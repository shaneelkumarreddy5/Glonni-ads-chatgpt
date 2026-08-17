"use client";

import {
  Bell,
  CheckCircle2,
  CircleAlert,
  Mail,
  MessageCircle,
  RefreshCw,
  Route,
  Send,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";

type Channel = "sms" | "whatsapp" | "email" | "push" | "in_app";
type Provider = {
  provider_id: string;
  code: string;
  display_name: string;
  channel: Channel;
  status: string;
  integration_mode: string;
  priority: number;
  active_routes: number;
  secret_configured: boolean;
  messages_24h: number;
  delivered_24h: number;
  failed_24h: number;
  updated_at: string;
};
type RouteRecord = {
  route_id: string;
  purpose: string;
  channel: Channel;
  provider_code: string;
  priority: number;
  enabled: boolean;
  country_codes: string[];
};
type Payload = {
  providers: Provider[];
  routes: RouteRecord[];
  summary: {
    configured_providers: number;
    active_providers: number;
    enabled_routes: number;
    queued_messages: number;
    messages_24h: number;
    delivered_24h: number;
    failed_24h: number;
  };
  channels: { channel: Channel; label: string }[];
  purposes: string[];
  routing: {
    provider_neutral: boolean;
    priority_fallback: boolean;
    automatic_provider_selection: boolean;
    otp_owner: string;
    delivery_owner: string;
  };
  activation_requirements: string[];
};

const emptyPayload: Payload = {
  providers: [],
  routes: [],
  summary: {
    configured_providers: 0,
    active_providers: 0,
    enabled_routes: 0,
    queued_messages: 0,
    messages_24h: 0,
    delivered_24h: 0,
    failed_24h: 0,
  },
  channels: [
    { channel: "sms", label: "SMS" },
    { channel: "whatsapp", label: "WhatsApp" },
    { channel: "email", label: "Email" },
    { channel: "push", label: "Push" },
    { channel: "in_app", label: "In-app" },
  ],
  purposes: ["otp", "security", "transactional", "support", "marketing", "system"],
  routing: {
    provider_neutral: true,
    priority_fallback: true,
    automatic_provider_selection: false,
    otp_owner: "supabase_auth",
    delivery_owner: "communication_gateway",
  },
  activation_requirements: [],
};

const channelIcons: Record<Channel, LucideIcon> = {
  sms: Smartphone,
  whatsapp: MessageCircle,
  email: Mail,
  push: Bell,
  in_app: Send,
};

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function CommunicationsControl({ action }: { action: (message: string) => void }) {
  const [payload, setPayload] = useState(emptyPayload);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: invokeError } = await supabase.functions.invoke("admin-communications", {
        body: { operation: "list" },
      });
      if (signal?.aborted) return;
      if (invokeError) throw invokeError;
      const next = (data as { data?: Payload } | null)?.data;
      if (!next || !Array.isArray(next.providers) || !Array.isArray(next.routes)) {
        throw new Error("invalid_communications_payload");
      }
      setPayload(next);
    } catch {
      if (!signal?.aborted) setError("The live communications status could not be loaded. No configuration was changed.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const metrics: Array<[string, number, string, LucideIcon, string]> = [
    ["Configured providers", payload.summary.configured_providers, `${payload.summary.active_providers} active`, Send, "bg-violet-50 text-violet-700"],
    ["Enabled routes", payload.summary.enabled_routes, "Priority and fallback routing", Route, "bg-blue-50 text-blue-700"],
    ["Queued messages", payload.summary.queued_messages, `${payload.summary.messages_24h} requested · 24h`, Bell, "bg-amber-50 text-amber-700"],
    ["Delivered · 24h", payload.summary.delivered_24h, `${payload.summary.failed_24h} failed`, CheckCircle2, "bg-emerald-50 text-emerald-700"],
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-bold">Communications gateway</h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">A provider-neutral delivery layer for OTP, security, transactional, support and product messages.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void load()} disabled={loading} className="flex h-10 items-center gap-2 rounded-xl border bg-white px-4 text-xs font-bold disabled:opacity-40"><RefreshCw size={15} className={loading ? "animate-spin" : ""}/>Refresh live status</button>
          <span className="flex h-10 items-center rounded-xl bg-emerald-50 px-3 text-xs font-bold text-emerald-700">Step 15 · Gateway live</span>
        </div>
      </div>

      <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
        <CircleAlert size={18} className="mt-0.5 shrink-0"/>
        <div><b>No communication provider has been selected or activated.</b> This is the correct pre-integration state. Glonni can later connect one or more approved services per channel without rebuilding the application.</div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">{error}</div>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value, note, Icon, tone]) => <article key={label} className="rounded-2xl border bg-white p-5 shadow-sm"><span className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}><Icon size={18}/></span><p className="mt-4 text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{loading ? "—" : value}</p><p className="mt-1 text-[10px] text-slate-400">{note}</p></article>)}
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3"><ShieldCheck className="text-violet-600" size={20}/><div><h3 className="font-bold">Channel adapters</h3><p className="text-xs text-slate-500">Each channel can use different providers, ordered routes and an independent fallback.</p></div></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {payload.channels.map(({ channel, label }) => { const Icon = channelIcons[channel]; const count = payload.providers.filter((provider) => provider.channel === channel).length; return <article key={channel} className="rounded-xl bg-slate-50 p-4"><Icon size={18} className="text-violet-600"/><b className="mt-3 block text-xs">{label}</b><p className="mt-1 text-[10px] text-slate-400">{count ? `${count} configured` : channel === "in_app" ? "Built-in delivery" : "Adapter ready"}</p></article>; })}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="border-b p-5"><h3 className="font-bold">Provider and route status</h3><p className="mt-1 text-xs text-slate-500">Secrets stay encrypted server-side and are never returned to this screen.</p></div>
        {loading ? <div role="status" className="space-y-3 p-5"><span className="sr-only">Loading communications providers</span>{[1,2,3].map((item) => <div key={item} className="h-14 animate-pulse rounded-xl bg-slate-100"/>)}</div> : payload.providers.length ? <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr>{["Provider", "Channel / mode", "Status", "Credentials", "Active routes", "Delivered · 24h", "Failed · 24h"].map((heading) => <th key={heading} className="px-5 py-3">{heading}</th>)}</tr></thead><tbody className="divide-y">{payload.providers.map((provider) => <tr key={provider.provider_id}><td className="px-5 py-4"><b>{provider.display_name}</b><p className="mt-1 font-mono text-[10px] text-violet-600">{provider.code}</p></td><td className="px-5 py-4"><b>{humanize(provider.channel)}</b><p className="mt-1 text-[10px] text-slate-400">{humanize(provider.integration_mode)}</p></td><td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{humanize(provider.status)}</span></td><td className="px-5 py-4 font-semibold">{provider.secret_configured ? "Configured" : "Required"}</td><td className="px-5 py-4 font-bold">{provider.active_routes}</td><td className="px-5 py-4 font-bold text-emerald-700">{provider.delivered_24h}</td><td className="px-5 py-4 font-bold text-rose-600">{provider.failed_24h}</td></tr>)}</tbody></table></div> : <div className="p-10 text-center"><ShieldCheck className="mx-auto text-emerald-500" size={34}/><h3 className="mt-3 text-sm font-bold">Gateway ready—no providers connected</h3><p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-slate-500">Provider selection, credentials, sender identities and routing will be added only after Glonni chooses and approves each service.</p></div>}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <article className="rounded-2xl border border-violet-200 bg-violet-50 p-5"><h3 className="text-sm font-bold text-violet-950">OTP responsibility is separated</h3><p className="mt-2 text-xs leading-5 text-violet-900">Supabase Auth remains responsible for generating and verifying the six-digit OTP. The communications gateway only chooses an approved delivery route; a provider never decides whether a code is valid.</p></article>
        <article className="rounded-2xl border bg-white p-5"><h3 className="font-bold">Provider activation gate</h3><div className="mt-4 space-y-2">{payload.activation_requirements.map((requirement, index) => <div key={requirement} className="flex items-center gap-3 rounded-xl border p-3 text-xs"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-[10px] font-bold">{index + 1}</span>{requirement}</div>)}</div>{!payload.activation_requirements.length && !loading && <p className="text-xs text-slate-500">Activation requirements unavailable.</p>}</article>
      </section>

      <button onClick={() => action("Communication gateway contract is ready for future provider onboarding")} className="w-full rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left text-xs font-bold text-emerald-800">Provider-neutral routing active · Automatic provider selection disabled · Credentials required before activation</button>
    </div>
  );
}
