"use client";

import {
  Activity,
  CheckCircle2,
  CircleAlert,
  Download,
  Eye,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";

type RiskDecision = "clear" | "monitor" | "restrict";
type RiskSignal = {
  signal_id: string;
  signal_type: string;
  severity: "low" | "medium" | "high" | "critical";
  confidence: number;
  source: string;
  basis: string;
  detected_at: string;
  evidence_verified: boolean;
};
type RiskCase = {
  risk_case_id: string;
  user_id: string;
  display_name: string;
  account_status: string;
  status: "open" | "under_review" | "resolved" | "dismissed";
  highest_severity: "low" | "medium" | "high" | "critical";
  risk_score: number;
  disposition: string | null;
  decision_reason: string | null;
  opened_at: string;
  updated_at: string;
  review: {
    review_item_id: string;
    status: string;
    priority: number;
    assigned_to: string | null;
    due_at: string | null;
  } | null;
  signals: RiskSignal[];
};
type RiskReviewPayload = {
  cases: RiskCase[];
  summary: {
    matching: number;
    open: number;
    critical: number;
    under_review: number;
    resolved_today: number;
  };
  permissions: {
    can_view: boolean;
    can_decide: boolean;
    human_decision_required: boolean;
  };
  pagination: { limit: number; offset: number };
};

const emptyPayload: RiskReviewPayload = {
  cases: [],
  summary: { matching: 0, open: 0, critical: 0, under_review: 0, resolved_today: 0 },
  permissions: { can_view: false, can_decide: false, human_decision_required: true },
  pagination: { limit: 50, offset: 0 },
};

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function relativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Unknown";
  const seconds = Math.round((timestamp - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (Math.abs(seconds) < 60) return formatter.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  return formatter.format(Math.round(hours / 24), "day");
}

function csvCell(value: string | number) {
  const stringValue = String(value);
  const safeValue = /^[=+\-@]/.test(stringValue) ? `'${stringValue}` : stringValue;
  return `"${safeValue.replaceAll('"', '""')}"`;
}

function errorMessage(value: unknown) {
  if (value && typeof value === "object" && "message" in value && typeof value.message === "string") {
    if (value.message.includes("403")) return "Your admin role cannot perform this action.";
    if (value.message.includes("409")) return "This case was already decided. Refreshing the queue.";
  }
  return "The live risk queue could not be updated. Existing data was not changed.";
}

export function FraudRiskControl({ action }: { action: (message: string) => void }) {
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");
  const [payload, setPayload] = useState<RiskReviewPayload>(emptyPayload);
  const [selected, setSelected] = useState<RiskCase | null>(null);
  const [decision, setDecision] = useState<RiskDecision | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCases = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: invokeError } = await supabase.functions.invoke("admin-risk-review", {
        body: {
          operation: "list",
          search: query.trim() || null,
          severity: severity || null,
          status: status || null,
          limit: 50,
          offset: 0,
        },
      });
      if (signal?.aborted) return;
      if (invokeError) throw invokeError;
      const nextPayload = (data as { data?: RiskReviewPayload } | null)?.data;
      if (!nextPayload || !Array.isArray(nextPayload.cases)) throw new Error("invalid_risk_payload");
      setPayload(nextPayload);
    } catch (loadError) {
      if (signal?.aborted) return;
      setError(errorMessage(loadError));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [query, severity, status]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void loadCases(controller.signal), 300);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [loadCases]);

  const severityTone = (value: string) => value === "critical"
    ? "bg-rose-100 text-rose-800"
    : value === "high" ? "bg-orange-50 text-orange-700"
    : value === "medium" ? "bg-amber-50 text-amber-700"
    : "bg-emerald-50 text-emerald-700";
  const statusTone = (value: string) => value === "open"
    ? "bg-rose-50 text-rose-700"
    : value === "under_review" ? "bg-blue-50 text-blue-700"
    : value === "resolved" ? "bg-emerald-50 text-emerald-700"
    : "bg-slate-100 text-slate-700";

  const latestSignal = useCallback((riskCase: RiskCase) => riskCase.signals[0] ?? null, []);
  const metrics = useMemo(() => [
    ["Open risk cases", payload.summary.open, `${payload.summary.critical} critical`, ShieldAlert, "bg-rose-50 text-rose-600"],
    ["Under review", payload.summary.under_review, "Human investigation", Activity, "bg-blue-50 text-blue-600"],
    ["Matching results", payload.summary.matching, "Current filters", UserCheck, "bg-violet-50 text-violet-600"],
    ["Resolved today", payload.summary.resolved_today, "Audited decisions", CheckCircle2, "bg-emerald-50 text-emerald-600"],
  ] as const, [payload.summary]);

  const exportCases = () => {
    const header = ["Case ID", "User ID", "User", "Severity", "Score", "Status", "Latest signal", "Opened"];
    const rows = payload.cases.map((riskCase) => {
      const signal = latestSignal(riskCase);
      return [riskCase.risk_case_id, riskCase.user_id, riskCase.display_name, riskCase.highest_severity,
        riskCase.risk_score, riskCase.status, signal?.signal_type ?? "", riskCase.opened_at];
    });
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `glonni-risk-cases-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    action(`${payload.cases.length} live risk cases exported`);
  };

  const confirmDecision = async () => {
    if (!selected || !decision || reason.trim().length < 8 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: invokeError } = await supabase.functions.invoke("admin-risk-review", {
        body: {
          operation: "decide",
          riskCaseId: selected.risk_case_id,
          decision,
          reason: reason.trim(),
          requestId: crypto.randomUUID(),
        },
      });
      if (invokeError) throw invokeError;
      action(`${selected.risk_case_id}: ${humanize(decision)} decision saved to the permanent audit trail`);
      setDecision(null);
      setReason("");
      setSelected(null);
      await loadCases();
    } catch (decisionError) {
      setError(errorMessage(decisionError));
      await loadCases();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 text-xs text-slate-400">Home <span className="px-2">›</span> Fraud &amp; Risk</div>
          <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">Fraud &amp; Risk Control</h1>
          <p className="mt-1 text-sm text-slate-500">Live verified signals, human decisions and permanent audit evidence.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button disabled={!payload.cases.length} onClick={exportCases} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold disabled:opacity-40">
            <Download size={15} />Export cases
          </button>
          <button onClick={() => void loadCases()} disabled={loading} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold disabled:opacity-40">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />Refresh
          </button>
          <span className="flex h-10 items-center rounded-xl bg-emerald-50 px-3 text-xs font-semibold text-emerald-700">Step 13 · Live Supabase</span>
        </div>
      </div>

      {error && <div role="alert" className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800"><CircleAlert size={17} className="shrink-0"/><div><b>Live operation unsuccessful</b><p className="mt-1">{error}</p></div></div>}

      <section className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value, detail, Icon, tone]) => (
          <article key={label} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className={`grid h-12 w-12 place-items-center rounded-2xl ${tone}`}><Icon size={21}/></span>
            <div><p className="text-xs text-slate-500">{label}</p><p className="text-xl font-bold">{loading ? "—" : value}</p><p className="text-[10px] text-slate-400">{detail}</p></div>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 xl:flex-row">
          <label className="flex h-11 flex-1 items-center gap-3 rounded-xl border border-slate-200 px-4"><Search size={17} className="text-slate-400"/><input aria-label="Search live risk cases" value={query} onChange={(event) => setQuery(event.target.value)} maxLength={100} placeholder="Search case UUID, user or signal" className="w-full bg-transparent text-xs outline-none"/></label>
          <select aria-label="Severity filter" value={severity} onChange={(event) => setSeverity(event.target.value)} className="h-11 rounded-xl border bg-white px-4 text-xs"><option value="">All severity</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
          <select aria-label="Risk status filter" value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 rounded-xl border bg-white px-4 text-xs"><option value="">All statuses</option><option value="open">Open</option><option value="under_review">Under review</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option></select>
        </div>

        {loading ? <div role="status" className="space-y-3 p-5"><span className="sr-only">Loading live risk cases</span>{[1,2,3].map((item)=><div key={item} className="h-16 animate-pulse rounded-xl bg-slate-100"/>)}</div> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1020px] text-left">
              <thead><tr className="bg-[#fafafd] text-[10px] uppercase tracking-wider text-slate-400"><th className="px-5 py-3">Case / user</th><th className="px-4 py-3">Latest signal</th><th className="px-4 py-3">Score</th><th className="px-4 py-3">Account</th><th className="px-4 py-3">Review status</th><th className="px-4 py-3">Opened</th><th className="px-5 py-3 text-right">Action</th></tr></thead>
              <tbody>{payload.cases.map((riskCase) => { const signal = latestSignal(riskCase); return <tr key={riskCase.risk_case_id} className="border-t border-slate-100 text-xs hover:bg-violet-50/30"><td className="px-5 py-4"><b>{riskCase.display_name}</b><p className="mt-1 max-w-[230px] truncate font-mono text-[10px] text-violet-600">{riskCase.risk_case_id}</p><p className="mt-1 max-w-[230px] truncate font-mono text-[9px] text-slate-400">User {riskCase.user_id}</p></td><td className="px-4 py-4"><b>{signal ? humanize(signal.signal_type) : "No signal"}</b><p className="mt-1 text-[10px] text-slate-400">{signal?.source ?? "—"}</p></td><td className="px-4 py-4"><div className="flex items-center gap-2"><b className={riskCase.risk_score >= 85 ? "text-rose-600" : "text-amber-600"}>{riskCase.risk_score}</b><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${severityTone(riskCase.highest_severity)}`}>{humanize(riskCase.highest_severity)}</span></div></td><td className="px-4 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-700">{humanize(riskCase.account_status)}</span></td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusTone(riskCase.status)}`}>{humanize(riskCase.status)}</span><p className="mt-2 text-[9px] text-slate-400">Queue: {humanize(riskCase.review?.status ?? "not queued")}</p></td><td className="px-4 py-4 text-slate-500">{relativeTime(riskCase.opened_at)}</td><td className="px-5 py-4 text-right"><button onClick={() => setSelected(riskCase)} className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 font-semibold text-violet-600"><Eye size={14}/>Investigate</button></td></tr>; })}</tbody>
            </table>
            {!payload.cases.length && <div className="p-12 text-center"><ShieldCheck className="mx-auto text-emerald-400"/><p className="mt-3 text-sm font-bold">No live risk cases match</p><p className="mt-1 text-xs text-slate-400">The verified-signal pipeline remains active. New eligible cases will appear here automatically.</p></div>}
          </div>
        )}
        <div className="border-t px-5 py-4 text-xs text-slate-500">Showing {payload.cases.length} of {payload.summary.matching} live cases · Every adverse action requires a human administrator</div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <article className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-bold">Live evidence boundary</h2><p className="mt-1 text-xs text-slate-500">Only verified provider/admin evidence is promoted into this queue.</p><div className="mt-4 space-y-3 text-xs">{["Raw IP addresses and device fingerprints are never displayed", "Signals retain their source, confidence and detection time", "Unverified client claims cannot create an administrator case"].map((text)=><div key={text} className="flex gap-3 rounded-xl bg-slate-50 p-3"><ShieldCheck size={17} className="shrink-0 text-emerald-600"/><span>{text}</span></div>)}</div></article>
        <article className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-bold">Human decision safeguards</h2><p className="mt-1 text-xs text-slate-500">Risk scoring prioritizes review; it never automatically punishes a user.</p><div className="mt-4 space-y-3 text-xs">{["MFA and an active owner/KYC-risk role are required", "A meaningful reason is mandatory for every decision", "Decisions and restrictions create permanent audit history"].map((text, index)=><div key={text} className="flex gap-3 rounded-xl border p-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet-50 text-[10px] font-bold text-violet-700">{index+1}</span><span>{text}</span></div>)}</div></article>
      </section>

      {selected && <div className="fixed inset-0 z-[70] flex justify-end"><button aria-label="Close risk investigation" onClick={() => setSelected(null)} className="absolute inset-0 bg-slate-950/40"/><aside role="dialog" aria-modal="true" aria-labelledby="risk-case-title" className="admin-scroll relative h-full w-full max-w-[660px] overflow-y-auto bg-[#f7f8fc] shadow-2xl"><header className="sticky top-0 z-10 flex items-center border-b bg-white p-5"><div><p className="text-xs text-slate-400">Live risk investigation</p><h2 id="risk-case-title" className="max-w-[520px] truncate font-bold">{selected.risk_case_id} · {selected.display_name}</h2></div><button aria-label="Close investigation" onClick={() => setSelected(null)} className="ml-auto grid h-10 w-10 place-items-center"><X/></button></header><div className="space-y-4 p-5"><section className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-bold ${severityTone(selected.highest_severity)}`}>{humanize(selected.highest_severity)} · {selected.risk_score}/100</span><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone(selected.status)}`}>{humanize(selected.status)}</span></div><dl className="mt-5 grid gap-3 text-xs sm:grid-cols-2">{[["User", `${selected.display_name} · ${selected.user_id}`],["Account", humanize(selected.account_status)],["Queue", humanize(selected.review?.status ?? "not queued")],["Opened", new Date(selected.opened_at).toLocaleString("en-IN")]].map(([label,value])=><div key={label} className="rounded-xl bg-slate-50 p-3"><dt className="text-[10px] text-slate-400">{label}</dt><dd className="mt-1 break-all font-bold">{value}</dd></div>)}</dl></section><section className="rounded-2xl border bg-white p-5"><h3 className="font-bold">Evidence timeline</h3><div className="mt-4 space-y-4 border-l-2 border-violet-100 pl-4">{selected.signals.map((signal)=><div key={signal.signal_id}><div className="flex flex-wrap items-center gap-2"><b className="text-xs">{humanize(signal.signal_type)}</b><span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${severityTone(signal.severity)}`}>{humanize(signal.severity)}</span>{signal.evidence_verified&&<span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">Verified</span>}</div><p className="mt-1 text-xs text-slate-600">{signal.basis}</p><p className="mt-1 text-[10px] text-slate-400">{signal.source} · Confidence {Math.round(Number(signal.confidence)*100)}% · {relativeTime(signal.detected_at)}</p></div>)}</div></section><section className="rounded-2xl border bg-white p-5"><h3 className="font-bold">Human investigation actions</h3>{payload.permissions.can_decide ? <><p className="mt-1 text-xs text-slate-500">Every choice requires a reason and creates permanent audit evidence.</p><div className="mt-4 flex flex-wrap gap-2"><button disabled={!['open','under_review'].includes(selected.status)} onClick={() => setDecision("clear")} className="h-10 rounded-xl border border-emerald-200 px-4 text-xs font-bold text-emerald-700 disabled:opacity-40">Clear case</button><button disabled={!['open','under_review'].includes(selected.status)} onClick={() => setDecision("monitor")} className="h-10 rounded-xl border border-amber-200 px-4 text-xs font-bold text-amber-700 disabled:opacity-40">Continue monitoring</button><button disabled={!['open','under_review'].includes(selected.status)} onClick={() => setDecision("restrict")} className="h-10 rounded-xl bg-rose-600 px-4 text-xs font-bold text-white disabled:opacity-40">Restrict account</button></div></> : <p className="mt-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Your role can inspect evidence but cannot make a final risk decision.</p>}</section></div></aside></div>}

      {decision && selected && <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/50 p-4"><div role="alertdialog" aria-modal="true" aria-labelledby="risk-decision-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h3 id="risk-decision-title" className="text-lg font-bold">Confirm {humanize(decision)} decision</h3><p className="mt-2 text-xs leading-5 text-slate-500">This changes the real case and writes a permanent audit record. {decision === "restrict" ? "The user account will be restricted and may appeal." : "No automatic restriction will be created."}</p><textarea autoFocus value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} placeholder="Required: explain the verified reason (minimum 8 characters)" className="mt-4 h-28 w-full rounded-xl border p-3 text-xs outline-none focus:border-violet-400"/><p className="mt-1 text-right text-[10px] text-slate-400">{reason.trim().length}/500</p><div className="mt-5 flex justify-end gap-2"><button disabled={submitting} onClick={() => { setDecision(null); setReason(""); }} className="h-10 rounded-xl border px-4 text-xs font-bold disabled:opacity-40">Cancel</button><button disabled={reason.trim().length < 8 || submitting} onClick={() => void confirmDecision()} className={`h-10 rounded-xl px-4 text-xs font-bold text-white disabled:opacity-40 ${decision === "restrict" ? "bg-rose-600" : "bg-violet-600"}`}>{submitting ? "Saving…" : "Confirm human decision"}</button></div></div></div>}
    </>
  );
}
