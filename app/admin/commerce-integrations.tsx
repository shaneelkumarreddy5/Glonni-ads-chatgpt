"use client";

import { BadgeIndianRupee, CheckCircle2, CircleAlert, CreditCard, Link2, RefreshCw, Route, ShieldCheck, ShoppingBag } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";

type ProviderDomain = "affiliate" | "payout";
type Provider = {
  provider_id: string;
  code: string;
  display_name: string;
  domain: ProviderDomain;
  status: string;
  integration_mode: string;
  secret_configured: boolean;
  updated_at: string;
};
type Payload = {
  providers: Provider[];
  summary: {
    affiliate_providers: number;
    payout_providers: number;
    active_providers: number;
    active_merchants: number;
    clicks_24h: number;
    pending_cashback_paise: number;
    confirmed_cashback_paise: number;
    payout_attempts_24h: number;
    enabled_payout_routes: number;
  };
  contracts: {
    currency: string;
    money_unit: string;
    callback_signature: string;
    affiliate_attribution: string;
    cashback_release: string;
    payout_idempotency: boolean;
    automatic_provider_activation: boolean;
    provider_neutral: boolean;
  };
  activation_requirements: string[];
};

const emptyPayload: Payload = {
  providers: [],
  summary: { affiliate_providers: 0, payout_providers: 0, active_providers: 0, active_merchants: 0, clicks_24h: 0, pending_cashback_paise: 0, confirmed_cashback_paise: 0, payout_attempts_24h: 0, enabled_payout_routes: 0 },
  contracts: { currency: "INR", money_unit: "paise", callback_signature: "HMAC-SHA256", affiliate_attribution: "signed_click_id", cashback_release: "provider_confirmed_and_return_window_closed", payout_idempotency: true, automatic_provider_activation: false, provider_neutral: true },
  activation_requirements: [],
};

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function money(paise: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(paise / 100);
}

export function CommerceIntegrations({ action }: { action: (message: string) => void }) {
  const [payload, setPayload] = useState(emptyPayload);
  const [domain, setDomain] = useState<ProviderDomain | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: invokeError } = await supabase.functions.invoke("admin-commerce-integrations", { body: { operation: "list" } });
      if (signal?.aborted) return;
      if (invokeError) throw invokeError;
      const next = (data as { data?: Payload } | null)?.data;
      if (!next || !Array.isArray(next.providers)) throw new Error("invalid_commerce_payload");
      setPayload(next);
    } catch {
      if (!signal?.aborted) setError("The live affiliate and payout status could not be loaded. No configuration was changed.");
    } finally { if (!signal?.aborted) setLoading(false); }
  }, []);

  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  const providers = useMemo(() => domain === "all" ? payload.providers : payload.providers.filter((provider) => provider.domain === domain), [domain, payload.providers]);
  const metrics: Array<[string, string | number, string, LucideIcon, string]> = [
    ["Affiliate providers", payload.summary.affiliate_providers, `${payload.summary.active_merchants} active merchants`, Link2, "bg-violet-50 text-violet-700"],
    ["Payout providers", payload.summary.payout_providers, `${payload.summary.enabled_payout_routes} enabled routes`, CreditCard, "bg-blue-50 text-blue-700"],
    ["Pending cashback", money(payload.summary.pending_cashback_paise), "Never withdrawable yet", ShoppingBag, "bg-amber-50 text-amber-700"],
    ["Payout attempts · 24h", payload.summary.payout_attempts_24h, "Idempotent provider requests", Route, "bg-emerald-50 text-emerald-700"],
  ];

  return <>
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-2 text-xs text-slate-400">Shop &amp; Grow <span className="px-2">›</span> Shop &amp; Earn</div><h1 className="text-2xl font-bold tracking-tight md:text-[28px]">Affiliate &amp; Payout Gateway</h1><p className="mt-1 max-w-3xl text-sm text-slate-500">Secure click attribution, order callbacks, return-window cashback and withdrawal-provider routing.</p></div><div className="flex flex-wrap gap-2"><button onClick={() => void load()} disabled={loading} className="flex h-10 items-center gap-2 rounded-xl border bg-white px-4 text-xs font-bold disabled:opacity-40"><RefreshCw size={15} className={loading ? "animate-spin" : ""}/>Refresh live status</button><span className="flex h-10 items-center rounded-xl bg-emerald-50 px-3 text-xs font-bold text-emerald-700">Step 16 · Gateway live</span></div></div>

    <div className="mb-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900"><CircleAlert size={18} className="mt-0.5 shrink-0"/><div><b>No affiliate network or payout provider is selected or active.</b> The infrastructure is ready, but no real click is redirected and no money is sent until Glonni approves providers, credentials, mappings, tests and routes.</div></div>
    {error && <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">{error}</div>}

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, value, note, Icon, tone]) => <article key={label} className="rounded-2xl border bg-white p-5 shadow-sm"><span className={`grid h-11 w-11 place-items-center rounded-xl ${tone}`}><Icon size={19}/></span><p className="mt-4 text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{loading ? "—" : value}</p><p className="mt-1 text-[10px] text-slate-400">{note}</p></article>)}</section>

    <section className="mt-6 overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="flex flex-col gap-3 border-b p-5 lg:flex-row lg:items-center"><div><h2 className="font-bold">Provider readiness</h2><p className="mt-1 text-xs text-slate-500">Live database state; encrypted credentials are never returned.</p></div><div className="flex gap-2 lg:ml-auto">{(["all", "affiliate", "payout"] as const).map((item) => <button key={item} onClick={() => setDomain(item)} className={`h-9 rounded-lg px-3 text-[11px] font-bold ${domain === item ? "bg-violet-600 text-white" : "bg-slate-50 text-slate-600"}`}>{item === "all" ? "All" : humanize(item)}</button>)}</div></div>
      {loading ? <div role="status" className="space-y-3 p-5"><span className="sr-only">Loading commerce providers</span>{[1,2,3].map((item) => <div key={item} className="h-14 animate-pulse rounded-xl bg-slate-100"/>)}</div> : providers.length ? <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr>{["Provider", "Domain / integration", "Status", "Credential", "Updated"].map((heading) => <th key={heading} className="px-5 py-3">{heading}</th>)}</tr></thead><tbody className="divide-y">{providers.map((provider) => <tr key={provider.provider_id}><td className="px-5 py-4"><b>{provider.display_name}</b><p className="mt-1 font-mono text-[10px] text-violet-600">{provider.code}</p></td><td className="px-5 py-4"><b>{humanize(provider.domain)}</b><p className="mt-1 text-[10px] text-slate-400">{humanize(provider.integration_mode)}</p></td><td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{humanize(provider.status)}</span></td><td className="px-5 py-4 font-semibold">{provider.secret_configured ? "Configured" : "Required"}</td><td className="px-5 py-4 text-slate-500">{new Date(provider.updated_at).toLocaleString("en-IN")}</td></tr>)}</tbody></table></div> : <div className="p-12 text-center"><ShieldCheck className="mx-auto text-emerald-500" size={34}/><h3 className="mt-3 text-sm font-bold">Gateway ready—no providers connected</h3><p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-slate-500">This is the correct pre-approval state. Affiliate and payout services can be connected independently later.</p></div>}
    </section>

    <section className="mt-6 grid gap-5 xl:grid-cols-2"><article className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-bold">Cashback release control</h2><div className="mt-4 space-y-3">{[["1", "Signed click attribution", "The user, merchant and attribution expiry are bound server-side."], ["2", "Provider order confirmation", "Commission and cashback values arrive through a signed callback."], ["3", "Return window completed", "Pending cashback becomes available only after cancellation risk ends."], ["4", "Append-only wallet credit", "The existing reward ledger records the final financial movement."]].map(([step, title, detail]) => <div key={step} className="flex gap-3 rounded-xl bg-slate-50 p-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700">{step}</span><div><b className="text-xs">{title}</b><p className="mt-1 text-[10px] leading-4 text-slate-500">{detail}</p></div></div>)}</div></article><article className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-bold">Provider activation gate</h2><p className="mt-1 text-xs text-slate-500">Every service must pass these checks independently.</p><div className="mt-4 space-y-2">{payload.activation_requirements.map((requirement, index) => <div key={requirement} className="flex items-center gap-3 rounded-xl border p-3 text-xs"><CheckCircle2 size={15} className="text-slate-300"/><span>{index + 1}. {requirement}</span></div>)}</div></article></section>

    <section className="mt-6 grid gap-4 md:grid-cols-3"><article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><BadgeIndianRupee className="text-emerald-700"/><h3 className="mt-3 text-sm font-bold text-emerald-950">Money stays exact</h3><p className="mt-1 text-xs leading-5 text-emerald-800">All commission, cashback and payout values use integer paise—never floating-point money.</p></article><article className="rounded-2xl border border-violet-200 bg-violet-50 p-5"><ShieldCheck className="text-violet-700"/><h3 className="mt-3 text-sm font-bold text-violet-950">Callbacks are verified</h3><p className="mt-1 text-xs leading-5 text-violet-800">HMAC signature, timestamp and event ID checks block tampering, replay and duplicate credits.</p></article><button onClick={() => action("Step 16 provider-neutral contract is ready for future onboarding")} className="rounded-2xl border bg-white p-5 text-left"><Route className="text-blue-600"/><h3 className="mt-3 text-sm font-bold">Independent routing</h3><p className="mt-1 text-xs leading-5 text-slate-500">Affiliate tracking and payout rails can use separate providers and fallback routes.</p></button></section>
  </>;
}
