"use client";

import {
  Activity,
  CheckCircle2,
  CircleAlert,
  Gamepad2,
  Layers3,
  MonitorPlay,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";

type ProviderKind = "rewarded_ad" | "offerwall" | "survey" | "app_install" | "game";
type Provider = {
  provider_id: string;
  code: string;
  display_name: string;
  status: string;
  provider_kind: ProviderKind | null;
  integration_mode: string | null;
  readiness_status: string;
  gateway_enabled: boolean;
  secret_configured: boolean;
  active_campaigns: number;
  callbacks_24h: number;
  rejected_callbacks_24h: number;
  last_callback_at: string | null;
  last_health_at: string | null;
  last_health_status: string | null;
  updated_at: string;
};
type Payload = {
  providers: Provider[];
  summary: {
    configured: number;
    ready: number;
    enabled: number;
    active_campaigns: number;
    callbacks_24h: number;
    rejected_callbacks_24h: number;
  };
  supported_kinds: { kind: ProviderKind; label: string }[];
  gateway: {
    function_name: string;
    contract_version: string;
    signature: string;
    reward_source: string;
    automatic_activation: boolean;
  };
  activation_requirements: string[];
};

const emptyPayload: Payload = {
  providers: [],
  summary: { configured: 0, ready: 0, enabled: 0, active_campaigns: 0, callbacks_24h: 0, rejected_callbacks_24h: 0 },
  supported_kinds: [
    { kind: "rewarded_ad", label: "Rewarded ads" },
    { kind: "offerwall", label: "Offerwalls" },
    { kind: "survey", label: "Surveys" },
    { kind: "app_install", label: "App installs" },
    { kind: "game", label: "Games" },
  ],
  gateway: {
    function_name: "earning-provider-callback",
    contract_version: "glonni_v1",
    signature: "HMAC-SHA256",
    reward_source: "verified_server_callback_only",
    automatic_activation: false,
  },
  activation_requirements: [],
};

const kindIcons = {
  rewarded_ad: MonitorPlay,
  offerwall: Layers3,
  survey: Activity,
  app_install: Smartphone,
  game: Gamepad2,
};

function humanize(value: string | null) {
  return value ? value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Not mapped";
}

function relativeTime(value: string | null) {
  if (!value) return "Never";
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  if (!Number.isFinite(seconds)) return "Unknown";
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (Math.abs(seconds) < 60) return formatter.format(seconds, "second");
  if (Math.abs(seconds) < 3600) return formatter.format(Math.round(seconds / 60), "minute");
  if (Math.abs(seconds) < 86400) return formatter.format(Math.round(seconds / 3600), "hour");
  return formatter.format(Math.round(seconds / 86400), "day");
}

export function ProviderIntegrations({ action }: { action: (message: string) => void }) {
  const [payload, setPayload] = useState(emptyPayload);
  const [kind, setKind] = useState<ProviderKind | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: invokeError } = await supabase.functions.invoke("admin-provider-integrations", {
        body: { operation: "list" },
      });
      if (signal?.aborted) return;
      if (invokeError) throw invokeError;
      const next = (data as { data?: Payload } | null)?.data;
      if (!next || !Array.isArray(next.providers)) throw new Error("invalid_provider_payload");
      setPayload(next);
    } catch {
      if (!signal?.aborted) setError("The live provider status could not be loaded. No configuration was changed.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const providers = useMemo(
    () => kind === "all" ? payload.providers : payload.providers.filter((provider) => provider.provider_kind === kind),
    [kind, payload.providers],
  );
  const metrics: Array<[string, number, string, LucideIcon, string]> = [
    ["Configured providers", payload.summary.configured, `${payload.summary.ready} ready`, Layers3, "bg-violet-50 text-violet-700"],
    ["Enabled gateways", payload.summary.enabled, "Owner-controlled activation", ShieldCheck, "bg-emerald-50 text-emerald-700"],
    ["Active campaigns", payload.summary.active_campaigns, "Immutable reward economics", MonitorPlay, "bg-blue-50 text-blue-700"],
    ["Callbacks · 24h", payload.summary.callbacks_24h, `${payload.summary.rejected_callbacks_24h} rejected/review`, Activity, "bg-amber-50 text-amber-700"],
  ];

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 text-xs text-slate-400">Earnings <span className="px-2">›</span> Provider integrations</div>
          <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">Real Provider Gateway</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">One secure integration layer for rewarded ads, offerwalls, surveys, app installs and games.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void load()} disabled={loading} className="flex h-10 items-center gap-2 rounded-xl border bg-white px-4 text-xs font-bold disabled:opacity-40">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""}/>Refresh live status
          </button>
          <span className="flex h-10 items-center rounded-xl bg-emerald-50 px-3 text-xs font-bold text-emerald-700">Step 14 · Gateway live</span>
        </div>
      </div>

      <div className="mb-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
        <CircleAlert size={18} className="mt-0.5 shrink-0"/>
        <div><b>No provider is activated automatically.</b> The gateway is deployed, but earning traffic remains disabled until provider approval, credentials, mapping, a signed callback test and owner approval are complete.</div>
      </div>

      {error && <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">{error}</div>}

      <section className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value, note, Icon, tone]) => <article key={label} className="rounded-2xl border bg-white p-5 shadow-sm"><span className={`grid h-11 w-11 place-items-center rounded-xl ${tone}`}><Icon size={19}/></span><p className="mt-4 text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{loading ? "—" : value}</p><p className="mt-1 text-[10px] text-slate-400">{note}</p></article>)}
      </section>

      <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
          <div><h2 className="font-bold">Provider readiness</h2><p className="mt-1 text-xs text-slate-500">Live database state; credentials are never returned to this screen.</p></div>
          <div className="flex flex-wrap gap-2 lg:ml-auto">
            <button onClick={() => setKind("all")} className={`h-9 rounded-lg px-3 text-[11px] font-bold ${kind === "all" ? "bg-violet-600 text-white" : "bg-slate-50 text-slate-600"}`}>All</button>
            {payload.supported_kinds.map((item) => <button key={item.kind} onClick={() => setKind(item.kind)} className={`h-9 rounded-lg px-3 text-[11px] font-bold ${kind === item.kind ? "bg-violet-600 text-white" : "bg-slate-50 text-slate-600"}`}>{item.label}</button>)}
          </div>
        </div>
        {loading ? <div role="status" className="space-y-3 p-5"><span className="sr-only">Loading provider integrations</span>{[1,2,3].map((item)=><div key={item} className="h-16 animate-pulse rounded-xl bg-slate-100"/>)}</div> : providers.length ? <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr>{["Provider", "Type / mode", "Readiness", "Credentials", "Campaigns", "Callbacks · 24h", "Last callback"].map((heading)=><th key={heading} className="px-5 py-3">{heading}</th>)}</tr></thead><tbody className="divide-y">{providers.map((provider)=><tr key={provider.provider_id}><td className="px-5 py-4"><b>{provider.display_name}</b><p className="mt-1 font-mono text-[10px] text-violet-600">{provider.code}</p></td><td className="px-5 py-4"><b>{humanize(provider.provider_kind)}</b><p className="mt-1 text-[10px] text-slate-400">{humanize(provider.integration_mode)}</p></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${provider.gateway_enabled ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{humanize(provider.readiness_status)}</span><p className="mt-2 text-[10px] text-slate-400">Gateway {provider.gateway_enabled ? "enabled" : "disabled"}</p></td><td className="px-5 py-4 font-semibold">{provider.secret_configured ? "Configured" : "Required"}</td><td className="px-5 py-4 font-bold">{provider.active_campaigns}</td><td className="px-5 py-4"><b>{provider.callbacks_24h}</b><p className="mt-1 text-[10px] text-rose-500">{provider.rejected_callbacks_24h} rejected/review</p></td><td className="px-5 py-4 text-slate-500">{relativeTime(provider.last_callback_at)}</td></tr>)}</tbody></table></div> : <div className="p-12 text-center"><ShieldCheck className="mx-auto text-emerald-500" size={34}/><h3 className="mt-3 text-sm font-bold">Gateway ready—no providers connected</h3><p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-slate-500">This is the correct pre-approval state. Add each provider only after Glonni receives its commercial approval and server credentials.</p></div>}
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-2">
        <article className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-bold">Supported earning types</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{payload.supported_kinds.map((item) => { const Icon = kindIcons[item.kind]; return <div key={item.kind} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-violet-100 text-violet-700"><Icon size={17}/></span><div><b className="text-xs">{item.label}</b><p className="mt-1 text-[10px] text-slate-400">Provider-neutral adapter</p></div></div>; })}</div></article>
        <article className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-bold">Activation gate</h2><p className="mt-1 text-xs text-slate-500">Every provider must pass all five checks.</p><div className="mt-4 space-y-2">{payload.activation_requirements.map((requirement, index)=><div key={requirement} className="flex items-center gap-3 rounded-xl border p-3 text-xs"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-[10px] font-bold">{index + 1}</span>{requirement}</div>)}</div></article>
      </section>

      <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><div className="flex gap-3"><CheckCircle2 className="shrink-0 text-emerald-700"/><div><h2 className="text-sm font-bold text-emerald-900">Reward integrity is active</h2><p className="mt-1 text-xs leading-5 text-emerald-800">Only a signed, timestamp-valid, non-duplicate server callback can reach the existing reward ledger. Browser activity alone cannot credit money.</p><button onClick={() => action("Provider gateway contract copied for future onboarding")} className="mt-3 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-[11px] font-bold text-emerald-800">Gateway: {payload.gateway.contract_version} · {payload.gateway.signature}</button></div></div></section>
    </>
  );
}
