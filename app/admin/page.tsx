"use client";
/* eslint-disable @typescript-eslint/no-unused-vars -- compact mock document cards retain map indices for future ordering */

import { Activity, ArrowDownRight, ArrowUpRight, BadgeIndianRupee, Bell, Bot, CalendarDays, CheckCircle2, ChevronDown, CircleAlert, Clock3, Download, ExternalLink, FileText, Gamepad2, Gift, HandCoins, Headphones, LayoutDashboard, Link2, LockKeyhole, LogOut, Menu, MonitorPlay, Moon, MoreHorizontal, PackageCheck, PanelLeftClose, Pin, PinOff, Plus, RefreshCw, Search, Send, Settings, ShieldAlert, ShieldCheck, ShoppingBag, SlidersHorizontal, Sparkles, Store, TrendingUp, UserCheck, Users, WalletCards, X, Ban, ChevronLeft, ChevronRight, Copy, Eye, Filter, Mail, MapPin, Phone, RotateCcw, Smartphone, UserRound, UserX, Wifi } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FraudRiskControl } from "./fraud-risk-control";
import { ProviderIntegrations } from "./provider-integrations";
import { CommunicationsControl } from "./communications-control";

type NavItem = { label: string; icon: typeof LayoutDashboard; badge?: string };
type NavGroup = { label?: string; items: NavItem[] };
type AdminView = "Dashboard" | "Users" | "Wallet & Transactions" | "Withdrawals" | "KYC Verification" | "Fraud & Risk" | "Ad Networks" | "Surveys" | "App Install Offers" | "Games" | "Shop & Earn" | "Stores & Links" | "Referrals" | "Content" | "Support Centre" | "Reports" | "Settings & Security" | "Activity Logs";
type SearchRecordType = "User" | "Transaction" | "Withdrawal" | "Support" | "Campaign" | "Store" | "Audit Event";
type SearchRecord = {
  id: string;
  type: SearchRecordType;
  title: string;
  subtitle: string;
  status: string;
  priority: "Low" | "Medium" | "High";
  updated: string;
  updatedOrder: number;
  view: AdminView;
  details: [string, string][];
};
type SavedRecordView = { name: string; type: "All" | SearchRecordType; status: string; priority: string; sort: string };
type ReliabilityState = "Ready" | "Loading" | "Empty" | "Error" | "Offline";
type AdminRole = "Super Admin" | "Finance Admin" | "Support Admin" | "Content Admin" | "Operations Admin" | "Security Admin";
type RoleWorkspace = {
  description: string;
  focus: string;
  views: AdminView[];
  defaultPins: AdminView[];
  priorities: { label: string; detail: string; view: AdminView; urgency: "Urgent" | "High" | "Medium" }[];
  permissions: { label: string; level: "Full action" | "Guarded action" | "View only" | "Hidden" }[];
};

const adminViewSlugs: Record<AdminView, string> = {
  Dashboard: "dashboard",
  Users: "users",
  "Wallet & Transactions": "wallet-transactions",
  Withdrawals: "withdrawals",
  "KYC Verification": "kyc-verification",
  "Fraud & Risk": "fraud-risk",
  "Ad Networks": "ad-networks",
  Surveys: "surveys",
  "App Install Offers": "app-install-offers",
  Games: "games",
  "Shop & Earn": "shop-earn",
  "Stores & Links": "stores-links",
  Referrals: "referrals",
  Content: "content",
  "Support Centre": "support",
  Reports: "reports",
  "Settings & Security": "settings-security",
  "Activity Logs": "activity-logs",
};

const adminSlugViews = Object.fromEntries(Object.entries(adminViewSlugs).map(([view, slug]) => [slug, view])) as Record<string, AdminView>;

type BulkQueueAction = { label: string; permission: string; tone?: "default" | "danger" };

function BulkQueueToolbar({ selectedCount, visibleCount, allSelected, onToggleAll, onClear, actions, onApply }: { selectedCount: number; visibleCount: number; allSelected: boolean; onToggleAll: () => void; onClear: () => void; actions: BulkQueueAction[]; onApply: (label: string, reason: string) => void }) {
  const [pending, setPending] = useState<BulkQueueAction | null>(null);
  const [reason, setReason] = useState("");
  return <>
    <div className="flex flex-col gap-3 border-b border-violet-100 bg-violet-50/70 px-4 py-3 sm:flex-row sm:items-center">
      <label className="flex items-center gap-2 text-xs font-bold text-violet-900"><input type="checkbox" checked={allSelected} onChange={onToggleAll} className="h-4 w-4 rounded border-violet-300 text-violet-600"/><span>{selectedCount ? `${selectedCount} selected` : `Select all ${visibleCount} visible`}</span></label>
      {selectedCount > 0 && <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">{actions.map((item) => <button key={item.label} onClick={() => setPending(item)} className={`h-9 rounded-lg px-3 text-[11px] font-bold ${item.tone === "danger" ? "border border-rose-200 bg-white text-rose-700" : "border border-violet-200 bg-white text-violet-700"}`}>{item.label}</button>)}<button onClick={onClear} className="h-9 px-2 text-[11px] font-bold text-slate-500">Clear</button></div>}
    </div>
    {pending && <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/55 p-4"><div role="alertdialog" aria-modal="true" aria-labelledby="bulk-action-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Permission: {pending.permission}</p><h3 id="bulk-action-title" className="mt-2 text-lg font-bold">{pending.label} for {selectedCount} records?</h3><p className="mt-2 text-xs leading-5 text-slate-500">This is a simulated bulk operation. Production will re-check every selected record, your role permission and any four-eye approval rule before changing data.</p><textarea autoFocus value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Required audit reason" className="mt-4 min-h-24 w-full rounded-xl border p-3 text-xs outline-none focus:border-violet-400"/><div className="mt-5 flex justify-end gap-2"><button onClick={() => { setPending(null); setReason(""); }} className="h-10 rounded-xl border px-4 text-xs font-bold">Cancel</button><button disabled={!reason.trim()} onClick={() => { onApply(pending.label, reason); setPending(null); setReason(""); }} className={`h-10 rounded-xl px-4 text-xs font-bold text-white disabled:opacity-40 ${pending.tone === "danger" ? "bg-rose-600" : "bg-violet-600"}`}>Confirm mock action</button></div></div></div>}
  </>;
}

function QueueDisplayControls({ compact, onCompact, columns, visibleColumns, onToggleColumn }: { compact: boolean; onCompact: () => void; columns: string[]; visibleColumns: string[]; onToggleColumn: (column: string) => void }) {
  const [open, setOpen] = useState(false);
  return <div className="relative flex items-center gap-2"><button onClick={onCompact} className={`hidden h-10 items-center gap-2 rounded-xl border px-3 text-[11px] font-bold md:flex ${compact ? "border-violet-300 bg-violet-50 text-violet-700" : "bg-white text-slate-600"}`}><SlidersHorizontal size={14}/>{compact ? "Compact rows" : "Comfortable rows"}</button><button onClick={() => setOpen((value) => !value)} className="hidden h-10 items-center gap-2 rounded-xl border bg-white px-3 text-[11px] font-bold text-slate-600 md:flex"><MoreHorizontal size={15}/>Columns</button>{open && <div className="absolute right-0 top-12 z-30 w-56 rounded-xl border bg-white p-3 shadow-xl"><p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Visible columns</p>{columns.map((column) => <label key={column} className="flex h-9 items-center gap-2 rounded-lg px-2 text-xs hover:bg-slate-50"><input type="checkbox" checked={visibleColumns.includes(column)} onChange={() => onToggleColumn(column)} className="h-4 w-4 rounded"/>{column}</label>)}</div>}<span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500 md:hidden">Mobile cards</span></div>;
}

function AdminStatePreview({ state, onRetry }: { state: ReliabilityState; onRetry: () => void }) {
  if (state === "Loading") return <div role="status" aria-live="polite" className="grid gap-3 rounded-2xl border bg-white p-5"><span className="sr-only">Loading admin records</span>{["w-2/3", "w-full", "w-5/6"].map((width) => <div key={width} className={`h-10 animate-pulse rounded-xl bg-slate-100 ${width}`} />)}</div>;
  if (state === "Empty") return <div role="status" className="empty-state rounded-2xl border bg-white p-8 text-center"><FileText className="mx-auto text-slate-300"/><h3 className="mt-3 text-sm font-bold">No records yet</h3><p className="mt-1 text-xs text-slate-500">Explain why the queue is empty and give the administrator one useful next action.</p></div>;
  if (state === "Error") return <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5"><CircleAlert className="text-rose-600"/><h3 className="mt-3 text-sm font-bold text-rose-950">Records could not be loaded</h3><p className="mt-1 text-xs text-rose-800">Existing data remains unchanged. Retry safely or return later.</p><button onClick={onRetry} className="mt-4 flex h-10 items-center gap-2 rounded-xl bg-rose-600 px-4 text-xs font-bold text-white"><RefreshCw size={14}/>Retry</button></div>;
  if (state === "Offline") return <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><Wifi className="text-amber-700"/><h3 className="mt-3 text-sm font-bold text-amber-950">You are offline</h3><p className="mt-1 text-xs text-amber-900">Read-only cached information may remain visible. Changes must wait for a verified connection.</p><button onClick={onRetry} className="mt-4 h-10 rounded-xl border border-amber-300 bg-white px-4 text-xs font-bold text-amber-800">Check connection</button></div>;
  return <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><CheckCircle2 className="text-emerald-600"/><h3 className="mt-3 text-sm font-bold text-emerald-950">Queue is ready</h3><p className="mt-1 text-xs text-emerald-800">Records are current, controls are available and the last refresh time is visible.</p></div>;
}
const adminViews = Object.keys(adminViewSlugs) as AdminView[];

function tone(value: string) {
  if (["Matched", "Ready to match", "Passed"].includes(value)) return "bg-emerald-50 text-emerald-700";
  if (["Exception", "Escalated", "Restricted"].includes(value)) return "bg-rose-50 text-rose-700";
  if (["Review", "Investigating", "Open", "Return window", "Statement pending"].includes(value)) return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function getAdminViewFromUrl(): AdminView {
  if (typeof window === "undefined") return "Dashboard";
  return adminSlugViews[new URL(window.location.href).searchParams.get("section") ?? ""] ?? "Dashboard";
}

const navGroups: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", icon: LayoutDashboard },
      { label: "Users", icon: Users },
      { label: "Wallet & Transactions", icon: WalletCards },
      { label: "Withdrawals", icon: HandCoins, badge: "8" },
      { label: "KYC Verification", icon: ShieldCheck, badge: "12" },
      { label: "Fraud & Risk", icon: Activity },
    ],
  },
  {
    label: "EARNINGS",
    items: [
      { label: "Ad Networks", icon: MonitorPlay },
      { label: "Surveys", icon: FileText },
      { label: "App Install Offers", icon: PackageCheck },
      { label: "Games", icon: Gamepad2 },
    ],
  },
  {
    label: "SHOP & GROW",
    items: [
      { label: "Shop & Earn", icon: ShoppingBag },
      { label: "Stores & Links", icon: Store },
      { label: "Referrals", icon: Gift },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      { label: "Content", icon: FileText },
      { label: "Support Centre", icon: Headphones, badge: "5" },
      { label: "Reports", icon: SlidersHorizontal },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { label: "Settings & Security", icon: Settings },
      { label: "Activity Logs", icon: Activity },
    ],
  },
];

const roleWorkspaces: Record<AdminRole, RoleWorkspace> = {
  "Super Admin": {
    description: "Platform-wide oversight with protected access to every admin module.",
    focus: "Platform health, escalations and cross-team decisions",
    views: adminViews,
    defaultPins: ["Withdrawals", "KYC Verification", "Support Centre"],
    priorities: [
      { label: "3 high-risk accounts need review", detail: "Security and fraud escalation", view: "Fraud & Risk", urgency: "Urgent" },
      { label: "8 withdrawals await approval", detail: "₹74,260 requested", view: "Withdrawals", urgency: "High" },
      { label: "2 reconciliation exceptions remain", detail: "Period close needs attention", view: "Reports", urgency: "High" },
    ],
    permissions: [{ label: "Platform configuration", level: "Guarded action" }, { label: "Financial decisions", level: "Guarded action" }, { label: "Identity decisions", level: "Guarded action" }, { label: "Audit evidence", level: "Full action" }],
  },
  "Finance Admin": {
    description: "Financial operations workspace with sensitive user identity fields minimized.",
    focus: "Wallet integrity, payouts and reconciliation",
    views: ["Dashboard", "Users", "Wallet & Transactions", "Withdrawals", "Fraud & Risk", "Shop & Earn", "Stores & Links", "Reports", "Activity Logs"],
    defaultPins: ["Withdrawals", "Wallet & Transactions", "Reports"],
    priorities: [
      { label: "8 withdrawals await approval", detail: "₹74,260 requested", view: "Withdrawals", urgency: "Urgent" },
      { label: "2 reconciliation exceptions remain", detail: "Provider statements unmatched", view: "Reports", urgency: "High" },
      { label: "1 wallet velocity hold", detail: "Review before payout release", view: "Fraud & Risk", urgency: "High" },
    ],
    permissions: [{ label: "Wallet & payouts", level: "Guarded action" }, { label: "Reconciliation", level: "Full action" }, { label: "User identity", level: "View only" }, { label: "Security settings", level: "Hidden" }],
  },
  "Support Admin": {
    description: "Customer-resolution workspace with restricted financial and security actions.",
    focus: "SLA recovery, customer resolution and escalation",
    views: ["Dashboard", "Users", "Wallet & Transactions", "Withdrawals", "KYC Verification", "Ad Networks", "Surveys", "App Install Offers", "Games", "Shop & Earn", "Referrals", "Support Centre", "Activity Logs"],
    defaultPins: ["Support Centre", "Users", "Wallet & Transactions"],
    priorities: [
      { label: "2 support tickets breached SLA", detail: "Immediate response required", view: "Support Centre", urgency: "Urgent" },
      { label: "5 missing-reward cases are open", detail: "Games, surveys and installs", view: "Support Centre", urgency: "High" },
      { label: "3 KYC guidance requests", detail: "Customer follow-up pending", view: "KYC Verification", urgency: "Medium" },
    ],
    permissions: [{ label: "Support replies", level: "Full action" }, { label: "Reward investigation", level: "Guarded action" }, { label: "Payout approval", level: "Hidden" }, { label: "KYC decision", level: "View only" }],
  },
  "Content Admin": {
    description: "Publishing and campaign workspace without access to financial or identity decisions.",
    focus: "Content quality, offer accuracy and publishing readiness",
    views: ["Dashboard", "Ad Networks", "Surveys", "App Install Offers", "Games", "Shop & Earn", "Stores & Links", "Referrals", "Content", "Support Centre", "Activity Logs"],
    defaultPins: ["Content", "Stores & Links", "Shop & Earn"],
    priorities: [
      { label: "4 content briefs await approval", detail: "Publishing queue", view: "Content", urgency: "High" },
      { label: "1 affiliate redirect warning", detail: "Destination review required", view: "Stores & Links", urgency: "Urgent" },
      { label: "3 campaigns expire within 10 days", detail: "Refresh offer copy", view: "Shop & Earn", urgency: "Medium" },
    ],
    permissions: [{ label: "Content publishing", level: "Guarded action" }, { label: "Campaign copy", level: "Full action" }, { label: "Financial records", level: "Hidden" }, { label: "User identity", level: "Hidden" }],
  },
  "Operations Admin": {
    description: "Offer-delivery and partner-health workspace with escalation-only finance access.",
    focus: "Provider delivery, campaigns and partner operations",
    views: ["Dashboard", "Users", "Fraud & Risk", "Ad Networks", "Surveys", "App Install Offers", "Games", "Shop & Earn", "Stores & Links", "Referrals", "Content", "Support Centre", "Reports", "Activity Logs"],
    defaultPins: ["Ad Networks", "Stores & Links", "Reports"],
    priorities: [
      { label: "Offerwall success rate is 91.8%", detail: "Below operating target", view: "App Install Offers", urgency: "High" },
      { label: "1 tracking link has a redirect mismatch", detail: "Attribution risk", view: "Stores & Links", urgency: "Urgent" },
      { label: "3 referral rules need review", detail: "Fraud controls changed", view: "Referrals", urgency: "Medium" },
    ],
    permissions: [{ label: "Provider configuration", level: "Guarded action" }, { label: "Campaign operations", level: "Full action" }, { label: "Financial approval", level: "Hidden" }, { label: "User support", level: "View only" }],
  },
  "Security Admin": {
    description: "Risk, access and audit workspace with financial amounts redacted by default.",
    focus: "Threat response, access control and evidence integrity",
    views: ["Dashboard", "Users", "Withdrawals", "KYC Verification", "Fraud & Risk", "Support Centre", "Reports", "Settings & Security", "Activity Logs"],
    defaultPins: ["Fraud & Risk", "Settings & Security", "Activity Logs"],
    priorities: [
      { label: "3 high-risk accounts need review", detail: "Device duplication signals", view: "Fraud & Risk", urgency: "Urgent" },
      { label: "1 blocked MFA event", detail: "Unknown Android device", view: "Activity Logs", urgency: "High" },
      { label: "2 privileged sessions near expiry", detail: "Session policy review", view: "Settings & Security", urgency: "Medium" },
    ],
    permissions: [{ label: "Risk restrictions", level: "Guarded action" }, { label: "Admin access policy", level: "Guarded action" }, { label: "Audit evidence", level: "Full action" }, { label: "Payout amounts", level: "View only" }],
  },
};

const searchableRecords: SearchRecord[] = [
  { id: "GLN-10248", type: "User", title: "Aarav Mehta", subtitle: "aarav.mehta@example.com · Hyderabad", status: "Active", priority: "Low", updated: "2 min ago", updatedOrder: 1, view: "Users", details: [["Phone", "+91 98765 43210"], ["KYC", "Verified"], ["Wallet", "₹684.50"], ["Risk", "Low"]] },
  { id: "GLN-10247", type: "User", title: "Priya Reddy", subtitle: "priya.reddy@example.com · Nellore", status: "Review", priority: "Medium", updated: "12 min ago", updatedOrder: 2, view: "Users", details: [["Phone", "+91 91234 56780"], ["KYC", "Pending"], ["Wallet", "₹524.20"], ["Risk", "Low"]] },
  { id: "GLN-10244", type: "User", title: "Vikram Singh", subtitle: "vikram.singh@example.com · Delhi", status: "Suspended", priority: "High", updated: "2 days ago", updatedOrder: 17, view: "Users", details: [["Phone", "+91 93456 78901"], ["KYC", "Pending"], ["Wallet", "₹0.00"], ["Risk", "High"]] },
  { id: "GLN-RW-90284", type: "Transaction", title: "Game milestone reward", subtitle: "Aarav Mehta · +₹120.00", status: "Approved", priority: "Low", updated: "2 min ago", updatedOrder: 1, view: "Wallet & Transactions", details: [["Direction", "Credit"], ["Source", "Puzzle Kingdom"], ["Amount", "₹120.00"], ["Balance after", "₹684.50"]] },
  { id: "GLN-WD-90283", type: "Transaction", title: "UPI withdrawal hold", subtitle: "Priya Reddy · −₹500.00", status: "Pending", priority: "High", updated: "8 min ago", updatedOrder: 2, view: "Wallet & Transactions", details: [["Direction", "Debit hold"], ["Source", "Withdrawal"], ["Amount", "₹500.00"], ["Balance after", "₹24.20"]] },
  { id: "GLN-RW-90280", type: "Transaction", title: "App-install reward", subtitle: "Vikram Singh · +₹45.00", status: "Review", priority: "Medium", updated: "32 min ago", updatedOrder: 5, view: "Wallet & Transactions", details: [["Direction", "Credit"], ["Source", "App install"], ["Amount", "₹45.00"], ["Reason", "Attribution review"]] },
  { id: "WD-2841", type: "Withdrawal", title: "Priya Reddy", subtitle: "₹500 · UPI · priya@upi", status: "Pending", priority: "High", updated: "8 min ago", updatedOrder: 2, view: "Withdrawals", details: [["Amount", "₹500.00"], ["Method", "UPI"], ["Risk", "Low"], ["Requested", "Today, 19:42"]] },
  { id: "WD-2838", type: "Withdrawal", title: "Karthik Rao", subtitle: "₹1,250 · Bank transfer", status: "Review", priority: "High", updated: "1 hour ago", updatedOrder: 8, view: "Withdrawals", details: [["Amount", "₹1,250.00"], ["Method", "Bank"], ["Risk", "Medium"], ["Reason", "Name mismatch"]] },
  { id: "WD-2834", type: "Withdrawal", title: "Ananya Sharma", subtitle: "₹750 · UPI · ananya@okaxis", status: "Paid", priority: "Low", updated: "Yesterday", updatedOrder: 12, view: "Withdrawals", details: [["Amount", "₹750.00"], ["Method", "UPI"], ["Risk", "Low"], ["Provider ref", "PAY-88142"]] },
  { id: "SUP-4812", type: "Support", title: "Missing game milestone reward", subtitle: "Aarav Mehta · In-app chat", status: "Open", priority: "High", updated: "6 min ago", updatedOrder: 2, view: "Support Centre", details: [["Channel", "In-app chat"], ["Category", "Games"], ["SLA", "42 min remaining"], ["Assigned", "AI Support Agent"]] },
  { id: "SUP-4809", type: "Support", title: "Withdrawal pending over 24 hours", subtitle: "Priya Reddy · Email", status: "Escalated", priority: "High", updated: "22 min ago", updatedOrder: 4, view: "Support Centre", details: [["Channel", "Email"], ["Category", "Withdrawal"], ["SLA", "Breached"], ["Assigned", "Finance queue"]] },
  { id: "SUP-4804", type: "Support", title: "How to complete KYC", subtitle: "Sana Khan · Telugu", status: "Resolved", priority: "Low", updated: "3 hours ago", updatedOrder: 10, view: "Support Centre", details: [["Channel", "AI chat"], ["Category", "KYC"], ["Language", "Telugu"], ["Resolution", "Knowledge answer"]] },
  { id: "CMP-GM-204", type: "Campaign", title: "Puzzle Kingdom Level Rush", subtitle: "Games · Android · India", status: "Active", priority: "Medium", updated: "14 min ago", updatedOrder: 3, view: "Games", details: [["Provider", "MockPlay"], ["Reward", "Up to ₹320"], ["Conversions", "4,280"], ["Ends", "31 Aug 2026"]] },
  { id: "CMP-SV-119", type: "Campaign", title: "Quick Opinion India", subtitle: "Survey · All verified users", status: "Active", priority: "Low", updated: "28 min ago", updatedOrder: 5, view: "Surveys", details: [["Provider", "SurveyMock"], ["Reward", "₹18–₹80"], ["Completions", "3,915"], ["Quality", "94.2%"]] },
  { id: "CMP-AD-088", type: "Campaign", title: "Daily Rewarded Video", subtitle: "Watch & Earn · 20 views/day", status: "Active", priority: "Medium", updated: "45 min ago", updatedOrder: 7, view: "Ad Networks", details: [["Provider", "Provider A"], ["User reward", "₹0.80"], ["Daily cap", "20"], ["Delivery", "98.7%"]] },
  { id: "CMP-SH-064", type: "Campaign", title: "Festival Fashion Cashback", subtitle: "Shop & Earn · Multi-store", status: "Scheduled", priority: "Medium", updated: "Yesterday", updatedOrder: 12, view: "Shop & Earn", details: [["Network", "AffiliateMock"], ["Cashback", "Up to 6%"], ["Starts", "15 Aug 2026"], ["Stores", "4"]] },
  { id: "CMP-RF-031", type: "Campaign", title: "Invite & Earn August", subtitle: "Referrals · Verified users", status: "Paused", priority: "High", updated: "2 days ago", updatedOrder: 18, view: "Referrals", details: [["Inviter", "₹25"], ["New user", "₹10"], ["Qualified", "1,284"], ["Reason", "Fraud-rule review"]] },
  { id: "STR-101", type: "Store", title: "Amazon India", subtitle: "AffiliateMock · Electronics and general", status: "Active", priority: "Low", updated: "18 min ago", updatedOrder: 4, view: "Stores & Links", details: [["Tracking", "Healthy"], ["Links", "38 active"], ["Clicks", "12,840"], ["Owner", "Commerce Agent"]] },
  { id: "STR-104", type: "Store", title: "Travel Partner", subtitle: "Direct merchant · Travel", status: "Review", priority: "High", updated: "41 min ago", updatedOrder: 6, view: "Stores & Links", details: [["Tracking", "Redirect warning"], ["Links", "6 active"], ["Clicks", "2,406"], ["Owner", "Affiliate Ops"]] },
  { id: "AUD-8842", type: "Audit Event", title: "Withdrawal hold applied", subtitle: "Finance Agent · WD-2841", status: "Review", priority: "High", updated: "8 min ago", updatedOrder: 2, view: "Activity Logs", details: [["Actor type", "AI agent"], ["Category", "Finance"], ["Session", "SES-AI-204"], ["Integrity", "Verified"]] },
  { id: "AUD-8839", type: "Audit Event", title: "Affiliate link paused", subtitle: "Shaneel Kumarreddy · LNK-441", status: "Passed", priority: "Medium", updated: "32 min ago", updatedOrder: 5, view: "Activity Logs", details: [["Actor type", "Human admin"], ["Category", "Commerce"], ["Reason", "Redirect mismatch"], ["Integrity", "Verified"]] },
];

const metrics = [
  {
    label: "Total users",
    value: "24,892",
    change: "+12.5%",
    note: "vs previous period",
    icon: Users,
    bg: "bg-[#eee9ff]",
    color: "text-[#7046df]",
    positive: true,
  },
  {
    label: "Gross provider revenue",
    value: "₹8,42,680",
    change: "+18.2%",
    note: "mock provider total",
    icon: TrendingUp,
    bg: "bg-[#e5f8f1]",
    color: "text-[#119568]",
    positive: true,
  },
  {
    label: "User rewards approved",
    value: "₹5,06,420",
    change: "+9.8%",
    note: "60.1% of revenue",
    icon: BadgeIndianRupee,
    bg: "bg-[#fff1dc]",
    color: "text-[#d98714]",
    positive: true,
  },
  {
    label: "Pending withdrawals",
    value: "₹74,260",
    change: "-6.4%",
    note: "8 requests need review",
    icon: HandCoins,
    bg: "bg-[#ffe8ec]",
    color: "text-[#df5269]",
    positive: false,
  },
];

const roleMetricSets: Record<AdminRole, typeof metrics> = {
  "Super Admin": metrics,
  "Finance Admin": [
    { label: "Wallet liabilities", value: "₹5,80,680", change: "+4.1%", note: "approved + pending mock", icon: WalletCards, bg: "bg-[#eee9ff]", color: "text-[#7046df]", positive: true },
    { label: "Provider receivables", value: "₹1,48,240", change: "2 exceptions", note: "statement matching", icon: TrendingUp, bg: "bg-[#e5f8f1]", color: "text-[#119568]", positive: true },
    { label: "Pending withdrawals", value: "₹74,260", change: "8 requests", note: "guarded approval queue", icon: HandCoins, bg: "bg-[#fff1dc]", color: "text-[#d98714]", positive: false },
    { label: "Reconciliation breaks", value: "2", change: "−3", note: "since last mock close", icon: CircleAlert, bg: "bg-[#ffe8ec]", color: "text-[#df5269]", positive: true },
  ],
  "Support Admin": [
    { label: "Open tickets", value: "5", change: "2 breached", note: "response target", icon: Headphones, bg: "bg-[#eee9ff]", color: "text-[#7046df]", positive: false },
    { label: "Resolved today", value: "84", change: "+11.2%", note: "mock resolutions", icon: CheckCircle2, bg: "bg-[#e5f8f1]", color: "text-[#119568]", positive: true },
    { label: "AI draft acceptance", value: "91%", change: "+2.4%", note: "human-reviewed drafts", icon: Bot, bg: "bg-[#fff1dc]", color: "text-[#d98714]", positive: true },
    { label: "Escalations", value: "7", change: "3 financial", note: "protected queues", icon: ShieldAlert, bg: "bg-[#ffe8ec]", color: "text-[#df5269]", positive: false },
  ],
  "Content Admin": [
    { label: "Draft briefs", value: "12", change: "4 due", note: "publishing queue", icon: FileText, bg: "bg-[#eee9ff]", color: "text-[#7046df]", positive: false },
    { label: "Published today", value: "18", change: "+6", note: "mock content items", icon: CheckCircle2, bg: "bg-[#e5f8f1]", color: "text-[#119568]", positive: true },
    { label: "Offer accuracy", value: "97.4%", change: "+1.2%", note: "QA sample", icon: ShieldCheck, bg: "bg-[#fff1dc]", color: "text-[#d98714]", positive: true },
    { label: "Link warnings", value: "1", change: "Urgent", note: "redirect mismatch", icon: Link2, bg: "bg-[#ffe8ec]", color: "text-[#df5269]", positive: false },
  ],
  "Operations Admin": [
    { label: "Active providers", value: "8", change: "7 healthy", note: "mock integrations", icon: Store, bg: "bg-[#eee9ff]", color: "text-[#7046df]", positive: true },
    { label: "Delivery success", value: "95.3%", change: "+0.8%", note: "weighted average", icon: TrendingUp, bg: "bg-[#e5f8f1]", color: "text-[#119568]", positive: true },
    { label: "Active campaigns", value: "24", change: "3 expiring", note: "within 10 days", icon: Gift, bg: "bg-[#fff1dc]", color: "text-[#d98714]", positive: false },
    { label: "Provider incidents", value: "2", change: "1 urgent", note: "tracking and delivery", icon: CircleAlert, bg: "bg-[#ffe8ec]", color: "text-[#df5269]", positive: false },
  ],
  "Security Admin": [
    { label: "High-risk signals", value: "3", change: "Needs review", note: "device and velocity", icon: ShieldAlert, bg: "bg-[#ffe8ec]", color: "text-[#df5269]", positive: false },
    { label: "Protected actions", value: "42", change: "100% logged", note: "today", icon: ShieldCheck, bg: "bg-[#e5f8f1]", color: "text-[#119568]", positive: true },
    { label: "Privileged sessions", value: "6", change: "2 expiring", note: "mock sessions", icon: LockKeyhole, bg: "bg-[#eee9ff]", color: "text-[#7046df]", positive: false },
    { label: "Integrity breaks", value: "0", change: "Verified", note: "audit chain", icon: Activity, bg: "bg-[#fff1dc]", color: "text-[#d98714]", positive: true },
  ],
};

const transactions = [
  {
    id: "GLN-RW-90284",
    user: "Aarav Mehta",
    type: "Game milestone",
    amount: "+₹120.00",
    status: "Approved",
    time: "2 min ago",
    color: "bg-violet-100 text-violet-700",
  },
  {
    id: "GLN-WD-90283",
    user: "Priya Reddy",
    type: "UPI withdrawal",
    amount: "-₹500.00",
    status: "Pending",
    time: "8 min ago",
    color: "bg-amber-100 text-amber-700",
  },
  {
    id: "GLN-RW-90282",
    user: "Karthik Rao",
    type: "Survey reward",
    amount: "+₹32.00",
    status: "Approved",
    time: "14 min ago",
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    id: "GLN-RW-90281",
    user: "Sana Khan",
    type: "Shop cashback",
    amount: "+₹184.50",
    status: "Tracking",
    time: "21 min ago",
    color: "bg-blue-100 text-blue-700",
  },
  {
    id: "GLN-RW-90280",
    user: "Vikram Singh",
    type: "App install",
    amount: "+₹45.00",
    status: "Review",
    time: "32 min ago",
    color: "bg-rose-100 text-rose-700",
  },
];

const chartSets = {
  "7 days": [42, 55, 48, 66, 61, 78, 86],
  "30 days": [38, 44, 49, 43, 58, 63, 59, 71, 68, 76, 82, 88],
  "90 days": [31, 36, 42, 39, 48, 51, 57, 55, 64, 68, 73, 79],
};

type AdminUser = {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  joined: string;
  status: "Active" | "Review" | "Suspended";
  kyc: "Verified" | "Pending" | "Not started";
  balance: number;
  earned: number;
  tasks: number;
  risk: "Low" | "Medium" | "High";
  initials: string;
  color: string;
  lastSeen: string;
  device: string;
};

const usersData: AdminUser[] = [
  {
    id: "GLN-10248",
    name: "Aarav Mehta",
    phone: "+91 98765 43210",
    email: "aarav.mehta@example.com",
    city: "Hyderabad",
    joined: "02 Aug 2026",
    status: "Active",
    kyc: "Verified",
    balance: 684.5,
    earned: 2480.8,
    tasks: 186,
    risk: "Low",
    initials: "AM",
    color: "bg-violet-100 text-violet-700",
    lastSeen: "2 minutes ago",
    device: "Samsung Galaxy A55",
  },
  {
    id: "GLN-10247",
    name: "Priya Reddy",
    phone: "+91 91234 56780",
    email: "priya.reddy@example.com",
    city: "Nellore",
    joined: "01 Aug 2026",
    status: "Active",
    kyc: "Pending",
    balance: 524.2,
    earned: 1894.0,
    tasks: 142,
    risk: "Low",
    initials: "PR",
    color: "bg-rose-100 text-rose-700",
    lastSeen: "12 minutes ago",
    device: "OnePlus Nord 4",
  },
  {
    id: "GLN-10246",
    name: "Karthik Rao",
    phone: "+91 99887 66554",
    email: "karthik.rao@example.com",
    city: "Bengaluru",
    joined: "31 Jul 2026",
    status: "Review",
    kyc: "Verified",
    balance: 142.0,
    earned: 3226.4,
    tasks: 215,
    risk: "Medium",
    initials: "KR",
    color: "bg-amber-100 text-amber-700",
    lastSeen: "36 minutes ago",
    device: "Redmi Note 13 Pro",
  },
  {
    id: "GLN-10245",
    name: "Sana Khan",
    phone: "+91 90123 45678",
    email: "sana.khan@example.com",
    city: "Chennai",
    joined: "30 Jul 2026",
    status: "Active",
    kyc: "Not started",
    balance: 88.5,
    earned: 742.6,
    tasks: 64,
    risk: "Low",
    initials: "SK",
    color: "bg-blue-100 text-blue-700",
    lastSeen: "1 hour ago",
    device: "iPhone 15",
  },
  {
    id: "GLN-10244",
    name: "Vikram Singh",
    phone: "+91 93456 78901",
    email: "vikram.singh@example.com",
    city: "Delhi",
    joined: "29 Jul 2026",
    status: "Suspended",
    kyc: "Pending",
    balance: 0,
    earned: 986.2,
    tasks: 91,
    risk: "High",
    initials: "VS",
    color: "bg-slate-200 text-slate-700",
    lastSeen: "2 days ago",
    device: "Realme 12 Pro",
  },
  {
    id: "GLN-10243",
    name: "Ananya Sharma",
    phone: "+91 95678 12340",
    email: "ananya.sharma@example.com",
    city: "Pune",
    joined: "28 Jul 2026",
    status: "Active",
    kyc: "Verified",
    balance: 1048.75,
    earned: 4162.3,
    tasks: 294,
    risk: "Low",
    initials: "AS",
    color: "bg-emerald-100 text-emerald-700",
    lastSeen: "3 hours ago",
    device: "Google Pixel 8a",
  },
  {
    id: "GLN-10242",
    name: "Rahul Verma",
    phone: "+91 97890 12345",
    email: "rahul.verma@example.com",
    city: "Kolkata",
    joined: "27 Jul 2026",
    status: "Review",
    kyc: "Not started",
    balance: 214.4,
    earned: 1265.9,
    tasks: 105,
    risk: "Medium",
    initials: "RV",
    color: "bg-orange-100 text-orange-700",
    lastSeen: "5 hours ago",
    device: "Vivo V30",
  },
];

function UsersManagement({ action }: { action: (message: string) => void }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [kyc, setKyc] = useState("All KYC");
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [tab, setTab] = useState("Overview");
  const [confirm, setConfirm] = useState<"suspend" | "restore" | null>(null);
  const filtered = useMemo(
    () =>
      usersData.filter((u) => {
        const match = !query || `${u.name} ${u.phone} ${u.email} ${u.id}`.toLowerCase().includes(query.toLowerCase());
        return match && (status === "All statuses" || u.status === status) && (kyc === "All KYC" || u.kyc === kyc);
      }),
    [query, status, kyc],
  );
  const statusTone = (value: string) => (value === "Active" ? "bg-emerald-50 text-emerald-700" : value === "Suspended" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700");
  const kycTone = (value: string) => (value === "Verified" ? "bg-emerald-50 text-emerald-700" : value === "Pending" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600");
  return (
    <>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 text-xs text-slate-400">
            Home <span className="px-2">›</span> Users
          </div>
          <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">Users Management</h1>
          <p className="mt-1 text-sm text-slate-500">Review accounts, earnings, devices and safety signals.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => action("Mock user report exported")} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600">
            <Download size={15} />
            Export users
          </button>
          <span className="flex h-10 items-center rounded-xl bg-violet-50 px-3 text-xs font-semibold text-violet-700">Step 3 · Mock data</span>
        </div>
      </div>
      <section className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total users", "24,892", "+12.5%", Users, "bg-violet-50 text-violet-600"],
          ["Active today", "8,416", "33.8% of users", UserCheck, "bg-emerald-50 text-emerald-600"],
          ["Under review", "42", "8 added today", ShieldAlert, "bg-amber-50 text-amber-600"],
          ["Suspended", "186", "0.7% of users", UserX, "bg-rose-50 text-rose-600"],
        ].map(([label, value, note, Icon, tone]) => (
          <article key={label as string} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${tone}`}>
              <Icon size={21} />
            </span>
            <div>
              <p className="text-xs text-slate-500">{label as string}</p>
              <p className="text-xl font-bold">{value as string}</p>
              <p className="text-[10px] text-slate-400">{note as string}</p>
            </div>
          </article>
        ))}
      </section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-center">
          <label className="flex h-11 flex-1 items-center gap-3 rounded-xl border border-slate-200 px-4">
            <Search size={17} className="text-slate-400" />
            <span className="sr-only">Search users</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, phone, email or User ID" className="w-full bg-transparent text-xs outline-none" />
          </label>
          <div className="flex flex-wrap gap-2">
            <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs text-slate-600">
              <Filter size={15} />
              <select aria-label="Filter account status" value={status} onChange={(e) => setStatus(e.target.value)} className="bg-white outline-none">
                <option>All statuses</option>
                <option>Active</option>
                <option>Review</option>
                <option>Suspended</option>
              </select>
            </label>
            <label className="flex h-11 items-center rounded-xl border border-slate-200 px-3 text-xs text-slate-600">
              <select aria-label="Filter KYC status" value={kyc} onChange={(e) => setKyc(e.target.value)} className="bg-white outline-none">
                <option>All KYC</option>
                <option>Verified</option>
                <option>Pending</option>
                <option>Not started</option>
              </select>
            </label>
            <button
              onClick={() => {
                setQuery("");
                setStatus("All statuses");
                setKyc("All KYC");
              }}
              className="h-11 rounded-xl px-3 text-xs font-semibold text-violet-600"
            >
              Reset
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-[#fafafd] text-[10px] uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Account</th>
                <th className="px-4 py-3 font-semibold">KYC</th>
                <th className="px-4 py-3 font-semibold">Wallet</th>
                <th className="px-4 py-3 font-semibold">Lifetime earned</th>
                <th className="px-4 py-3 font-semibold">Risk</th>
                <th className="px-5 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-slate-50 text-xs hover:bg-violet-50/30">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className={`grid h-10 w-10 place-items-center rounded-full font-bold ${u.color}`}>{u.initials}</span>
                      <div>
                        <button
                          onClick={() => {
                            setSelected(u);
                            setTab("Overview");
                          }}
                          className="font-bold hover:text-violet-700"
                        >
                          {u.name}
                        </button>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          {u.id} · {u.phone}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusTone(u.status)}`}>{u.status}</span>
                    <p className="mt-2 text-[10px] text-slate-400">Joined {u.joined}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${kycTone(u.kyc)}`}>{u.kyc}</span>
                  </td>
                  <td className="px-4 py-4 font-bold">₹{u.balance.toFixed(2)}</td>
                  <td className="px-4 py-4">
                    <b>₹{u.earned.toFixed(2)}</b>
                    <p className="mt-1 text-[10px] text-slate-400">{u.tasks} tasks</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${u.risk === "High" ? "bg-rose-50 text-rose-700" : u.risk === "Medium" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                      <i className="h-1.5 w-1.5 rounded-full bg-current" />
                      {u.risk}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      aria-label={`View ${u.name}`}
                      onClick={() => {
                        setSelected(u);
                        setTab("Overview");
                      }}
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 font-semibold text-violet-600 hover:border-violet-300"
                    >
                      <Eye size={14} />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-12 text-center">
              <UserRound size={32} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-semibold">No users found</p>
              <p className="mt-1 text-xs text-slate-400">Try changing the search or filters.</p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
          <span>Showing {filtered.length} of 24,892 mock users</span>
          <div className="flex items-center gap-1">
            <button aria-label="Previous page" className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-400">
              <ChevronLeft size={16} />
            </button>
            <button className="grid h-9 w-9 place-items-center rounded-lg bg-violet-600 font-bold text-white">1</button>
            <button className="grid h-9 w-9 place-items-center rounded-lg text-slate-500">2</button>
            <button className="grid h-9 w-9 place-items-center rounded-lg text-slate-500">3</button>
            <button aria-label="Next page" className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>
      {selected && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <button aria-label="Close user details" onClick={() => setSelected(null)} className="absolute inset-0 bg-slate-950/40" />
          <aside role="dialog" aria-modal="true" aria-label={`${selected.name} user details`} className="admin-scroll relative h-full w-full max-w-[620px] overflow-y-auto bg-[#f7f8fc] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <p className="text-xs text-slate-400">User profile</p>
                <h2 className="font-bold">{selected.id}</h2>
              </div>
              <button aria-label="Close user profile" onClick={() => setSelected(null)} className="ml-auto grid h-10 w-10 place-items-center rounded-xl hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>
            <div className="p-5">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-lg font-bold ${selected.color}`}>{selected.initials}</span>
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold">{selected.name}</h3>
                    <p className="text-xs text-slate-400">Member since {selected.joined}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusTone(selected.status)}`}>{selected.status}</span>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${kycTone(selected.kyc)}`}>KYC {selected.kyc}</span>
                    </div>
                  </div>
                  <button aria-label="Copy user ID" onClick={() => action("User ID copied (mock)")} className="ml-auto grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500">
                    <Copy size={15} />
                  </button>
                </div>
                <div className="mt-5 grid gap-3 text-xs sm:grid-cols-2">
                  <p className="flex items-center gap-2 text-slate-600">
                    <Phone size={15} className="text-slate-400" />
                    {selected.phone}
                  </p>
                  <p className="flex items-center gap-2 truncate text-slate-600">
                    <Mail size={15} className="shrink-0 text-slate-400" />
                    {selected.email}
                  </p>
                  <p className="flex items-center gap-2 text-slate-600">
                    <MapPin size={15} className="text-slate-400" />
                    {selected.city}, India
                  </p>
                  <p className="flex items-center gap-2 text-slate-600">
                    <Clock3 size={15} className="text-slate-400" />
                    Seen {selected.lastSeen}
                  </p>
                </div>
              </section>
              <div className="my-4 flex overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
                {["Overview", "Earnings", "Devices", "Warnings"].map((x) => (
                  <button key={x} onClick={() => setTab(x)} className={`min-w-fit flex-1 rounded-lg px-3 py-2.5 text-xs font-semibold ${tab === x ? "bg-violet-600 text-white" : "text-slate-500"}`}>
                    {x}
                  </button>
                ))}
              </div>
              {tab === "Overview" && (
                <div className="space-y-4">
                  <section className="grid grid-cols-3 gap-3">
                    {[
                      ["Wallet", `₹${selected.balance.toFixed(2)}`],
                      ["Lifetime", `₹${selected.earned.toFixed(2)}`],
                      ["Tasks", String(selected.tasks)],
                    ].map((x) => (
                      <div key={x[0]} className="rounded-xl border border-slate-200 bg-white p-4 text-center">
                        <p className="text-[10px] text-slate-400">{x[0]}</p>
                        <p className="mt-1 text-sm font-bold">{x[1]}</p>
                      </div>
                    ))}
                  </section>
                  <section className="rounded-2xl border border-slate-200 bg-white p-5">
                    <h4 className="text-sm font-bold">Account health</h4>
                    <div className="mt-4 space-y-4">
                      {[
                        ["Mobile verified", 100, "bg-emerald-500"],
                        ["KYC completion", selected.kyc === "Verified" ? 100 : selected.kyc === "Pending" ? 70 : 20, "bg-violet-500"],
                        ["Profile completeness", 86, "bg-blue-500"],
                      ].map(([x, v, c]) => (
                        <div key={x as string}>
                          <div className="mb-2 flex text-xs">
                            <span>{x as string}</span>
                            <b className="ml-auto">{v as number}%</b>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100">
                            <div className={`h-full rounded-full ${c}`} style={{ width: `${v}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              )}
              {tab === "Earnings" && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold">Recent earnings</h4>
                    <span className="text-[10px] text-slate-400">MOCK LEDGER</span>
                  </div>
                  <div className="mt-3 divide-y divide-slate-100">
                    {[
                      ["Game milestone", "+₹120.00", "Today"],
                      ["Survey reward", "+₹32.00", "Yesterday"],
                      ["Watch & Earn", "+₹12.80", "Yesterday"],
                      ["Shop cashback", "+₹184.50", "03 Aug"],
                    ].map((x) => (
                      <div key={x[0]} className="flex items-center py-3 text-xs">
                        <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                          <BadgeIndianRupee size={16} />
                        </span>
                        <div className="ml-3">
                          <b>{x[0]}</b>
                          <p className="text-[10px] text-slate-400">{x[2]}</p>
                        </div>
                        <b className="ml-auto text-emerald-600">{x[1]}</b>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {tab === "Devices" && (
                <div className="space-y-4">
                  <section className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-start gap-3">
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-violet-50 text-violet-600">
                        <Smartphone size={20} />
                      </span>
                      <div>
                        <h4 className="text-sm font-bold">{selected.device}</h4>
                        <p className="mt-1 text-[11px] text-slate-400">Android 15 · Glonni app 0.1</p>
                        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-600">
                          <Wifi size={13} />
                          Current trusted device
                        </p>
                      </div>
                    </div>
                  </section>
                  <section className="rounded-2xl border border-slate-200 bg-white p-5 text-xs">
                    <h4 className="font-bold">Device and session checks</h4>
                    <div className="mt-4 space-y-3 text-slate-500">
                      <p className="flex justify-between">
                        <span>Device fingerprint</span>
                        <b className="text-slate-700">Unique</b>
                      </p>
                      <p className="flex justify-between">
                        <span>Last IP region</span>
                        <b className="text-slate-700">{selected.city}</b>
                      </p>
                      <p className="flex justify-between">
                        <span>Linked accounts</span>
                        <b className={selected.risk === "High" ? "text-rose-600" : "text-emerald-600"}>{selected.risk === "High" ? "3 detected" : "None"}</b>
                      </p>
                    </div>
                  </section>
                </div>
              )}
              {tab === "Warnings" && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold">Warnings and admin notes</h4>
                    <button onClick={() => action("Add-note editor opened (mock)")} className="text-xs font-semibold text-violet-600">
                      + Add note
                    </button>
                  </div>
                  {selected.risk === "Low" ? (
                    <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-xs text-emerald-800">
                      <CheckCircle2 size={18} className="mb-2" />
                      No warnings or risk events found for this mock account.
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                          <ShieldAlert size={17} />
                          Repeated device signal
                        </div>
                        <p className="mt-2 text-[11px] leading-5 text-amber-700">Account activity matched another device fingerprint. Reward verification is on hold.</p>
                        <p className="mt-2 text-[10px] text-amber-600">Created 07 Aug 2026 · Open</p>
                      </div>
                    </div>
                  )}
                </section>
              )}
              <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
                <h4 className="text-sm font-bold">Account actions</h4>
                <p className="mt-1 text-[11px] text-slate-400">All actions are simulated and will require permissions and audit logging in production.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => action("Message composer opened (mock)")} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold">
                    <Mail size={15} />
                    Contact user
                  </button>
                  <button onClick={() => action("Password reset link simulated")} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold">
                    <RotateCcw size={15} />
                    Reset access
                  </button>
                  {selected.status === "Suspended" ? (
                    <button onClick={() => setConfirm("restore")} className="flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-3 text-xs font-semibold text-white">
                      <UserCheck size={15} />
                      Restore account
                    </button>
                  ) : (
                    <button onClick={() => setConfirm("suspend")} className="flex h-10 items-center gap-2 rounded-xl bg-rose-600 px-3 text-xs font-semibold text-white">
                      <Ban size={15} />
                      Suspend account
                    </button>
                  )}
                </div>
              </section>
            </div>
          </aside>
        </div>
      )}
      {confirm && selected && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/50 p-4">
          <div role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <span className={`grid h-12 w-12 place-items-center rounded-2xl ${confirm === "suspend" ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>{confirm === "suspend" ? <Ban size={22} /> : <UserCheck size={22} />}</span>
            <h3 className="mt-4 text-lg font-bold">
              {confirm === "suspend" ? "Suspend" : "Restore"} {selected.name}?
            </h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">This mock confirmation previews the protected admin workflow. No real account or reward data will change.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setConfirm(null)} className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-semibold">
                Cancel
              </button>
              <button
                onClick={() => {
                  action(`Account ${confirm === "suspend" ? "suspended" : "restored"} in mock preview`);
                  setConfirm(null);
                }}
                className={`h-10 rounded-xl px-4 text-xs font-semibold text-white ${confirm === "suspend" ? "bg-rose-600" : "bg-emerald-600"}`}
              >
                Confirm mock action
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

type LedgerEntry = {
  id: string;
  user: string;
  userId: string;
  source: string;
  direction: "Credit" | "Debit";
  amount: number;
  status: "Completed" | "Pending" | "Reversed" | "Review";
  date: string;
  balance: string;
  note: string;
};
const ledgerEntries: LedgerEntry[] = [
  {
    id: "GLN-TXN-93018",
    user: "Aarav Mehta",
    userId: "GLN-10248",
    source: "Game milestone",
    direction: "Credit",
    amount: 120,
    status: "Completed",
    date: "08 Aug 2026 · 09:42 PM",
    balance: "₹684.50",
    note: "Puzzle Kingdom level 10 reward",
  },
  {
    id: "GLN-TXN-93017",
    user: "Priya Reddy",
    userId: "GLN-10247",
    source: "UPI withdrawal",
    direction: "Debit",
    amount: 500,
    status: "Pending",
    date: "08 Aug 2026 · 09:36 PM",
    balance: "₹524.20",
    note: "Withdrawal request GLN-WD-90283",
  },
  {
    id: "GLN-TXN-93016",
    user: "Karthik Rao",
    userId: "GLN-10246",
    source: "Survey reward",
    direction: "Credit",
    amount: 32,
    status: "Completed",
    date: "08 Aug 2026 · 09:30 PM",
    balance: "₹142.00",
    note: "Quick Opinion India completion",
  },
  {
    id: "GLN-TXN-93015",
    user: "Sana Khan",
    userId: "GLN-10245",
    source: "Shop cashback",
    direction: "Credit",
    amount: 184.5,
    status: "Pending",
    date: "08 Aug 2026 · 09:23 PM",
    balance: "₹88.50",
    note: "Affiliate order awaiting validation",
  },
  {
    id: "GLN-TXN-93014",
    user: "Vikram Singh",
    userId: "GLN-10244",
    source: "App install",
    direction: "Credit",
    amount: 45,
    status: "Review",
    date: "08 Aug 2026 · 09:12 PM",
    balance: "₹0.00",
    note: "Device signal requires manual review",
  },
  {
    id: "GLN-TXN-93013",
    user: "Ananya Sharma",
    userId: "GLN-10243",
    source: "Manual correction",
    direction: "Credit",
    amount: 80,
    status: "Completed",
    date: "08 Aug 2026 · 08:58 PM",
    balance: "₹1,048.75",
    note: "Missing reward approved by SK",
  },
  {
    id: "GLN-TXN-93012",
    user: "Rahul Verma",
    userId: "GLN-10242",
    source: "Reward reversal",
    direction: "Debit",
    amount: 65,
    status: "Reversed",
    date: "08 Aug 2026 · 08:41 PM",
    balance: "₹214.40",
    note: "Duplicate offer completion reversed",
  },
];

function WalletTransactions({ action }: { action: (message: string) => void }) {
  const [query, setQuery] = useState("");
  const [direction, setDirection] = useState("All types");
  const [status, setStatus] = useState("All statuses");
  const [selected, setSelected] = useState<LedgerEntry | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustType, setAdjustType] = useState<"Credit" | "Debit">("Credit");
  const [adjustUser, setAdjustUser] = useState("");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const filtered = useMemo(() => ledgerEntries.filter((t) => (!query || `${t.id} ${t.user} ${t.userId} ${t.source}`.toLowerCase().includes(query.toLowerCase())) && (direction === "All types" || t.direction === direction) && (status === "All statuses" || t.status === status)), [query, direction, status]);
  const tone = (s: string) => (s === "Completed" ? "bg-emerald-50 text-emerald-700" : s === "Pending" ? "bg-amber-50 text-amber-700" : s === "Review" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600");
  const submitAdjustment = () => {
    if (!adjustUser || !adjustAmount || !adjustReason) {
      action("Complete all adjustment fields");
      return;
    }
    if (!confirming) {
      setConfirming(true);
      return;
    }
    action(`Mock ${adjustType.toLowerCase()} adjustment recorded with audit reference`);
    setAdjustOpen(false);
    setConfirming(false);
    setAdjustUser("");
    setAdjustAmount("");
    setAdjustReason("");
  };
  return (
    <>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 text-xs text-slate-400">
            Home <span className="px-2">›</span> Wallet & Transactions
          </div>
          <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">Wallet & Transactions</h1>
          <p className="mt-1 text-sm text-slate-500">Monitor every wallet movement and maintain a traceable mock ledger.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => action("Mock ledger exported as CSV")} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600">
            <Download size={15} />
            Export ledger
          </button>
          <button onClick={() => setAdjustOpen(true)} className="flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-semibold text-white">
            <BadgeIndianRupee size={15} />
            Manual adjustment
          </button>
          <span className="flex h-10 items-center rounded-xl bg-violet-50 px-3 text-xs font-semibold text-violet-700">Step 4 · Mock data</span>
        </div>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {[
          ["Total wallet liability", "₹31,84,260", "Across active user balances", WalletCards, "bg-violet-50 text-violet-600"],
          ["Credits this month", "₹5,06,420", "48,216 ledger entries", ArrowUpRight, "bg-emerald-50 text-emerald-600"],
          ["Debits this month", "₹2,74,860", "Withdrawals and reversals", ArrowDownRight, "bg-rose-50 text-rose-600"],
          ["Pending entries", "₹89,445", "132 require settlement", Clock3, "bg-amber-50 text-amber-600"],
        ].map(([label, value, note, Icon, toneClass]) => (
          <article key={label as string} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${toneClass}`}>
              <Icon size={21} />
            </span>
            <div>
              <p className="text-xs text-slate-500">{label as string}</p>
              <p className="text-xl font-bold">{value as string}</p>
              <p className="text-[10px] text-slate-400">{note as string}</p>
            </div>
          </article>
        ))}
      </section>
      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-center">
          <label className="flex h-11 flex-1 items-center gap-3 rounded-xl border border-slate-200 px-4">
            <Search size={17} className="text-slate-400" />
            <span className="sr-only">Search ledger</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search transaction, user, source or reference" className="w-full bg-transparent text-xs outline-none" />
          </label>
          <div className="flex flex-wrap gap-2">
            <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs">
              <Filter size={15} />
              <select aria-label="Transaction type" value={direction} onChange={(e) => setDirection(e.target.value)} className="bg-white outline-none">
                <option>All types</option>
                <option>Credit</option>
                <option>Debit</option>
              </select>
            </label>
            <label className="flex h-11 items-center rounded-xl border border-slate-200 px-3 text-xs">
              <select aria-label="Transaction status" value={status} onChange={(e) => setStatus(e.target.value)} className="bg-white outline-none">
                <option>All statuses</option>
                <option>Completed</option>
                <option>Pending</option>
                <option>Review</option>
                <option>Reversed</option>
              </select>
            </label>
            <button
              onClick={() => {
                setQuery("");
                setDirection("All types");
                setStatus("All statuses");
              }}
              className="h-11 px-3 text-xs font-semibold text-violet-600"
            >
              Reset
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-[#fafafd] text-[10px] uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3">Reference</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Balance after</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-slate-50 text-xs hover:bg-violet-50/30">
                  <td className="px-5 py-4 font-mono text-[11px] font-semibold text-violet-600">
                    {t.id}
                    <p className="mt-1 font-sans text-[9px] font-normal text-slate-400">{t.date}</p>
                  </td>
                  <td className="px-4 py-4 font-semibold">
                    {t.user}
                    <p className="mt-1 text-[10px] font-normal text-slate-400">{t.userId}</p>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{t.source}</td>
                  <td className={`px-4 py-4 font-semibold ${t.direction === "Credit" ? "text-emerald-600" : "text-rose-600"}`}>{t.direction}</td>
                  <td className={`px-4 py-4 font-bold ${t.direction === "Credit" ? "text-emerald-600" : "text-rose-600"}`}>
                    {t.direction === "Credit" ? "+" : "−"}₹{t.amount.toFixed(2)}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${tone(t.status)}`}>{t.status}</span>
                  </td>
                  <td className="px-4 py-4 font-semibold">{t.balance}</td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => setSelected(t)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 font-semibold text-violet-600">
                      <Eye size={14} />
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && (
            <div className="p-12 text-center">
              <WalletCards size={32} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-semibold">No ledger entries found</p>
              <p className="mt-1 text-xs text-slate-400">Try changing the search or filters.</p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
          <span>Showing {filtered.length} of 48,216 mock entries</span>
          <div className="flex gap-1">
            <button className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-400">
              <ChevronLeft size={16} />
            </button>
            <button className="grid h-9 w-9 place-items-center rounded-lg bg-violet-600 font-bold text-white">1</button>
            <button className="grid h-9 w-9 place-items-center rounded-lg">2</button>
            <button className="grid h-9 w-9 place-items-center rounded-lg">3</button>
            <button className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold">Ledger controls</h2>
          <p className="mt-1 text-xs text-slate-500">Rules that protect wallet integrity after backend integration.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              ["Double-entry ledger", "Every credit has an immutable reference", ShieldCheck],
              ["Idempotency guard", "Duplicate provider callbacks are rejected", RefreshCw],
              ["Balance validation", "Debits cannot exceed available balance", WalletCards],
              ["Admin accountability", "Adjustments record actor, time and reason", Activity],
            ].map(([a, b, Icon]) => (
              <div key={a as string} className="flex gap-3 rounded-xl bg-slate-50 p-3">
                <Icon size={18} className="shrink-0 text-violet-600" />
                <div>
                  <p className="text-xs font-bold">{a as string}</p>
                  <p className="mt-1 text-[10px] leading-4 text-slate-500">{b as string}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold">Recent admin audit</h2>
              <p className="mt-1 text-xs text-slate-500">Mock wallet-related administrative actions.</p>
            </div>
            <Activity size={19} className="text-violet-500" />
          </div>
          <div className="mt-4 space-y-4">
            {[
              ["Manual credit approved", "₹80.00 · Ananya Sharma", "SK · 18 min ago"],
              ["Reward reversal reviewed", "₹65.00 · Rahul Verma", "SK · 1 hr ago"],
              ["Ledger CSV exported", "01–08 Aug 2026", "SK · 3 hrs ago"],
            ].map((x) => (
              <div key={x[0]} className="flex gap-3 border-b border-slate-100 pb-3 last:border-0">
                <span className="mt-1 h-2 w-2 rounded-full bg-violet-500" />
                <div>
                  <p className="text-xs font-bold">{x[0]}</p>
                  <p className="text-[10px] text-slate-500">{x[1]}</p>
                </div>
                <span className="ml-auto text-[9px] text-slate-400">{x[2]}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
      {selected && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <button aria-label="Close transaction details" onClick={() => setSelected(null)} className="absolute inset-0 bg-slate-950/40" />
          <aside role="dialog" aria-modal="true" className="relative h-full w-full max-w-[520px] overflow-y-auto bg-[#f7f8fc] shadow-2xl">
            <div className="sticky top-0 flex items-center border-b bg-white p-5">
              <div>
                <p className="text-xs text-slate-400">Transaction details</p>
                <h2 className="font-mono text-sm font-bold text-violet-600">{selected.id}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="ml-auto grid h-10 w-10 place-items-center rounded-xl">
                <X size={20} />
              </button>
            </div>
            <div className="p-5">
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone(selected.status)}`}>{selected.status}</span>
                  <p className={`text-2xl font-bold ${selected.direction === "Credit" ? "text-emerald-600" : "text-rose-600"}`}>
                    {selected.direction === "Credit" ? "+" : "−"}₹{selected.amount.toFixed(2)}
                  </p>
                </div>
                <dl className="mt-6 space-y-4 text-xs">
                  {[
                    ["User", `${selected.user} · ${selected.userId}`],
                    ["Source", selected.source],
                    ["Direction", selected.direction],
                    ["Date and time", selected.date],
                    ["Balance after", selected.balance],
                    ["Internal note", selected.note],
                  ].map((x) => (
                    <div key={x[0]} className="flex justify-between gap-6 border-b border-slate-100 pb-3">
                      <dt className="text-slate-400">{x[0]}</dt>
                      <dd className="text-right font-semibold">{x[1]}</dd>
                    </div>
                  ))}
                </dl>
                <button onClick={() => action("Transaction reference copied (mock)")} className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 text-xs font-semibold text-violet-600">
                  <Copy size={14} />
                  Copy audit reference
                </button>
              </div>
              <div className="mt-4 rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-800">
                <CircleAlert size={17} className="mb-2" />
                Ledger entries are immutable. Corrections create a separate adjustment entry instead of editing history.
              </div>
            </div>
          </aside>
        </div>
      )}
      {adjustOpen && (
        <div className="fixed inset-0 z-[75] grid place-items-center bg-slate-950/50 p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center">
              <div>
                <p className="text-xs text-slate-400">Guarded admin action</p>
                <h2 className="text-lg font-bold">Manual wallet adjustment</h2>
              </div>
              <button
                onClick={() => {
                  setAdjustOpen(false);
                  setConfirming(false);
                }}
                className="ml-auto grid h-10 w-10 place-items-center rounded-xl"
              >
                <X size={20} />
              </button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
              {(["Credit", "Debit"] as const).map((x) => (
                <button
                  key={x}
                  onClick={() => {
                    setAdjustType(x);
                    setConfirming(false);
                  }}
                  className={`h-10 rounded-lg text-xs font-semibold ${adjustType === x ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"}`}
                >
                  {x}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-3">
              <label className="block text-xs font-semibold">
                User ID or mobile
                <input
                  value={adjustUser}
                  onChange={(e) => {
                    setAdjustUser(e.target.value);
                    setConfirming(false);
                  }}
                  placeholder="e.g. GLN-10248"
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-violet-400"
                />
              </label>
              <label className="block text-xs font-semibold">
                Amount (₹)
                <input
                  value={adjustAmount}
                  onChange={(e) => {
                    setAdjustAmount(e.target.value);
                    setConfirming(false);
                  }}
                  type="number"
                  min="1"
                  placeholder="0.00"
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-violet-400"
                />
              </label>
              <label className="block text-xs font-semibold">
                Mandatory reason
                <textarea
                  value={adjustReason}
                  onChange={(e) => {
                    setAdjustReason(e.target.value);
                    setConfirming(false);
                  }}
                  placeholder="Explain the verified reason and supporting reference"
                  className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 p-3 font-normal outline-none focus:border-violet-400"
                />
              </label>
            </div>
            {confirming && (
              <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                <b>
                  Confirm {adjustType.toLowerCase()} of ₹{Number(adjustAmount || 0).toFixed(2)}
                </b>
                <br />
                This mock action will create a separate immutable audit entry.
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  setAdjustOpen(false);
                  setConfirming(false);
                }}
                className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-semibold"
              >
                Cancel
              </button>
              <button onClick={submitAdjustment} className="h-10 rounded-xl bg-violet-600 px-4 text-xs font-semibold text-white">
                {confirming ? "Confirm adjustment" : "Review adjustment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

type Withdrawal = {
  id: string;
  user: string;
  userId: string;
  amount: number;
  method: "UPI" | "Bank";
  destination: string;
  status: "Pending" | "Approved" | "Processing" | "Failed" | "Rejected";
  requested: string;
  age: string;
  risk: "Low" | "Medium" | "High";
  providerRef?: string;
  failure?: string;
};
const withdrawalData: Withdrawal[] = [
  {
    id: "GLN-WD-90283",
    user: "Priya Reddy",
    userId: "GLN-10247",
    amount: 500,
    method: "UPI",
    destination: "pri•••@okaxis",
    status: "Pending",
    requested: "08 Aug 2026 · 09:36 PM",
    age: "18 min",
    risk: "Low",
  },
  {
    id: "GLN-WD-90279",
    user: "Ananya Sharma",
    userId: "GLN-10243",
    amount: 1000,
    method: "Bank",
    destination: "HDFC ••4821",
    status: "Pending",
    requested: "08 Aug 2026 · 07:42 PM",
    age: "2 hr",
    risk: "Low",
  },
  {
    id: "GLN-WD-90274",
    user: "Karthik Rao",
    userId: "GLN-10246",
    amount: 750,
    method: "UPI",
    destination: "kar•••@ybl",
    status: "Pending",
    requested: "08 Aug 2026 · 05:18 PM",
    age: "4 hr",
    risk: "Medium",
  },
  {
    id: "GLN-WD-90268",
    user: "Aarav Mehta",
    userId: "GLN-10248",
    amount: 500,
    method: "UPI",
    destination: "aar•••@paytm",
    status: "Approved",
    requested: "08 Aug 2026 · 02:10 PM",
    age: "7 hr",
    risk: "Low",
    providerRef: "CASH-882104",
  },
  {
    id: "GLN-WD-90261",
    user: "Sana Khan",
    userId: "GLN-10245",
    amount: 600,
    method: "Bank",
    destination: "ICICI ••1964",
    status: "Processing",
    requested: "08 Aug 2026 · 11:02 AM",
    age: "10 hr",
    risk: "Low",
    providerRef: "CASH-882096",
  },
  {
    id: "GLN-WD-90255",
    user: "Rahul Verma",
    userId: "GLN-10242",
    amount: 500,
    method: "UPI",
    destination: "rah•••@oksbi",
    status: "Failed",
    requested: "08 Aug 2026 · 08:26 AM",
    age: "13 hr",
    risk: "Low",
    providerRef: "CASH-882071",
    failure: "Beneficiary UPI address unavailable",
  },
  {
    id: "GLN-WD-90242",
    user: "Vikram Singh",
    userId: "GLN-10244",
    amount: 1250,
    method: "Bank",
    destination: "SBI ••7302",
    status: "Rejected",
    requested: "07 Aug 2026 · 08:10 PM",
    age: "1 day",
    risk: "High",
    failure: "Account suspended after duplicate-device review",
  },
];

function WithdrawalsManagement({ action }: { action: (message: string) => void }) {
  const [status, setStatus] = useState("Pending");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Withdrawal | null>(null);
  const [decision, setDecision] = useState<"approve" | "reject" | "retry" | null>(null);
  const [reason, setReason] = useState("");
  const [reconcile, setReconcile] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [compact, setCompact] = useState(false);
  const withdrawalColumns = ["Method", "Amount", "Risk", "Status", "Age"];
  const [visibleColumns, setVisibleColumns] = useState(withdrawalColumns);
  const filtered = useMemo(() => withdrawalData.filter((w) => (status === "All" || w.status === status) && (!query || `${w.id} ${w.user} ${w.userId} ${w.destination}`.toLowerCase().includes(query.toLowerCase()))), [status, query]);
  const tone = (s: string) => (s === "Approved" ? "bg-emerald-50 text-emerald-700" : s === "Processing" ? "bg-blue-50 text-blue-700" : s === "Failed" ? "bg-rose-50 text-rose-700" : s === "Rejected" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-700");
  const confirmDecision = () => {
    if (decision === "reject" && !reason.trim()) {
      action("Add a rejection reason before continuing");
      return;
    }
    action(decision === "retry" ? "Mock payout retry queued with a new idempotency key" : decision === "approve" ? "Mock withdrawal approved and queued for payout" : "Mock withdrawal rejected and wallet release recorded");
    setDecision(null);
    setReason("");
    setSelected(null);
  };
  const toggleWithdrawal = (id: string) => setSelectedIds((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
  const toggleAllWithdrawals = () => setSelectedIds((ids) => filtered.length > 0 && filtered.every((item) => ids.includes(item.id)) ? ids.filter((id) => !filtered.some((item) => item.id === id)) : Array.from(new Set([...ids, ...filtered.map((item) => item.id)])));
  const toggleWithdrawalColumn = (column: string) => setVisibleColumns((columns) => columns.includes(column) ? columns.length === 1 ? columns : columns.filter((item) => item !== column) : [...columns, column]);
  const applyBulkWithdrawal = (label: string, reasonText: string) => { action(`${label} simulated for ${selectedIds.length} withdrawals · audit reason captured`); setSelectedIds([]); void reasonText; };
  return (
    <>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 text-xs text-slate-400">
            Home <span className="px-2">›</span> Withdrawals
          </div>
          <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">Withdrawals</h1>
          <p className="mt-1 text-sm text-slate-500">Review payout requests, handle failures and reconcile provider settlements.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => action("Mock withdrawal report exported")} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold">
            <Download size={15} />
            Export
          </button>
          <button onClick={() => setReconcile(true)} className="flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-semibold text-white">
            <RefreshCw size={15} />
            Reconcile payouts
          </button>
          <span className="flex h-10 items-center rounded-xl bg-violet-50 px-3 text-xs font-semibold text-violet-700">Step 5 · Mock data</span>
        </div>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {[
          ["Pending review", "8 requests", "₹74,260 queued", Clock3, "bg-amber-50 text-amber-600"],
          ["Approved today", "₹38,500", "42 requests", CheckCircle2, "bg-emerald-50 text-emerald-600"],
          ["Processing", "₹12,750", "7 with payout provider", RefreshCw, "bg-blue-50 text-blue-600"],
          ["Failed / rejected", "₹4,860", "5 need attention", CircleAlert, "bg-rose-50 text-rose-600"],
        ].map(([a, b, c, Icon, t]) => (
          <article key={a as string} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className={`grid h-12 w-12 place-items-center rounded-2xl ${t}`}>
              <Icon size={21} />
            </span>
            <div>
              <p className="text-xs text-slate-500">{a as string}</p>
              <p className="text-xl font-bold">{b as string}</p>
              <p className="text-[10px] text-slate-400">{c as string}</p>
            </div>
          </article>
        ))}
      </section>
      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 xl:flex-row xl:items-center">
          <label className="flex h-11 flex-1 items-center gap-3 rounded-xl border border-slate-200 px-4">
            <Search size={17} className="text-slate-400" />
            <input aria-label="Search withdrawals" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search request, user or payout destination" className="w-full bg-transparent text-xs outline-none" />
          </label>
          <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
            {["All", "Pending", "Approved", "Processing", "Failed", "Rejected"].map((x) => (
              <button key={x} onClick={() => setStatus(x)} className={`h-9 rounded-lg px-3 text-[11px] font-semibold ${status === x ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"}`}>
                {x}
              </button>
            ))}
          </div>
          <QueueDisplayControls compact={compact} onCompact={() => setCompact((value) => !value)} columns={withdrawalColumns} visibleColumns={visibleColumns} onToggleColumn={toggleWithdrawalColumn}/>
        </div>
        <BulkQueueToolbar selectedCount={selectedIds.length} visibleCount={filtered.length} allSelected={filtered.length > 0 && filtered.every((item) => selectedIds.includes(item.id))} onToggleAll={toggleAllWithdrawals} onClear={() => setSelectedIds([])} actions={[{label:"Assign finance reviewer",permission:"withdrawals.assign"},{label:"Approve eligible",permission:"withdrawals.bulk_approve"},{label:"Place on hold",permission:"withdrawals.hold",tone:"danger"}]} onApply={applyBulkWithdrawal}/>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1050px] text-left">
            <thead>
              <tr className="border-b bg-[#fafafd] text-[10px] uppercase tracking-wider text-slate-400">
                <th className="sticky left-0 z-10 w-12 bg-[#fafafd] px-4 py-3"><input aria-label="Select all visible withdrawals" type="checkbox" checked={filtered.length > 0 && filtered.every((item) => selectedIds.includes(item.id))} onChange={toggleAllWithdrawals} className="h-4 w-4 rounded"/></th>
                <th className="px-5 py-3">Request</th>
                <th className="px-4 py-3">User</th>
                {visibleColumns.includes("Method") && <th className="px-4 py-3">Method</th>}
                {visibleColumns.includes("Amount") && <th className="px-4 py-3">Amount</th>}
                {visibleColumns.includes("Risk") && <th className="px-4 py-3">Risk</th>}
                {visibleColumns.includes("Status") && <th className="px-4 py-3">Status</th>}
                {visibleColumns.includes("Age") && <th className="px-4 py-3">Age</th>}
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((w) => (
                <tr key={w.id} className={`border-b border-slate-50 text-xs hover:bg-violet-50/30 ${selectedIds.includes(w.id) ? "bg-violet-50/60" : ""}`}>
                  <td className={`sticky left-0 z-10 bg-white px-4 ${compact ? "py-2" : "py-4"}`}><input aria-label={`Select withdrawal ${w.id}`} type="checkbox" checked={selectedIds.includes(w.id)} onChange={() => toggleWithdrawal(w.id)} className="h-4 w-4 rounded"/></td>
                  <td className={`px-5 font-mono text-[11px] font-semibold text-violet-600 ${compact ? "py-2" : "py-4"}`}>
                    {w.id}
                    <p className="mt-1 font-sans text-[9px] font-normal text-slate-400">{w.requested}</p>
                  </td>
                  <td className={`px-4 font-semibold ${compact ? "py-2" : "py-4"}`}>
                    {w.user}
                    <p className="mt-1 text-[10px] font-normal text-slate-400">{w.userId}</p>
                  </td>
                  {visibleColumns.includes("Method") && <td className={`px-4 font-semibold ${compact ? "py-2" : "py-4"}`}>
                    {w.method}
                    <p className="mt-1 text-[10px] font-normal text-slate-400">{w.destination}</p>
                  </td>}
                  {visibleColumns.includes("Amount") && <td className={`px-4 text-sm font-bold ${compact ? "py-2" : "py-4"}`}>₹{w.amount.toFixed(2)}</td>}
                  {visibleColumns.includes("Risk") && <td className={`px-4 ${compact ? "py-2" : "py-4"}`}>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${w.risk === "High" ? "bg-rose-50 text-rose-700" : w.risk === "Medium" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{w.risk}</span>
                  </td>}
                  {visibleColumns.includes("Status") && <td className={`px-4 ${compact ? "py-2" : "py-4"}`}>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${tone(w.status)}`}>{w.status}</span>
                  </td>}
                  {visibleColumns.includes("Age") && <td className={`px-4 text-slate-500 ${compact ? "py-2" : "py-4"}`}>{w.age}</td>}
                  <td className={`px-5 text-right ${compact ? "py-2" : "py-4"}`}>
                    <button onClick={() => setSelected(w)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 font-semibold text-violet-600">
                      <Eye size={14} />
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && (
            <div className="p-12 text-center">
              <HandCoins size={32} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-semibold">No withdrawals in this queue</p>
              <p className="mt-1 text-xs text-slate-400">Choose another status or change your search.</p>
            </div>
          )}
        </div>
        <div className="grid gap-3 p-4 md:hidden">{filtered.map((w) => <article key={w.id} className={`rounded-xl border p-4 ${selectedIds.includes(w.id) ? "border-violet-300 bg-violet-50/50" : "bg-white"}`}><div className="flex items-start gap-3"><input aria-label={`Select withdrawal ${w.id}`} type="checkbox" checked={selectedIds.includes(w.id)} onChange={() => toggleWithdrawal(w.id)} className="mt-1 h-5 w-5 rounded"/><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><p className="font-mono text-[10px] font-bold text-violet-600">{w.id}</p><h3 className="mt-1 text-sm font-bold">{w.user}</h3><p className="text-[10px] text-slate-400">{w.userId} · {w.age}</p></div><b className="text-sm">₹{w.amount.toFixed(2)}</b></div><div className="mt-3 flex flex-wrap gap-2"><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${tone(w.status)}`}>{w.status}</span><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${w.risk === "High" ? "bg-rose-50 text-rose-700" : w.risk === "Medium" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{w.risk} risk</span><span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600">{w.method}</span></div><button onClick={() => setSelected(w)} className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl border bg-white text-xs font-bold text-violet-700"><Eye size={14}/>Review request</button></div></div></article>)}</div>
        <div className="flex items-center justify-between border-t px-5 py-4 text-xs text-slate-500">
          <span>Showing {filtered.length} mock requests</span>
          <span>Last provider sync: 2 min ago</span>
        </div>
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold">Payout controls</h2>
          <p className="mt-1 text-xs text-slate-500">Checks applied before money leaves the platform.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              ["Wallet hold", "Requested amount is reserved", WalletCards],
              ["KYC and name match", "Verified payout ownership", ShieldCheck],
              ["Risk review", "Device and velocity signals", ShieldAlert],
              ["Idempotent payout", "Duplicate transfers prevented", RefreshCw],
            ].map(([a, b, Icon]) => (
              <div key={a as string} className="flex gap-3 rounded-xl bg-slate-50 p-3">
                <Icon size={18} className="text-violet-600" />
                <div>
                  <p className="text-xs font-bold">{a as string}</p>
                  <p className="mt-1 text-[10px] text-slate-500">{b as string}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold">Settlement snapshot</h2>
              <p className="mt-1 text-xs text-slate-500">Mock payout-provider reconciliation.</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold text-emerald-700">Balanced</span>
          </div>
          <dl className="mt-5 space-y-3 text-xs">
            {[
              ["Admin approved", "₹38,500.00"],
              ["Provider accepted", "₹38,500.00"],
              ["Bank/UPI settled", "₹31,750.00"],
              ["Still processing", "₹6,750.00"],
              ["Difference", "₹0.00"],
            ].map((x) => (
              <div key={x[0]} className="flex justify-between border-b border-slate-100 pb-3">
                <dt className="text-slate-500">{x[0]}</dt>
                <dd className="font-bold">{x[1]}</dd>
              </div>
            ))}
          </dl>
        </article>
      </section>
      {selected && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <button aria-label="Close withdrawal details" onClick={() => setSelected(null)} className="absolute inset-0 bg-slate-950/40" />
          <aside role="dialog" aria-modal="true" className="relative h-full w-full max-w-[560px] overflow-y-auto bg-[#f7f8fc] shadow-2xl">
            <div className="sticky top-0 flex items-center border-b bg-white p-5">
              <div>
                <p className="text-xs text-slate-400">Withdrawal review</p>
                <h2 className="font-mono text-sm font-bold text-violet-600">{selected.id}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="ml-auto grid h-10 w-10 place-items-center rounded-xl">
                <X size={20} />
              </button>
            </div>
            <div className="p-5">
              <section className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone(selected.status)}`}>{selected.status}</span>
                  <p className="text-2xl font-bold">₹{selected.amount.toFixed(2)}</p>
                </div>
                <dl className="mt-6 space-y-4 text-xs">
                  {[
                    ["User", `${selected.user} · ${selected.userId}`],
                    ["Payout", `${selected.method} · ${selected.destination}`],
                    ["Requested", selected.requested],
                    ["Risk level", selected.risk],
                    ["Provider reference", selected.providerRef || "Not submitted"],
                    ["Failure / decision", selected.failure || "No exception recorded"],
                  ].map((x) => (
                    <div key={x[0]} className="flex justify-between gap-5 border-b border-slate-100 pb-3">
                      <dt className="text-slate-400">{x[0]}</dt>
                      <dd className="text-right font-semibold">{x[1]}</dd>
                    </div>
                  ))}
                </dl>
              </section>
              <div className="mt-4 rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-800">
                <CircleAlert size={17} className="mb-2" />
                Approvals create a provider payout request. Rejections release the held wallet amount and require a recorded reason.
              </div>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                {selected.status === "Pending" && (
                  <>
                    <button onClick={() => setDecision("reject")} className="h-10 rounded-xl border border-rose-200 px-4 text-xs font-semibold text-rose-600">
                      Reject
                    </button>
                    <button onClick={() => setDecision("approve")} className="h-10 rounded-xl bg-violet-600 px-4 text-xs font-semibold text-white">
                      Approve payout
                    </button>
                  </>
                )}
                {selected.status === "Failed" && (
                  <button onClick={() => setDecision("retry")} className="h-10 rounded-xl bg-violet-600 px-4 text-xs font-semibold text-white">
                    Retry payout
                  </button>
                )}
                {!["Pending", "Failed"].includes(selected.status) && (
                  <button onClick={() => action("Mock payout audit trail opened")} className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-violet-600">
                    View audit trail
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
      {decision && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/50 p-4">
          <div role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-bold capitalize">Confirm {decision}</h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">{decision === "approve" ? "This mock approval will reserve a payout reference and queue the transfer." : decision === "retry" ? "This creates a new mock provider attempt without duplicating the wallet debit." : "The held amount will be released back to the user wallet."}</p>
            {decision === "reject" && <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Mandatory rejection reason" className="mt-4 min-h-24 w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-violet-400" />}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  setDecision(null);
                  setReason("");
                }}
                className="h-10 rounded-xl border px-4 text-xs font-semibold"
              >
                Cancel
              </button>
              <button onClick={confirmDecision} className={`h-10 rounded-xl px-4 text-xs font-semibold text-white ${decision === "reject" ? "bg-rose-600" : "bg-violet-600"}`}>
                Confirm {decision}
              </button>
            </div>
          </div>
        </div>
      )}
      {reconcile && (
        <div className="fixed inset-0 z-[75] grid place-items-center bg-slate-950/50 p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center">
              <div>
                <p className="text-xs text-slate-400">Provider reconciliation</p>
                <h2 className="text-lg font-bold">Settlement batch · 08 Aug</h2>
              </div>
              <button onClick={() => setReconcile(false)} className="ml-auto grid h-10 w-10 place-items-center">
                <X size={20} />
              </button>
            </div>
            <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-xs text-emerald-800">
              <b>All provider records match</b>
              <p className="mt-1">42 accepted payouts · ₹38,500.00 · Difference ₹0.00</p>
            </div>
            <div className="mt-4 space-y-3">
              {[
                ["Settled", "35", "₹31,750"],
                ["Processing", "7", "₹6,750"],
                ["Failed", "0", "₹0"],
              ].map((x) => (
                <div key={x[0]} className="grid grid-cols-3 rounded-xl border p-3 text-xs">
                  <b>{x[0]}</b>
                  <span className="text-center text-slate-500">{x[1]} payouts</span>
                  <b className="text-right">{x[2]}</b>
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                action("Mock reconciliation report closed and archived");
                setReconcile(false);
              }}
              className="mt-5 h-10 w-full rounded-xl bg-violet-600 text-xs font-semibold text-white"
            >
              Close and archive batch
            </button>
          </div>
        </div>
      )}
    </>
  );
}

type KycCase = {
  id: string;
  user: string;
  userId: string;
  submitted: string;
  type: string;
  status: "Pending" | "Changes requested" | "Approved" | "Rejected";
  risk: "Low" | "Medium" | "High";
  pan: string;
  dob: string;
  nameMatch: number;
  initials: string;
};
const kycCases: KycCase[] = [
  {
    id: "KYC-240812",
    user: "Priya Reddy",
    userId: "GLN-10247",
    submitted: "08 Aug · 9:42 PM",
    type: "PAN + Selfie",
    status: "Pending",
    risk: "Low",
    pan: "ABCDE••••F",
    dob: "14 May 1997",
    nameMatch: 98,
    initials: "PR",
  },
  {
    id: "KYC-240811",
    user: "Karthik Rao",
    userId: "GLN-10246",
    submitted: "08 Aug · 8:16 PM",
    type: "PAN + Selfie",
    status: "Pending",
    risk: "Medium",
    pan: "FGHIJ••••K",
    dob: "22 Nov 1993",
    nameMatch: 87,
    initials: "KR",
  },
  {
    id: "KYC-240810",
    user: "Neha Gupta",
    userId: "GLN-10241",
    submitted: "08 Aug · 6:54 PM",
    type: "PAN + Selfie",
    status: "Changes requested",
    risk: "Low",
    pan: "LMNOP••••Q",
    dob: "03 Feb 2000",
    nameMatch: 62,
    initials: "NG",
  },
  {
    id: "KYC-240809",
    user: "Imran Ali",
    userId: "GLN-10240",
    submitted: "08 Aug · 5:20 PM",
    type: "PAN + Selfie",
    status: "Pending",
    risk: "High",
    pan: "RSTUV••••W",
    dob: "19 Jul 1995",
    nameMatch: 74,
    initials: "IA",
  },
  {
    id: "KYC-240808",
    user: "Ananya Sharma",
    userId: "GLN-10243",
    submitted: "08 Aug · 3:08 PM",
    type: "PAN + Selfie",
    status: "Approved",
    risk: "Low",
    pan: "XYZAB••••C",
    dob: "08 Jan 1998",
    nameMatch: 100,
    initials: "AS",
  },
];

function KycVerification({ action }: { action: (message: string) => void }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [selected, setSelected] = useState<KycCase | null>(null);
  const [decision, setDecision] = useState<"approve" | "reject" | "changes" | null>(null);
  const [reason, setReason] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [compact, setCompact] = useState(false);
  const kycColumns = ["Submitted", "Documents", "Name match", "Risk", "Status"];
  const [visibleColumns, setVisibleColumns] = useState(kycColumns);
  const rows = useMemo(() => kycCases.filter((k) => (status === "All statuses" || k.status === status) && (!query || `${k.user} ${k.userId} ${k.id}`.toLowerCase().includes(query.toLowerCase()))), [query, status]);
  const tone = (s: string) => (s === "Approved" ? "bg-emerald-50 text-emerald-700" : s === "Rejected" ? "bg-rose-50 text-rose-700" : s === "Changes requested" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700");
  const complete = () => {
    if (!selected || !decision) return;
    if (decision !== "approve" && !reason.trim()) return;
    action(`${selected.id} ${decision} action recorded in mock audit history`);
    setDecision(null);
    setReason("");
    setSelected(null);
  };
  const toggleKyc = (id: string) => setSelectedIds((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
  const toggleAllKyc = () => setSelectedIds((ids) => rows.length > 0 && rows.every((item) => ids.includes(item.id)) ? ids.filter((id) => !rows.some((item) => item.id === id)) : Array.from(new Set([...ids, ...rows.map((item) => item.id)])));
  const toggleKycColumn = (column: string) => setVisibleColumns((columns) => columns.includes(column) ? columns.length === 1 ? columns : columns.filter((item) => item !== column) : [...columns, column]);
  const applyBulkKyc = (label: string, reasonText: string) => { action(`${label} simulated for ${selectedIds.length} KYC cases · audit reason captured`); setSelectedIds([]); void reasonText; };
  return (
    <>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 text-xs text-slate-400">
            Home <span className="px-2">›</span> KYC Verification
          </div>
          <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">KYC Verification</h1>
          <p className="mt-1 text-sm text-slate-500">Review identity documents, resolve mismatches and preserve every decision.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => action("Mock KYC report exported")} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold">
            <Download size={15} />
            Export queue
          </button>
          <span className="flex h-10 items-center rounded-xl bg-violet-50 px-3 text-xs font-semibold text-violet-700">Step 6 · Mock data</span>
        </div>
      </div>
      <section className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Awaiting review", "12", "Oldest: 9 hours", Clock3, "bg-amber-50 text-amber-600"],
          ["Approved today", "38", "96.4% match rate", ShieldCheck, "bg-emerald-50 text-emerald-600"],
          ["Changes requested", "5", "Document quality issues", FileText, "bg-blue-50 text-blue-600"],
          ["High-risk review", "3", "Manual escalation", ShieldAlert, "bg-rose-50 text-rose-600"],
        ].map(([a, b, c, I, t]) => (
          <article key={a as string} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className={`grid h-12 w-12 place-items-center rounded-2xl ${t}`}>
              <I size={21} />
            </span>
            <div>
              <p className="text-xs text-slate-500">{a as string}</p>
              <p className="text-xl font-bold">{b as string}</p>
              <p className="text-[10px] text-slate-400">{c as string}</p>
            </div>
          </article>
        ))}
      </section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row">
          <label className="flex h-11 flex-1 items-center gap-3 rounded-xl border border-slate-200 px-4">
            <Search size={17} className="text-slate-400" />
            <input aria-label="Search KYC cases" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search user, User ID or KYC reference" className="w-full bg-transparent text-xs outline-none" />
          </label>
          <select aria-label="KYC status filter" value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs">
            <option>All statuses</option>
            <option>Pending</option>
            <option>Changes requested</option>
            <option>Approved</option>
            <option>Rejected</option>
          </select>
          <QueueDisplayControls compact={compact} onCompact={() => setCompact((value) => !value)} columns={kycColumns} visibleColumns={visibleColumns} onToggleColumn={toggleKycColumn}/>
        </div>
        <BulkQueueToolbar selectedCount={selectedIds.length} visibleCount={rows.length} allSelected={rows.length > 0 && rows.every((item) => selectedIds.includes(item.id))} onToggleAll={toggleAllKyc} onClear={() => setSelectedIds([])} actions={[{label:"Assign reviewer",permission:"kyc.assign"},{label:"Request document refresh",permission:"kyc.request_changes"},{label:"Escalate high risk",permission:"kyc.escalate",tone:"danger"}]} onApply={applyBulkKyc}/>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="bg-[#fafafd] text-[10px] uppercase tracking-wider text-slate-400">
                <th className="sticky left-0 z-10 w-12 bg-[#fafafd] px-4 py-3"><input aria-label="Select all visible KYC cases" type="checkbox" checked={rows.length > 0 && rows.every((item) => selectedIds.includes(item.id))} onChange={toggleAllKyc} className="h-4 w-4 rounded"/></th>
                <th className="px-5 py-3">Applicant</th>
                {visibleColumns.includes("Submitted") && <th className="px-4 py-3">Submitted</th>}
                {visibleColumns.includes("Documents") && <th className="px-4 py-3">Documents</th>}
                {visibleColumns.includes("Name match") && <th className="px-4 py-3">Name match</th>}
                {visibleColumns.includes("Risk") && <th className="px-4 py-3">Risk</th>}
                {visibleColumns.includes("Status") && <th className="px-4 py-3">Status</th>}
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((k) => (
                <tr key={k.id} className={`border-t border-slate-100 text-xs hover:bg-violet-50/30 ${selectedIds.includes(k.id) ? "bg-violet-50/60" : ""}`}>
                  <td className={`sticky left-0 z-10 bg-white px-4 ${compact ? "py-2" : "py-4"}`}><input aria-label={`Select KYC case ${k.id}`} type="checkbox" checked={selectedIds.includes(k.id)} onChange={() => toggleKyc(k.id)} className="h-4 w-4 rounded"/></td>
                  <td className={`px-5 ${compact ? "py-2" : "py-4"}`}>
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-violet-100 font-bold text-violet-700">{k.initials}</span>
                      <div>
                        <b>{k.user}</b>
                        <p className="text-[10px] text-slate-400">
                          {k.userId} · {k.id}
                        </p>
                      </div>
                    </div>
                  </td>
                  {visibleColumns.includes("Submitted") && <td className={`px-4 text-slate-500 ${compact ? "py-2" : "py-4"}`}>{k.submitted}</td>}
                  {visibleColumns.includes("Documents") && <td className={`px-4 ${compact ? "py-2" : "py-4"}`}>
                    <b>{k.type}</b>
                    <p className="text-[10px] text-emerald-600">2 files received</p>
                  </td>}
                  {visibleColumns.includes("Name match") && <td className={`px-4 ${compact ? "py-2" : "py-4"}`}>
                    <b className={k.nameMatch < 80 ? "text-rose-600" : "text-emerald-600"}>{k.nameMatch}%</b>
                  </td>}
                  {visibleColumns.includes("Risk") && <td className={`px-4 ${compact ? "py-2" : "py-4"}`}>
                    <span className={k.risk === "High" ? "text-rose-600" : k.risk === "Medium" ? "text-amber-600" : "text-emerald-600"}>{k.risk}</span>
                  </td>}
                  {visibleColumns.includes("Status") && <td className={`px-4 ${compact ? "py-2" : "py-4"}`}>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${tone(k.status)}`}>{k.status}</span>
                  </td>}
                  <td className={`px-5 text-right ${compact ? "py-2" : "py-4"}`}>
                    <button onClick={() => setSelected(k)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 font-semibold text-violet-600">
                      <Eye size={14} />
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-3 p-4 md:hidden">{rows.map((k) => <article key={k.id} className={`rounded-xl border p-4 ${selectedIds.includes(k.id) ? "border-violet-300 bg-violet-50/50" : "bg-white"}`}><div className="flex items-start gap-3"><input aria-label={`Select KYC case ${k.id}`} type="checkbox" checked={selectedIds.includes(k.id)} onChange={() => toggleKyc(k.id)} className="mt-1 h-5 w-5 rounded"/><div className="min-w-0 flex-1"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">{k.initials}</span><div><h3 className="text-sm font-bold">{k.user}</h3><p className="font-mono text-[10px] text-violet-600">{k.id}</p><p className="text-[10px] text-slate-400">{k.userId} · {k.submitted}</p></div></div><div className="mt-3 grid grid-cols-2 gap-2 text-[10px]"><div className="rounded-lg bg-slate-50 p-2"><span className="text-slate-400">Name match</span><b className={`block ${k.nameMatch < 80 ? "text-rose-600" : "text-emerald-600"}`}>{k.nameMatch}%</b></div><div className="rounded-lg bg-slate-50 p-2"><span className="text-slate-400">Risk</span><b className="block">{k.risk}</b></div></div><div className="mt-3 flex items-center justify-between"><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${tone(k.status)}`}>{k.status}</span><button onClick={() => setSelected(k)} className="flex h-9 items-center gap-2 rounded-lg border bg-white px-3 text-[11px] font-bold text-violet-700"><Eye size={14}/>Review</button></div></div></div></article>)}</div>
        <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-500">Showing {rows.length} mock applications · Documents are masked and synthetic</div>
      </section>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-violet-600" />
          <div>
            <h2 className="font-bold">Verification controls</h2>
            <p className="text-xs text-slate-500">Four-eye review, reason-required rejection, masked documents and immutable audit history are represented in this mock workflow.</p>
          </div>
        </div>
      </section>
      {selected && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <button aria-label="Close KYC review" onClick={() => setSelected(null)} className="absolute inset-0 bg-slate-950/40" />
          <aside role="dialog" aria-modal="true" className="admin-scroll relative h-full w-full max-w-[680px] overflow-y-auto bg-[#f7f8fc] shadow-2xl">
            <header className="sticky top-0 z-10 flex items-center border-b bg-white px-5 py-4">
              <div>
                <p className="text-xs text-slate-400">KYC review</p>
                <h2 className="font-bold">
                  {selected.id} · {selected.user}
                </h2>
              </div>
              <button onClick={() => setSelected(null)} className="ml-auto grid h-10 w-10 place-items-center rounded-xl">
                <X />
              </button>
            </header>
            <div className="space-y-4 p-5">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <ShieldAlert size={16} className="mr-2 inline" />
                Synthetic masked documents only. Never download or share real identity files.
              </div>
              <section className="grid gap-4 sm:grid-cols-2">
                {[
                  ["PAN card", "Front image · clear"],
                  ["Live selfie", "Liveness passed"],
                ].map((x, i) => (
                  <article key={x[0]} className="rounded-2xl border bg-white p-4">
                    <div className="grid h-40 place-items-center rounded-xl bg-slate-100 text-slate-400">
                      <div className="text-center">
                        <FileText className="mx-auto mb-2" />
                        <p className="text-xs">Masked {x[0]}</p>
                        <button onClick={() => action("Secure document viewer opened (mock)")} className="mt-3 rounded-lg bg-white px-3 py-2 text-[10px] font-bold text-violet-600">
                          <Eye size={13} className="mr-1 inline" />
                          Inspect
                        </button>
                      </div>
                    </div>
                    <b className="mt-3 block text-xs">{x[0]}</b>
                    <p className="text-[10px] text-emerald-600">{x[1]}</p>
                  </article>
                ))}
              </section>
              <section className="rounded-2xl border bg-white p-5">
                <h3 className="font-bold">Identity comparison</h3>
                <dl className="mt-4 space-y-3 text-xs">
                  {[
                    ["Submitted name", selected.user],
                    ["PAN number", selected.pan],
                    ["Date of birth", selected.dob],
                    ["Name similarity", `${selected.nameMatch}%`],
                    ["Duplicate PAN check", "No match found"],
                    ["Device risk", selected.risk],
                  ].map((x) => (
                    <div key={x[0]} className="flex justify-between border-b pb-3">
                      <dt className="text-slate-500">{x[0]}</dt>
                      <dd className="font-bold">{x[1]}</dd>
                    </div>
                  ))}
                </dl>
              </section>
              <section className="rounded-2xl border bg-white p-5">
                <h3 className="font-bold">Verification history</h3>
                <div className="mt-4 border-l-2 border-violet-100 pl-4 text-xs">
                  <b>Application submitted</b>
                  <p className="text-slate-400">{selected.submitted} · Automated checks completed</p>
                </div>
              </section>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setDecision("approve")} className="h-11 rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white">
                  Approve KYC
                </button>
                <button onClick={() => setDecision("changes")} className="h-11 rounded-xl border border-blue-200 px-5 text-xs font-bold text-blue-700">
                  Request changes
                </button>
                <button onClick={() => setDecision("reject")} className="h-11 rounded-xl border border-rose-200 px-5 text-xs font-bold text-rose-700">
                  Reject
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
      {decision && selected && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/50 p-4">
          <div role="alertdialog" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold capitalize">Confirm {decision}</h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">This mock decision will be added to {selected.id}&apos;s verification history. Production will require role checks and a permanent audit record.</p>
            {decision !== "approve" && <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Required: explain the issue to the user" className="mt-4 h-24 w-full rounded-xl border border-slate-200 p-3 text-xs outline-none" />}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  setDecision(null);
                  setReason("");
                }}
                className="h-10 rounded-xl px-4 text-xs font-bold"
              >
                Cancel
              </button>
              <button disabled={decision !== "approve" && !reason.trim()} onClick={complete} className="h-10 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white disabled:opacity-40">
                Confirm decision
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

type AdProvider = {
  id: string;
  name: string;
  model: "SDK" | "API" | "Offerwall";
  status: "Active" | "Paused" | "Draft";
  health: "Healthy" | "Degraded" | "Not tested";
  priority: number;
  fill: number;
  impressions: number;
  completions: number;
  ecpm: number;
  revenue: number;
  rewardCost: number;
  postback: string;
};

const initialAdProviders: AdProvider[] = [
  { id: "NET-001", name: "Reward Network Alpha", model: "SDK", status: "Active", health: "Healthy", priority: 1, fill: 91.4, impressions: 184220, completions: 146802, ecpm: 148, revenue: 27264, rewardCost: 11744, postback: "Verified 2 min ago" },
  { id: "NET-002", name: "Video Partner Beta", model: "API", status: "Active", health: "Degraded", priority: 2, fill: 73.8, impressions: 96840, completions: 70125, ecpm: 132, revenue: 12783, rewardCost: 5610, postback: "Delayed 8 min" },
  { id: "NET-003", name: "Offerwall Demo", model: "Offerwall", status: "Paused", health: "Healthy", priority: 3, fill: 82.1, impressions: 44860, completions: 31092, ecpm: 118, revenue: 5293, rewardCost: 2487, postback: "Verified 1 hr ago" },
  { id: "NET-004", name: "Future Provider Template", model: "API", status: "Draft", health: "Not tested", priority: 4, fill: 0, impressions: 0, completions: 0, ecpm: 0, revenue: 0, rewardCost: 0, postback: "Not configured" },
];

const adRewardEvents = [
  { id: "AD-RW-84192", user: "Priya Reddy", provider: "Reward Network Alpha", amount: "₹0.80", status: "Approved", signal: "Clean", time: "2 min ago" },
  { id: "AD-RW-84191", user: "Karthik Rao", provider: "Video Partner Beta", amount: "₹0.80", status: "Pending", signal: "Callback delayed", time: "6 min ago" },
  { id: "AD-RW-84190", user: "Aarav Mehta", provider: "Reward Network Alpha", amount: "₹0.80", status: "Held", signal: "Velocity check", time: "11 min ago" },
  { id: "AD-RW-84189", user: "Sana Khan", provider: "Video Partner Beta", amount: "₹0.80", status: "Duplicate", signal: "Repeated event ID", time: "18 min ago" },
  { id: "AD-RW-84188", user: "Vikram Singh", provider: "Reward Network Alpha", amount: "₹0.80", status: "Approved", signal: "Clean", time: "24 min ago" },
];

function AdNetworksManagement({ action }: { action: (message: string) => void }) {
  const [providers, setProviders] = useState(initialAdProviders);
  const [selected, setSelected] = useState<AdProvider | null>(null);
  const [tab, setTab] = useState<"Networks" | "Reward events" | "Claims & postbacks">("Networks");
  const [range, setRange] = useState("30 days");
  const [addOpen, setAddOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"pause" | "activate" | "remove" | null>(null);
  const [networkName, setNetworkName] = useState("");
  const [integration, setIntegration] = useState<AdProvider["model"]>("API");
  const [reason, setReason] = useState("");
  const [eventFilter, setEventFilter] = useState("All");

  const activeProviders = providers.filter((provider) => provider.status === "Active").length;
  const totalRevenue = providers.reduce((sum, provider) => sum + provider.revenue, 0);
  const totalRewards = providers.reduce((sum, provider) => sum + provider.rewardCost, 0);
  const averageFill = providers.filter((provider) => provider.status === "Active").reduce((sum, provider, _, list) => sum + provider.fill / list.length, 0);
  const filteredEvents = eventFilter === "All" ? adRewardEvents : adRewardEvents.filter((event) => event.status === eventFilter);

  const addNetwork = () => {
    if (!networkName.trim()) return;
    const newProvider: AdProvider = {
      id: `NET-${String(providers.length + 1).padStart(3, "0")}`,
      name: networkName.trim(), model: integration, status: "Draft", health: "Not tested",
      priority: providers.length + 1, fill: 0, impressions: 0, completions: 0, ecpm: 0, revenue: 0, rewardCost: 0, postback: "Not configured",
    };
    setProviders((current) => [...current, newProvider]);
    setNetworkName("");
    setAddOpen(false);
    action("New network draft added to mock configuration");
  };

  const confirmProviderAction = () => {
    if (!selected || !confirmAction || !reason.trim()) return;
    if (confirmAction === "remove") {
      setProviders((current) => current.filter((provider) => provider.id !== selected.id));
      setSelected(null);
    } else {
      const status = confirmAction === "pause" ? "Paused" : "Active";
      setProviders((current) => current.map((provider) => provider.id === selected.id ? { ...provider, status } : provider));
      setSelected((current) => current ? { ...current, status } : current);
    }
    action(`Mock network ${confirmAction} action recorded`);
    setConfirmAction(null);
    setReason("");
  };

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 text-xs text-slate-400">Earnings <span className="px-2">›</span> Ad Networks</div>
          <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">Watch &amp; Earn / Ad Networks</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">Configure any current or future rewarded-ad provider, monitor delivery, and investigate reward callbacks. All data and actions are mock-only.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select aria-label="Ad network report period" value={range} onChange={(event) => setRange(event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-none">
            <option>7 days</option><option>30 days</option><option>90 days</option>
          </select>
          <button onClick={() => action("Mock ad-network report exported")} className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600"><Download size={16} />Export</button>
          <button onClick={() => setAddOpen(true)} className="flex h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white shadow-lg shadow-violet-200"><Plus size={17} />Add new network</button>
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-violet-100 bg-violet-50 p-4 text-xs leading-5 text-violet-800">
        <strong>Provider-independent setup:</strong> no network is pre-installed. These generic records demonstrate the workflow; production providers will be added with their own credentials, SDK/API details, postback mapping and reward rules.
      </div>

      <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {[
          ["Active networks", `${activeProviders} of ${providers.length}`, "Priority fallback enabled", MonitorPlay, "bg-violet-50 text-violet-700"],
          ["Average fill rate", `${averageFill.toFixed(1)}%`, `Across active providers · ${range}`, Activity, "bg-blue-50 text-blue-700"],
          ["Provider revenue", `₹${totalRevenue.toLocaleString("en-IN")}`, "Mock gross revenue", TrendingUp, "bg-emerald-50 text-emerald-700"],
          ["User reward cost", `₹${totalRewards.toLocaleString("en-IN")}`, `${totalRevenue ? ((totalRewards / totalRevenue) * 100).toFixed(1) : 0}% of revenue`, BadgeIndianRupee, "bg-amber-50 text-amber-700"],
        ].map(([label, value, note, Icon, color]) => (
          <article key={label as string} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`grid h-10 w-10 place-items-center rounded-xl ${color}`}><Icon size={19} /></div>
            <p className="mt-4 text-xs font-semibold text-slate-500">{label as string}</p><p className="mt-1 text-2xl font-bold">{value as string}</p><p className="mt-1 text-[11px] text-slate-400">{note as string}</p>
          </article>
        ))}
      </section>

      <div className="mt-6 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5">
        {(["Networks", "Reward events", "Claims & postbacks"] as const).map((item) => <button key={item} onClick={() => setTab(item)} className={`h-10 whitespace-nowrap rounded-lg px-4 text-xs font-bold ${tab === item ? "bg-violet-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}>{item}</button>)}
      </div>

      {tab === "Networks" && (
        <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold">Network priority &amp; performance</h2><p className="mt-1 text-xs text-slate-500">Lower priority numbers receive traffic first; fallback providers cover unavailable inventory.</p></div><button onClick={() => action("Mock provider health checks started")} className="flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-bold text-slate-600"><RefreshCw size={15} />Test all connections</button></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr>{["Priority / network", "Integration", "Status", "Health", "Fill", "Completed views", "eCPM", "Revenue / rewards", ""].map((heading) => <th key={heading} className="px-5 py-3 font-bold">{heading}</th>)}</tr></thead><tbody className="divide-y">
            {[...providers].sort((a, b) => a.priority - b.priority).map((provider) => <tr key={provider.id} className="hover:bg-slate-50"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-50 font-bold text-violet-700">{provider.priority}</span><div><p className="font-bold text-slate-800">{provider.name}</p><p className="mt-1 text-[10px] text-slate-400">{provider.id} · Mock</p></div></div></td><td className="px-5 py-4 font-semibold">{provider.model}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${provider.status === "Active" ? "bg-emerald-50 text-emerald-700" : provider.status === "Paused" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{provider.status}</span></td><td className="px-5 py-4"><span className={provider.health === "Healthy" ? "text-emerald-600" : provider.health === "Degraded" ? "text-amber-600" : "text-slate-400"}>● {provider.health}</span><p className="mt-1 text-[10px] text-slate-400">{provider.postback}</p></td><td className="px-5 py-4 font-bold">{provider.fill}%</td><td className="px-5 py-4">{provider.completions.toLocaleString("en-IN")}</td><td className="px-5 py-4">₹{provider.ecpm}</td><td className="px-5 py-4"><p className="font-bold text-emerald-700">₹{provider.revenue.toLocaleString("en-IN")}</p><p className="mt-1 text-[10px] text-slate-400">₹{provider.rewardCost.toLocaleString("en-IN")} rewards</p></td><td className="px-5 py-4"><button onClick={() => setSelected(provider)} className="h-9 rounded-lg border px-3 font-bold text-violet-600">Manage</button></td></tr>)}
          </tbody></table></div>
        </section>
      )}

      {tab === "Reward events" && (
        <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold">Reward event monitor</h2><p className="mt-1 text-xs text-slate-500">Server callback states, duplicate protection and held rewards.</p></div><select aria-label="Filter reward events" value={eventFilter} onChange={(event) => setEventFilter(event.target.value)} className="h-10 rounded-xl border px-3 text-xs font-bold"><option>All</option><option>Approved</option><option>Pending</option><option>Held</option><option>Duplicate</option></select></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr>{["Event", "User", "Provider", "Reward", "Status", "Verification signal", "Received"].map((heading) => <th className="px-5 py-3" key={heading}>{heading}</th>)}</tr></thead><tbody className="divide-y">{filteredEvents.map((event) => <tr key={event.id}><td className="px-5 py-4 font-bold text-violet-700">{event.id}</td><td className="px-5 py-4 font-semibold">{event.user}</td><td className="px-5 py-4">{event.provider}</td><td className="px-5 py-4 font-bold">{event.amount}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${event.status === "Approved" ? "bg-emerald-50 text-emerald-700" : event.status === "Duplicate" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{event.status}</span></td><td className="px-5 py-4">{event.signal}</td><td className="px-5 py-4 text-slate-400">{event.time}</td></tr>)}</tbody></table></div>
        </section>
      )}

      {tab === "Claims & postbacks" && (
        <section className="mt-4 grid gap-5 xl:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-bold">Missing reward claims</h2><p className="mt-1 text-xs text-slate-500">3 mock claims require callback matching.</p></div><span className="rounded-full bg-rose-50 px-3 py-1 text-[10px] font-bold text-rose-700">3 OPEN</span></div>{[["CLM-3082", "Callback not received", "18 min"], ["CLM-3081", "Completion disputed", "1 hr"], ["CLM-3078", "Reward held by risk rule", "3 hr"]].map(([id, issue, time]) => <button key={id} onClick={() => action(`${id} mock claim opened`)} className="mt-3 flex w-full items-center rounded-xl border p-4 text-left"><span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-50 text-amber-600"><CircleAlert size={17} /></span><span className="ml-3"><b className="block text-xs">{id}</b><span className="text-[11px] text-slate-500">{issue}</span></span><span className="ml-auto text-[10px] text-slate-400">{time}</span></button>)}</article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-bold">Postback health</h2><p className="mt-1 text-xs text-slate-500">Mock delivery and signature-verification summary.</p></div><Wifi size={19} className="text-emerald-600" /></div>{[["Callbacks received", "248,019", "99.2%"], ["Signature verified", "246,884", "99.5%"], ["Duplicates blocked", "1,135", "0.5%"], ["Retry queue", "42", "Needs review"]].map(([label, value, note]) => <div key={label} className="mt-4 flex items-center border-b border-slate-100 pb-4 last:border-0"><div><p className="text-xs font-bold">{label}</p><p className="mt-1 text-[10px] text-slate-400">{note}</p></div><strong className="ml-auto text-sm">{value}</strong></div>)}</article>
        </section>
      )}

      {selected && (
        <div className="fixed inset-0 z-[70] bg-slate-950/40" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}><aside role="dialog" aria-modal="true" aria-label="Manage ad network" className="admin-scroll ml-auto h-full w-full max-w-xl overflow-y-auto bg-[#f7f8fc] shadow-2xl"><div className="sticky top-0 z-10 flex items-center border-b bg-white p-5"><div><p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">{selected.id} · Mock provider</p><h2 className="mt-1 text-xl font-bold">{selected.name}</h2></div><button aria-label="Close network details" onClick={() => setSelected(null)} className="ml-auto grid h-10 w-10 place-items-center rounded-xl border"><X size={18} /></button></div><div className="space-y-4 p-5">
          <section className="rounded-2xl border bg-white p-5"><h3 className="font-bold">Connection configuration</h3><p className="mt-1 text-xs text-slate-500">Credentials are placeholders only and are never stored in this mock UI.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{[["Integration", selected.model], ["Priority", String(selected.priority)], ["Callback URL", "/api/postbacks/provider"], ["Signature method", "HMAC / provider-defined"]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] uppercase text-slate-400">{label}</p><p className="mt-1 break-all text-xs font-bold">{value}</p></div>)}</div><button onClick={() => action("Mock network configuration editor opened")} className="mt-4 h-10 rounded-xl border border-violet-200 px-4 text-xs font-bold text-violet-700">Edit configuration</button></section>
          <section className="rounded-2xl border bg-white p-5"><h3 className="font-bold">Reward &amp; delivery rules</h3><div className="mt-4 grid gap-3 sm:grid-cols-2">{[["User reward", "₹0.80 per approved view"], ["Daily cap", "20 ads per user"], ["Approval", "Verified server callback"], ["Fallback", `Priority ${selected.priority + 1} if unavailable`]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] uppercase text-slate-400">{label}</p><p className="mt-1 text-xs font-bold">{value}</p></div>)}</div><p className="mt-4 text-[11px] leading-5 text-amber-700">Production rules must be enforced by the backend, never by browser state.</p></section>
          <section className="rounded-2xl border bg-white p-5"><h3 className="font-bold">Sensitive actions</h3><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => action("Mock connection test passed")} className="h-10 rounded-xl border border-emerald-200 px-4 text-xs font-bold text-emerald-700">Test connection</button>{selected.status === "Active" ? <button onClick={() => setConfirmAction("pause")} className="h-10 rounded-xl border border-amber-200 px-4 text-xs font-bold text-amber-700">Pause network</button> : <button onClick={() => setConfirmAction("activate")} className="h-10 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white">Activate network</button>}<button onClick={() => setConfirmAction("remove")} className="h-10 rounded-xl border border-rose-200 px-4 text-xs font-bold text-rose-700">Remove</button></div></section>
        </div></aside></div>
      )}

      {addOpen && <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/50 p-4"><div role="dialog" aria-modal="true" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start"><div><p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Flexible provider setup</p><h3 className="mt-1 text-xl font-bold">Add new ad network</h3><p className="mt-2 text-xs leading-5 text-slate-500">Create a draft now. Credentials, endpoints, event mapping and security checks will be configured only during real integration.</p></div><button aria-label="Close add network" onClick={() => setAddOpen(false)} className="ml-auto grid h-10 w-10 place-items-center rounded-xl border"><X size={18} /></button></div><label className="mt-5 block text-xs font-bold">Network name<input autoFocus value={networkName} onChange={(event) => setNetworkName(event.target.value)} placeholder="Enter provider name" className="mt-2 h-11 w-full rounded-xl border px-3 font-normal outline-none focus:border-violet-400" /></label><label className="mt-4 block text-xs font-bold">Integration type<select value={integration} onChange={(event) => setIntegration(event.target.value as AdProvider["model"])} className="mt-2 h-11 w-full rounded-xl border bg-white px-3 font-normal"><option>API</option><option>SDK</option><option>Offerwall</option></select></label><div className="mt-5 rounded-xl bg-amber-50 p-3 text-[11px] leading-5 text-amber-800">The provider will remain in Draft until credentials, callback verification, reward mapping and a connection test are completed.</div><div className="mt-6 flex justify-end gap-2"><button onClick={() => setAddOpen(false)} className="h-10 rounded-xl border px-4 text-xs font-bold">Cancel</button><button disabled={!networkName.trim()} onClick={addNetwork} className="h-10 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white disabled:opacity-40">Create draft</button></div></div></div>}

      {confirmAction && selected && <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/55 p-4"><div role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h3 className="text-lg font-bold capitalize">Confirm {confirmAction} network</h3><p className="mt-2 text-xs leading-5 text-slate-500">This mock action affects {selected.name}. Production will require role permission, backend validation and an immutable audit log.</p><textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Required reason" className="mt-4 h-24 w-full rounded-xl border p-3 text-xs outline-none focus:border-violet-400" /><div className="mt-5 flex justify-end gap-2"><button onClick={() => { setConfirmAction(null); setReason(""); }} className="h-10 rounded-xl border px-4 text-xs font-bold">Cancel</button><button disabled={!reason.trim()} onClick={confirmProviderAction} className={`h-10 rounded-xl px-4 text-xs font-bold text-white disabled:opacity-40 ${confirmAction === "remove" ? "bg-rose-600" : "bg-violet-600"}`}>Confirm</button></div></div></div>}
    </>
  );
}

type SurveyProvider = { id: string; name: string; model: "API" | "Offerwall" | "Router"; status: "Active" | "Paused" | "Draft"; health: "Healthy" | "Delayed" | "Not tested"; priority: number; starts: number; completes: number; revenue: number; rewards: number; postback: string };
const initialSurveyProviders: SurveyProvider[] = [
  { id: "SVP-001", name: "Opinion Partner Alpha", model: "API", status: "Active", health: "Healthy", priority: 1, starts: 6842, completes: 3279, revenue: 142860, rewards: 91812, postback: "Verified 3 min ago" },
  { id: "SVP-002", name: "Research Router Beta", model: "Router", status: "Active", health: "Delayed", priority: 2, starts: 4120, completes: 1846, revenue: 82740, rewards: 55418, postback: "Delayed 11 min" },
  { id: "SVP-003", name: "Survey Wall Demo", model: "Offerwall", status: "Paused", health: "Healthy", priority: 3, starts: 1980, completes: 704, revenue: 29920, rewards: 19008, postback: "Verified 2 hr ago" },
  { id: "SVP-004", name: "Future Provider Template", model: "API", status: "Draft", health: "Not tested", priority: 4, starts: 0, completes: 0, revenue: 0, rewards: 0, postback: "Not configured" },
];
const surveyCampaigns = [
  { id: "SRV-2841", title: "Indian Shopping Habits", provider: "Opinion Partner Alpha", audience: "18–44 · All India", reward: "₹42", length: "12 min", completes: "1,284 / 2,000", status: "Live" },
  { id: "SRV-2838", title: "Mobile Network Experience", provider: "Research Router Beta", audience: "Android · South India", reward: "₹28", length: "8 min", completes: "842 / 1,500", status: "Live" },
  { id: "SRV-2826", title: "Digital Payments Study", provider: "Opinion Partner Alpha", audience: "KYC verified · 21+", reward: "₹65", length: "18 min", completes: "2,000 / 2,000", status: "Full" },
  { id: "SRV-2812", title: "Home Entertainment Panel", provider: "Survey Wall Demo", audience: "25–55 · Metro cities", reward: "₹34", length: "10 min", completes: "964 / 1,200", status: "Paused" },
];
const surveyEvents = [
  { id: "SRE-91842", user: "Priya Reddy", survey: "Indian Shopping Habits", amount: "₹42", status: "Approved", note: "Postback verified", time: "4 min ago" },
  { id: "SRE-91841", user: "Karthik Rao", survey: "Mobile Network Experience", amount: "₹28", status: "Pending", note: "Awaiting provider", time: "12 min ago" },
  { id: "SRE-91840", user: "Sana Khan", survey: "Digital Payments Study", amount: "₹65", status: "Screened out", note: "Eligibility mismatch", time: "19 min ago" },
  { id: "SRE-91839", user: "Aarav Mehta", survey: "Indian Shopping Habits", amount: "₹42", status: "Held", note: "Velocity review", time: "27 min ago" },
];

function SurveysManagement({ action }: { action: (message: string) => void }) {
  const [providers, setProviders] = useState(initialSurveyProviders);
  const [tab, setTab] = useState<"Providers" | "Campaigns" | "Completions" | "Claims">("Providers");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SurveyProvider | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [providerName, setProviderName] = useState("");
  const [model, setModel] = useState<SurveyProvider["model"]>("API");
  const [decision, setDecision] = useState<"pause" | "activate" | "remove" | null>(null);
  const [reason, setReason] = useState("");
  const totalRevenue = providers.reduce((sum, p) => sum + p.revenue, 0);
  const totalRewards = providers.reduce((sum, p) => sum + p.rewards, 0);
  const completionRate = Math.round((providers.reduce((sum, p) => sum + p.completes, 0) / Math.max(1, providers.reduce((sum, p) => sum + p.starts, 0))) * 1000) / 10;
  const tone = (value: string) => value === "Active" || value === "Healthy" || value === "Approved" || value === "Live" ? "bg-emerald-100 text-emerald-700" : value === "Paused" || value === "Delayed" || value === "Pending" || value === "Held" ? "bg-amber-100 text-amber-700" : value === "Draft" || value === "Not tested" ? "bg-slate-100 text-slate-600" : "bg-rose-100 text-rose-700";
  const filteredProviders = providers.filter((p) => `${p.name} ${p.id} ${p.model}`.toLowerCase().includes(query.toLowerCase()));
  const addProvider = () => { const created: SurveyProvider = { id: `SVP-${String(providers.length + 1).padStart(3, "0")}`, name: providerName.trim(), model, status: "Draft", health: "Not tested", priority: providers.length + 1, starts: 0, completes: 0, revenue: 0, rewards: 0, postback: "Not configured" }; setProviders([...providers, created]); setProviderName(""); setAddOpen(false); action(`${created.name} saved as a mock draft`); };
  const confirm = () => { if (!selected || !decision || !reason.trim()) return; setProviders((items) => decision === "remove" ? items.filter((p) => p.id !== selected.id) : items.map((p) => p.id === selected.id ? { ...p, status: decision === "pause" ? "Paused" : "Active" } : p)); action(`${selected.name}: mock ${decision} recorded`); setDecision(null); setReason(""); setSelected(null); };
  return <>
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-2 text-xs text-slate-400">Earnings <span className="px-2">›</span> Surveys</div><h1 className="text-2xl font-bold tracking-tight md:text-[28px]">Surveys Management</h1><p className="mt-1 text-sm text-slate-500">Manage providers, campaigns, eligibility, completions and reward disputes.</p></div><div className="flex flex-wrap gap-2"><span className="flex h-10 items-center rounded-xl bg-violet-50 px-3 text-xs font-semibold text-violet-700">Step 9 · Mock data</span><button onClick={() => setAddOpen(true)} className="flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white"><Plus size={15}/>Add provider</button></div></div>
    <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">{[["Active providers", String(providers.filter(p=>p.status==="Active").length), FileText, "bg-violet-50 text-violet-700"],["Completion rate", `${completionRate}%`, CheckCircle2, "bg-emerald-50 text-emerald-700"],["Provider revenue", `₹${totalRevenue.toLocaleString("en-IN")}`, TrendingUp, "bg-blue-50 text-blue-700"],["User rewards", `₹${totalRewards.toLocaleString("en-IN")}`, BadgeIndianRupee, "bg-amber-50 text-amber-700"]].map(([label,value,Icon,style])=><article key={label as string} className="rounded-2xl border bg-white p-5 shadow-sm"><div className={`grid h-11 w-11 place-items-center rounded-xl ${style as string}`}><Icon size={20}/></div><p className="mt-4 text-xs text-slate-500">{label as string}</p><p className="mt-1 text-2xl font-bold">{value as string}</p></article>)}</section>
    <section className="mt-6 overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between"><div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">{(["Providers","Campaigns","Completions","Claims"] as const).map(x=><button key={x} onClick={()=>setTab(x)} className={`rounded-lg px-4 py-2 text-xs font-bold ${tab===x?"bg-white text-violet-700 shadow-sm":"text-slate-500"}`}>{x}{x==="Claims"&&<span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-[9px] text-rose-700">6</span>}</button>)}</div><label className="flex h-10 min-w-[250px] items-center gap-2 rounded-xl border px-3"><Search size={15} className="text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} aria-label="Search surveys" placeholder="Search this workspace" className="w-full bg-transparent text-xs outline-none"/></label></div>
    {tab==="Providers"?<div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left"><thead><tr className="bg-[#fafafd] text-[10px] uppercase tracking-wider text-slate-400"><th className="px-5 py-3">Provider</th><th className="px-4 py-3">Priority / model</th><th className="px-4 py-3">Health</th><th className="px-4 py-3">Starts / completes</th><th className="px-4 py-3">Revenue / rewards</th><th className="px-4 py-3">Postback</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody>{filteredProviders.map(p=><tr key={p.id} className="border-t text-xs hover:bg-violet-50/30"><td className="px-5 py-4"><b>{p.name}</b><p className="mt-1 font-mono text-[10px] text-violet-600">{p.id}</p></td><td className="px-4 py-4"><b>#{p.priority}</b><p className="text-[10px] text-slate-400">{p.model}</p></td><td className="px-4 py-4"><div className="flex gap-2"><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${tone(p.status)}`}>{p.status}</span><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${tone(p.health)}`}>{p.health}</span></div></td><td className="px-4 py-4"><b>{p.starts.toLocaleString("en-IN")}</b><p className="text-[10px] text-slate-400">{p.completes.toLocaleString("en-IN")} complete</p></td><td className="px-4 py-4"><b>₹{p.revenue.toLocaleString("en-IN")}</b><p className="text-[10px] text-slate-400">₹{p.rewards.toLocaleString("en-IN")} rewards</p></td><td className="px-4 py-4 text-slate-500">{p.postback}</td><td className="px-5 py-4 text-right"><button onClick={()=>setSelected(p)} className="h-9 rounded-lg border px-3 font-bold text-violet-600">Manage</button></td></tr>)}</tbody></table></div>:tab==="Campaigns"?<div className="overflow-x-auto"><table className="w-full min-w-[950px] text-left"><thead><tr className="bg-[#fafafd] text-[10px] uppercase text-slate-400"><th className="px-5 py-3">Campaign</th><th className="px-4 py-3">Provider</th><th className="px-4 py-3">Eligibility</th><th className="px-4 py-3">Reward / length</th><th className="px-4 py-3">Quota</th><th className="px-5 py-3">Status</th></tr></thead><tbody>{surveyCampaigns.map(c=><tr key={c.id} className="border-t text-xs"><td className="px-5 py-4"><b>{c.title}</b><p className="font-mono text-[10px] text-violet-600">{c.id}</p></td><td className="px-4 py-4">{c.provider}</td><td className="px-4 py-4 text-slate-500">{c.audience}</td><td className="px-4 py-4"><b>{c.reward}</b><p className="text-[10px] text-slate-400">{c.length}</p></td><td className="px-4 py-4">{c.completes}</td><td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${tone(c.status)}`}>{c.status}</span></td></tr>)}</tbody></table></div>:tab==="Completions"?<div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead><tr className="bg-[#fafafd] text-[10px] uppercase text-slate-400"><th className="px-5 py-3">Event / user</th><th className="px-4 py-3">Survey</th><th className="px-4 py-3">Reward</th><th className="px-4 py-3">Verification</th><th className="px-5 py-3">Time</th></tr></thead><tbody>{surveyEvents.map(e=><tr key={e.id} className="border-t text-xs"><td className="px-5 py-4"><b>{e.user}</b><p className="font-mono text-[10px] text-violet-600">{e.id}</p></td><td className="px-4 py-4">{e.survey}</td><td className="px-4 py-4 font-bold">{e.amount}</td><td className="px-4 py-4"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${tone(e.status)}`}>{e.status}</span><p className="mt-1 text-[10px] text-slate-400">{e.note}</p></td><td className="px-5 py-4 text-slate-500">{e.time}</td></tr>)}</tbody></table></div>:<div className="grid gap-4 p-5 md:grid-cols-3">{[["Missing reward","3 claims","Provider completion reported; reward absent"],["Screen-out dispute","2 claims","User challenges eligibility termination"],["Expired survey","1 claim","Campaign closed during active session"]].map(x=><article key={x[0]} className="rounded-xl border p-4"><span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] font-bold text-rose-700">OPEN</span><h3 className="mt-3 text-sm font-bold">{x[0]}</h3><p className="mt-1 text-xs text-slate-500">{x[2]}</p><button onClick={()=>action(`${x[0]} queue opened in mock mode`)} className="mt-4 text-xs font-bold text-violet-600">Review {x[1]} →</button></article>)}</div>}</section>
    <section className="mt-6 grid gap-6 xl:grid-cols-2"><article className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-bold">Eligibility safeguards</h2><div className="mt-4 space-y-3">{["Age, location and profile requirements shown before start","One completion per provider event ID","Screen-outs never create automatic user debits","Sensitive profile answers remain provider-controlled"].map((x,i)=><div key={x} className="flex gap-3 rounded-xl bg-slate-50 p-3 text-xs"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700">{i+1}</span>{x}</div>)}</div></article><article className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-bold">Provider configuration</h2><p className="mt-1 text-xs text-slate-500">New and future providers use the same flexible setup.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{[["Credentials","Encrypted server-side later"],["Postback URL","Signed event verification"],["Reward mapping","Provider amount → user reward"],["Priority & fallback","Route by availability"]].map(x=><div key={x[0]} className="rounded-xl border p-3"><b className="text-xs">{x[0]}</b><p className="mt-1 text-[10px] text-slate-500">{x[1]}</p></div>)}</div></article></section>
    {selected&&<div className="fixed inset-0 z-[80] flex justify-end"><button aria-label="Close provider" onClick={()=>setSelected(null)} className="absolute inset-0 bg-slate-950/40"/><aside role="dialog" aria-modal="true" className="relative h-full w-full max-w-[560px] overflow-y-auto bg-[#f7f8fc] p-5 shadow-2xl"><div className="flex items-center"><div><p className="text-xs text-slate-400">Survey provider</p><h2 className="text-lg font-bold">{selected.name}</h2></div><button onClick={()=>setSelected(null)} className="ml-auto grid h-10 w-10 place-items-center"><X/></button></div><section className="mt-5 rounded-2xl border bg-white p-5"><div className="grid gap-3 sm:grid-cols-2">{[["Integration",selected.model],["Priority",`#${selected.priority}`],["Health",selected.health],["Postback",selected.postback]].map(x=><div key={x[0]} className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">{x[0]}</p><b className="text-xs">{x[1]}</b></div>)}</div><div className="mt-5 flex flex-wrap gap-2">{selected.status!=="Paused"&&<button onClick={()=>setDecision("pause")} className="h-10 rounded-xl border border-amber-200 px-4 text-xs font-bold text-amber-700">Pause</button>}{selected.status!=="Active"&&<button onClick={()=>setDecision("activate")} className="h-10 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white">Activate</button>}<button onClick={()=>setDecision("remove")} className="h-10 rounded-xl border border-rose-200 px-4 text-xs font-bold text-rose-700">Remove</button></div></section><div className="mt-4 rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-800">Mock configuration only. Production credentials must never be displayed here in plain text.</div></aside></div>}
    {addOpen&&<div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/50 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6"><h3 className="text-lg font-bold">Add survey provider</h3><p className="mt-1 text-xs text-slate-500">Create a provider-agnostic draft for a current or future partner.</p><label className="mt-5 block text-xs font-bold">Provider name<input value={providerName} onChange={e=>setProviderName(e.target.value)} className="mt-2 h-11 w-full rounded-xl border px-3 font-normal outline-none" placeholder="Provider name"/></label><label className="mt-4 block text-xs font-bold">Integration type<select value={model} onChange={e=>setModel(e.target.value as SurveyProvider["model"])} className="mt-2 h-11 w-full rounded-xl border px-3 font-normal"><option>API</option><option>Offerwall</option><option>Router</option></select></label><div className="mt-4 rounded-xl bg-violet-50 p-3 text-[11px] text-violet-800">Draft remains inactive until credentials, eligibility mapping, callback signature and reward rules are verified.</div><div className="mt-6 flex justify-end gap-2"><button onClick={()=>setAddOpen(false)} className="h-10 rounded-xl border px-4 text-xs font-bold">Cancel</button><button disabled={!providerName.trim()} onClick={addProvider} className="h-10 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white disabled:opacity-40">Create draft</button></div></div></div>}
    {decision&&selected&&<div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/55 p-4"><div role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6"><h3 className="text-lg font-bold capitalize">Confirm {decision}</h3><p className="mt-2 text-xs text-slate-500">This mock action affects {selected.name} and requires an audit reason.</p><textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="Required reason" className="mt-4 h-24 w-full rounded-xl border p-3 text-xs"/><div className="mt-5 flex justify-end gap-2"><button onClick={()=>{setDecision(null);setReason("");}} className="h-10 rounded-xl border px-4 text-xs font-bold">Cancel</button><button disabled={!reason.trim()} onClick={confirm} className={`h-10 rounded-xl px-4 text-xs font-bold text-white disabled:opacity-40 ${decision==="remove"?"bg-rose-600":"bg-violet-600"}`}>Confirm</button></div></div></div>}
  </>;
}

type InstallProvider = { id:string; name:string; model:"API"|"SDK"|"Offerwall"; status:"Active"|"Paused"|"Draft"; health:"Healthy"|"Delayed"|"Not tested"; priority:number; clicks:number; installs:number; verified:number; revenue:number; rewards:number };
const initialInstallProviders: InstallProvider[] = [
  {id:"OFP-001",name:"Install Partner Alpha",model:"API",status:"Active",health:"Healthy",priority:1,clicks:28420,installs:8462,verified:6974,revenue:348700,rewards:209220},
  {id:"OFP-002",name:"Mobile Offers Beta",model:"SDK",status:"Active",health:"Delayed",priority:2,clicks:17680,installs:4918,verified:3821,revenue:187950,rewards:108430},
  {id:"OFP-003",name:"Offerwall Demo",model:"Offerwall",status:"Paused",health:"Healthy",priority:3,clicks:9230,installs:2104,verified:1760,revenue:84200,rewards:50160},
  {id:"OFP-004",name:"Future Provider Template",model:"API",status:"Draft",health:"Not tested",priority:4,clicks:0,installs:0,verified:0,revenue:0,rewards:0},
];
const installCampaigns = [
  {id:"APP-2401",app:"FinTrack",provider:"Install Partner Alpha",platform:"Android",payout:"₹45",steps:"Install + register",cap:"6,000 / 10,000",status:"Live"},
  {id:"APP-2402",app:"QuickCart",provider:"Mobile Offers Beta",platform:"Android",payout:"₹80",steps:"Install + first order",cap:"2,840 / 5,000",status:"Live"},
  {id:"APP-2403",app:"LearnNow",provider:"Offerwall Demo",platform:"Android / iOS",payout:"₹120",steps:"Install + 3 lessons",cap:"1,290 / 3,000",status:"Paused"},
  {id:"APP-2404",app:"GameSprint",provider:"Install Partner Alpha",platform:"Android",payout:"₹65",steps:"Install + reach level 5",cap:"4,110 / 8,000",status:"Review"},
];
const installEvents = [
  {id:"INS-90821",user:"Aarav Mehta",app:"FinTrack",milestone:"Registration",reward:"₹45",status:"Approved",signal:"Signed postback",time:"3 min"},
  {id:"INS-90820",user:"Priya Reddy",app:"QuickCart",milestone:"First order",reward:"₹80",status:"Pending",signal:"Attribution window",time:"9 min"},
  {id:"INS-90819",user:"Karthik Rao",app:"GameSprint",milestone:"Level 5",reward:"₹65",status:"Held",signal:"Device mismatch",time:"18 min"},
  {id:"INS-90818",user:"Sana Khan",app:"FinTrack",milestone:"Registration",reward:"₹45",status:"Rejected",signal:"Existing install",time:"31 min"},
];

function AppInstallOffersManagement({action}:{action:(message:string)=>void}) {
  const [providers,setProviders]=useState(initialInstallProviders); const [tab,setTab]=useState<"Providers"|"Campaigns"|"Install events"|"Disputes">("Providers");
  const [query,setQuery]=useState(""); const [selected,setSelected]=useState<InstallProvider|null>(null); const [addOpen,setAddOpen]=useState(false); const [providerName,setProviderName]=useState(""); const [model,setModel]=useState<InstallProvider["model"]>("API"); const [decision,setDecision]=useState<"pause"|"activate"|"remove"|null>(null); const [reason,setReason]=useState("");
  const totalRevenue=providers.reduce((s,p)=>s+p.revenue,0), totalRewards=providers.reduce((s,p)=>s+p.rewards,0), verified=providers.reduce((s,p)=>s+p.verified,0), installs=providers.reduce((s,p)=>s+p.installs,0);
  const tone=(v:string)=>v==="Active"||v==="Healthy"||v==="Live"||v==="Approved"?"bg-emerald-100 text-emerald-700":v==="Paused"||v==="Delayed"||v==="Pending"||v==="Held"||v==="Review"?"bg-amber-100 text-amber-700":v==="Draft"||v==="Not tested"?"bg-slate-100 text-slate-600":"bg-rose-100 text-rose-700";
  const visible=providers.filter(p=>`${p.name} ${p.id} ${p.model}`.toLowerCase().includes(query.toLowerCase()));
  const addProvider=()=>{if(!providerName.trim())return; const p:InstallProvider={id:`OFP-${String(providers.length+1).padStart(3,"0")}`,name:providerName.trim(),model,status:"Draft",health:"Not tested",priority:providers.length+1,clicks:0,installs:0,verified:0,revenue:0,rewards:0};setProviders([...providers,p]);setProviderName("");setAddOpen(false);action(`${p.name} created as a mock provider draft`)};
  const confirm=()=>{if(!selected||!decision||!reason.trim())return;setProviders(items=>decision==="remove"?items.filter(p=>p.id!==selected.id):items.map(p=>p.id===selected.id?{...p,status:decision==="pause"?"Paused":"Active"}:p));action(`${selected.name}: mock ${decision} recorded`);setSelected(null);setDecision(null);setReason("")};
  return <>
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-2 text-xs text-slate-400">Earnings <span className="px-2">›</span> App Install Offers</div><h1 className="text-2xl font-bold tracking-tight md:text-[28px]">App Install Offers Management</h1><p className="mt-1 max-w-3xl text-sm text-slate-500">Manage providers, app campaigns, conversion milestones, install verification and reward disputes.</p></div><div className="flex flex-wrap gap-2"><button onClick={()=>action("Mock app-install report exported")} className="flex h-10 items-center gap-2 rounded-xl border bg-white px-4 text-xs font-bold"><Download size={15}/>Export</button><span className="flex h-10 items-center rounded-xl bg-violet-50 px-3 text-xs font-semibold text-violet-700">Step 10 · Mock data</span><button onClick={()=>setAddOpen(true)} className="flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white"><Plus size={15}/>Add provider</button></div></div>
    <div className="mb-5 rounded-2xl border border-violet-100 bg-violet-50 p-4 text-xs leading-5 text-violet-800"><b>Provider-independent setup:</b> add any current or future install/offerwall provider. No real SDK, API, credentials or tracking connection is installed.</div>
    <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">{[["Verified installs",verified.toLocaleString("en-IN"),PackageCheck,"bg-violet-50 text-violet-700"],["Verification rate",`${installs?((verified/installs)*100).toFixed(1):0}%`,CheckCircle2,"bg-emerald-50 text-emerald-700"],["Provider revenue",`₹${totalRevenue.toLocaleString("en-IN")}`,TrendingUp,"bg-blue-50 text-blue-700"],["User rewards",`₹${totalRewards.toLocaleString("en-IN")}`,BadgeIndianRupee,"bg-amber-50 text-amber-700"]].map(([l,v,I,s])=><article key={l as string} className="rounded-2xl border bg-white p-5 shadow-sm"><div className={`grid h-11 w-11 place-items-center rounded-xl ${s}`}><I size={20}/></div><p className="mt-4 text-xs text-slate-500">{l as string}</p><p className="mt-1 text-2xl font-bold">{v as string}</p></article>)}</section>
    <section className="mt-6 overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between"><div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">{(["Providers","Campaigns","Install events","Disputes"] as const).map(x=><button key={x} onClick={()=>setTab(x)} className={`rounded-lg px-4 py-2 text-xs font-bold ${tab===x?"bg-white text-violet-700 shadow-sm":"text-slate-500"}`}>{x}{x==="Disputes"&&<span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-[9px] text-rose-700">7</span>}</button>)}</div><label className="flex h-10 min-w-[260px] items-center gap-2 rounded-xl border px-3"><Search size={15} className="text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} aria-label="Search app install workspace" placeholder="Search providers or IDs" className="w-full bg-transparent text-xs outline-none"/></label></div>
    {tab==="Providers"?<div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left"><thead><tr className="bg-[#fafafd] text-[10px] uppercase tracking-wider text-slate-400">{["Provider","Priority / model","Status / health","Clicks / installs","Verified","Revenue / rewards","Action"].map(h=><th key={h} className="px-5 py-3">{h}</th>)}</tr></thead><tbody>{visible.map(p=><tr key={p.id} className="border-t text-xs hover:bg-violet-50/30"><td className="px-5 py-4"><b>{p.name}</b><p className="mt-1 font-mono text-[10px] text-violet-600">{p.id}</p></td><td className="px-5 py-4"><b>#{p.priority}</b><p className="text-[10px] text-slate-400">{p.model}</p></td><td className="px-5 py-4"><div className="flex gap-2"><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${tone(p.status)}`}>{p.status}</span><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${tone(p.health)}`}>{p.health}</span></div></td><td className="px-5 py-4"><b>{p.clicks.toLocaleString("en-IN")}</b><p className="text-[10px] text-slate-400">{p.installs.toLocaleString("en-IN")} installs</p></td><td className="px-5 py-4 font-bold">{p.verified.toLocaleString("en-IN")}</td><td className="px-5 py-4"><b>₹{p.revenue.toLocaleString("en-IN")}</b><p className="text-[10px] text-slate-400">₹{p.rewards.toLocaleString("en-IN")} rewards</p></td><td className="px-5 py-4"><button onClick={()=>setSelected(p)} className="h-9 rounded-lg border px-3 font-bold text-violet-600">Manage</button></td></tr>)}</tbody></table></div>:tab==="Campaigns"?<div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left"><thead><tr className="bg-[#fafafd] text-[10px] uppercase text-slate-400">{["App campaign","Provider","Platform","Conversion steps","User reward","Cap","Status"].map(h=><th key={h} className="px-5 py-3">{h}</th>)}</tr></thead><tbody>{installCampaigns.map(c=><tr key={c.id} className="border-t text-xs"><td className="px-5 py-4"><b>{c.app}</b><p className="font-mono text-[10px] text-violet-600">{c.id}</p></td><td className="px-5 py-4">{c.provider}</td><td className="px-5 py-4">{c.platform}</td><td className="px-5 py-4 font-semibold">{c.steps}</td><td className="px-5 py-4 font-bold">{c.payout}</td><td className="px-5 py-4">{c.cap}</td><td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${tone(c.status)}`}>{c.status}</span></td></tr>)}</tbody></table></div>:tab==="Install events"?<div className="overflow-x-auto"><table className="w-full min-w-[950px] text-left"><thead><tr className="bg-[#fafafd] text-[10px] uppercase text-slate-400">{["Event / user","App / milestone","Reward","Verification","Signal","Received"].map(h=><th key={h} className="px-5 py-3">{h}</th>)}</tr></thead><tbody>{installEvents.map(e=><tr key={e.id} className="border-t text-xs"><td className="px-5 py-4"><b>{e.user}</b><p className="font-mono text-[10px] text-violet-600">{e.id}</p></td><td className="px-5 py-4"><b>{e.app}</b><p className="text-[10px] text-slate-400">{e.milestone}</p></td><td className="px-5 py-4 font-bold">{e.reward}</td><td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${tone(e.status)}`}>{e.status}</span></td><td className="px-5 py-4">{e.signal}</td><td className="px-5 py-4 text-slate-400">{e.time}</td></tr>)}</tbody></table></div>:<div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">{[["Missing reward","3 open","Install verified; reward absent"],["Existing-install rejection","2 open","User disputes prior-install signal"],["Milestone mismatch","1 open","Required in-app event not matched"],["Attribution expired","1 open","Completion outside tracking window"]].map(x=><article key={x[0]} className="rounded-xl border p-4"><span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] font-bold text-rose-700">{x[1]}</span><h3 className="mt-3 text-sm font-bold">{x[0]}</h3><p className="mt-1 text-xs text-slate-500">{x[2]}</p><button onClick={()=>action(`${x[0]} mock queue opened`)} className="mt-4 text-xs font-bold text-violet-600">Review queue →</button></article>)}</div>}</section>
    <section className="mt-6 grid gap-6 xl:grid-cols-2"><article className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-bold">Install verification safeguards</h2><div className="mt-4 space-y-3">{["Signed server postback required before reward approval","Package/app ID and campaign ID must match","Existing installs and duplicate device events are rejected","Milestones remain pending until the provider confirms them"].map((x,i)=><div key={x} className="flex gap-3 rounded-xl bg-slate-50 p-3 text-xs"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700">{i+1}</span>{x}</div>)}</div></article><article className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-bold">Attribution &amp; fraud controls</h2><p className="mt-1 text-xs text-slate-500">Mock rules for later server-side implementation.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{[["Attribution window","Provider-defined expiry"],["Device integrity","Fingerprint + risk signals"],["Event idempotency","One credit per event ID"],["Reward state","Pending → verified → credited"]].map(x=><div key={x[0]} className="rounded-xl border p-3"><b className="text-xs">{x[0]}</b><p className="mt-1 text-[10px] text-slate-500">{x[1]}</p></div>)}</div></article></section>
    {selected&&<div className="fixed inset-0 z-[80] flex justify-end"><button aria-label="Close provider details" onClick={()=>setSelected(null)} className="absolute inset-0 bg-slate-950/40"/><aside role="dialog" aria-modal="true" className="relative h-full w-full max-w-[560px] overflow-y-auto bg-[#f7f8fc] p-5 shadow-2xl"><div className="flex items-center"><div><p className="text-xs text-slate-400">Install provider</p><h2 className="text-lg font-bold">{selected.name}</h2></div><button onClick={()=>setSelected(null)} className="ml-auto grid h-10 w-10 place-items-center"><X/></button></div><section className="mt-5 rounded-2xl border bg-white p-5"><h3 className="font-bold">Connection &amp; attribution</h3><div className="mt-4 grid gap-3 sm:grid-cols-2">{[["Integration",selected.model],["Priority",`#${selected.priority}`],["Postback","Signed callback placeholder"],["Attribution","Click ID + device match"]].map(x=><div key={x[0]} className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">{x[0]}</p><b className="text-xs">{x[1]}</b></div>)}</div><button onClick={()=>action("Mock provider configuration opened")} className="mt-4 h-10 rounded-xl border border-violet-200 px-4 text-xs font-bold text-violet-700">Edit configuration</button></section><section className="mt-4 rounded-2xl border bg-white p-5"><h3 className="font-bold">Guarded actions</h3><div className="mt-4 flex flex-wrap gap-2">{selected.status!=="Paused"&&<button onClick={()=>setDecision("pause")} className="h-10 rounded-xl border border-amber-200 px-4 text-xs font-bold text-amber-700">Pause</button>}{selected.status!=="Active"&&<button onClick={()=>setDecision("activate")} className="h-10 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white">Activate</button>}<button onClick={()=>setDecision("remove")} className="h-10 rounded-xl border border-rose-200 px-4 text-xs font-bold text-rose-700">Remove</button></div></section><div className="mt-4 rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-800">Credentials will be encrypted server-side later and must never appear in this mock client.</div></aside></div>}
    {addOpen&&<div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/50 p-4"><div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6"><h3 className="text-lg font-bold">Add install provider</h3><p className="mt-1 text-xs text-slate-500">Create a flexible inactive draft for any current or future provider.</p><label className="mt-5 block text-xs font-bold">Provider name<input autoFocus value={providerName} onChange={e=>setProviderName(e.target.value)} className="mt-2 h-11 w-full rounded-xl border px-3 font-normal outline-none" placeholder="Provider name"/></label><label className="mt-4 block text-xs font-bold">Integration type<select value={model} onChange={e=>setModel(e.target.value as InstallProvider["model"])} className="mt-2 h-11 w-full rounded-xl border bg-white px-3 font-normal"><option>API</option><option>SDK</option><option>Offerwall</option></select></label><div className="mt-4 rounded-xl bg-violet-50 p-3 text-[11px] text-violet-800">The provider stays Draft until credentials, attribution, postbacks, milestones and reward rules are tested.</div><div className="mt-6 flex justify-end gap-2"><button onClick={()=>setAddOpen(false)} className="h-10 rounded-xl border px-4 text-xs font-bold">Cancel</button><button disabled={!providerName.trim()} onClick={addProvider} className="h-10 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white disabled:opacity-40">Create draft</button></div></div></div>}
    {decision&&selected&&<div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/55 p-4"><div role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6"><h3 className="text-lg font-bold capitalize">Confirm {decision}</h3><p className="mt-2 text-xs text-slate-500">This mock action affects {selected.name} and requires an audit reason.</p><textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="Required reason" className="mt-4 h-24 w-full rounded-xl border p-3 text-xs"/><div className="mt-5 flex justify-end gap-2"><button onClick={()=>{setDecision(null);setReason("")}} className="h-10 rounded-xl border px-4 text-xs font-bold">Cancel</button><button disabled={!reason.trim()} onClick={confirm} className={`h-10 rounded-xl px-4 text-xs font-bold text-white disabled:opacity-40 ${decision==="remove"?"bg-rose-600":"bg-violet-600"}`}>Confirm</button></div></div></div>}
  </>;
}

type GameProvider = { id:string; name:string; model:"API"|"SDK"|"Offerwall"; status:"Active"|"Paused"|"Draft"; health:"Healthy"|"Delayed"|"Not tested"; priority:number; players:number; events:number; revenue:number; rewards:number };
const initialGameProviders:GameProvider[]=[
  {id:"GPR-001",name:"Play Partner Alpha",model:"SDK",status:"Active",health:"Healthy",priority:1,players:8420,events:26840,revenue:286400,rewards:174920},
  {id:"GPR-002",name:"Mission Network Beta",model:"API",status:"Active",health:"Delayed",priority:2,players:4960,events:12980,revenue:164800,rewards:101240},
  {id:"GPR-003",name:"Game Wall Demo",model:"Offerwall",status:"Paused",health:"Healthy",priority:3,players:2180,events:5840,revenue:68200,rewards:43160},
  {id:"GPR-004",name:"Future Provider Template",model:"API",status:"Draft",health:"Not tested",priority:4,players:0,events:0,revenue:0,rewards:0},
];
const gameCampaigns=[
  {id:"GAM-2841",game:"Puzzle Kingdom",provider:"Play Partner Alpha",mission:"Install → Level 10",reward:"₹85",progress:"3,482 / 5,000",expiry:"18 days",status:"Live"},
  {id:"GAM-2838",game:"Cricket Champs",provider:"Mission Network Beta",mission:"Complete 5 matches",reward:"₹48",progress:"1,926 / 3,000",expiry:"9 days",status:"Live"},
  {id:"GAM-2826",game:"Farm Story",provider:"Play Partner Alpha",mission:"Reach village level 15",reward:"₹120",progress:"2,000 / 2,000",expiry:"Expired",status:"Full"},
  {id:"GAM-2812",game:"Word Sprint",provider:"Game Wall Demo",mission:"Play on 3 separate days",reward:"₹35",progress:"884 / 1,500",expiry:"Paused",status:"Paused"},
];
const gameEvents=[
  {id:"GEV-91842",user:"Priya Reddy",game:"Puzzle Kingdom",milestone:"Reached level 10",reward:"₹85",status:"Approved",signal:"Signed event",time:"3 min ago"},
  {id:"GEV-91841",user:"Karthik Rao",game:"Cricket Champs",milestone:"Match 5 completed",reward:"₹48",status:"Pending",signal:"Awaiting postback",time:"11 min ago"},
  {id:"GEV-91840",user:"Sana Khan",game:"Farm Story",milestone:"Reached level 15",reward:"₹120",status:"Held",signal:"Fast progress review",time:"21 min ago"},
  {id:"GEV-91839",user:"Aarav Mehta",game:"Puzzle Kingdom",milestone:"Reached level 10",reward:"₹85",status:"Rejected",signal:"Duplicate device event",time:"34 min ago"},
];

function GamesManagement({action}:{action:(message:string)=>void}) {
  const [providers,setProviders]=useState(initialGameProviders); const [tab,setTab]=useState<"Providers"|"Games & missions"|"Player progress"|"Disputes">("Providers");
  const [query,setQuery]=useState(""); const [selected,setSelected]=useState<GameProvider|null>(null); const [addOpen,setAddOpen]=useState(false); const [providerName,setProviderName]=useState("");
  const [model,setModel]=useState<GameProvider["model"]>("API"); const [decision,setDecision]=useState<"pause"|"activate"|"remove"|null>(null); const [reason,setReason]=useState("");
  const tone=(v:string)=>v==="Active"||v==="Healthy"||v==="Live"||v==="Approved"?"bg-emerald-100 text-emerald-700":v==="Paused"||v==="Delayed"||v==="Pending"||v==="Held"?"bg-amber-100 text-amber-700":v==="Draft"||v==="Not tested"?"bg-slate-100 text-slate-600":"bg-rose-100 text-rose-700";
  const visible=providers.filter(p=>`${p.name} ${p.id} ${p.model}`.toLowerCase().includes(query.toLowerCase())); const totalPlayers=providers.reduce((s,p)=>s+p.players,0); const totalRevenue=providers.reduce((s,p)=>s+p.revenue,0); const totalRewards=providers.reduce((s,p)=>s+p.rewards,0);
  const addProvider=()=>{if(!providerName.trim())return;const p:GameProvider={id:`GPR-${String(providers.length+1).padStart(3,"0")}`,name:providerName.trim(),model,status:"Draft",health:"Not tested",priority:providers.length+1,players:0,events:0,revenue:0,rewards:0};setProviders([...providers,p]);setProviderName("");setAddOpen(false);action(`${p.name} created as a mock game-provider draft`)};
  const confirm=()=>{if(!selected||!decision||!reason.trim())return;setProviders(items=>decision==="remove"?items.filter(p=>p.id!==selected.id):items.map(p=>p.id===selected.id?{...p,status:decision==="pause"?"Paused":"Active"}:p));action(`${selected.name}: mock ${decision} recorded`);setSelected(null);setDecision(null);setReason("")};
  return <>
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-2 text-xs text-slate-400">Earnings <span className="px-2">›</span> Games</div><h1 className="text-2xl font-bold tracking-tight md:text-[28px]">Games Management</h1><p className="mt-1 max-w-3xl text-sm text-slate-500">Manage game providers, campaigns, missions, player milestones, expiries and reward disputes.</p></div><div className="flex flex-wrap gap-2"><button onClick={()=>action("Mock games report exported")} className="flex h-10 items-center gap-2 rounded-xl border bg-white px-4 text-xs font-bold"><Download size={15}/>Export</button><span className="flex h-10 items-center rounded-xl bg-violet-50 px-3 text-xs font-semibold text-violet-700">Step 11 · Mock data</span><button onClick={()=>setAddOpen(true)} className="flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white"><Plus size={15}/>Add provider</button></div></div>
    <div className="mb-5 rounded-2xl border border-violet-100 bg-violet-50 p-4 text-xs leading-5 text-violet-800"><b>Provider-independent setup:</b> add any current or future game network. No real SDK, API, credentials, tracking or playable game is connected.</div>
    <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">{[["Active players",totalPlayers.toLocaleString("en-IN"),Gamepad2,"bg-violet-50 text-violet-700"],["Milestone events",providers.reduce((s,p)=>s+p.events,0).toLocaleString("en-IN"),CheckCircle2,"bg-emerald-50 text-emerald-700"],["Provider revenue",`₹${totalRevenue.toLocaleString("en-IN")}`,TrendingUp,"bg-blue-50 text-blue-700"],["User rewards",`₹${totalRewards.toLocaleString("en-IN")}`,BadgeIndianRupee,"bg-amber-50 text-amber-700"]].map(([l,v,I,s])=><article key={l as string} className="rounded-2xl border bg-white p-5 shadow-sm"><div className={`grid h-11 w-11 place-items-center rounded-xl ${s}`}><I size={20}/></div><p className="mt-4 text-xs text-slate-500">{l as string}</p><p className="mt-1 text-2xl font-bold">{v as string}</p></article>)}</section>
    <section className="mt-6 overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between"><div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">{(["Providers","Games & missions","Player progress","Disputes"] as const).map(x=><button key={x} onClick={()=>setTab(x)} className={`rounded-lg px-4 py-2 text-xs font-bold ${tab===x?"bg-white text-violet-700 shadow-sm":"text-slate-500"}`}>{x}{x==="Disputes"&&<span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-[9px] text-rose-700">8</span>}</button>)}</div><label className="flex h-10 min-w-[260px] items-center gap-2 rounded-xl border px-3"><Search size={15} className="text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} aria-label="Search games workspace" placeholder="Search providers or IDs" className="w-full bg-transparent text-xs outline-none"/></label></div>
    {tab==="Providers"?<div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left"><thead><tr className="bg-[#fafafd] text-[10px] uppercase tracking-wider text-slate-400">{["Provider","Priority / model","Status / health","Active players","Milestone events","Revenue / rewards","Action"].map(h=><th key={h} className="px-5 py-3">{h}</th>)}</tr></thead><tbody>{visible.map(p=><tr key={p.id} className="border-t text-xs hover:bg-violet-50/30"><td className="px-5 py-4"><b>{p.name}</b><p className="mt-1 font-mono text-[10px] text-violet-600">{p.id}</p></td><td className="px-5 py-4"><b>#{p.priority}</b><p className="text-[10px] text-slate-400">{p.model}</p></td><td className="px-5 py-4"><div className="flex gap-2"><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${tone(p.status)}`}>{p.status}</span><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${tone(p.health)}`}>{p.health}</span></div></td><td className="px-5 py-4 font-bold">{p.players.toLocaleString("en-IN")}</td><td className="px-5 py-4 font-bold">{p.events.toLocaleString("en-IN")}</td><td className="px-5 py-4"><b>₹{p.revenue.toLocaleString("en-IN")}</b><p className="text-[10px] text-slate-400">₹{p.rewards.toLocaleString("en-IN")} rewards</p></td><td className="px-5 py-4"><button onClick={()=>setSelected(p)} className="h-9 rounded-lg border px-3 font-bold text-violet-600">Manage</button></td></tr>)}</tbody></table></div>:tab==="Games & missions"?<div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left"><thead><tr className="bg-[#fafafd] text-[10px] uppercase text-slate-400">{["Game campaign","Provider","Mission / milestone","User reward","Progress","Expiry","Status"].map(h=><th key={h} className="px-5 py-3">{h}</th>)}</tr></thead><tbody>{gameCampaigns.map(c=><tr key={c.id} className="border-t text-xs"><td className="px-5 py-4"><b>{c.game}</b><p className="font-mono text-[10px] text-violet-600">{c.id}</p></td><td className="px-5 py-4">{c.provider}</td><td className="px-5 py-4 font-semibold">{c.mission}</td><td className="px-5 py-4 font-bold">{c.reward}</td><td className="px-5 py-4">{c.progress}</td><td className="px-5 py-4">{c.expiry}</td><td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${tone(c.status)}`}>{c.status}</span></td></tr>)}</tbody></table></div>:tab==="Player progress"?<div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left"><thead><tr className="bg-[#fafafd] text-[10px] uppercase text-slate-400">{["Event / user","Game / milestone","Reward","Verification","Risk signal","Received"].map(h=><th key={h} className="px-5 py-3">{h}</th>)}</tr></thead><tbody>{gameEvents.map(e=><tr key={e.id} className="border-t text-xs"><td className="px-5 py-4"><b>{e.user}</b><p className="font-mono text-[10px] text-violet-600">{e.id}</p></td><td className="px-5 py-4"><b>{e.game}</b><p className="text-[10px] text-slate-400">{e.milestone}</p></td><td className="px-5 py-4 font-bold">{e.reward}</td><td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${tone(e.status)}`}>{e.status}</span></td><td className="px-5 py-4">{e.signal}</td><td className="px-5 py-4 text-slate-400">{e.time}</td></tr>)}</tbody></table></div>:<div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">{[["Missing milestone","3 open","Player reached target; event absent"],["Expired mission","2 open","Progress completed near campaign expiry"],["Progress mismatch","2 open","Provider and user progress differ"],["Reward held","1 open","Velocity or duplicate-device review"]].map(x=><article key={x[0]} className="rounded-xl border p-4"><span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] font-bold text-rose-700">{x[1]}</span><h3 className="mt-3 text-sm font-bold">{x[0]}</h3><p className="mt-1 text-xs text-slate-500">{x[2]}</p><button onClick={()=>action(`${x[0]} mock queue opened`)} className="mt-4 text-xs font-bold text-violet-600">Review queue →</button></article>)}</div>}</section>
    <section className="mt-6 grid gap-6 xl:grid-cols-2"><article className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-bold">Mission verification safeguards</h2><div className="mt-4 space-y-3">{["Signed server event required before milestone approval","Game, campaign, player and milestone IDs must match","Progress events are idempotent—one reward per milestone","Expired, duplicate and impossibly fast progress enters review"].map((x,i)=><div key={x} className="flex gap-3 rounded-xl bg-slate-50 p-3 text-xs"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700">{i+1}</span>{x}</div>)}</div></article><article className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-bold">Campaign lifecycle</h2><p className="mt-1 text-xs text-slate-500">Mock controls for later server-side implementation.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{[["Availability","Device, region and age rules"],["Progress window","Provider-defined expiry"],["Reward state","Pending → verified → credited"],["Fraud control","Device + velocity + event checks"]].map(x=><div key={x[0]} className="rounded-xl border p-3"><b className="text-xs">{x[0]}</b><p className="mt-1 text-[10px] text-slate-500">{x[1]}</p></div>)}</div></article></section>
    {selected&&<div className="fixed inset-0 z-[80] flex justify-end"><button aria-label="Close provider details" onClick={()=>setSelected(null)} className="absolute inset-0 bg-slate-950/40"/><aside role="dialog" aria-modal="true" className="relative h-full w-full max-w-[560px] overflow-y-auto bg-[#f7f8fc] p-5 shadow-2xl"><div className="flex items-center"><div><p className="text-xs text-slate-400">Game provider</p><h2 className="text-lg font-bold">{selected.name}</h2></div><button onClick={()=>setSelected(null)} className="ml-auto grid h-10 w-10 place-items-center"><X/></button></div><section className="mt-5 rounded-2xl border bg-white p-5"><h3 className="font-bold">Connection &amp; milestone mapping</h3><div className="mt-4 grid gap-3 sm:grid-cols-2">{[["Integration",selected.model],["Priority",`#${selected.priority}`],["Postback","Signed event placeholder"],["Player match","Click ID + provider player ID"]].map(x=><div key={x[0]} className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">{x[0]}</p><b className="text-xs">{x[1]}</b></div>)}</div><button onClick={()=>action("Mock game-provider configuration opened")} className="mt-4 h-10 rounded-xl border border-violet-200 px-4 text-xs font-bold text-violet-700">Edit configuration</button></section><section className="mt-4 rounded-2xl border bg-white p-5"><h3 className="font-bold">Guarded actions</h3><div className="mt-4 flex flex-wrap gap-2">{selected.status!=="Paused"&&<button onClick={()=>setDecision("pause")} className="h-10 rounded-xl border border-amber-200 px-4 text-xs font-bold text-amber-700">Pause</button>}{selected.status!=="Active"&&<button onClick={()=>setDecision("activate")} className="h-10 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white">Activate</button>}<button onClick={()=>setDecision("remove")} className="h-10 rounded-xl border border-rose-200 px-4 text-xs font-bold text-rose-700">Remove</button></div></section></aside></div>}
    {addOpen&&<div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/50 p-4"><div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6"><h3 className="text-lg font-bold">Add game provider</h3><p className="mt-1 text-xs text-slate-500">Create a flexible inactive draft for any current or future provider.</p><label className="mt-5 block text-xs font-bold">Provider name<input autoFocus value={providerName} onChange={e=>setProviderName(e.target.value)} className="mt-2 h-11 w-full rounded-xl border px-3 font-normal outline-none" placeholder="Provider name"/></label><label className="mt-4 block text-xs font-bold">Integration type<select value={model} onChange={e=>setModel(e.target.value as GameProvider["model"])} className="mt-2 h-11 w-full rounded-xl border bg-white px-3 font-normal"><option>API</option><option>SDK</option><option>Offerwall</option></select></label><div className="mt-4 rounded-xl bg-violet-50 p-3 text-[11px] text-violet-800">The provider stays Draft until credentials, player attribution, milestone postbacks, expiry and reward rules are tested.</div><div className="mt-6 flex justify-end gap-2"><button onClick={()=>setAddOpen(false)} className="h-10 rounded-xl border px-4 text-xs font-bold">Cancel</button><button disabled={!providerName.trim()} onClick={addProvider} className="h-10 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white disabled:opacity-40">Create draft</button></div></div></div>}
    {decision&&selected&&<div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/55 p-4"><div role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6"><h3 className="text-lg font-bold capitalize">Confirm {decision}</h3><p className="mt-2 text-xs text-slate-500">This mock action affects {selected.name} and requires an audit reason.</p><textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="Required reason" className="mt-4 h-24 w-full rounded-xl border p-3 text-xs"/><div className="mt-5 flex justify-end gap-2"><button onClick={()=>{setDecision(null);setReason("")}} className="h-10 rounded-xl border px-4 text-xs font-bold">Cancel</button><button disabled={!reason.trim()} onClick={confirm} className={`h-10 rounded-xl px-4 text-xs font-bold text-white disabled:opacity-40 ${decision==="remove"?"bg-rose-600":"bg-violet-600"}`}>Confirm</button></div></div></div>}
  </>;
}

type AffiliatePartner={id:string;name:string;model:"API"|"Feed"|"Affiliate link";status:string;health:string;priority:number;merchants:number;clicks:number;orders:number;commission:number;cashback:number};
const initialAffiliatePartners:AffiliatePartner[]=[
  {id:"AFP-001",name:"Affiliate Partner Alpha",model:"API",status:"Active",health:"Healthy",priority:1,merchants:84,clicks:48210,orders:2140,commission:328400,cashback:196800},
  {id:"AFP-002",name:"Commerce Network Beta",model:"Feed",status:"Active",health:"Delayed",priority:2,merchants:126,clicks:35740,orders:1428,commission:214600,cashback:128700},
  {id:"AFP-003",name:"Direct Merchant Links",model:"Affiliate link",status:"Paused",health:"Healthy",priority:3,merchants:18,clicks:9640,orders:386,commission:72100,cashback:43200},
  {id:"AFP-004",name:"Future Network Template",model:"API",status:"Draft",health:"Not tested",priority:4,merchants:0,clicks:0,orders:0,commission:0,cashback:0},
];
const shopMerchants=[
  {id:"MER-201",name:"Electronics Store",category:"Electronics",rate:"Up to 6%",tracking:"Feed + deep link",offers:"2,184",status:"Live"},
  {id:"MER-202",name:"Fashion Marketplace",category:"Fashion",rate:"Up to 12%",tracking:"API",offers:"8,420",status:"Live"},
  {id:"MER-203",name:"Travel Partner",category:"Travel",rate:"₹180–₹650",tracking:"Deep link",offers:"346",status:"Review"},
  {id:"MER-204",name:"Grocery Store",category:"Grocery",rate:"Up to 4%",tracking:"Feed",offers:"1,906",status:"Paused"},
];
const shopConversions=[
  {id:"ORD-78421",user:"Priya Reddy",merchant:"Fashion Marketplace",sale:"₹2,499",commission:"₹300",cashback:"₹180",status:"Pending",signal:"Return window",time:"6 min"},
  {id:"ORD-78420",user:"Aarav Mehta",merchant:"Electronics Store",sale:"₹18,990",commission:"₹760",cashback:"₹456",status:"Tracked",signal:"Click ID matched",time:"14 min"},
  {id:"ORD-78419",user:"Sana Khan",merchant:"Travel Partner",sale:"₹7,240",commission:"₹420",cashback:"₹252",status:"Confirmed",signal:"Provider approved",time:"31 min"},
  {id:"ORD-78418",user:"Karthik Rao",merchant:"Grocery Store",sale:"₹1,180",commission:"₹47",cashback:"₹28",status:"Rejected",signal:"Coupon conflict",time:"1 hr"},
];

function ShopEarnManagement({action}:{action:(message:string)=>void}){
  const [partners,setPartners]=useState(initialAffiliatePartners); const [tab,setTab]=useState<"Networks"|"Stores & deals"|"Conversions"|"Claims">("Networks"); const [query,setQuery]=useState(""); const [selected,setSelected]=useState<AffiliatePartner|null>(null); const [addOpen,setAddOpen]=useState(false); const [name,setName]=useState(""); const [model,setModel]=useState<AffiliatePartner["model"]>("API"); const [decision,setDecision]=useState<"pause"|"activate"|"remove"|null>(null); const [reason,setReason]=useState("");
  const commission=partners.reduce((s,p)=>s+p.commission,0), cashback=partners.reduce((s,p)=>s+p.cashback,0), clicks=partners.reduce((s,p)=>s+p.clicks,0), orders=partners.reduce((s,p)=>s+p.orders,0);
  const tone=(v:string)=>v==="Active"||v==="Healthy"||v==="Live"||v==="Confirmed"||v==="Tracked"?"bg-emerald-100 text-emerald-700":v==="Paused"||v==="Delayed"||v==="Pending"||v==="Review"?"bg-amber-100 text-amber-700":v==="Draft"||v==="Not tested"?"bg-slate-100 text-slate-600":"bg-rose-100 text-rose-700";
  const visible=partners.filter(p=>`${p.name} ${p.id} ${p.model}`.toLowerCase().includes(query.toLowerCase()));
  const addPartner=()=>{if(!name.trim())return;const p:AffiliatePartner={id:`AFP-${String(partners.length+1).padStart(3,"0")}`,name:name.trim(),model,status:"Draft",health:"Not tested",priority:partners.length+1,merchants:0,clicks:0,orders:0,commission:0,cashback:0};setPartners([...partners,p]);setName("");setAddOpen(false);action(`${p.name} created as a mock network draft`)};
  const confirm=()=>{if(!selected||!decision||!reason.trim())return;setPartners(x=>decision==="remove"?x.filter(p=>p.id!==selected.id):x.map(p=>p.id===selected.id?{...p,status:decision==="pause"?"Paused":"Active"}:p));action(`${selected.name}: mock ${decision} recorded`);setSelected(null);setDecision(null);setReason("")};
  return <>
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-2 text-xs text-slate-400">Shop &amp; Grow <span className="px-2">›</span> Shop &amp; Earn</div><h1 className="text-2xl font-bold tracking-tight md:text-[28px]">Shop &amp; Earn Management</h1><p className="mt-1 max-w-3xl text-sm text-slate-500">Manage affiliate networks, merchants, deal feeds, tracked orders, cashback and commission reconciliation.</p></div><div className="flex flex-wrap gap-2"><button onClick={()=>action("Mock affiliate report exported")} className="flex h-10 items-center gap-2 rounded-xl border bg-white px-4 text-xs font-bold"><Download size={15}/>Export</button><span className="flex h-10 items-center rounded-xl bg-violet-50 px-3 text-xs font-semibold text-violet-700">Step 12 · Mock data</span><button onClick={()=>setAddOpen(true)} className="flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white"><Plus size={15}/>Add network</button></div></div>
    <div className="mb-5 rounded-2xl border border-violet-100 bg-violet-50 p-4 text-xs leading-5 text-violet-800"><b>Network-independent setup:</b> add any current or future affiliate network, direct merchant, product feed or deep-link partner. No real credentials, links or commissions are connected.</div>
    <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">{[["Tracked orders",orders.toLocaleString("en-IN"),ShoppingBag,"bg-violet-50 text-violet-700"],["Conversion rate",`${clicks?((orders/clicks)*100).toFixed(1):0}%`,TrendingUp,"bg-emerald-50 text-emerald-700"],["Gross commission",`₹${commission.toLocaleString("en-IN")}`,BadgeIndianRupee,"bg-blue-50 text-blue-700"],["Estimated cashback",`₹${cashback.toLocaleString("en-IN")}`,HandCoins,"bg-amber-50 text-amber-700"]].map(([l,v,I,s])=><article key={l as string} className="rounded-2xl border bg-white p-5 shadow-sm"><div className={`grid h-11 w-11 place-items-center rounded-xl ${s}`}><I size={20}/></div><p className="mt-4 text-xs text-slate-500">{l as string}</p><p className="mt-1 text-2xl font-bold">{v as string}</p></article>)}</section>
    <section className="mt-6 overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between"><div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">{(["Networks","Stores & deals","Conversions","Claims"] as const).map(x=><button key={x} onClick={()=>setTab(x)} className={`rounded-lg px-4 py-2 text-xs font-bold ${tab===x?"bg-white text-violet-700 shadow-sm":"text-slate-500"}`}>{x}{x==="Claims"&&<span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-[9px] text-rose-700">9</span>}</button>)}</div><label className="flex h-10 min-w-[260px] items-center gap-2 rounded-xl border px-3"><Search size={15} className="text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} aria-label="Search Shop and Earn workspace" placeholder="Search networks or IDs" className="w-full bg-transparent text-xs outline-none"/></label></div>
    {tab==="Networks"?<div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left"><thead><tr className="bg-[#fafafd] text-[10px] uppercase text-slate-400">{["Network","Priority / model","Status / health","Stores","Clicks / orders","Commission / cashback","Action"].map(h=><th key={h} className="px-5 py-3">{h}</th>)}</tr></thead><tbody>{visible.map(p=><tr key={p.id} className="border-t text-xs"><td className="px-5 py-4"><b>{p.name}</b><p className="font-mono text-[10px] text-violet-600">{p.id}</p></td><td className="px-5 py-4"><b>#{p.priority}</b><p className="text-[10px] text-slate-400">{p.model}</p></td><td className="px-5 py-4"><div className="flex gap-2"><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${tone(p.status)}`}>{p.status}</span><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${tone(p.health)}`}>{p.health}</span></div></td><td className="px-5 py-4 font-bold">{p.merchants}</td><td className="px-5 py-4"><b>{p.clicks.toLocaleString("en-IN")}</b><p className="text-[10px] text-slate-400">{p.orders.toLocaleString("en-IN")} orders</p></td><td className="px-5 py-4"><b>₹{p.commission.toLocaleString("en-IN")}</b><p className="text-[10px] text-slate-400">₹{p.cashback.toLocaleString("en-IN")} cashback</p></td><td className="px-5 py-4"><button onClick={()=>setSelected(p)} className="h-9 rounded-lg border px-3 font-bold text-violet-600">Manage</button></td></tr>)}</tbody></table></div>:tab==="Stores & deals"?<div className="overflow-x-auto"><table className="w-full min-w-[950px] text-left"><thead><tr className="bg-[#fafafd] text-[10px] uppercase text-slate-400">{["Store","Category","Cashback rule","Tracking","Active deals","Status"].map(h=><th key={h} className="px-5 py-3">{h}</th>)}</tr></thead><tbody>{shopMerchants.map(m=><tr key={m.id} className="border-t text-xs"><td className="px-5 py-4"><b>{m.name}</b><p className="font-mono text-[10px] text-violet-600">{m.id}</p></td><td className="px-5 py-4">{m.category}</td><td className="px-5 py-4 font-bold">{m.rate}</td><td className="px-5 py-4">{m.tracking}</td><td className="px-5 py-4">{m.offers}</td><td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${tone(m.status)}`}>{m.status}</span></td></tr>)}</tbody></table></div>:tab==="Conversions"?<div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left"><thead><tr className="bg-[#fafafd] text-[10px] uppercase text-slate-400">{["Order / user","Merchant","Sale","Commission","Cashback","Status / signal","Received"].map(h=><th key={h} className="px-5 py-3">{h}</th>)}</tr></thead><tbody>{shopConversions.map(o=><tr key={o.id} className="border-t text-xs"><td className="px-5 py-4"><b>{o.user}</b><p className="font-mono text-[10px] text-violet-600">{o.id}</p></td><td className="px-5 py-4">{o.merchant}</td><td className="px-5 py-4 font-bold">{o.sale}</td><td className="px-5 py-4">{o.commission}</td><td className="px-5 py-4 font-bold">{o.cashback}</td><td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${tone(o.status)}`}>{o.status}</span><p className="mt-1 text-[10px] text-slate-400">{o.signal}</p></td><td className="px-5 py-4 text-slate-400">{o.time}</td></tr>)}</tbody></table></div>:<div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">{[["Missing cashback","4 open","Order exists but tracking is absent"],["Incorrect amount","2 open","Expected rate differs from tracked value"],["Rejected order","2 open","Merchant rejection needs evidence review"],["Delayed confirmation","1 open","Return window or provider approval overdue"]].map(x=><article key={x[0]} className="rounded-xl border p-4"><span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] font-bold text-rose-700">{x[1]}</span><h3 className="mt-3 text-sm font-bold">{x[0]}</h3><p className="mt-1 text-xs text-slate-500">{x[2]}</p><button onClick={()=>action(`${x[0]} mock queue opened`)} className="mt-4 text-xs font-bold text-violet-600">Review queue →</button></article>)}</div>}</section>
    <section className="mt-6 grid gap-6 xl:grid-cols-2"><article className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-bold">Cashback safeguards</h2><div className="mt-4 space-y-3">{["Show estimated cashback until the affiliate network confirms the order","Keep rewards pending through cancellation and return windows","Credit only once per provider order or transaction ID","Record coupon conflicts, exclusions and merchant rejection reasons"].map((x,i)=><div key={x} className="flex gap-3 rounded-xl bg-slate-50 p-3 text-xs"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700">{i+1}</span>{x}</div>)}</div></article><article className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-bold">Commission reconciliation</h2><p className="mt-1 text-xs text-slate-500">Mock controls for the later server-side ledger.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{[["Tracked","Click and order matched"],["Pending","Return window open"],["Confirmed","Provider commission approved"],["Payable","Cashback released to wallet"]].map(x=><div key={x[0]} className="rounded-xl border p-3"><b className="text-xs">{x[0]}</b><p className="mt-1 text-[10px] text-slate-500">{x[1]}</p></div>)}</div></article></section>
    {selected&&<div className="fixed inset-0 z-[80] flex justify-end"><button aria-label="Close network details" onClick={()=>setSelected(null)} className="absolute inset-0 bg-slate-950/40"/><aside role="dialog" aria-modal="true" className="relative h-full w-full max-w-[560px] overflow-y-auto bg-[#f7f8fc] p-5 shadow-2xl"><div className="flex items-center"><div><p className="text-xs text-slate-400">Affiliate network</p><h2 className="text-lg font-bold">{selected.name}</h2></div><button onClick={()=>setSelected(null)} className="ml-auto grid h-10 w-10 place-items-center"><X/></button></div><section className="mt-5 rounded-2xl border bg-white p-5"><h3 className="font-bold">Connection &amp; tracking</h3><div className="mt-4 grid gap-3 sm:grid-cols-2">{[["Integration",selected.model],["Priority",`#${selected.priority}`],["Product feed","Configurable placeholder"],["Attribution","Click/sub-ID + order ID"]].map(x=><div key={x[0]} className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">{x[0]}</p><b className="text-xs">{x[1]}</b></div>)}</div><button onClick={()=>action("Mock affiliate configuration opened")} className="mt-4 h-10 rounded-xl border border-violet-200 px-4 text-xs font-bold text-violet-700">Edit configuration</button></section><section className="mt-4 rounded-2xl border bg-white p-5"><h3 className="font-bold">Guarded actions</h3><div className="mt-4 flex flex-wrap gap-2">{selected.status!=="Paused"&&<button onClick={()=>setDecision("pause")} className="h-10 rounded-xl border border-amber-200 px-4 text-xs font-bold text-amber-700">Pause</button>}{selected.status!=="Active"&&<button onClick={()=>setDecision("activate")} className="h-10 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white">Activate</button>}<button onClick={()=>setDecision("remove")} className="h-10 rounded-xl border border-rose-200 px-4 text-xs font-bold text-rose-700">Remove</button></div></section><div className="mt-4 rounded-xl bg-amber-50 p-4 text-xs text-amber-800">Credentials and signing secrets will be encrypted server-side later and never displayed in this client.</div></aside></div>}
    {addOpen&&<div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/50 p-4"><div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6"><h3 className="text-lg font-bold">Add affiliate network</h3><p className="mt-1 text-xs text-slate-500">Create an inactive draft for any network, feed or direct merchant.</p><label className="mt-5 block text-xs font-bold">Network name<input autoFocus value={name} onChange={e=>setName(e.target.value)} className="mt-2 h-11 w-full rounded-xl border px-3 font-normal" placeholder="Network or merchant name"/></label><label className="mt-4 block text-xs font-bold">Integration type<select value={model} onChange={e=>setModel(e.target.value as AffiliatePartner["model"])} className="mt-2 h-11 w-full rounded-xl border bg-white px-3 font-normal"><option>API</option><option>Feed</option><option>Affiliate link</option></select></label><div className="mt-4 rounded-xl bg-violet-50 p-3 text-[11px] text-violet-800">The network stays Draft until tracking, feeds, commission rules, exclusions and callbacks are tested.</div><div className="mt-6 flex justify-end gap-2"><button onClick={()=>setAddOpen(false)} className="h-10 rounded-xl border px-4 text-xs font-bold">Cancel</button><button disabled={!name.trim()} onClick={addPartner} className="h-10 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white disabled:opacity-40">Create draft</button></div></div></div>}
    {decision&&selected&&<div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/55 p-4"><div role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6"><h3 className="text-lg font-bold capitalize">Confirm {decision}</h3><p className="mt-2 text-xs text-slate-500">This mock action affects {selected.name} and requires an audit reason.</p><textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="Required reason" className="mt-4 h-24 w-full rounded-xl border p-3 text-xs"/><div className="mt-5 flex justify-end gap-2"><button onClick={()=>{setDecision(null);setReason("")}} className="h-10 rounded-xl border px-4 text-xs font-bold">Cancel</button><button disabled={!reason.trim()} onClick={confirm} className={`h-10 rounded-xl px-4 text-xs font-bold text-white disabled:opacity-40 ${decision==="remove"?"bg-rose-600":"bg-violet-600"}`}>Confirm</button></div></div></div>}
  </>;
}

function MiniLine({ values }: { values: number[] }) {
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${100 - v}`).join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-[250px] w-full overflow-visible" role="img" aria-labelledby="revenue-chart-title revenue-chart-description">
      <title id="revenue-chart-title">Revenue and rewards trend</title>
      <desc id="revenue-chart-description">The mock trend rises overall across the selected period, from {values[0]} to {values[values.length - 1]} relative units, with {values.length} plotted observations.</desc>
      {[20, 40, 60, 80].map((y) => (
        <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="#e9e7ef" strokeWidth=".4" />
      ))}
      <defs>
        <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7c4dff" stopOpacity=".28" />
          <stop offset="1" stopColor="#7c4dff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,100 ${points} 100,100`} fill="url(#area)" />
      <polyline points={points} fill="none" stroke="#7545e8" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      {values.map((v, i) => (
        <circle key={i} cx={(i / (values.length - 1)) * 100} cy={100 - v} r="1.2" fill="white" stroke="#7545e8" strokeWidth=".8" />
      ))}
    </svg>
  );
}

type ReferralCampaign={id:string;name:string;status:"Active"|"Paused"|"Draft";inviter:number;friend:number;milestone:string;invites:number;qualified:number;cost:number};
const initialReferralCampaigns:ReferralCampaign[]=[
  {id:"REF-C01",name:"Standard invite reward",status:"Active",inviter:25,friend:10,milestone:"KYC + ₹50 verified earnings",invites:8420,qualified:2146,cost:75110},
  {id:"REF-C02",name:"Festival referral boost",status:"Paused",inviter:50,friend:20,milestone:"KYC + first withdrawal",invites:3180,qualified:724,cost:50680},
  {id:"REF-C03",name:"Creator partner pilot",status:"Draft",inviter:75,friend:15,milestone:"3 verified tasks",invites:0,qualified:0,cost:0},
];
const referralEvents=[
  {id:"INV-90841",inviter:"Aarav Mehta",friend:"Neha Verma",campaign:"Standard invite reward",stage:"Qualified",reward:"₹35",signal:"Unique device and UPI",time:"8 min"},
  {id:"INV-90840",inviter:"Priya Reddy",friend:"Rohan Reddy",campaign:"Standard invite reward",stage:"Held",reward:"₹35",signal:"Shared device detected",time:"16 min"},
  {id:"INV-90839",inviter:"Sana Khan",friend:"Farah Khan",campaign:"Festival referral boost",stage:"Pending",reward:"₹70",signal:"Waiting for first withdrawal",time:"42 min"},
  {id:"INV-90838",inviter:"Karthik Rao",friend:"Arjun Rao",campaign:"Standard invite reward",stage:"Rejected",reward:"₹35",signal:"Duplicate payout identity",time:"1 hr"},
];

function ReferralsManagement({action}:{action:(message:string)=>void}){
  const [campaigns,setCampaigns]=useState(initialReferralCampaigns); const [tab,setTab]=useState<"Campaigns"|"Invites & rewards"|"Risk review"|"Disputes">("Campaigns"); const [query,setQuery]=useState(""); const [selected,setSelected]=useState<ReferralCampaign|null>(null); const [addOpen,setAddOpen]=useState(false); const [name,setName]=useState(""); const [decision,setDecision]=useState<"pause"|"activate"|"retire"|null>(null); const [reason,setReason]=useState("");
  const invites=campaigns.reduce((s,c)=>s+c.invites,0), qualified=campaigns.reduce((s,c)=>s+c.qualified,0), cost=campaigns.reduce((s,c)=>s+c.cost,0); const conversion=invites?((qualified/invites)*100).toFixed(1):"0.0";
  const tone=(v:string)=>v==="Active"||v==="Qualified"?"bg-emerald-100 text-emerald-700":v==="Paused"||v==="Pending"?"bg-amber-100 text-amber-700":v==="Draft"?"bg-slate-100 text-slate-600":"bg-rose-100 text-rose-700";
  const visible=campaigns.filter(c=>`${c.name} ${c.id} ${c.milestone}`.toLowerCase().includes(query.toLowerCase()));
  const addCampaign=()=>{if(!name.trim())return;const c:ReferralCampaign={id:`REF-C${String(campaigns.length+1).padStart(2,"0")}`,name:name.trim(),status:"Draft",inviter:25,friend:10,milestone:"KYC + verified earning milestone",invites:0,qualified:0,cost:0};setCampaigns([...campaigns,c]);setName("");setAddOpen(false);action(`${c.name} created as a mock draft`)};
  const confirm=()=>{if(!selected||!decision||!reason.trim())return;setCampaigns(x=>decision==="retire"?x.filter(c=>c.id!==selected.id):x.map(c=>c.id===selected.id?{...c,status:decision==="pause"?"Paused":"Active"}:c));action(`${selected.name}: mock ${decision} recorded`);setSelected(null);setDecision(null);setReason("")};
  return <>
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-2 text-xs text-slate-400">Shop &amp; Grow <span className="px-2">›</span> Referrals</div><h1 className="text-2xl font-bold tracking-tight md:text-[28px]">Referrals Management</h1><p className="mt-1 max-w-3xl text-sm text-slate-500">Create referral campaigns, verify qualifying milestones, control rewards, investigate abuse and resolve claims.</p></div><div className="flex flex-wrap gap-2"><button onClick={()=>action("Mock referral report exported")} className="flex h-10 items-center gap-2 rounded-xl border bg-white px-4 text-xs font-bold"><Download size={15}/>Export</button><span className="flex h-10 items-center rounded-xl bg-violet-50 px-3 text-xs font-semibold text-violet-700">Step 13 · Mock data</span><button onClick={()=>setAddOpen(true)} className="flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white"><Plus size={15}/>New campaign</button></div></div>
    <div className="mb-5 rounded-2xl border border-violet-100 bg-violet-50 p-4 text-xs leading-5 text-violet-800"><b>Safe referral model:</b> an invite alone never creates a reward. A unique new user must pass identity, device and payout checks and complete the campaign&apos;s verified milestone first.</div>
    <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">{[["Invites created",invites.toLocaleString("en-IN"),Users,"bg-violet-50 text-violet-700"],["Qualified referrals",qualified.toLocaleString("en-IN"),UserCheck,"bg-emerald-50 text-emerald-700"],["Qualification rate",`${conversion}%`,TrendingUp,"bg-blue-50 text-blue-700"],["Rewards issued",`₹${cost.toLocaleString("en-IN")}`,Gift,"bg-amber-50 text-amber-700"]].map(([l,v,I,s])=><article key={l as string} className="rounded-2xl border bg-white p-5 shadow-sm"><div className={`grid h-11 w-11 place-items-center rounded-xl ${s}`}><I size={20}/></div><p className="mt-4 text-xs text-slate-500">{l as string}</p><p className="mt-1 text-2xl font-bold">{v as string}</p></article>)}</section>
    <section className="mt-6 overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between"><div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">{(["Campaigns","Invites & rewards","Risk review","Disputes"] as const).map(x=><button key={x} onClick={()=>setTab(x)} className={`rounded-lg px-4 py-2 text-xs font-bold ${tab===x?"bg-white text-violet-700 shadow-sm":"text-slate-500"}`}>{x}{x==="Risk review"&&<span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-[9px] text-rose-700">14</span>}</button>)}</div><label className="flex h-10 min-w-[260px] items-center gap-2 rounded-xl border px-3"><Search size={15} className="text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} aria-label="Search referrals" placeholder="Search campaigns or invite IDs" className="w-full bg-transparent text-xs outline-none"/></label></div>
    {tab==="Campaigns"?<div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left"><thead><tr className="bg-[#fafafd] text-[10px] uppercase text-slate-400">{["Campaign","Status","Reward split","Qualification milestone","Invites / qualified","Reward cost","Action"].map(h=><th key={h} className="px-5 py-3">{h}</th>)}</tr></thead><tbody>{visible.map(c=><tr key={c.id} className="border-t text-xs"><td className="px-5 py-4"><b>{c.name}</b><p className="font-mono text-[10px] text-violet-600">{c.id}</p></td><td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${tone(c.status)}`}>{c.status}</span></td><td className="px-5 py-4"><b>₹{c.inviter} inviter</b><p className="text-[10px] text-slate-400">₹{c.friend} new user</p></td><td className="px-5 py-4">{c.milestone}</td><td className="px-5 py-4"><b>{c.invites.toLocaleString("en-IN")}</b><p className="text-[10px] text-slate-400">{c.qualified.toLocaleString("en-IN")} qualified</p></td><td className="px-5 py-4 font-bold">₹{c.cost.toLocaleString("en-IN")}</td><td className="px-5 py-4"><button onClick={()=>setSelected(c)} className="h-9 rounded-lg border px-3 font-bold text-violet-600">Manage</button></td></tr>)}</tbody></table></div>:tab==="Invites & rewards"?<div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left"><thead><tr className="bg-[#fafafd] text-[10px] uppercase text-slate-400">{["Invite / inviter","Referred user","Campaign","Stage","Reward","Verification signal","Received"].map(h=><th key={h} className="px-5 py-3">{h}</th>)}</tr></thead><tbody>{referralEvents.map(e=><tr key={e.id} className="border-t text-xs"><td className="px-5 py-4"><b>{e.inviter}</b><p className="font-mono text-[10px] text-violet-600">{e.id}</p></td><td className="px-5 py-4">{e.friend}</td><td className="px-5 py-4">{e.campaign}</td><td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${tone(e.stage)}`}>{e.stage}</span></td><td className="px-5 py-4 font-bold">{e.reward}</td><td className="px-5 py-4">{e.signal}</td><td className="px-5 py-4 text-slate-400">{e.time}</td></tr>)}</tbody></table></div>:<div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">{(tab==="Risk review"?[["Shared device","6 cases","Inviter and referred account share a fingerprint"],["Payout identity reuse","4 cases","UPI or bank identity appears on multiple accounts"],["Velocity anomaly","3 cases","Unusual invite and qualification speed"],["Self-referral pattern","1 case","Linked account evidence needs review"]]:[["Reward not received","5 open","Milestone completed but reward is pending"],["Invite not attributed","3 open","Referral code or link attribution disputed"],["Incorrect campaign","2 open","Expected promotional reward differs"],["Rejected qualification","2 open","User submitted evidence for review"]]).map(x=><article key={x[0]} className="rounded-xl border p-4"><span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] font-bold text-rose-700">{x[1]}</span><h3 className="mt-3 text-sm font-bold">{x[0]}</h3><p className="mt-1 text-xs text-slate-500">{x[2]}</p><button onClick={()=>action(`${x[0]} mock queue opened`)} className="mt-4 text-xs font-bold text-violet-600">Review queue →</button></article>)}</div>}</section>
    <section className="mt-6 grid gap-6 xl:grid-cols-2"><article className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-bold">Qualification safeguards</h2><div className="mt-4 space-y-3">{["Reward only after the configured milestone is verified server-side","Block self-referrals and linked device, payout or identity reuse","Lock one attribution source per genuinely new account","Hold both rewards while a fraud review or reversal is open"].map((x,i)=><div key={x} className="flex gap-3 rounded-xl bg-slate-50 p-3 text-xs"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700">{i+1}</span>{x}</div>)}</div></article><article className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-bold">Referral economics</h2><p className="mt-1 text-xs text-slate-500">Mock controls to keep acquisition cost sustainable.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{[["Reward liability",`₹${cost.toLocaleString("en-IN")}`],["Average per qualified",qualified?`₹${Math.round(cost/qualified)}`:"₹0"],["Qualification rate",`${conversion}%`],["Fraud hold rate","1.8%"]].map(x=><div key={x[0]} className="rounded-xl border p-3"><p className="text-[10px] text-slate-400">{x[0]}</p><b className="text-sm">{x[1]}</b></div>)}</div></article></section>
    {selected&&<div className="fixed inset-0 z-[80] flex justify-end"><button aria-label="Close campaign details" onClick={()=>setSelected(null)} className="absolute inset-0 bg-slate-950/40"/><aside role="dialog" aria-modal="true" className="relative h-full w-full max-w-[560px] overflow-y-auto bg-[#f7f8fc] p-5 shadow-2xl"><div className="flex items-center"><div><p className="text-xs text-slate-400">Referral campaign</p><h2 className="text-lg font-bold">{selected.name}</h2></div><button onClick={()=>setSelected(null)} className="ml-auto grid h-10 w-10 place-items-center"><X/></button></div><section className="mt-5 rounded-2xl border bg-white p-5"><h3 className="font-bold">Rules &amp; rewards</h3><div className="mt-4 grid gap-3 sm:grid-cols-2">{[["Inviter reward",`₹${selected.inviter}`],["New-user reward",`₹${selected.friend}`],["Milestone",selected.milestone],["Attribution","Referral code + immutable invite ID"]].map(x=><div key={x[0]} className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">{x[0]}</p><b className="text-xs">{x[1]}</b></div>)}</div><button onClick={()=>action("Mock referral rule editor opened")} className="mt-4 h-10 rounded-xl border border-violet-200 px-4 text-xs font-bold text-violet-700">Edit rules</button></section><section className="mt-4 rounded-2xl border bg-white p-5"><h3 className="font-bold">Guarded actions</h3><div className="mt-4 flex flex-wrap gap-2">{selected.status!=="Paused"&&<button onClick={()=>setDecision("pause")} className="h-10 rounded-xl border border-amber-200 px-4 text-xs font-bold text-amber-700">Pause</button>}{selected.status!=="Active"&&<button onClick={()=>setDecision("activate")} className="h-10 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white">Activate</button>}<button onClick={()=>setDecision("retire")} className="h-10 rounded-xl border border-rose-200 px-4 text-xs font-bold text-rose-700">Retire</button></div></section><div className="mt-4 rounded-xl bg-amber-50 p-4 text-xs text-amber-800">Pausing a campaign stops new attributions; already-qualified obligations remain in the immutable reward ledger.</div></aside></div>}
    {addOpen&&<div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/50 p-4"><div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6"><h3 className="text-lg font-bold">Create referral campaign</h3><p className="mt-1 text-xs text-slate-500">Start with an inactive draft. Rewards cannot run until rules and checks are reviewed.</p><label className="mt-5 block text-xs font-bold">Campaign name<input autoFocus value={name} onChange={e=>setName(e.target.value)} className="mt-2 h-11 w-full rounded-xl border px-3 font-normal" placeholder="Campaign name"/></label><div className="mt-4 rounded-xl bg-violet-50 p-3 text-[11px] text-violet-800">Default mock split: ₹25 inviter + ₹10 new user after KYC and verified earnings.</div><div className="mt-6 flex justify-end gap-2"><button onClick={()=>setAddOpen(false)} className="h-10 rounded-xl border px-4 text-xs font-bold">Cancel</button><button disabled={!name.trim()} onClick={addCampaign} className="h-10 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white disabled:opacity-40">Create draft</button></div></div></div>}
    {decision&&selected&&<div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/50 p-4"><div role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6"><h3 className="text-lg font-bold capitalize">{decision} campaign?</h3><p className="mt-2 text-xs text-slate-500">This mock action requires a reason and will be recorded in the future audit log.</p><textarea autoFocus value={reason} onChange={e=>setReason(e.target.value)} className="mt-4 min-h-24 w-full rounded-xl border p-3 text-xs" placeholder="Required reason"/><div className="mt-4 flex justify-end gap-2"><button onClick={()=>{setDecision(null);setReason("")}} className="h-10 rounded-xl border px-4 text-xs font-bold">Cancel</button><button disabled={!reason.trim()} onClick={confirm} className="h-10 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white disabled:opacity-40">Confirm</button></div></div></div>}
  </>;
}

type SupportTicket={id:string;user:string;subject:string;category:string;channel:string;language:string;priority:"Urgent"|"High"|"Normal"|"Low";status:"New"|"AI handling"|"Waiting for user"|"Escalated"|"Resolved";sentiment:string;age:string;sla:string;summary:string;next:string};
const initialSupportTickets:SupportTicket[]=[
  {id:"SUP-8421",user:"Ananya Rao",subject:"Withdrawal not received after approval",category:"Withdrawals & payouts",channel:"In-app",language:"Telugu",priority:"Urgent",status:"Escalated",sentiment:"Frustrated",age:"18 min",sla:"12 min left",summary:"₹780 UPI payout marked approved, but provider confirmation is missing. No duplicate payout found.",next:"Financial operations must verify provider reference before retry."},
  {id:"SUP-8420",user:"Rahul Das",subject:"Game level reward is missing",category:"Games & milestones",channel:"AI chat",language:"Hindi",priority:"High",status:"AI handling",sentiment:"Concerned",age:"31 min",sla:"1h 29m left",summary:"Level 20 completion is visible, while the provider postback remains pending.",next:"AI agent is waiting within the provider postback window."},
  {id:"SUP-8419",user:"Meera Shah",subject:"PAN name does not match profile",category:"KYC & identity",channel:"Email",language:"English",priority:"High",status:"Escalated",sentiment:"Neutral",age:"46 min",sla:"1h 14m left",summary:"User reports a married-name difference and attached a supporting document.",next:"Identity review is required; the agent cannot approve KYC."},
  {id:"SUP-8418",user:"Vikram S",subject:"Cashback estimate changed after return",category:"Shop & Earn",channel:"WhatsApp",language:"Tamil",priority:"Normal",status:"Waiting for user",sentiment:"Confused",age:"1h 12m",sla:"6h 48m left",summary:"Merchant recorded a partial return. The estimated cashback was recalculated.",next:"Awaiting the final merchant invoice from the user."},
  {id:"SUP-8417",user:"Sara Khan",subject:"Cannot sign in on new phone",category:"Account & access",channel:"Callback",language:"Hindi",priority:"Normal",status:"New",sentiment:"Worried",age:"8 min",sla:"7h 52m left",summary:"OTP succeeds but device trust confirmation loops on Android.",next:"Run safe account-recovery checks without requesting OTP or password."},
  {id:"SUP-8414",user:"Kiran P",subject:"Survey screened out near completion",category:"Surveys",channel:"App review",language:"English",priority:"Low",status:"Resolved",sentiment:"Disappointed",age:"Yesterday",sla:"Met",summary:"Provider screen-out policy and consolation eligibility were explained.",next:"Resolved by AI; sampled for quality review."},
];
const supportCoverage=[
  ["Account & access","Login, OTP, profile, device change, suspension, deletion"],["Wallet & transactions","Balance, ledger, credits, debits, adjustments"],["Withdrawals & payouts","UPI/bank status, failures, delays, rejection, retry"],["KYC & identity","Documents, mismatch, verification, changes, privacy"],["Watch & Earn","Ad availability, completion, limits, missing rewards"],["Surveys","Eligibility, screen-outs, expiry, completion, rewards"],["App install offers","Attribution, existing install, milestones, tracking"],["Games & milestones","Progress, expiry, postbacks, held rewards"],["Shop & Earn","Clicks, orders, returns, estimates, missing cashback"],["Referrals","Invite tracking, qualification, reward and abuse appeals"],["Fraud & restrictions","Holds, warnings, blocks, evidence and appeals"],["Technical support","Crash, loading, network, compatibility, accessibility"],["Complaints & feedback","Service complaints, suggestions, app-store/social"],["Privacy, safety & legal","Data access/deletion, consent, abuse, legal notices"],
];

function SupportCentre({action}:{action:(message:string)=>void}){
  const [tickets,setTickets]=useState(initialSupportTickets); const [tab,setTab]=useState<"Inbox"|"AI agent"|"Channels"|"Knowledge"|"Coverage"|"Quality">("Inbox"); const [query,setQuery]=useState(""); const [status,setStatus]=useState("All statuses"); const [selected,setSelected]=useState<SupportTicket|null>(null); const [reply,setReply]=useState(""); const [confirm,setConfirm]=useState<"send"|"resolve"|"escalate"|null>(null);
  const visible=tickets.filter(t=>(status==="All statuses"||t.status===status)&&`${t.id} ${t.user} ${t.subject} ${t.category}`.toLowerCase().includes(query.toLowerCase()));
  const tone=(v:string)=>v==="Urgent"||v==="Escalated"?"bg-rose-50 text-rose-700":v==="High"||v==="Waiting for user"?"bg-amber-50 text-amber-700":v==="Resolved"?"bg-emerald-50 text-emerald-700":"bg-violet-50 text-violet-700";
  const decide=()=>{if(!selected||!confirm)return;if(confirm==="resolve")setTickets(tickets.map(t=>t.id===selected.id?{...t,status:"Resolved"}:t));if(confirm==="escalate")setTickets(tickets.map(t=>t.id===selected.id?{...t,status:"Escalated"}:t));action(confirm==="send"?"Mock AI-assisted reply added to the conversation":confirm==="resolve"?"Ticket resolved with a mock audit entry":"Ticket escalated to the protected operations queue");setReply("");setConfirm(null);setSelected(null)};
  return <>
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-2 text-xs text-slate-400">Operations <span className="px-2">›</span> Support Centre</div><h1 className="text-2xl font-bold tracking-tight md:text-[28px]">AI-powered Support Centre</h1><p className="mt-1 max-w-3xl text-sm text-slate-500">One inbox for every customer-support channel, with autonomous AI resolution inside strict financial, identity, safety and legal boundaries.</p></div><div className="flex flex-wrap gap-2"><button onClick={()=>action("Mock support report exported")} className="flex h-10 items-center gap-2 rounded-xl border bg-white px-4 text-xs font-bold"><Download size={15}/>Export</button><span className="flex h-10 items-center rounded-xl bg-violet-50 px-3 text-xs font-semibold text-violet-700">Step 15 · AI-ready mock</span><button onClick={()=>action("Mock support request created")} className="flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white"><Plus size={15}/>New case</button></div></div>
    <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{[["Open cases","31","5 urgent"],["AI resolution","74%","Last 7 days"],["First response","42 sec","AI median"],["SLA compliance","96.4%","Across channels"],["Customer rating","4.6 / 5","Resolved cases"]].map((m,i)=><article key={m[0]} className="rounded-2xl border bg-white p-4"><div className={`mb-3 grid h-9 w-9 place-items-center rounded-xl ${i===0?"bg-rose-50 text-rose-600":"bg-violet-50 text-violet-600"}`}>{i===0?<Headphones size={18}/>:<Bot size={18}/>}</div><p className="text-xs text-slate-500">{m[0]}</p><p className="mt-1 text-xl font-bold">{m[1]}</p><p className="text-[10px] text-slate-400">{m[2]}</p></article>)}</div>
    <section className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="flex gap-1 overflow-x-auto border-b p-2">{(["Inbox","AI agent","Channels","Knowledge","Coverage","Quality"] as const).map(t=><button key={t} onClick={()=>setTab(t)} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-bold ${tab===t?"bg-violet-600 text-white":"text-slate-500 hover:bg-slate-50"}`}>{t}</button>)}</div>
      {tab==="Inbox"?<><div className="flex flex-col gap-3 border-b p-4 md:flex-row"><label className="flex h-10 flex-1 items-center gap-2 rounded-xl border px-3"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search ticket, user, issue or category" className="w-full text-xs outline-none"/></label><select value={status} onChange={e=>setStatus(e.target.value)} className="h-10 rounded-xl border bg-white px-3 text-xs"><option>All statuses</option><option>New</option><option>AI handling</option><option>Waiting for user</option><option>Escalated</option><option>Resolved</option></select></div><div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left"><thead><tr className="bg-slate-50 text-[10px] uppercase text-slate-400">{["Case / customer","Issue","Channel / language","Priority","Status","Age / SLA","Action"].map(h=><th key={h} className="px-5 py-3">{h}</th>)}</tr></thead><tbody>{visible.map(t=><tr key={t.id} className="border-t text-xs"><td className="px-5 py-4"><b>{t.user}</b><p className="mt-1 font-mono text-[10px] text-violet-600">{t.id}</p></td><td className="max-w-xs px-5 py-4"><b>{t.subject}</b><p className="text-[10px] text-slate-400">{t.category} · {t.sentiment}</p></td><td className="px-5 py-4"><b>{t.channel}</b><p className="text-[10px] text-slate-400">{t.language}</p></td><td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${tone(t.priority)}`}>{t.priority}</span></td><td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${tone(t.status)}`}>{t.status}</span></td><td className="px-5 py-4"><b>{t.age}</b><p className="text-[10px] text-slate-400">{t.sla}</p></td><td className="px-5 py-4"><button onClick={()=>setSelected(t)} className="h-9 rounded-lg border px-3 font-bold text-violet-600">Open case</button></td></tr>)}</tbody></table></div></>:tab==="AI agent"?<div className="grid gap-5 p-5 xl:grid-cols-2"><article className="rounded-xl border p-5"><h3 className="flex items-center gap-2 font-bold"><Bot className="text-violet-600" size={20}/>Autonomous resolution loop</h3><div className="mt-4 space-y-3">{["Detect language, intent, urgency, sentiment and duplicate cases","Authenticate safely and collect only the minimum required information","Retrieve approved policy, account context and provider event evidence","Draft or send a grounded answer, then follow up across the same channel","Confirm resolution, collect rating and update the knowledge base"].map((x,i)=><div key={x} className="flex gap-3 rounded-xl bg-violet-50 p-3 text-xs"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet-600 text-[10px] font-bold text-white">{i+1}</span>{x}</div>)}</div></article><article className="rounded-xl border p-5"><h3 className="flex items-center gap-2 font-bold"><ShieldAlert className="text-rose-600" size={20}/>Mandatory escalation boundaries</h3><div className="mt-4 space-y-3">{["Never ask for password, OTP, UPI PIN, CVV or full banking credentials","Never approve KYC, unblock fraud cases or change identity records autonomously","Never issue, retry or reverse payouts and wallet adjustments without authorization","Escalate threats, self-harm, harassment, child safety, legal notices and data breaches immediately","Do not promise rewards, deadlines or outcomes not supported by verified platform data","High-value complaints, repeated failures and vulnerable users receive protected review"].map(x=><div key={x} className="flex gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-900"><CircleAlert size={15} className="shrink-0"/>{x}</div>)}</div></article></div>:tab==="Channels"?<div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">{[["In-app AI chat","Live · 18 open","Bot"],["Email","Live · 7 open","Mail"],["Callback / phone","Queue · 3 open","Phone"],["WhatsApp / messaging","Mock connector","Smartphone"],["App-store reviews","Mock intake","Store"],["Social complaints","Mock intake","Users"],["Help centre","42 articles","FileText"],["Emergency escalation","24/7 policy","ShieldAlert"]].map(x=><article key={x[0]} className="rounded-xl border p-4"><Headphones className="text-violet-600" size={20}/><h3 className="mt-3 text-sm font-bold">{x[0]}</h3><p className="mt-1 text-xs text-slate-500">{x[1]}</p><button onClick={()=>action(`${x[0]} settings opened as a mock`)} className="mt-4 text-xs font-bold text-violet-600">Configure →</button></article>)}</div>:tab==="Knowledge"?<div className="grid gap-5 p-5 lg:grid-cols-3"><article className="rounded-xl border p-5 lg:col-span-2"><h3 className="font-bold">Approved answer sources</h3><div className="mt-4 space-y-3">{[["Withdrawal troubleshooting","v8 · updated 2h ago","Published"],["Missing reward decision tree","v12 · updated yesterday","Published"],["KYC mismatch guidance","v5 · legal review due","Review"],["Cashback and return windows","v9 · provider synced","Published"]].map(x=><div key={x[0]} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs"><div><b>{x[0]}</b><p className="text-[10px] text-slate-400">{x[1]}</p></div><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${tone(x[2])}`}>{x[2]}</span></div>)}</div></article><article className="rounded-xl bg-violet-50 p-5"><Sparkles className="text-violet-600"/><h3 className="mt-3 font-bold">Knowledge improvement</h3><p className="mt-2 text-xs leading-5 text-slate-600">The future agent may propose new answers from resolved cases, but cannot publish financial, identity, safety, privacy or legal guidance without the required policy approval.</p><button onClick={()=>action("Mock knowledge-gap queue opened")} className="mt-5 text-xs font-bold text-violet-600">Review 6 gaps →</button></article></div>:tab==="Coverage"?<div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">{supportCoverage.map(x=><article key={x[0]} className="rounded-xl border p-4"><div className="flex items-start gap-3"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600"/><div><h3 className="text-sm font-bold">{x[0]}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{x[1]}</p></div></div></article>)}</div>:<div className="grid gap-5 p-5 xl:grid-cols-2"><article className="rounded-xl border p-5"><h3 className="font-bold">AI quality controls</h3><div className="mt-4 space-y-3">{[["Grounded-answer accuracy","98.1%","Target ≥ 97%"],["Correct escalation","96.8%","Target ≥ 95%"],["Unsupported promises","0","Target 0"],["PII exposure incidents","0","Target 0"]].map(x=><div key={x[0]} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs"><span>{x[0]}</span><b>{x[1]} <small className="ml-2 font-normal text-slate-400">{x[2]}</small></b></div>)}</div></article><article className="rounded-xl border p-5"><h3 className="font-bold">Review & audit</h3><p className="mt-2 text-xs leading-5 text-slate-500">Random samples, all escalations, low-confidence answers, negative ratings and reopened cases enter quality review. Every model suggestion, source, action, edit and outcome remains auditable.</p><div className="mt-4 grid grid-cols-2 gap-3">{[["Sampled today","42"],["Failed checks","3"],["Reopened","5"],["CSAT responses","218"]].map(x=><div key={x[0]} className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">{x[0]}</p><p className="mt-1 text-lg font-bold">{x[1]}</p></div>)}</div></article></div>}
    </section>
    {selected&&<div className="fixed inset-0 z-[90] flex justify-end bg-slate-950/50"><button aria-label="Close case" className="flex-1" onClick={()=>setSelected(null)}/><aside role="dialog" aria-modal="true" className="admin-scroll h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="font-mono text-xs font-bold text-violet-600">{selected.id}</p><h2 className="mt-1 text-xl font-bold">{selected.subject}</h2><p className="mt-1 text-xs text-slate-500">{selected.user} · {selected.channel} · {selected.language}</p></div><button aria-label="Close" onClick={()=>setSelected(null)} className="grid h-10 w-10 place-items-center rounded-xl border"><X size={18}/></button></div><div className="mt-5 flex flex-wrap gap-2"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${tone(selected.priority)}`}>{selected.priority}</span><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${tone(selected.status)}`}>{selected.status}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold">SLA {selected.sla}</span></div><div className="mt-5 rounded-xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase text-slate-400">AI case summary</p><p className="mt-2 text-sm leading-6">{selected.summary}</p><p className="mt-3 text-xs font-semibold text-violet-700">Next: {selected.next}</p></div><div className="mt-5 space-y-3"><div className="rounded-xl border p-4 text-xs"><b>User · {selected.age} ago</b><p className="mt-2 leading-5 text-slate-600">I need help with this issue. Please check my account and explain what happens next.</p></div><div className="ml-8 rounded-xl bg-violet-50 p-4 text-xs"><b>Glonni Support AI · draft</b><p className="mt-2 leading-5 text-slate-600">I found your case and checked the available status. I will only use verified account and provider information, and I will escalate any protected action.</p></div></div><label className="mt-5 block text-xs font-bold">Reply<textarea value={reply} onChange={e=>setReply(e.target.value)} className="mt-2 min-h-28 w-full rounded-xl border p-3 font-normal" placeholder="Use AI suggestion or write a mock reply"/></label><div className="mt-4 grid gap-2 sm:grid-cols-3"><button disabled={!reply.trim()} onClick={()=>setConfirm("send")} className="h-10 rounded-xl bg-violet-600 px-3 text-xs font-bold text-white disabled:opacity-40">Send reply</button><button onClick={()=>setConfirm("escalate")} className="h-10 rounded-xl border border-rose-200 px-3 text-xs font-bold text-rose-600">Escalate</button><button onClick={()=>setConfirm("resolve")} className="h-10 rounded-xl border border-emerald-200 px-3 text-xs font-bold text-emerald-700">Resolve</button></div><div className="mt-5 rounded-xl bg-amber-50 p-3 text-[11px] leading-5 text-amber-900">Mock only. No message will be sent and no customer account, reward, KYC, wallet or payout will change.</div></aside></div>}
    {confirm&&<div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/50 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6"><h3 className="text-lg font-bold">Confirm {confirm}</h3><p className="mt-2 text-sm text-slate-500">This records a simulated support action and audit entry only.</p><div className="mt-6 flex justify-end gap-2"><button onClick={()=>setConfirm(null)} className="h-10 rounded-xl border px-4 text-xs font-bold">Cancel</button><button onClick={decide} className="h-10 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white">Confirm mock action</button></div></div></div>}
  </>;
}

type ContentItem={id:string;title:string;type:"Banner"|"Featured card"|"FAQ"|"Notification"|"Legal page";status:"Published"|"Scheduled"|"Draft"|"Review";channel:string;audience:string;origin:"AI agent"|"System";updated:string;schedule:string;objective:string};
const initialContentItems:ContentItem[]=[
  {id:"CNT-1042",title:"Weekend earning boost",type:"Banner",status:"Published",channel:"Home",audience:"Active users · India",origin:"AI agent",updated:"12 min ago",schedule:"Live until 11 Aug, 11:59 PM",objective:"Increase verified task starts"},
  {id:"CNT-1041",title:"Complete KYC before withdrawal",type:"Notification",status:"Scheduled",channel:"Push + inbox",audience:"KYC pending",origin:"AI agent",updated:"28 min ago",schedule:"Today, 6:30 PM",objective:"Reduce failed withdrawal attempts"},
  {id:"CNT-1040",title:"How survey screen-outs work",type:"FAQ",status:"Published",channel:"Help centre",audience:"All users",origin:"AI agent",updated:"2 hrs ago",schedule:"Always available",objective:"Reduce repeat support tickets"},
  {id:"CNT-1039",title:"Top cashback picks under ₹1,000",type:"Featured card",status:"Review",channel:"Shop & Earn",audience:"Returning shoppers",origin:"AI agent",updated:"3 hrs ago",schedule:"Waiting for policy checks",objective:"Improve affiliate conversion"},
  {id:"CNT-1038",title:"Rewards terms — August revision",type:"Legal page",status:"Draft",channel:"Legal",audience:"All users",origin:"System",updated:"Yesterday",schedule:"No publish date",objective:"Keep reward rules transparent"},
];

function ContentManagement({action}:{action:(message:string)=>void}){
  const [items,setItems]=useState(initialContentItems); const [tab,setTab]=useState<"Library"|"AI work queue"|"Templates"|"Agent policy"|"History">("Library"); const [query,setQuery]=useState(""); const [status,setStatus]=useState("All statuses"); const [selected,setSelected]=useState<ContentItem|null>(null); const [createOpen,setCreateOpen]=useState(false); const [brief,setBrief]=useState(""); const [contentType,setContentType]=useState<ContentItem["type"]>("Banner"); const [decision,setDecision]=useState<"publish"|"schedule"|"unpublish"|"rollback"|null>(null); const [reason,setReason]=useState(""); const [draftStatus,setDraftStatus]=useState<"Saved"|"Saving"|"Recovered"|"">("");
  const visible=items.filter(i=>(!query||`${i.title} ${i.type} ${i.channel} ${i.audience}`.toLowerCase().includes(query.toLowerCase()))&&(status==="All statuses"||i.status===status));
  const tone=(v:string)=>v==="Published"?"bg-emerald-100 text-emerald-700":v==="Scheduled"?"bg-blue-100 text-blue-700":v==="Review"?"bg-amber-100 text-amber-700":"bg-slate-100 text-slate-600";
  useEffect(()=>{try{const stored=window.localStorage.getItem("glonni-admin-content-brief");if(!stored)return;const draft=JSON.parse(stored) as {brief?:string;contentType?:ContentItem["type"]};if(draft.brief){setBrief(draft.brief);setContentType(draft.contentType??"Banner");setDraftStatus("Recovered")}}catch{window.localStorage.removeItem("glonni-admin-content-brief")}},[]);
  useEffect(()=>{if(!brief.trim()){window.dispatchEvent(new CustomEvent("glonni-admin-dirty",{detail:false}));return}setDraftStatus("Saving");window.dispatchEvent(new CustomEvent("glonni-admin-dirty",{detail:true}));const timer=window.setTimeout(()=>{window.localStorage.setItem("glonni-admin-content-brief",JSON.stringify({brief,contentType,savedAt:new Date().toISOString()}));setDraftStatus("Saved");window.dispatchEvent(new CustomEvent("glonni-admin-dirty",{detail:false}))},650);return()=>window.clearTimeout(timer)},[brief,contentType]);
  const clearDraft=()=>{setBrief("");setDraftStatus("");window.localStorage.removeItem("glonni-admin-content-brief");window.dispatchEvent(new CustomEvent("glonni-admin-dirty",{detail:false}));action("Recovered content brief cleared")};
  const createDraft=()=>{if(!brief.trim())return;const item:ContentItem={id:`CNT-${1043+items.length}`,title:brief.trim(),type:contentType,status:"Draft",channel:contentType==="Notification"?"Push + inbox":contentType==="FAQ"?"Help centre":"Home",audience:"Awaiting agent targeting",origin:"AI agent",updated:"Just now",schedule:"Not scheduled",objective:"Defined from the content brief"};setItems([item,...items]);window.localStorage.removeItem("glonni-admin-content-brief");window.dispatchEvent(new CustomEvent("glonni-admin-dirty",{detail:false}));setBrief("");setDraftStatus("");setCreateOpen(false);action("AI content job created as a mock draft")};
  const applyDecision=()=>{if(!selected||!decision||!reason.trim())return;setItems(x=>x.map(i=>i.id===selected.id?{...i,status:decision==="publish"?"Published":decision==="schedule"?"Scheduled":decision==="unpublish"?"Draft":"Published",updated:"Just now",schedule:decision==="schedule"?"Tomorrow, 9:00 AM":decision==="publish"||decision==="rollback"?"Live now":"Unpublished"}:i));action(`${selected.title}: mock ${decision} recorded`);setSelected(null);setDecision(null);setReason("")};
  return <>
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-2 text-xs text-slate-400">Operations <span className="px-2">›</span> Content</div><h1 className="text-2xl font-bold tracking-tight md:text-[28px]">AI Content Operations</h1><p className="mt-1 max-w-3xl text-sm text-slate-500">Let a future AI agent plan, create, target, schedule, publish and improve app content within strict safety policies.</p></div><div className="flex flex-wrap gap-2"><button onClick={()=>action("Mock content report exported")} className="flex h-10 items-center gap-2 rounded-xl border bg-white px-4 text-xs font-bold"><Download size={15}/>Export</button><span className="flex h-10 items-center rounded-xl bg-violet-50 px-3 text-xs font-semibold text-violet-700">Step 14 · AI-ready mock</span><button onClick={()=>setCreateOpen(true)} className="flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white"><Sparkles size={15}/>Give AI a brief</button></div></div>
    <div className="mb-5 flex gap-3 rounded-2xl border border-violet-100 bg-violet-50 p-4 text-xs leading-5 text-violet-900"><Bot size={22} className="shrink-0"/><div><b>Designed for autonomous operation:</b> the future agent may create and optimize normal promotional/help content automatically. Legal, financial-claim, reward-rule and high-risk content must stop at review until an explicit policy permits publication. Every agent action keeps a prompt, model, evidence and rollback record.</div></div>
    <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">{[["Published","18",Send,"bg-emerald-50 text-emerald-700"],["Scheduled","6",Clock3,"bg-blue-50 text-blue-700"],["AI jobs running","3",Bot,"bg-violet-50 text-violet-700"],["Needs policy review","4",ShieldAlert,"bg-amber-50 text-amber-700"]].map(([l,v,I,s])=><article key={l as string} className="rounded-2xl border bg-white p-5 shadow-sm"><div className={`grid h-11 w-11 place-items-center rounded-xl ${s}`}><I size={20}/></div><p className="mt-4 text-xs text-slate-500">{l as string}</p><p className="mt-1 text-2xl font-bold">{v as string}</p></article>)}</section>
    <section className="mt-6 overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="flex flex-col gap-4 border-b p-5 xl:flex-row xl:items-center xl:justify-between"><div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">{(["Library","AI work queue","Templates","Agent policy","History"] as const).map(x=><button key={x} onClick={()=>setTab(x)} className={`rounded-lg px-4 py-2 text-xs font-bold ${tab===x?"bg-white text-violet-700 shadow-sm":"text-slate-500"}`}>{x}{x==="AI work queue"&&<span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-[9px] text-violet-700">3</span>}</button>)}</div>{tab==="Library"&&<div className="flex flex-wrap gap-2"><label className="flex h-10 min-w-[240px] items-center gap-2 rounded-xl border px-3"><Search size={15} className="text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} aria-label="Search content" placeholder="Search content" className="w-full bg-transparent text-xs outline-none"/></label><select aria-label="Filter content status" value={status} onChange={e=>setStatus(e.target.value)} className="h-10 rounded-xl border bg-white px-3 text-xs"><option>All statuses</option><option>Published</option><option>Scheduled</option><option>Draft</option><option>Review</option></select></div>}</div>
      {tab==="Library"?<div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left"><thead><tr className="bg-[#fafafd] text-[10px] uppercase text-slate-400">{["Content","Type / channel","Status","Audience","Origin","Schedule","Action"].map(h=><th key={h} className="px-5 py-3">{h}</th>)}</tr></thead><tbody>{visible.map(i=><tr key={i.id} className="border-t text-xs"><td className="px-5 py-4"><b>{i.title}</b><p className="mt-1 font-mono text-[10px] text-violet-600">{i.id} · {i.updated}</p></td><td className="px-5 py-4"><b>{i.type}</b><p className="text-[10px] text-slate-400">{i.channel}</p></td><td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${tone(i.status)}`}>{i.status}</span></td><td className="px-5 py-4">{i.audience}</td><td className="px-5 py-4"><span className="flex items-center gap-1.5"><Bot size={14} className="text-violet-600"/>{i.origin}</span></td><td className="px-5 py-4">{i.schedule}</td><td className="px-5 py-4"><button onClick={()=>setSelected(i)} className="h-9 rounded-lg border px-3 font-bold text-violet-600">Inspect</button></td></tr>)}</tbody></table></div>:tab==="AI work queue"?<div className="grid gap-4 p-5 md:grid-cols-3">{[["Generating variants","Weekend task banner","Agent is creating Telugu, Hindi and English variants","72%"],["Checking claims","Cashback picks under ₹1,000","Verifying price, expiry and cashback wording","46%"],["Optimizing schedule","KYC reminder","Selecting low-fatigue delivery window","88%"]].map(x=><article key={x[0]} className="rounded-xl border p-4"><span className="flex items-center gap-2 text-[10px] font-bold text-violet-700"><Sparkles size={14}/>{x[0]}</span><h3 className="mt-3 text-sm font-bold">{x[1]}</h3><p className="mt-1 min-h-10 text-xs text-slate-500">{x[2]}</p><div className="mt-4 h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-600" style={{width:x[3]}}/></div><p className="mt-2 text-right text-[10px] text-slate-400">Mock progress {x[3]}</p></article>)}</div>:tab==="Templates"?<div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">{[["Home promotion","Banner + CTA","Task or cashback campaign"],["Service notice","Inbox + push","Outage, delay or maintenance"],["Help answer","FAQ article","Support-ticket reduction"],["Policy update","Versioned legal page","Mandatory review and acknowledgement"]].map(x=><article key={x[0]} className="rounded-xl border p-4"><FileText className="text-violet-600" size={20}/><h3 className="mt-3 text-sm font-bold">{x[0]}</h3><p className="text-[10px] text-violet-600">{x[1]}</p><p className="mt-2 text-xs text-slate-500">{x[2]}</p><button onClick={()=>{setContentType(x[0]==="Service notice"?"Notification":x[0]==="Help answer"?"FAQ":x[0]==="Policy update"?"Legal page":"Banner");setCreateOpen(true)}} className="mt-4 text-xs font-bold text-violet-600">Use template →</button></article>)}</div>:tab==="Agent policy"?<div className="grid gap-5 p-5 xl:grid-cols-2"><article className="rounded-xl border p-5"><h3 className="flex items-center gap-2 font-bold"><ShieldCheck className="text-emerald-600" size={19}/>May run automatically</h3><div className="mt-4 space-y-3">{["Create promotional banners from approved offers and verified prices","Translate approved content while preserving reward and legal meaning","Schedule low-risk messages within frequency and quiet-hour limits","Pause expired campaigns and restore the last approved version","Run A/B tests within fixed audience, budget and claim policies"].map(x=><div key={x} className="flex gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-900"><CheckCircle2 size={15} className="shrink-0"/>{x}</div>)}</div></article><article className="rounded-xl border p-5"><h3 className="flex items-center gap-2 font-bold"><ShieldAlert className="text-rose-600" size={19}/>Must stop or escalate</h3><div className="mt-4 space-y-3">{["Never invent earnings, cashback, prices, availability or deadlines","Never change reward rates, withdrawal rules or financial obligations","Legal and privacy changes require an approved policy source","Safety-sensitive copy must pass deterministic checks before release","Kill switch, audit log and one-click rollback remain available at all times"].map(x=><div key={x} className="flex gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-900"><CircleAlert size={15} className="shrink-0"/>{x}</div>)}</div></article></div>:<div className="space-y-3 p-5">{[["CNT-1042 published","Content Agent","12 min ago","Passed brand, claims and expiry checks"],["CNT-1041 scheduled","Content Agent","28 min ago","Quiet hours and KYC audience verified"],["CNT-1039 sent to review","Policy Guard","3 hrs ago","Price evidence expires before campaign end"],["CNT-1038 version created","System","Yesterday","Previous legal version retained for rollback"]].map(x=><div key={x[0]} className="grid gap-2 rounded-xl border p-4 text-xs sm:grid-cols-[1fr_160px_100px_1.4fr]"><b>{x[0]}</b><span>{x[1]}</span><span className="text-slate-400">{x[2]}</span><span className="text-slate-500">{x[3]}</span></div>)}</div>}
    </section>
    <section className="mt-6 grid gap-6 xl:grid-cols-2"><article className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-bold">Agent operating loop</h2><p className="mt-1 text-xs text-slate-500">The future backend agent follows one observable, reversible workflow.</p><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{[["1","Observe","Campaign and support signals"],["2","Plan","Objective, audience and evidence"],["3","Act","Create, test and schedule"],["4","Learn","Measure, stop or optimize"]].map(x=><div key={x[0]} className="rounded-xl bg-slate-50 p-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700">{x[0]}</span><b className="mt-2 block text-xs">{x[1]}</b><p className="mt-1 text-[10px] text-slate-400">{x[2]}</p></div>)}</div></article><article className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-bold">Autonomy controls</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{[["Mode","Supervised mock"],["Daily publish limit","10 items"],["Quiet hours","9 PM–8 AM IST"],["Automatic rollback","Complaint or error threshold"],["Claim evidence","Required"],["Agent kill switch","Available"]].map(x=><div key={x[0]} className="rounded-xl border p-3"><p className="text-[10px] text-slate-400">{x[0]}</p><b className="text-xs">{x[1]}</b></div>)}</div></article></section>
    {selected&&<div className="fixed inset-0 z-[80] flex justify-end"><button aria-label="Close content details" onClick={()=>setSelected(null)} className="absolute inset-0 bg-slate-950/40"/><aside role="dialog" aria-modal="true" className="relative h-full w-full max-w-[580px] overflow-y-auto bg-[#f7f8fc] p-5 shadow-2xl"><div className="flex items-start"><div><p className="text-xs text-slate-400">{selected.id} · {selected.type}</p><h2 className="mt-1 text-lg font-bold">{selected.title}</h2></div><button onClick={()=>setSelected(null)} className="ml-auto grid h-10 w-10 place-items-center"><X/></button></div><section className="mt-5 rounded-2xl border bg-white p-5"><h3 className="font-bold">Preview &amp; intent</h3><div className="mt-4 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 p-6 text-white"><p className="text-[10px] uppercase tracking-widest opacity-70">Glonni Ads</p><h4 className="mt-3 text-xl font-bold">{selected.title}</h4><p className="mt-2 text-xs opacity-80">AI-generated preview placeholder for {selected.channel}.</p><button className="mt-5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-violet-700">Explore now</button></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{[["Objective",selected.objective],["Audience",selected.audience],["Origin",selected.origin],["Schedule",selected.schedule]].map(x=><div key={x[0]} className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">{x[0]}</p><b className="text-xs">{x[1]}</b></div>)}</div></section><section className="mt-4 rounded-2xl border bg-white p-5"><h3 className="font-bold">Policy result</h3><div className="mt-3 flex gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800"><ShieldCheck size={17}/>Claims, audience, frequency and expiry checks passed in this mock review.</div><div className="mt-4 flex flex-wrap gap-2">{selected.status!=="Published"&&<button onClick={()=>setDecision("publish")} className="h-10 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white">Publish</button>}<button onClick={()=>setDecision("schedule")} className="h-10 rounded-xl border border-blue-200 px-4 text-xs font-bold text-blue-700">Schedule</button>{selected.status==="Published"&&<button onClick={()=>setDecision("unpublish")} className="h-10 rounded-xl border border-amber-200 px-4 text-xs font-bold text-amber-700">Unpublish</button>}<button onClick={()=>setDecision("rollback")} className="h-10 rounded-xl border px-4 text-xs font-bold">Rollback</button></div></section></aside></div>}
    {createOpen&&<div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/50 p-4"><div role="dialog" aria-modal="true" aria-labelledby="content-brief-title" aria-describedby="content-brief-description" className="w-full max-w-lg rounded-2xl bg-white p-6"><h3 id="content-brief-title" className="flex items-center gap-2 text-lg font-bold"><Bot className="text-violet-600"/>Give the AI agent a content brief</h3><p id="content-brief-description" className="mt-1 text-xs text-slate-500">The agent will later gather verified inputs, create variants, run checks and follow the selected approval policy.</p>{draftStatus==="Recovered"&&<div role="status" className="mt-4 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900"><RotateCcw size={15}/><span><b>Draft recovered.</b> Continue where you stopped.</span><button onClick={clearDraft} className="ml-auto font-bold text-blue-700">Clear</button></div>}<label className="mt-5 block text-xs font-bold">Content type<select value={contentType} onChange={e=>setContentType(e.target.value as ContentItem["type"])} className="mt-2 h-11 w-full rounded-xl border bg-white px-3 font-normal"><option>Banner</option><option>Featured card</option><option>FAQ</option><option>Notification</option><option>Legal page</option></select></label><label className="mt-4 block text-xs font-bold">Goal or brief<textarea autoFocus value={brief} onChange={e=>setBrief(e.target.value)} className="mt-2 min-h-28 w-full rounded-xl border p-3 font-normal" placeholder="Example: Explain KYC benefits to users who attempted a withdrawal"/></label><div className="mt-2 flex h-5 items-center justify-end text-[10px] font-semibold text-slate-500" role="status" aria-live="polite">{draftStatus==="Saving"?"Saving draft…":draftStatus==="Saved"?"Draft saved on this device":draftStatus==="Recovered"?"Recovered draft loaded":""}</div><div className="mt-3 rounded-xl bg-violet-50 p-3 text-[11px] text-violet-800">This creates a mock draft only. No AI model, notification service or live publishing backend is connected.</div><div className="mt-6 flex justify-end gap-2"><button data-dialog-close onClick={()=>setCreateOpen(false)} className="h-10 rounded-xl border px-4 text-xs font-bold">Save &amp; close</button><button disabled={!brief.trim()} onClick={createDraft} className="h-10 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white disabled:opacity-40">Create AI job</button></div></div></div>}
    {decision&&selected&&<div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/50 p-4"><div role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6"><h3 className="text-lg font-bold capitalize">{decision} content?</h3><p className="mt-2 text-xs text-slate-500">This sensitive mock action requires a reason and creates a versioned audit entry.</p><textarea autoFocus value={reason} onChange={e=>setReason(e.target.value)} className="mt-4 min-h-24 w-full rounded-xl border p-3 text-xs" placeholder="Required reason"/><div className="mt-4 flex justify-end gap-2"><button onClick={()=>{setDecision(null);setReason("")}} className="h-10 rounded-xl border px-4 text-xs font-bold">Cancel</button><button disabled={!reason.trim()} onClick={applyDecision} className="h-10 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white disabled:opacity-40">Confirm</button></div></div></div>}
  </>;
}

type ReconException={id:string;source:string;reference:string;expected:string;received:string;difference:string;age:string;severity:"High"|"Medium"|"Low";status:"Open"|"Investigating"|"Ready to match"|"Escalated";reason:string};
const initialReconExceptions:ReconException[]=[
  {id:"REC-2048",source:"Rewarded Ads",reference:"SET-ADS-0808",expected:"₹1,84,260",received:"₹1,79,840",difference:"−₹4,420",age:"18h",severity:"High",status:"Investigating",reason:"Provider statement is missing 37 completed-view postbacks."},
  {id:"REC-2047",source:"Shop & Earn",reference:"AFF-JUL-391",expected:"₹74,920",received:"₹72,680",difference:"−₹2,240",age:"2d",severity:"Medium",status:"Open",reason:"Three orders moved to returned after cashback estimation."},
  {id:"REC-2046",source:"Surveys",reference:"SUR-0807-IN",expected:"₹48,110",received:"₹48,110",difference:"₹0",age:"6h",severity:"Low",status:"Ready to match",reason:"Statement and internal completion ledger agree."},
  {id:"REC-2045",source:"Games & Installs",reference:"OFF-0806-77",expected:"₹96,540",received:"₹92,300",difference:"−₹4,240",age:"3d",severity:"High",status:"Escalated",reason:"Provider rejected milestones after rewards entered the pending ledger."},
];

function ReportsReconciliation({action}:{action:(message:string)=>void}){
  const [tab,setTab]=useState<"Overview"|"Settlements"|"Exceptions"|"Liabilities"|"Period close"|"Audit">("Overview");
  const [period,setPeriod]=useState("August 2026"); const [exceptions,setExceptions]=useState(initialReconExceptions); const [selected,setSelected]=useState<ReconException|null>(null); const [reason,setReason]=useState(""); const [confirm,setConfirm]=useState<"match"|"adjust"|"escalate"|"close"|null>(null);
  const finish=()=>{if(!confirm)return;if(confirm==="close"){action("Mock period-close checklist submitted; no books were locked");setConfirm(null);setReason("");return;}if(!selected)return;const next=confirm==="match"?"Ready to match":confirm==="escalate"?"Escalated":"Investigating";setExceptions(xs=>xs.map(x=>x.id===selected.id?{...x,status:next}:x));setSelected({...selected,status:next});action(`Mock ${confirm} decision recorded for ${selected.id}`);setConfirm(null);setReason("")};
  const money=[
    ["Gross provider revenue","₹8,42,680","Recognized from verified mock events","text-violet-700 bg-violet-50"],
    ["User reward expense","₹5,06,240","Approved and pending user rewards","text-rose-700 bg-rose-50"],
    ["Provider receivables","₹2,14,890","Earned but not yet settled in cash","text-amber-700 bg-amber-50"],
    ["Contribution margin","₹3,36,440","Before operations, tax and payment costs","text-emerald-700 bg-emerald-50"],
  ];
  const settlements=[["ADS-0808","Rewarded Ads","₹1,84,260","₹1,79,840","Exception","08 Aug"],["SUR-0807","Surveys","₹48,110","₹48,110","Matched","07 Aug"],["OFF-0806","Games & Installs","₹96,540","₹92,300","Review","06 Aug"],["AFF-JUL","Shop & Earn","₹74,920","₹72,680","Exception","31 Jul"],["REF-0808","Referrals","₹0","−₹31,400","Internal cost","08 Aug"]];
  return <>
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-2 text-xs text-slate-400">Operations <span className="px-2">›</span> Reports & Reconciliation</div><h1 className="text-2xl font-bold tracking-tight md:text-[28px]">Reports & Reconciliation</h1><p className="mt-1 max-w-3xl text-sm text-slate-500">One financial control centre for provider earnings, user obligations, cash settlements, exceptions and auditable period close.</p></div><div className="flex flex-wrap gap-2"><select aria-label="Reporting period" value={period} onChange={e=>setPeriod(e.target.value)} className="h-10 rounded-xl border bg-white px-3 text-xs font-bold"><option>August 2026</option><option>July 2026</option><option>Q2 2026</option></select><button onClick={()=>action("Mock report package exported")} className="flex h-10 items-center gap-2 rounded-xl border bg-white px-4 text-xs font-bold"><Download size={15}/>Export pack</button><span className="flex h-10 items-center rounded-xl bg-violet-50 px-3 text-xs font-semibold text-violet-700">Step 16 · Mock controls</span></div></div>
    <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">{(["Overview","Settlements","Exceptions","Liabilities","Period close","Audit"] as const).map(x=><button key={x} onClick={()=>setTab(x)} className={`shrink-0 rounded-lg px-4 py-2 text-xs font-bold ${tab===x?"bg-white text-violet-700 shadow-sm":"text-slate-500"}`}>{x}{x==="Exceptions"&&<span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-[9px] text-rose-700">3</span>}</button>)}</div>
    {tab==="Overview"&&<div className="space-y-5"><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{money.map(x=><article key={x[0]} className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-xs font-semibold text-slate-500">{x[0]}</p><p className="mt-2 text-2xl font-bold">{x[1]}</p><span className={`mt-3 inline-block rounded-lg px-2 py-1 text-[10px] font-semibold ${x[3]}`}>{x[2]}</span></article>)}</section><section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]"><article className="rounded-2xl border bg-white p-5"><div className="flex items-center justify-between"><div><h2 className="font-bold">Economics by earning source</h2><p className="text-xs text-slate-500">Revenue, rewards and contribution before operating costs</p></div><span className="text-[10px] font-bold text-slate-400">{period}</span></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-400"><tr>{["Source","Revenue","User rewards","Margin","Margin %","Confidence"].map(h=><th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody>{[["Watch & Earn","₹3,28,400","₹2,09,600","₹1,18,800","36.2%","Statement pending"],["Surveys","₹1,46,800","₹91,200","₹55,600","37.9%","Matched"],["Games & Installs","₹2,11,600","₹1,36,440","₹75,160","35.5%","Exception"],["Shop & Earn","₹1,55,880","₹37,600","₹1,18,280","75.9%","Return window"],["Referrals","₹0","₹31,400","−₹31,400","—","Internal cost"]].map(r=><tr key={r[0]} className="border-t"><td className="px-4 py-4 font-bold">{r[0]}</td>{r.slice(1,5).map((c,i)=><td key={i} className={`px-4 py-4 ${c.startsWith("−")?"font-bold text-rose-600":""}`}>{c}</td>)}<td className="px-4 py-4"><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${tone(r[5])}`}>{r[5]}</span></td></tr>)}</tbody></table></div></article><article className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Control status</h2><p className="text-xs text-slate-500">Readiness for {period}</p><div className="mt-5 space-y-3">{[["Ledger integrity","100%","bg-emerald-500"],["Provider statements","82%","bg-violet-500"],["Exceptions resolved","61%","bg-amber-500"],["Withdrawal reconciliation","94%","bg-blue-500"]].map(x=><div key={x[0]}><div className="mb-1 flex text-xs"><b>{x[0]}</b><span className="ml-auto">{x[1]}</span></div><div className="h-2 rounded-full bg-slate-100"><div className={`h-full rounded-full ${x[2]}`} style={{width:x[1]}}/></div></div>)}</div><div className="mt-5 rounded-xl bg-amber-50 p-3 text-[11px] leading-5 text-amber-900"><CircleAlert size={15} className="mb-1"/>Contribution margin is not net profit. Taxes, gateway fees, reversals and operating expenses remain excluded.</div></article></section></div>}
    {tab==="Settlements"&&<section className="overflow-hidden rounded-2xl border bg-white"><div className="flex items-center justify-between p-5"><div><h2 className="font-bold">Settlement ledger</h2><p className="text-xs text-slate-500">Internal ledger compared with provider statements and bank receipt</p></div><button onClick={()=>action("Mock provider statements refreshed")} className="flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-bold"><RefreshCw size={14}/>Refresh</button></div><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-400"><tr>{["Batch","Source","Internal amount","Statement / cash","Status","Statement date","Action"].map(h=><th key={h} className="px-5 py-3">{h}</th>)}</tr></thead><tbody>{settlements.map(r=><tr key={r[0]} className="border-t"><td className="px-5 py-4 font-mono font-bold text-violet-600">{r[0]}</td><td className="px-5 py-4 font-bold">{r[1]}</td><td className="px-5 py-4">{r[2]}</td><td className="px-5 py-4">{r[3]}</td><td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${tone(r[4])}`}>{r[4]}</span></td><td className="px-5 py-4">{r[5]}</td><td className="px-5 py-4"><button onClick={()=>action(`${r[0]} statement opened`)} className="font-bold text-violet-600">Inspect →</button></td></tr>)}</tbody></table></div></section>}
    {tab==="Exceptions"&&<section className="overflow-hidden rounded-2xl border bg-white"><div className="p-5"><h2 className="font-bold">Reconciliation exceptions</h2><p className="text-xs text-slate-500">Every difference requires evidence, ownership and an auditable resolution</p></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-400"><tr>{["Case","Source / reference","Expected","Received","Difference","Age","Status","Action"].map(h=><th key={h} className="px-5 py-3">{h}</th>)}</tr></thead><tbody>{exceptions.map(r=><tr key={r.id} className="border-t"><td className="px-5 py-4"><b className="font-mono text-violet-600">{r.id}</b><p className={`mt-1 text-[9px] font-bold ${r.severity==="High"?"text-rose-600":r.severity==="Medium"?"text-amber-600":"text-slate-400"}`}>{r.severity}</p></td><td className="px-5 py-4"><b>{r.source}</b><p className="font-mono text-[10px] text-slate-400">{r.reference}</p></td><td className="px-5 py-4">{r.expected}</td><td className="px-5 py-4">{r.received}</td><td className={`px-5 py-4 font-bold ${r.difference.startsWith("−")?"text-rose-600":"text-emerald-600"}`}>{r.difference}</td><td className="px-5 py-4">{r.age}</td><td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${tone(r.status)}`}>{r.status}</span></td><td className="px-5 py-4"><button onClick={()=>setSelected(r)} className="h-9 rounded-lg border px-3 font-bold text-violet-600">Review</button></td></tr>)}</tbody></table></div></section>}
    {tab==="Liabilities"&&<div className="grid gap-5 lg:grid-cols-2"><article className="rounded-2xl border bg-white p-5"><h2 className="font-bold">User reward liabilities</h2><p className="text-xs text-slate-500">Money owed or conditionally reserved for users</p><div className="mt-5 space-y-3">{[["Available wallet balances","₹3,82,760","Payable"],["Pending task rewards","₹1,08,420","Provider confirmation"],["Withdrawal requests","₹74,260","Processing"],["Estimated shop cashback","₹92,810","Return window"],["Held for risk review","₹18,640","Restricted"]].map(x=><div key={x[0]} className="flex items-center rounded-xl border p-4 text-xs"><div><b>{x[0]}</b><p className="text-[10px] text-slate-400">{x[2]}</p></div><b className="ml-auto text-sm">{x[1]}</b></div>)}</div></article><article className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Liability safeguards</h2><div className="mt-4 space-y-3">{["Wallet ledger must equal the sum of user balances","Pending rewards stay separate from withdrawable cash","Estimated cashback never becomes payable before confirmation","Rejected or reversed rewards require linked source evidence","Held balances remain visible and cannot be silently removed"].map(x=><div key={x} className="flex gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-900"><ShieldCheck size={15} className="shrink-0"/>{x}</div>)}</div><button onClick={()=>action("Mock liability proof exported")} className="mt-5 h-10 w-full rounded-xl border text-xs font-bold text-violet-600">Export liability proof</button></article></div>}
    {tab==="Period close"&&<div className="grid gap-5 lg:grid-cols-[1fr_.7fr]"><article className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Close checklist · {period}</h2><p className="text-xs text-slate-500">Period cannot close until blocking controls pass</p><div className="mt-5 space-y-3">{[["Reward and wallet ledgers balanced","Passed",true],["Bank withdrawals matched","Passed",true],["Provider statements imported","2 pending",false],["High-severity exceptions resolved","2 open",false],["Cashback return windows separated","Passed",true],["Tax and gateway cost files attached","Missing",false],["Close snapshot and rollback point created","Ready",true]].map(x=><div key={x[0] as string} className="flex items-center gap-3 rounded-xl border p-4 text-xs">{x[2]?<CheckCircle2 size={17} className="text-emerald-600"/>:<CircleAlert size={17} className="text-amber-600"/>}<b>{x[0] as string}</b><span className={`ml-auto rounded-full px-2 py-1 text-[9px] font-bold ${x[2]?"bg-emerald-50 text-emerald-700":"bg-amber-50 text-amber-700"}`}>{x[1] as string}</span></div>)}</div></article><article className="rounded-2xl border bg-white p-5"><ShieldAlert className="text-rose-600"/><h2 className="mt-3 font-bold">Close protection</h2><p className="mt-2 text-xs leading-5 text-slate-500">Closing freezes the reporting snapshot but never deletes ledger entries. Reopening requires authorization, reason and audit history.</p><div className="mt-4 rounded-xl bg-rose-50 p-3 text-[11px] leading-5 text-rose-900">3 blocking controls are unresolved. The real system must prevent close until they pass or an authorized exception is documented.</div><button onClick={()=>setConfirm("close")} className="mt-5 h-10 w-full rounded-xl bg-slate-900 text-xs font-bold text-white">Review mock close</button></article></div>}
    {tab==="Audit"&&<section className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Financial audit trail</h2><p className="text-xs text-slate-500">Append-only record of imports, matches, adjustments, approvals and closes</p><div className="mt-5 space-y-3">{[["Statement imported","System","SUR-0807-IN","Today, 08:42","SHA-256 evidence retained"],["Exception escalated","Finance Agent","REC-2045","Yesterday, 17:10","Provider rejection evidence attached"],["Withdrawal batch matched","Reconciliation Agent","WD-0807-04","Yesterday, 15:26","Bank reference verified"],["Adjustment approved","Super Admin","ADJ-1182","06 Aug, 12:08","Dual-control reason recorded"],["July period closed","System + Super Admin","CLOSE-2026-07","02 Aug, 09:30","Snapshot immutable; reopen unused"]].map(x=><div key={x[2]} className="grid gap-2 rounded-xl border p-4 text-xs md:grid-cols-[1fr_150px_130px_120px_1.4fr]"><b>{x[0]}</b><span>{x[1]}</span><span className="font-mono text-violet-600">{x[2]}</span><span className="text-slate-400">{x[3]}</span><span className="text-slate-500">{x[4]}</span></div>)}</div></section>}
    {selected&&<div className="fixed inset-0 z-[90] flex justify-end bg-slate-950/50"><button aria-label="Close exception" className="flex-1" onClick={()=>{setSelected(null);setConfirm(null);setReason("")}}/><aside role="dialog" aria-modal="true" className="admin-scroll h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="font-mono text-xs font-bold text-violet-600">{selected.id}</p><h2 className="mt-1 text-xl font-bold">{selected.source} exception</h2><p className="mt-1 text-xs text-slate-500">{selected.reference} · {selected.age} old</p></div><button aria-label="Close" onClick={()=>setSelected(null)} className="grid h-10 w-10 place-items-center rounded-xl border"><X size={18}/></button></div><div className="mt-5 grid grid-cols-3 gap-3">{[["Expected",selected.expected],["Received",selected.received],["Difference",selected.difference]].map(x=><div key={x[0]} className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">{x[0]}</p><b className="text-sm">{x[1]}</b></div>)}</div><div className="mt-5 rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-900"><b>Reconciliation finding</b><p className="mt-1">{selected.reason}</p></div><div className="mt-5 space-y-3">{["Internal event ledger and reward IDs preserved","Provider statement reference attached","Cash receipt must be independently verified","No user balance changes are permitted from this mock decision"].map(x=><div key={x} className="flex gap-2 rounded-xl border p-3 text-xs"><CheckCircle2 size={15} className="shrink-0 text-emerald-600"/>{x}</div>)}</div><label className="mt-5 block text-xs font-bold">Decision reason<textarea value={reason} onChange={e=>setReason(e.target.value)} className="mt-2 min-h-24 w-full rounded-xl border p-3 font-normal" placeholder="Required for adjustment or escalation"/></label><div className="mt-4 grid gap-2 sm:grid-cols-3"><button onClick={()=>setConfirm("match")} disabled={selected.difference!=="₹0"} className="h-10 rounded-xl bg-emerald-600 text-xs font-bold text-white disabled:opacity-35">Mark matched</button><button onClick={()=>setConfirm("adjust")} disabled={!reason.trim()} className="h-10 rounded-xl border border-amber-200 text-xs font-bold text-amber-700 disabled:opacity-35">Propose adjustment</button><button onClick={()=>setConfirm("escalate")} disabled={!reason.trim()} className="h-10 rounded-xl border border-rose-200 text-xs font-bold text-rose-700 disabled:opacity-35">Escalate</button></div><p className="mt-4 rounded-xl bg-violet-50 p-3 text-[11px] text-violet-900">Mock only. No provider statement, wallet, bank transaction, accounting entry or period status will change.</p></aside></div>}
    {confirm&&<div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/55 p-4"><div role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h3 className="text-lg font-bold">Confirm mock {confirm}</h3><p className="mt-2 text-sm leading-6 text-slate-500">This records a simulated decision with an audit note. It does not move money, alter user balances, contact providers or lock accounting books.</p>{confirm!=="close"&&<p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs"><b>Reason:</b> {reason||"Statement and ledger amounts agree."}</p>}<div className="mt-5 flex gap-2"><button onClick={()=>setConfirm(null)} className="h-10 flex-1 rounded-xl border text-xs font-bold">Cancel</button><button onClick={finish} className="h-10 flex-1 rounded-xl bg-violet-600 text-xs font-bold text-white">Confirm mock action</button></div></div></div>}
  </>;
}

function SettingsSecurity({action}:{action:(message:string)=>void}){
  const [tab,setTab]=useState<"Overview"|"Admins & roles"|"Access policy"|"Integrations"|"Platform"|"Recovery"|"Audit">("Overview");
  const [maintenance,setMaintenance]=useState(false); const [agentEnabled,setAgentEnabled]=useState(true); const [confirm,setConfirm]=useState<null|"maintenance"|"revoke"|"rotate"|"lockdown">(null); const [reason,setReason]=useState("");
  const admins=[["Shaneel Kumarreddy","Super Admin","MFA enrolled","Now","Active"],["Finance Agent","Finance reviewer","Service identity","8 min ago","Restricted"],["Support Agent","Support lead","MFA enrolled","32 min ago","Active"],["Content Agent","Content operator","Scoped token","2h ago","Active"]];
  const finish=()=>{if(!confirm)return; if(confirm==="maintenance")setMaintenance(!maintenance); action(`Mock ${confirm} security action recorded`);setConfirm(null);setReason("")};
  return <>
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-2 text-xs text-slate-400">System <span className="px-2">›</span> Settings & Security</div><h1 className="text-2xl font-bold tracking-tight md:text-[28px]">Settings & Admin Security</h1><p className="mt-1 max-w-3xl text-sm text-slate-500">Control platform policies, privileged access, integrations, recovery and emergency protections from one auditable workspace.</p></div><div className="flex flex-wrap gap-2"><span className="flex h-10 items-center gap-2 rounded-xl bg-emerald-50 px-3 text-xs font-bold text-emerald-700"><ShieldCheck size={15}/>Security posture: Good</span><span className="flex h-10 items-center rounded-xl bg-violet-50 px-3 text-xs font-semibold text-violet-700">Step 17 · Mock controls</span></div></div>
    <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">{(["Overview","Admins & roles","Access policy","Integrations","Platform","Recovery","Audit"] as const).map(x=><button key={x} onClick={()=>setTab(x)} className={`shrink-0 rounded-lg px-4 py-2 text-xs font-bold ${tab===x?"bg-white text-violet-700 shadow-sm":"text-slate-500"}`}>{x}</button>)}</div>
    {tab==="Overview"&&<div className="space-y-5"><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["Privileged admins","4","Least privilege reviewed","Users"],["MFA coverage","100%","Required for people","Shield"],["Active sessions","7","2 service identities","Activity"],["Security alerts","2","No critical alerts","Alert"]].map((x,i)=><article key={x[0]} className="rounded-2xl border bg-white p-5 shadow-sm"><span className={`grid h-10 w-10 place-items-center rounded-xl ${i===3?"bg-amber-50 text-amber-600":"bg-violet-50 text-violet-600"}`}>{i===0?<Users size={19}/>:i===1?<ShieldCheck size={19}/>:i===2?<Activity size={19}/>:<CircleAlert size={19}/>}</span><p className="mt-4 text-xs font-semibold text-slate-500">{x[0]}</p><p className="mt-1 text-2xl font-bold">{x[1]}</p><p className="mt-1 text-[10px] text-slate-400">{x[2]}</p></article>)}</section><section className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]"><article className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Security control status</h2><p className="text-xs text-slate-500">Required safeguards before production backend activation</p><div className="mt-5 space-y-3">{[["Admin MFA enforcement","Configured","All human administrators"],["Role-based access control","Configured","Deny by default"],["Session timeout","Review","15 min privileged inactivity"],["Secret rotation","Due soon","Two mock connectors"],["Audit log retention","Configured","Minimum 365 days"],["Backup restore test","Scheduled","15 August 2026"]].map(x=><div key={x[0]} className="flex items-center gap-3 rounded-xl border p-4 text-xs"><CheckCircle2 size={16} className={x[1]==="Configured"?"text-emerald-600":"text-amber-600"}/><div><b>{x[0]}</b><p className="text-[10px] text-slate-400">{x[2]}</p></div><span className={`ml-auto rounded-full px-2 py-1 text-[9px] font-bold ${x[1]==="Configured"?"bg-emerald-50 text-emerald-700":"bg-amber-50 text-amber-700"}`}>{x[1]}</span></div>)}</div></article><article className="rounded-2xl border bg-slate-950 p-5 text-white"><ShieldAlert className="text-amber-400"/><h2 className="mt-3 font-bold">Emergency controls</h2><p className="mt-2 text-xs leading-5 text-slate-300">Protected actions require confirmation, a reason and a permanent audit entry. Mock controls cannot change the deployed app.</p><div className="mt-5 space-y-2"><button onClick={()=>setConfirm("lockdown")} className="h-10 w-full rounded-xl bg-rose-600 text-xs font-bold">Review admin lockdown</button><button onClick={()=>setConfirm("maintenance")} className="h-10 w-full rounded-xl border border-white/20 text-xs font-bold">{maintenance?"Review exit from maintenance":"Review maintenance mode"}</button></div></article></section></div>}
    {tab==="Admins & roles"&&<div className="space-y-5"><section className="overflow-hidden rounded-2xl border bg-white"><div className="flex items-center justify-between p-5"><div><h2 className="font-bold">Administrators & service identities</h2><p className="text-xs text-slate-500">Human accounts and future AI agents are separated and individually scoped</p></div><button onClick={()=>action("Mock invite-admin form opened")} className="flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white"><Plus size={15}/>Add admin</button></div><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-400"><tr>{["Identity","Role","Authentication","Last active","Status","Action"].map(h=><th key={h} className="px-5 py-3">{h}</th>)}</tr></thead><tbody>{admins.map(x=><tr key={x[0]} className="border-t"><td className="px-5 py-4 font-bold">{x[0]}</td><td className="px-5 py-4">{x[1]}</td><td className="px-5 py-4">{x[2]}</td><td className="px-5 py-4">{x[3]}</td><td className="px-5 py-4"><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">{x[4]}</span></td><td className="px-5 py-4"><button onClick={()=>action(`${x[0]} permissions opened`)} className="font-bold text-violet-600">Inspect →</button></td></tr>)}</tbody></table></div></section><section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[["Super Admin","All controls","2 members"],["Finance reviewer","Wallet, reports, withdrawals","1 identity"],["Support lead","Cases, users, read-only rewards","1 member"],["Content operator","Content and campaigns only","1 AI identity"]].map(x=><article key={x[0]} className="rounded-2xl border bg-white p-5"><h3 className="font-bold">{x[0]}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{x[1]}</p><p className="mt-4 text-[10px] font-bold text-violet-600">{x[2]}</p></article>)}</section></div>}
    {tab==="Access policy"&&<div className="grid gap-5 lg:grid-cols-2"><article className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Authentication & sessions</h2><div className="mt-5 space-y-3">{[["Require MFA for human admins",true],["Block shared administrator accounts",true],["Re-authenticate sensitive actions",true],["Allow remembered devices",false],["Restrict access by approved IP",false]].map(x=><div key={x[0] as string} className="flex items-center justify-between rounded-xl border p-4 text-xs"><b>{x[0] as string}</b><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${x[1]?"bg-emerald-50 text-emerald-700":"bg-slate-100 text-slate-500"}`}>{x[1]?"Required":"Off"}</span></div>)}</div></article><article className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Session rules</h2><div className="mt-5 grid grid-cols-2 gap-3">{[["Idle timeout","15 min"],["Maximum session","8 hours"],["Failed attempts","5"],["Lock duration","30 min"],["Concurrent sessions","2"],["Password minimum","14 chars"]].map(x=><div key={x[0]} className="rounded-xl bg-slate-50 p-4"><p className="text-[10px] text-slate-400">{x[0]}</p><b className="text-sm">{x[1]}</b></div>)}</div><button onClick={()=>action("Mock access-policy editor opened")} className="mt-5 h-10 w-full rounded-xl border text-xs font-bold text-violet-600">Edit policy draft</button></article></div>}
    {tab==="Integrations"&&<CommunicationsControl action={action}/>}
    {tab==="Platform"&&<div className="grid gap-5 lg:grid-cols-2"><article className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Global platform settings</h2><div className="mt-5 space-y-3">{[["Default currency","INR (₹)"],["Business timezone","Asia/Kolkata"],["Minimum withdrawal","₹500"],["Reward expiry","365 days"],["Default language","English"],["Data region","To be selected"]].map(x=><div key={x[0]} className="flex rounded-xl border p-4 text-xs"><b>{x[0]}</b><span className="ml-auto text-slate-500">{x[1]}</span></div>)}</div></article><article className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Feature flags & AI autonomy</h2><div className="mt-4 flex items-center rounded-xl bg-violet-50 p-4"><Bot className="text-violet-600"/><div className="ml-3"><b className="text-xs">AI operations agent</b><p className="text-[10px] text-slate-500">Mock policy engine; no model connected</p></div><button onClick={()=>setAgentEnabled(!agentEnabled)} className={`ml-auto rounded-full px-3 py-1 text-[10px] font-bold ${agentEnabled?"bg-emerald-600 text-white":"bg-slate-200 text-slate-600"}`}>{agentEnabled?"Enabled":"Paused"}</button></div><div className="mt-4 space-y-3">{["Watch & Earn","Surveys","Games","Shop & Earn","Referrals","User withdrawals"].map((x,i)=><div key={x} className="flex items-center rounded-xl border p-4 text-xs"><b>{x}</b><span className={`ml-auto rounded-full px-2 py-1 text-[9px] font-bold ${i===5?"bg-amber-50 text-amber-700":"bg-emerald-50 text-emerald-700"}`}>{i===5?"Approval required":"Visible"}</span></div>)}</div></article></div>}
    {tab==="Recovery"&&<div className="grid gap-5 lg:grid-cols-2"><article className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Backup & recovery readiness</h2><div className="mt-5 space-y-3">{[["Database point-in-time recovery","Planned","Backend not connected"],["Daily encrypted backup","Planned","Retention: 30 days"],["Configuration snapshot","Ready","Mock snapshot today"],["Restore drill","Scheduled","15 August 2026"],["Incident runbook","Draft","4 contacts pending"]].map(x=><div key={x[0]} className="rounded-xl border p-4 text-xs"><div className="flex"><b>{x[0]}</b><span className="ml-auto font-bold text-violet-600">{x[1]}</span></div><p className="mt-1 text-[10px] text-slate-400">{x[2]}</p></div>)}</div></article><article className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Recovery principles</h2><div className="mt-4 space-y-3">{["Backups are encrypted, access-controlled and isolated from production","Restore tests are required; a successful backup alone is insufficient","Wallet and transaction ledgers are append-only and independently reconciled","Break-glass access expires automatically and alerts all owners","Every incident preserves evidence, decisions, notifications and lessons learned"].map(x=><div key={x} className="flex gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-900"><ShieldCheck size={15} className="shrink-0"/>{x}</div>)}</div><button onClick={()=>action("Mock recovery drill started")} className="mt-5 h-10 w-full rounded-xl border text-xs font-bold text-violet-600">Run mock recovery drill</button></article></div>}
    {tab==="Audit"&&<section className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Security audit trail</h2><p className="text-xs text-slate-500">Append-only record of authentication, permission, policy, secret and emergency events</p><div className="mt-5 space-y-3">{[["MFA challenge passed","Shaneel Kumarreddy","AUTH-8821","Today, 08:41","Android · India"],["Role policy reviewed","System","RBAC-114","Today, 06:00","No drift detected"],["Service token scoped","Super Admin","TOK-462","Yesterday, 18:24","Content only"],["Failed login blocked","Unknown identity","AUTH-8814","Yesterday, 02:13","5 attempts · rate limited"],["Recovery snapshot created","System","BKP-0808","08 Aug, 23:30","Integrity check passed"]].map(x=><div key={x[2]} className="grid gap-2 rounded-xl border p-4 text-xs md:grid-cols-[1.2fr_150px_110px_120px_1fr]"><b>{x[0]}</b><span>{x[1]}</span><span className="font-mono text-violet-600">{x[2]}</span><span className="text-slate-400">{x[3]}</span><span className="text-slate-500">{x[4]}</span></div>)}</div><button onClick={()=>action("Mock immutable audit export created")} className="mt-5 flex h-10 items-center gap-2 rounded-xl border px-4 text-xs font-bold text-violet-600"><Download size={15}/>Export audit evidence</button></section>}
    {confirm&&<div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/55 p-4"><div role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><ShieldAlert className="text-rose-600"/><h3 className="mt-3 text-lg font-bold">Confirm mock security action</h3><p className="mt-2 text-sm leading-6 text-slate-500">This only records a simulated {confirm} decision. It cannot expose secrets, revoke sessions, lock administrators, change production availability or modify deployed settings.</p><label className="mt-4 block text-xs font-bold">Reason<textarea value={reason} onChange={e=>setReason(e.target.value)} className="mt-2 min-h-20 w-full rounded-xl border p-3 font-normal" placeholder="Required for the audit record"/></label><div className="mt-5 flex gap-2"><button onClick={()=>{setConfirm(null);setReason("")}} className="h-10 flex-1 rounded-xl border text-xs font-bold">Cancel</button><button disabled={!reason.trim()} onClick={finish} className="h-10 flex-1 rounded-xl bg-rose-600 text-xs font-bold text-white disabled:opacity-35">Confirm mock action</button></div></div></div>}
  </>;
}

type CommerceStore = { id: string; name: string; network: string; category: string; owner: string; status: "Active" | "Review" | "Paused"; tracking: "Healthy" | "Warning" | "Not tested"; rate: string; links: number; clicks: number; orders: number };
type TrackingLink = { id: string; store: string; campaign: string; shortPath: string; destination: string; owner: string; status: "Active" | "Warning" | "Paused"; health: string; clicks: number; conversions: number; expires: string; tested: string };

const commerceStores: CommerceStore[] = [
  { id: "STR-101", name: "Amazon India", network: "AffiliateMock", category: "General", owner: "Commerce Agent", status: "Active", tracking: "Healthy", rate: "1–6%", links: 38, clicks: 12840, orders: 514 },
  { id: "STR-102", name: "Myntra", network: "FashionMock", category: "Fashion", owner: "Affiliate Ops", status: "Active", tracking: "Healthy", rate: "4–9%", links: 24, clicks: 8794, orders: 406 },
  { id: "STR-103", name: "Croma", network: "Direct merchant", category: "Electronics", owner: "Commerce Agent", status: "Paused", tracking: "Not tested", rate: "2.5%", links: 11, clicks: 3612, orders: 92 },
  { id: "STR-104", name: "Travel Partner", network: "TravelMock", category: "Travel", owner: "Affiliate Ops", status: "Review", tracking: "Warning", rate: "₹120–₹480", links: 6, clicks: 2406, orders: 71 },
  { id: "STR-105", name: "Health Store", network: "Direct merchant", category: "Health", owner: "AI Commerce Agent", status: "Active", tracking: "Healthy", rate: "5%", links: 9, clicks: 1842, orders: 118 },
];

const trackingLinks: TrackingLink[] = [
  { id: "LNK-441", store: "Amazon India", campaign: "Festival electronics", shortPath: "/go/amazon-fest", destination: "amazon.in/deals/electronics", owner: "Commerce Agent", status: "Active", health: "200 · attributed", clicks: 5840, conversions: 226, expires: "31 Aug 2026", tested: "6 min ago" },
  { id: "LNK-440", store: "Myntra", campaign: "Fashion cashback", shortPath: "/go/style-aug", destination: "myntra.com/shop/august", owner: "Affiliate Ops", status: "Active", health: "200 · attributed", clicks: 4204, conversions: 198, expires: "18 Aug 2026", tested: "12 min ago" },
  { id: "LNK-438", store: "Travel Partner", campaign: "Monsoon travel", shortPath: "/go/travel-monsoon", destination: "travel.example/offers", owner: "Affiliate Ops", status: "Warning", health: "Redirect mismatch", clicks: 2406, conversions: 71, expires: "20 Aug 2026", tested: "18 min ago" },
  { id: "LNK-434", store: "Croma", campaign: "Laptop week", shortPath: "/go/laptop-week", destination: "croma.com/laptops", owner: "Commerce Agent", status: "Paused", health: "Awaiting retest", clicks: 3612, conversions: 92, expires: "Expired 08 Aug", tested: "1 hour ago" },
  { id: "LNK-429", store: "Health Store", campaign: "Wellness essentials", shortPath: "/go/wellness", destination: "health.example/essentials", owner: "AI Commerce Agent", status: "Active", health: "200 · attributed", clicks: 1842, conversions: 118, expires: "No expiry", tested: "22 min ago" },
];

function commerceTone(value: string) {
  if (["Active", "Healthy"].includes(value)) return "bg-emerald-50 text-emerald-700";
  if (["Review", "Warning"].includes(value)) return "bg-amber-50 text-amber-700";
  if (["Paused", "Not tested"].includes(value)) return "bg-slate-100 text-slate-600";
  return "bg-violet-50 text-violet-700";
}

function StoresLinksManagement({ action }: { action: (message: string) => void }) {
  const [tab, setTab] = useState<"Overview" | "Stores" | "Tracking links" | "Health & compliance">("Overview");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [detail, setDetail] = useState<{ title: string; id: string; fields: [string, string][] } | null>(null);
  const [pending, setPending] = useState<{ label: string; target: string; permission: string } | null>(null);
  const [reason, setReason] = useState("");
  const filteredStores = commerceStores.filter((store) => `${store.id} ${store.name} ${store.network} ${store.category} ${store.owner}`.toLowerCase().includes(query.toLowerCase()) && (status === "All statuses" || store.status === status));
  const filteredLinks = trackingLinks.filter((link) => `${link.id} ${link.store} ${link.campaign} ${link.shortPath} ${link.owner}`.toLowerCase().includes(query.toLowerCase()) && (status === "All statuses" || link.status === status));
  const openStore = (store: CommerceStore) => setDetail({ title: store.name, id: store.id, fields: [["Network", store.network], ["Category", store.category], ["Owner", store.owner], ["Commission rule", store.rate], ["Tracking", store.tracking], ["Active links", String(store.links)], ["Clicks", store.clicks.toLocaleString("en-IN")], ["Orders", store.orders.toLocaleString("en-IN")]] });
  const openLink = (link: TrackingLink) => setDetail({ title: link.campaign, id: link.id, fields: [["Store", link.store], ["Short path", link.shortPath], ["Destination", link.destination], ["Owner", link.owner], ["Health", link.health], ["Clicks", link.clicks.toLocaleString("en-IN")], ["Conversions", link.conversions.toLocaleString("en-IN")], ["Expiry", link.expires]] });
  const confirmAction = () => { if (!pending || !reason.trim()) return; action(`${pending.label} recorded for ${pending.target}`); setPending(null); setReason(""); };
  return <>
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-2 text-xs text-slate-400">Shop & Grow <span className="px-2">›</span> Stores & Links</div><h1 className="text-2xl font-bold tracking-tight md:text-[28px]">Stores & Affiliate Links</h1><p className="mt-1 max-w-3xl text-sm text-slate-500">Manage merchants, tracking destinations, campaign ownership and link health without tying the console to one affiliate provider.</p></div><div className="flex flex-wrap gap-2"><button onClick={() => action("Mock store onboarding form opened")} className="flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white"><Plus size={15}/>Add store</button><button onClick={() => action("Mock link health scan completed: 1 warning")} className="flex h-10 items-center gap-2 rounded-xl border bg-white px-4 text-xs font-bold text-violet-700"><RefreshCw size={15}/>Test all links</button></div></div>
    <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Stores and links workspace">{(["Overview","Stores","Tracking links","Health & compliance"] as const).map((item) => <button key={item} role="tab" aria-selected={tab === item} onClick={() => { setTab(item); setQuery(""); setStatus("All statuses"); }} className={`shrink-0 rounded-lg px-4 py-2 text-xs font-bold ${tab === item ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"}`}>{item}</button>)}</div>
    {tab === "Overview" && <div className="space-y-5"><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["Active stores","3","1 review · 1 paused",Store],["Tracking links","88","82 active",Link2],["Clicks this month","29,494","4.8% conversion",TrendingUp],["Health warnings","1","Redirect mismatch",CircleAlert]].map(([label,value,note,Icon], index) => <article key={label as string} className="rounded-2xl border bg-white p-5 shadow-sm"><span className={`grid h-10 w-10 place-items-center rounded-xl ${index === 3 ? "bg-amber-50 text-amber-600" : "bg-violet-50 text-violet-600"}`}><Icon size={19}/></span><p className="mt-4 text-xs font-semibold text-slate-500">{label as string}</p><p className="mt-1 text-2xl font-bold">{value as string}</p><p className="mt-1 text-[10px] text-slate-400">{note as string}</p></article>)}</section><section className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]"><article className="rounded-2xl border bg-white p-5"><div className="flex items-center"><div><h2 className="font-bold">Store health</h2><p className="text-xs text-slate-500">Attribution readiness across every merchant</p></div><button onClick={() => setTab("Stores")} className="ml-auto text-xs font-bold text-violet-600">Open directory →</button></div><div className="mt-5 space-y-3">{commerceStores.map((store) => <button key={store.id} onClick={() => openStore(store)} className="flex w-full items-center gap-3 rounded-xl border p-3 text-left hover:border-violet-200"><span className="grid h-9 w-9 place-items-center rounded-lg bg-violet-50 text-violet-600"><Store size={16}/></span><span><b className="block text-xs">{store.name}</b><span className="text-[10px] text-slate-400">{store.network} · {store.links} links</span></span><span className={`ml-auto rounded-full px-2 py-1 text-[9px] font-bold ${commerceTone(store.tracking)}`}>{store.tracking}</span></button>)}</div></article><article className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><ShieldAlert className="text-amber-600"/><h2 className="mt-3 font-bold text-amber-950">Action required</h2><p className="mt-2 text-xs leading-5 text-amber-900">Travel Partner redirects through an unexpected domain. Attribution could be lost or users could be sent to an unapproved destination.</p><button onClick={() => { setTab("Tracking links"); setQuery("LNK-438"); }} className="mt-5 h-10 rounded-xl bg-amber-600 px-4 text-xs font-bold text-white">Inspect warning</button><div className="mt-5 rounded-xl bg-white/70 p-3 text-[10px] leading-5 text-amber-900">Production scans must verify HTTPS, allowlisted domains, affiliate parameters, redirect chains, malware reputation and final landing-page availability.</div></article></section></div>}
    {(tab === "Stores" || tab === "Tracking links") && <section className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center"><label className="flex h-10 flex-1 items-center gap-2 rounded-xl border px-3"><Search size={15} className="text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tab === "Stores" ? "Search store, network, category or owner" : "Search link ID, campaign, path or owner"} className="w-full bg-transparent text-xs outline-none"/></label><select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-xl border bg-white px-3 text-xs outline-none"><option>All statuses</option><option>Active</option><option>Review</option><option>Warning</option><option>Paused</option></select><button onClick={() => action(`Mock ${tab.toLowerCase()} export created`)} className="flex h-10 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold text-violet-700"><Download size={14}/>Export</button></div>
      {tab === "Stores" ? <><div className="grid gap-3 p-4 md:hidden">{filteredStores.map((store) => <article key={store.id} className="rounded-xl border p-4"><div className="flex items-start"><div><p className="font-mono text-[10px] text-violet-600">{store.id}</p><h3 className="text-sm font-bold">{store.name}</h3><p className="text-[10px] text-slate-400">{store.network} · {store.category}</p></div><span className={`ml-auto rounded-full px-2 py-1 text-[9px] font-bold ${commerceTone(store.status)}`}>{store.status}</span></div><div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-slate-50 p-2"><b className="block text-xs">{store.links}</b><span className="text-[9px] text-slate-400">Links</span></div><div className="rounded-lg bg-slate-50 p-2"><b className="block text-xs">{store.clicks.toLocaleString("en-IN")}</b><span className="text-[9px] text-slate-400">Clicks</span></div><div className="rounded-lg bg-slate-50 p-2"><b className="block text-xs">{store.orders}</b><span className="text-[9px] text-slate-400">Orders</span></div></div><button onClick={() => openStore(store)} className="mt-3 h-9 w-full rounded-lg border text-xs font-bold text-violet-600">Inspect store</button></article>)}</div><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[1000px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-400"><tr>{["Store","Network / owner","Rate","Tracking","Links","Clicks / orders","Status","Action"].map((heading) => <th key={heading} className="px-5 py-3">{heading}</th>)}</tr></thead><tbody>{filteredStores.map((store) => <tr key={store.id} className="border-t"><td className="px-5 py-4"><b>{store.name}</b><p className="font-mono text-[10px] text-violet-600">{store.id} · {store.category}</p></td><td className="px-5 py-4">{store.network}<p className="text-[10px] text-slate-400">{store.owner}</p></td><td className="px-5 py-4 font-bold">{store.rate}</td><td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${commerceTone(store.tracking)}`}>{store.tracking}</span></td><td className="px-5 py-4 font-bold">{store.links}</td><td className="px-5 py-4"><b>{store.clicks.toLocaleString("en-IN")}</b><p className="text-[10px] text-slate-400">{store.orders} orders</p></td><td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${commerceTone(store.status)}`}>{store.status}</span></td><td className="px-5 py-4"><button onClick={() => openStore(store)} className="font-bold text-violet-600">Manage →</button></td></tr>)}</tbody></table></div></> : <><div className="grid gap-3 p-4 lg:hidden">{filteredLinks.map((link) => <article key={link.id} className="rounded-xl border p-4"><div className="flex"><div><p className="font-mono text-[10px] text-violet-600">{link.id}</p><h3 className="text-sm font-bold">{link.campaign}</h3><p className="text-[10px] text-slate-400">{link.store} · {link.shortPath}</p></div><span className={`ml-auto h-fit rounded-full px-2 py-1 text-[9px] font-bold ${commerceTone(link.status)}`}>{link.status}</span></div><p className="mt-3 rounded-lg bg-slate-50 p-2 text-[10px] text-slate-500">{link.health} · tested {link.tested}</p><button onClick={() => openLink(link)} className="mt-3 h-9 w-full rounded-lg border text-xs font-bold text-violet-600">Inspect link</button></article>)}</div><div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[1100px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-400"><tr>{["Link / campaign","Store","Destination","Owner","Health","Clicks / conversions","Expiry","Action"].map((heading) => <th key={heading} className="px-5 py-3">{heading}</th>)}</tr></thead><tbody>{filteredLinks.map((link) => <tr key={link.id} className="border-t"><td className="px-5 py-4"><b>{link.campaign}</b><p className="font-mono text-[10px] text-violet-600">{link.id} · {link.shortPath}</p></td><td className="px-5 py-4">{link.store}</td><td className="max-w-[220px] truncate px-5 py-4 text-slate-500">{link.destination}</td><td className="px-5 py-4">{link.owner}</td><td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${commerceTone(link.status)}`}>{link.health}</span><p className="mt-1 text-[9px] text-slate-400">{link.tested}</p></td><td className="px-5 py-4"><b>{link.clicks.toLocaleString("en-IN")}</b><p className="text-[10px] text-slate-400">{link.conversions} conversions</p></td><td className="px-5 py-4">{link.expires}</td><td className="px-5 py-4"><button onClick={() => openLink(link)} className="font-bold text-violet-600">Inspect →</button></td></tr>)}</tbody></table></div></>}
      {(tab === "Stores" ? filteredStores.length : filteredLinks.length) === 0 && <div className="p-10 text-center text-sm text-slate-500">No mock records match this search.</div>}
    </section>}
    {tab === "Health & compliance" && <div className="grid gap-5 lg:grid-cols-2"><section className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Automated link checks</h2><p className="text-xs text-slate-500">Required validation before a link can reach users</p><div className="mt-5 space-y-3">{[["HTTPS and destination allowlist","Passed","Every final domain approved"],["Affiliate parameter presence","Passed","Campaign and sub-ID retained"],["Redirect-chain integrity","Warning","1 link changed final domain"],["Malware and unsafe-content scan","Passed","No threat signals"],["Expiry and offer availability","Review","3 links expire within 10 days"],["Mobile deep-link fallback","Passed","Web fallback available"]].map(([check,state,note]) => <div key={check} className="flex items-center gap-3 rounded-xl border p-4"><CheckCircle2 size={16} className={state === "Passed" ? "text-emerald-600" : "text-amber-600"}/><div><b className="text-xs">{check}</b><p className="text-[10px] text-slate-400">{note}</p></div><span className={`ml-auto rounded-full px-2 py-1 text-[9px] font-bold ${state === "Passed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{state}</span></div>)}</div></section><section className="space-y-5"><article className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Governance rules</h2><div className="mt-4 space-y-3">{["Every store has an owner and approved network","User-facing cashback cannot exceed verified commission rules","Destination changes trigger an automatic pause and review","AI agent may test and flag links but cannot approve a new payout rule","Pause, replacement and retirement require a reason and audit event","Historical links remain traceable after campaigns end"].map((rule) => <div key={rule} className="flex gap-2 rounded-xl bg-violet-50 p-3 text-xs leading-5 text-violet-900"><ShieldCheck size={15} className="mt-0.5 shrink-0"/>{rule}</div>)}</div></article><article className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h2 className="font-bold text-amber-950">Provider-independent design</h2><p className="mt-2 text-xs leading-5 text-amber-900">Stores and links can later connect to multiple affiliate networks or direct merchants. No network credentials, click redirects or tracking callbacks are active in this mock workspace.</p></article></section></div>}
    {detail && <div className="fixed inset-0 z-[110] flex justify-end bg-slate-950/45" onMouseDown={(event) => event.target === event.currentTarget && setDetail(null)}><aside role="dialog" aria-modal="true" aria-labelledby="commerce-detail-title" className="admin-scroll h-full w-full max-w-xl overflow-y-auto bg-[#f7f8fc] shadow-2xl"><div className="sticky top-0 z-10 flex items-center border-b bg-white p-5"><div><p className="font-mono text-[10px] font-bold text-violet-600">{detail.id}</p><h2 id="commerce-detail-title" className="text-lg font-bold">{detail.title}</h2></div><button aria-label="Close details" onClick={() => setDetail(null)} className="ml-auto grid h-10 w-10 place-items-center rounded-xl border"><X size={18}/></button></div><div className="space-y-4 p-5"><section className="rounded-2xl border bg-white p-5"><div className="grid gap-3 sm:grid-cols-2">{detail.fields.map(([label,value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p><b className="mt-1 block break-all text-xs">{value}</b></div>)}</div></section><section className="rounded-2xl border bg-white p-5"><h3 className="font-bold">Guarded controls</h3><p className="mt-1 text-xs text-slate-500">Production will re-check role permissions, destination safety and active campaigns before changing availability.</p><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => action(`${detail.id} copied`)} className="flex h-10 items-center gap-2 rounded-xl border px-4 text-xs font-bold text-violet-700"><Copy size={14}/>Copy ID</button><button onClick={() => setPending({ label: "Pause", target: detail.id, permission: "commerce.links.pause" })} className="h-10 rounded-xl border border-amber-200 px-4 text-xs font-bold text-amber-700">Review pause</button><button onClick={() => setPending({ label: "Replace destination", target: detail.id, permission: "commerce.links.write" })} className="h-10 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white">Review replacement</button></div></section><section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900"><b>Mock only:</b> no store, redirect, commission rule or live affiliate link is changed.</section></div></aside></div>}
    {pending && <div className="fixed inset-0 z-[130] grid place-items-center bg-slate-950/55 p-4"><div role="alertdialog" aria-modal="true" aria-labelledby="commerce-action-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Permission: {pending.permission}</p><h3 id="commerce-action-title" className="mt-2 text-lg font-bold">{pending.label} {pending.target}?</h3><p className="mt-2 text-xs leading-5 text-slate-500">This records a simulated decision only. Production will validate dependencies and write an immutable activity event.</p><textarea autoFocus value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Required audit reason" className="mt-4 min-h-24 w-full rounded-xl border p-3 text-xs outline-none focus:border-violet-400"/><div className="mt-5 flex justify-end gap-2"><button onClick={() => { setPending(null); setReason(""); }} className="h-10 rounded-xl border px-4 text-xs font-bold">Cancel</button><button disabled={!reason.trim()} onClick={confirmAction} className="h-10 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white disabled:opacity-40">Confirm mock action</button></div></div></div>}
  </>;
}

type AuditEvent = { id: string; time: string; order: number; actor: string; actorType: "Human admin" | "AI agent" | "System"; action: string; category: "Finance" | "Identity" | "Commerce" | "Content" | "Security" | "Support"; target: string; result: "Success" | "Review" | "Blocked"; risk: "Low" | "Medium" | "High"; reason: string; session: string; source: string; before: string; after: string; integrity: string };
const auditEvents: AuditEvent[] = [
  { id: "AUD-8844", time: "Today, 22:14", order: 1, actor: "Content Agent", actorType: "AI agent", action: "Content draft scheduled", category: "Content", target: "CNT-208", result: "Success", risk: "Low", reason: "Approved evergreen FAQ policy", session: "SES-AI-209", source: "Scoped service token · India", before: "Draft", after: "Scheduled for 10 Aug, 08:00", integrity: "SHA-256 chain verified" },
  { id: "AUD-8843", time: "Today, 22:02", order: 2, actor: "Shaneel Kumarreddy", actorType: "Human admin", action: "KYC case escalated", category: "Identity", target: "KYC-2408", result: "Review", risk: "Medium", reason: "Document name mismatch", session: "SES-H-882", source: "Chrome · macOS · India", before: "Pending", after: "Manual review", integrity: "SHA-256 chain verified" },
  { id: "AUD-8842", time: "Today, 21:48", order: 3, actor: "Finance Agent", actorType: "AI agent", action: "Withdrawal hold applied", category: "Finance", target: "WD-2841", result: "Review", risk: "High", reason: "Velocity rule and new UPI handle", session: "SES-AI-204", source: "Policy engine · service identity", before: "Pending", after: "Risk hold", integrity: "SHA-256 chain verified" },
  { id: "AUD-8841", time: "Today, 21:30", order: 4, actor: "Support Agent", actorType: "AI agent", action: "Ticket response drafted", category: "Support", target: "SUP-4812", result: "Success", risk: "Low", reason: "Knowledge match confidence 96%", session: "SES-AI-201", source: "Support workspace · Telugu", before: "Open", after: "Draft response", integrity: "SHA-256 chain verified" },
  { id: "AUD-8840", time: "Today, 21:04", order: 5, actor: "System", actorType: "System", action: "Admin login blocked", category: "Security", target: "AUTH-8814", result: "Blocked", risk: "High", reason: "Five failed MFA challenges", session: "SES-UNKNOWN", source: "Unknown Android device · India", before: "Challenge", after: "Rate limited 30 min", integrity: "SHA-256 chain verified" },
  { id: "AUD-8839", time: "Today, 20:42", order: 6, actor: "Shaneel Kumarreddy", actorType: "Human admin", action: "Affiliate link paused", category: "Commerce", target: "LNK-438", result: "Success", risk: "Medium", reason: "Final redirect domain mismatch", session: "SES-H-882", source: "Chrome · macOS · India", before: "Active", after: "Paused", integrity: "SHA-256 chain verified" },
  { id: "AUD-8838", time: "Today, 20:18", order: 7, actor: "System", actorType: "System", action: "Reconciliation export created", category: "Finance", target: "RPT-AUG-09", result: "Success", risk: "Low", reason: "Scheduled close-readiness evidence", session: "SES-SYS-102", source: "Scheduled system task", before: "Not generated", after: "Encrypted export ready", integrity: "SHA-256 chain verified" },
];

function auditTone(value: string) {
  if (["Success", "Low"].includes(value)) return "bg-emerald-50 text-emerald-700";
  if (["Blocked", "High"].includes(value)) return "bg-rose-50 text-rose-700";
  if (["Review", "Medium"].includes(value)) return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function ActivityLogsManagement({ action }: { action: (message: string) => void }) {
  const [tab, setTab] = useState<"Event stream" | "Integrity & retention">("Event stream");
  const [query, setQuery] = useState("");
  const [actorType, setActorType] = useState("All actors");
  const [category, setCategory] = useState("All categories");
  const [risk, setRisk] = useState("All risk levels");
  const [selected, setSelected] = useState<AuditEvent | null>(null);
  const filtered = auditEvents.filter((event) => `${event.id} ${event.actor} ${event.action} ${event.target} ${event.reason} ${event.session}`.toLowerCase().includes(query.toLowerCase()) && (actorType === "All actors" || event.actorType === actorType) && (category === "All categories" || event.category === category) && (risk === "All risk levels" || event.risk === risk));
  return <>
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-2 text-xs text-slate-400">System <span className="px-2">›</span> Activity Logs</div><h1 className="text-2xl font-bold tracking-tight md:text-[28px]">Activity Logs & Audit Evidence</h1><p className="mt-1 max-w-3xl text-sm text-slate-500">Trace sensitive actions by people, AI agents and system processes with reasons, session context and tamper-evident history.</p></div><div className="flex flex-wrap gap-2"><span className="flex h-10 items-center gap-2 rounded-xl bg-emerald-50 px-3 text-xs font-bold text-emerald-700"><ShieldCheck size={15}/>Integrity verified</span><button onClick={() => action("Mock signed audit-evidence export created")} className="flex h-10 items-center gap-2 rounded-xl border bg-white px-4 text-xs font-bold text-violet-700"><Download size={15}/>Export evidence</button></div></div>
    <div className="mb-5 flex gap-1 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Activity log workspace"><button role="tab" aria-selected={tab === "Event stream"} onClick={() => setTab("Event stream")} className={`flex-1 rounded-lg px-4 py-2 text-xs font-bold ${tab === "Event stream" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"}`}>Event stream</button><button role="tab" aria-selected={tab === "Integrity & retention"} onClick={() => setTab("Integrity & retention")} className={`flex-1 rounded-lg px-4 py-2 text-xs font-bold ${tab === "Integrity & retention" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"}`}>Integrity & retention</button></div>
    {tab === "Event stream" ? <div className="space-y-5"><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["Events today","1,284","Across all modules",Activity],["AI-agent actions","426","33.2% of events",Bot],["High-risk events","2","Both protected",ShieldAlert],["Integrity breaks","0","Hash chain healthy",ShieldCheck]].map(([label,value,note,Icon], index) => <article key={label as string} className="rounded-2xl border bg-white p-5 shadow-sm"><span className={`grid h-10 w-10 place-items-center rounded-xl ${index === 2 ? "bg-rose-50 text-rose-600" : "bg-violet-50 text-violet-600"}`}><Icon size={19}/></span><p className="mt-4 text-xs font-semibold text-slate-500">{label as string}</p><p className="mt-1 text-2xl font-bold">{value as string}</p><p className="mt-1 text-[10px] text-slate-400">{note as string}</p></article>)}</section><section className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="grid gap-2 border-b p-4 lg:grid-cols-[1fr_160px_160px_150px_auto]"><label className="flex h-10 items-center gap-2 rounded-xl border px-3"><Search size={15} className="text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search actor, event ID, target, reason or session" className="w-full bg-transparent text-xs outline-none"/></label><select value={actorType} onChange={(event) => setActorType(event.target.value)} className="h-10 rounded-xl border bg-white px-3 text-xs"><option>All actors</option><option>Human admin</option><option>AI agent</option><option>System</option></select><select value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 rounded-xl border bg-white px-3 text-xs"><option>All categories</option>{["Finance","Identity","Commerce","Content","Security","Support"].map((item) => <option key={item}>{item}</option>)}</select><select value={risk} onChange={(event) => setRisk(event.target.value)} className="h-10 rounded-xl border bg-white px-3 text-xs"><option>All risk levels</option><option>High</option><option>Medium</option><option>Low</option></select><button onClick={() => { setQuery(""); setActorType("All actors"); setCategory("All categories"); setRisk("All risk levels"); }} className="h-10 rounded-xl px-3 text-xs font-bold text-violet-600">Reset</button></div><div className="grid gap-3 p-4 lg:hidden">{filtered.map((event) => <button key={event.id} onClick={() => setSelected(event)} className="rounded-xl border p-4 text-left"><div className="flex items-start"><div><p className="font-mono text-[10px] text-violet-600">{event.id}</p><h3 className="text-sm font-bold">{event.action}</h3><p className="text-[10px] text-slate-400">{event.actor} · {event.actorType}</p></div><span className={`ml-auto rounded-full px-2 py-1 text-[9px] font-bold ${auditTone(event.risk)}`}>{event.risk}</span></div><div className="mt-3 flex items-center text-[10px] text-slate-500"><span>{event.target} · {event.category}</span><span className="ml-auto">{event.time}</span></div></button>)}</div><div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[1150px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-400"><tr>{["Time / event","Actor","Action / reason","Category","Target","Result","Risk","Session","Inspect"].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead><tbody>{filtered.map((event) => <tr key={event.id} className="border-t hover:bg-slate-50/70"><td className="px-4 py-4"><b className="font-mono text-violet-600">{event.id}</b><p className="text-[9px] text-slate-400">{event.time}</p></td><td className="px-4 py-4"><b>{event.actor}</b><p className="text-[9px] text-slate-400">{event.actorType}</p></td><td className="max-w-[280px] px-4 py-4"><b>{event.action}</b><p className="truncate text-[9px] text-slate-400">{event.reason}</p></td><td className="px-4 py-4">{event.category}</td><td className="px-4 py-4 font-mono text-[10px]">{event.target}</td><td className="px-4 py-4"><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${auditTone(event.result)}`}>{event.result}</span></td><td className="px-4 py-4"><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${auditTone(event.risk)}`}>{event.risk}</span></td><td className="px-4 py-4 font-mono text-[9px] text-slate-500">{event.session}</td><td className="px-4 py-4"><button onClick={() => setSelected(event)} className="font-bold text-violet-600">Inspect →</button></td></tr>)}</tbody></table></div>{filtered.length === 0 && <div className="p-10 text-center text-sm text-slate-500">No audit events match these filters.</div>}<div className="border-t bg-amber-50 px-5 py-3 text-[10px] leading-5 text-amber-900"><b>Append-only:</b> events cannot be edited or deleted from this console. Corrections create a new linked event while preserving the original evidence.</div></section></div> : <div className="grid gap-5 lg:grid-cols-2"><section className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Evidence integrity</h2><p className="text-xs text-slate-500">Mock controls required for a production-grade audit ledger</p><div className="mt-5 space-y-3">{[["Event hash chain","Verified","1,284 / 1,284 today"],["Sequence continuity","Verified","No missing sequence IDs"],["Signed export readiness","Configured","Server signing required"],["Clock consistency","Verified","Asia/Kolkata business display"],["Sensitive-field redaction","Configured","No secrets or full identity data"],["External archive copy","Planned","Backend storage not connected"]].map(([label,state,note]) => <div key={label} className="flex items-center gap-3 rounded-xl border p-4"><ShieldCheck size={16} className={state === "Planned" ? "text-amber-600" : "text-emerald-600"}/><div><b className="text-xs">{label}</b><p className="text-[10px] text-slate-400">{note}</p></div><span className={`ml-auto rounded-full px-2 py-1 text-[9px] font-bold ${state === "Planned" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{state}</span></div>)}</div></section><section className="space-y-5"><article className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Retention policy</h2><div className="mt-4 grid grid-cols-2 gap-3">{[["Security & access","7 years"],["Wallet & finance","8 years"],["KYC decisions","8 years"],["Content & campaigns","3 years"],["Support actions","3 years"],["Link operations","5 years"]].map(([label,value]) => <div key={label} className="rounded-xl bg-slate-50 p-4"><p className="text-[10px] text-slate-400">{label}</p><b className="text-sm">{value}</b></div>)}</div><p className="mt-4 text-[10px] leading-5 text-slate-400">Illustrative policy only. Final retention periods must be approved against applicable Indian legal, tax, privacy and contractual requirements before backend activation.</p></article><article className="rounded-2xl border border-violet-200 bg-violet-50 p-5"><Bot className="text-violet-600"/><h2 className="mt-3 font-bold text-violet-950">AI-agent accountability</h2><p className="mt-2 text-xs leading-5 text-violet-900">Every autonomous action must identify the agent version, policy, tool permission, confidence, input evidence and approving identity when required. AI events are never merged under a generic “System” actor.</p></article></section></div>}
    {selected && <div className="fixed inset-0 z-[110] flex justify-end bg-slate-950/45" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}><aside role="dialog" aria-modal="true" aria-labelledby="audit-detail-title" className="admin-scroll h-full w-full max-w-xl overflow-y-auto bg-[#f7f8fc] shadow-2xl"><div className="sticky top-0 z-10 flex items-center border-b bg-white p-5"><div><p className="font-mono text-[10px] font-bold text-violet-600">{selected.id} · {selected.time}</p><h2 id="audit-detail-title" className="text-lg font-bold">{selected.action}</h2></div><button aria-label="Close audit detail" onClick={() => setSelected(null)} className="ml-auto grid h-10 w-10 place-items-center rounded-xl border"><X size={18}/></button></div><div className="space-y-4 p-5"><section className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap gap-2"><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${auditTone(selected.result)}`}>{selected.result}</span><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${auditTone(selected.risk)}`}>{selected.risk} risk</span><span className="rounded-full bg-violet-50 px-2 py-1 text-[9px] font-bold text-violet-700">{selected.category}</span></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{[["Actor",`${selected.actor} · ${selected.actorType}`],["Target",selected.target],["Reason",selected.reason],["Session",selected.session],["Source",selected.source],["Integrity",selected.integrity]].map(([label,value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p><b className="mt-1 block text-xs leading-5">{value}</b></div>)}</div></section><section className="rounded-2xl border bg-white p-5"><h3 className="font-bold">Before and after</h3><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border p-4"><p className="text-[10px] font-bold uppercase text-slate-400">Before</p><p className="mt-2 text-xs">{selected.before}</p></div><div className="rounded-xl border border-violet-200 bg-violet-50 p-4"><p className="text-[10px] font-bold uppercase text-violet-500">After</p><p className="mt-2 text-xs font-bold text-violet-900">{selected.after}</p></div></div></section><button onClick={() => action(`Evidence bundle for ${selected.id} prepared`)} className="flex h-10 items-center gap-2 rounded-xl border bg-white px-4 text-xs font-bold text-violet-700"><Download size={15}/>Export this event</button><section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900"><b>Immutable evidence:</b> this event cannot be edited or deleted. Production corrections create a linked follow-up event.</section></div></aside></div>}
  </>;
}

export default function AdminDashboardPage() {
  const [activeView, setActiveView] = useState<AdminView>("Dashboard");
  const [currentRole, setCurrentRole] = useState<AdminRole>("Super Admin");
  const [historyPosition, setHistoryPosition] = useState(0);
  const [historyLength, setHistoryLength] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [readNotifications, setReadNotifications] = useState<string[]>([]);
  const [pinnedViews, setPinnedViews] = useState<AdminView[]>(["Withdrawals", "KYC Verification", "Support Centre"]);
  const [recentViews, setRecentViews] = useState<AdminView[]>([]);
  const [range, setRange] = useState<keyof typeof chartSets>("30 days");
  const [transactionFilter, setTransactionFilter] = useState("All");
  const [toast, setToast] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [recordType, setRecordType] = useState<"All" | SearchRecordType>("All");
  const [recordStatus, setRecordStatus] = useState("All statuses");
  const [recordPriority, setRecordPriority] = useState("All priorities");
  const [recordSort, setRecordSort] = useState("Recently updated");
  const [recordPage, setRecordPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<SearchRecord | null>(null);
  const [saveViewName, setSaveViewName] = useState("");
  const [showSaveView, setShowSaveView] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [dirtyForm, setDirtyForm] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<AdminView | null>(null);
  const [reliabilityState, setReliabilityState] = useState<ReliabilityState>("Ready");
  const [savedRecordViews, setSavedRecordViews] = useState<SavedRecordView[]>([
    { name: "High-priority work", type: "All", status: "All statuses", priority: "High", sort: "Recently updated" },
    { name: "Open support cases", type: "Support", status: "Open", priority: "All priorities", sort: "Recently updated" },
  ]);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const notifications: { id: string; title: string; detail: string; view: AdminView; urgent?: boolean }[] = [
    { id: "withdrawals", title: "8 withdrawals await approval", detail: "₹74,260 requested", view: "Withdrawals" },
    { id: "kyc", title: "12 KYC profiles need review", detail: "Oldest request is 9 hours old", view: "KYC Verification" },
    { id: "risk", title: "Unusual activity detected on 3 devices", detail: "High-risk signals require review", view: "Fraud & Risk", urgent: true },
    { id: "support", title: "5 support tickets are open", detail: "2 are beyond response target", view: "Support Centre" },
    { id: "reports", title: "Reconciliation period needs attention", detail: "2 exceptions remain unmatched", view: "Reports" },
  ];
  const workspace = roleWorkspaces[currentRole];
  const roleNotifications = notifications.filter((notification) => workspace.views.includes(notification.view));
  const unreadCount = roleNotifications.filter((notification) => !readNotifications.includes(notification.id)).length;
  const filteredTransactions = useMemo(() => (transactionFilter === "All" ? transactions : transactions.filter((t) => t.status === transactionFilter)), [transactionFilter]);
  const commandResults = useMemo(() => {
    const query = commandQuery.trim().toLowerCase();
    return workspace.views.filter((view) => !query || view.toLowerCase().includes(query));
  }, [commandQuery, workspace.views]);
  const recordStatuses = useMemo(() => Array.from(new Set(searchableRecords.filter((record) => recordType === "All" || record.type === recordType).map((record) => record.status))).sort(), [recordType]);
  const recordResults = useMemo(() => {
    const query = commandQuery.trim().toLowerCase();
    const matches = searchableRecords.filter((record) => {
      const searchable = `${record.id} ${record.type} ${record.title} ${record.subtitle} ${record.status} ${record.details.flat().join(" ")}`.toLowerCase();
      return workspace.views.includes(record.view) && (!query || searchable.includes(query)) &&
        (recordType === "All" || record.type === recordType) &&
        (recordStatus === "All statuses" || record.status === recordStatus) &&
        (recordPriority === "All priorities" || record.priority === recordPriority);
    });
    return [...matches].sort((a, b) => {
      if (recordSort === "Oldest updated") return b.updatedOrder - a.updatedOrder;
      if (recordSort === "Priority: high first") return ({ High: 0, Medium: 1, Low: 2 }[a.priority] - { High: 0, Medium: 1, Low: 2 }[b.priority]) || a.updatedOrder - b.updatedOrder;
      if (recordSort === "ID: A to Z") return a.id.localeCompare(b.id);
      return a.updatedOrder - b.updatedOrder;
    });
  }, [commandQuery, recordPriority, recordSort, recordStatus, recordType, workspace.views]);
  const recordPageSize = 6;
  const recordPageCount = Math.max(1, Math.ceil(recordResults.length / recordPageSize));
  const pagedRecordResults = recordResults.slice((Math.min(recordPage, recordPageCount) - 1) * recordPageSize, Math.min(recordPage, recordPageCount) * recordPageSize);
  const action = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };

  const rememberView = useCallback((view: AdminView) => {
    setRecentViews((current) => [view, ...current.filter((item) => item !== view)].slice(0, 5));
  }, []);

  const togglePinnedView = (view: AdminView) => {
    if (!workspace.views.includes(view)) {
      action(`${currentRole} cannot pin this restricted section`);
      return;
    }
    const isPinned = pinnedViews.includes(view);
    setPinnedViews((current) => {
      const next = isPinned ? current.filter((item) => item !== view) : [...current, view];
      window.localStorage.setItem(`glonni-admin-pinned-views-${currentRole}`, JSON.stringify(next));
      return next;
    });
    action(isPinned ? `${view} removed from pinned sections` : `${view} pinned to your workspace`);
  };

  const syncHistoryControls = useCallback(() => {
    const position = Number(window.history.state?.adminPosition ?? 0);
    const length = Number(window.sessionStorage.getItem("glonni-admin-history-length") ?? position + 1);
    setHistoryPosition(position);
    setHistoryLength(Math.max(length, position + 1));
  }, []);

  const dirtyFormRef = useRef(false);
  const navigateTo = useCallback((view: AdminView, replace = false, discardDraft = false) => {
    if (!roleWorkspaces[currentRole].views.includes(view)) {
      action(`${currentRole} does not have access to ${view}`);
      setMenuOpen(false);
      return;
    }
    if (dirtyFormRef.current && view !== activeView && !discardDraft) {
      setPendingNavigation(view);
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set("section", adminViewSlugs[view]);
    url.searchParams.delete("record");
    const currentPosition = Number(window.history.state?.adminPosition ?? 0);
    const nextPosition = replace ? currentPosition : currentPosition + 1;
    const nextLength = replace ? Math.max(Number(window.sessionStorage.getItem("glonni-admin-history-length") ?? 1), nextPosition + 1) : nextPosition + 1;
    window.history[replace ? "replaceState" : "pushState"]({ ...window.history.state, adminView: view, adminPosition: nextPosition }, "", url);
    window.sessionStorage.setItem("glonni-admin-history-length", String(nextLength));
    setActiveView(view);
    setSelectedRecord(null);
    rememberView(view);
    setHistoryPosition(nextPosition);
    setHistoryLength(nextLength);
    setMenuOpen(false);
    setNoticeOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeView, currentRole, rememberView]);

  const openRecord = useCallback((record: SearchRecord) => {
    if (!roleWorkspaces[currentRole].views.includes(record.view)) {
      action(`${currentRole} cannot open this restricted record`);
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set("section", adminViewSlugs[record.view]);
    url.searchParams.set("record", record.id);
    const currentPosition = Number(window.history.state?.adminPosition ?? 0);
    const nextPosition = currentPosition + 1;
    window.history.pushState({ ...window.history.state, adminView: record.view, adminPosition: nextPosition, adminRecord: record.id }, "", url);
    window.sessionStorage.setItem("glonni-admin-history-length", String(nextPosition + 1));
    setActiveView(record.view);
    setSelectedRecord(record);
    rememberView(record.view);
    setHistoryPosition(nextPosition);
    setHistoryLength(nextPosition + 1);
    setCommandOpen(false);
    setCommandQuery("");
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentRole, rememberView]);

  const changeRole = (role: AdminRole) => {
    const nextWorkspace = roleWorkspaces[role];
    setCurrentRole(role);
    window.localStorage.setItem("glonni-admin-workspace-role", role);
    const storedPins = window.localStorage.getItem(`glonni-admin-pinned-views-${role}`);
    if (storedPins) {
      try {
        const parsed = JSON.parse(storedPins) as AdminView[];
        setPinnedViews(parsed.filter((view) => nextWorkspace.views.includes(view)));
      } catch {
        setPinnedViews(nextWorkspace.defaultPins);
      }
    } else setPinnedViews(nextWorkspace.defaultPins);
    setRecentViews((current) => current.filter((view) => nextWorkspace.views.includes(view)));
    setProfileOpen(false);
    setNoticeOpen(false);
    setCommandOpen(false);
    if (!nextWorkspace.views.includes(activeView)) navigateTo("Dashboard", false, true);
    action(`Previewing ${role} workspace`);
  };

  const closeRecord = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("record");
    window.history.replaceState({ ...window.history.state, adminRecord: undefined }, "", url);
    setSelectedRecord(null);
  }, []);

  const applySavedRecordView = (view: SavedRecordView) => {
    setRecordType(view.type);
    setRecordStatus(view.status);
    setRecordPriority(view.priority);
    setRecordSort(view.sort);
    setRecordPage(1);
  };

  const saveCurrentRecordView = () => {
    const name = saveViewName.trim();
    if (!name) return;
    const next = [...savedRecordViews.filter((view) => view.name.toLowerCase() !== name.toLowerCase()), { name, type: recordType, status: recordStatus, priority: recordPriority, sort: recordSort }];
    setSavedRecordViews(next);
    window.localStorage.setItem("glonni-admin-saved-record-views", JSON.stringify(next));
    setSaveViewName("");
    setShowSaveView(false);
    action(`Saved search view “${name}”`);
  };

  const goBack = useCallback(() => {
    const position = Number(window.history.state?.adminPosition ?? 0);
    if (position > 0) {
      window.history.back();
      return;
    }
    if (activeView !== "Dashboard") navigateTo("Dashboard");
  }, [activeView, navigateTo]);

  useEffect(() => {
    const initialView = getAdminViewFromUrl();
    const initialPosition = Number(window.history.state?.adminPosition ?? 0);
    const initialUrl = new URL(window.location.href);
    initialUrl.searchParams.set("section", adminViewSlugs[initialView]);
    const initialRecordId = initialUrl.searchParams.get("record");
    const initialRecord = searchableRecords.find((record) => record.id === initialRecordId && record.view === initialView) ?? null;
    if (!initialRecord) initialUrl.searchParams.delete("record");
    window.history.replaceState({ ...window.history.state, adminView: initialView, adminPosition: initialPosition }, "", initialUrl);
    setActiveView(initialView);
    setSelectedRecord(initialRecord);
    rememberView(initialView);
    syncHistoryControls();

    const handlePopState = () => {
      const nextView = getAdminViewFromUrl();
      const recordId = new URL(window.location.href).searchParams.get("record");
      setActiveView(nextView);
      setSelectedRecord(searchableRecords.find((record) => record.id === recordId && record.view === nextView) ?? null);
      rememberView(nextView);
      setMenuOpen(false);
      setNoticeOpen(false);
      setProfileOpen(false);
      syncHistoryControls();
      window.scrollTo({ top: 0, behavior: "auto" });
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [rememberView, syncHistoryControls]);

  useEffect(() => {
    const storedRole = window.localStorage.getItem("glonni-admin-workspace-role") as AdminRole | null;
    const role = storedRole && roleWorkspaces[storedRole] ? storedRole : "Super Admin";
    setCurrentRole(role);
    const storedPins = window.localStorage.getItem(`glonni-admin-pinned-views-${role}`) ?? window.localStorage.getItem("glonni-admin-pinned-views");
    if (!storedPins) {
      setPinnedViews(roleWorkspaces[role].defaultPins);
      return;
    }
    try {
      const parsed = JSON.parse(storedPins) as AdminView[];
      setPinnedViews(parsed.filter((view) => roleWorkspaces[role].views.includes(view)));
    } catch {
      setPinnedViews(roleWorkspaces[role].defaultPins);
    }
  }, []);

  useEffect(() => {
    const storedViews = window.localStorage.getItem("glonni-admin-saved-record-views");
    if (!storedViews) return;
    try {
      const parsed = JSON.parse(storedViews) as SavedRecordView[];
      if (Array.isArray(parsed)) setSavedRecordViews(parsed);
    } catch {
      window.localStorage.removeItem("glonni-admin-saved-record-views");
    }
  }, []);

  useEffect(() => {
    if (workspace.views.includes(activeView)) return;
    const url = new URL(window.location.href);
    url.searchParams.set("section", adminViewSlugs.Dashboard);
    url.searchParams.delete("record");
    window.history.replaceState({ ...window.history.state, adminView: "Dashboard" }, "", url);
    setActiveView("Dashboard");
    setSelectedRecord(null);
    action(`${currentRole} workspace opened; the previous section is restricted`);
  }, [activeView, currentRole, workspace.views]);

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
      if (event.key === "Escape") {
        setCommandOpen(false);
        setCommandQuery("");
        setShowSaveView(false);
        setMenuOpen(false);
        setNoticeOpen(false);
        setProfileOpen(false);
        if (selectedRecord) closeRecord();
      }
    };
    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [closeRecord, selectedRecord]);

  useEffect(() => {
    const handleDirty = (event: Event) => { const next=Boolean((event as CustomEvent<boolean>).detail);dirtyFormRef.current=next;setDirtyForm(next) };
    const handleBeforeUnload = (event: BeforeUnloadEvent) => { if (!dirtyFormRef.current) return; event.preventDefault(); event.returnValue="" };
    const handleOnline = () => { setIsOnline(true); setReliabilityState((current)=>current==="Offline"?"Ready":current); action("Connection restored") };
    const handleOffline = () => { setIsOnline(false); setReliabilityState("Offline") };
    setIsOnline(window.navigator.onLine);
    window.addEventListener("glonni-admin-dirty",handleDirty);
    window.addEventListener("beforeunload",handleBeforeUnload);
    window.addEventListener("online",handleOnline);
    window.addEventListener("offline",handleOffline);
    return()=>{window.removeEventListener("glonni-admin-dirty",handleDirty);window.removeEventListener("beforeunload",handleBeforeUnload);window.removeEventListener("online",handleOnline);window.removeEventListener("offline",handleOffline)};
  }, []);

  useEffect(() => {
    let activeDialog: HTMLElement | null = null;
    let returnFocus: HTMLElement | null = null;
    const focusable = 'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    const syncDialog = () => {
      const dialogs=Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"],[role="alertdialog"]'));
      const next=dialogs.at(-1)??null;
      if(next===activeDialog)return;
      if(!next&&activeDialog){returnFocus?.focus();activeDialog=null;returnFocus=null;return}
      if(next){returnFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;activeDialog=next;window.setTimeout(()=>{const target=next.querySelector<HTMLElement>('[autofocus]')??next.querySelector<HTMLElement>(focusable);if(!target){next.tabIndex=-1;next.focus()}else target.focus()},0)};
    };
    const observer=new MutationObserver(syncDialog);observer.observe(document.body,{childList:true,subtree:true});syncDialog();
    const trap=(event:KeyboardEvent)=>{if(!activeDialog)return;if(event.key==="Escape"){const close=activeDialog.querySelector<HTMLButtonElement>('[data-dialog-close],button[aria-label^="Close"]');if(close){event.preventDefault();event.stopPropagation();close.click()}return}if(event.key!=="Tab")return;const items=Array.from(activeDialog.querySelectorAll<HTMLElement>(focusable)).filter(item=>item.offsetParent!==null);if(!items.length){event.preventDefault();activeDialog.focus();return}const first=items[0],last=items[items.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}};
    document.addEventListener("keydown",trap,true);return()=>{observer.disconnect();document.removeEventListener("keydown",trap,true)};
  }, []);

  useEffect(() => {
    if (commandOpen) window.setTimeout(() => commandInputRef.current?.focus(), 0);
  }, [commandOpen]);

  return (
    <div className="admin-root min-h-screen bg-[#f7f8fc] text-[#172033]">
      <a href="#admin-content" className="admin-skip-link">Skip to admin content</a>
      {toast && (
        <div role="status" className="fixed bottom-6 right-6 z-[80] flex items-center gap-2 rounded-xl bg-[#172033] px-4 py-3 text-sm font-medium text-white shadow-2xl">
          <CheckCircle2 size={17} className="text-emerald-400" />
          {toast}
        </div>
      )}
      {!isOnline && <div role="alert" className="fixed inset-x-0 top-0 z-[160] flex min-h-11 items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-center text-xs font-bold text-amber-950"><Wifi size={15}/>Offline mode: review cached mock data only. Changes are paused until connection returns.</div>}
      {pendingNavigation && <div className="fixed inset-0 z-[145] grid place-items-center bg-slate-950/55 p-4"><div role="alertdialog" aria-modal="true" aria-labelledby="unsaved-title" aria-describedby="unsaved-description" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><CircleAlert className="text-amber-600"/><h2 id="unsaved-title" className="mt-3 text-lg font-bold">Draft is still saving</h2><p id="unsaved-description" className="mt-2 text-sm leading-6 text-slate-500">Wait for autosave to finish, or discard the latest unsaved keystrokes and continue to {pendingNavigation}.</p><div className="mt-5 flex gap-2"><button autoFocus data-dialog-close onClick={()=>setPendingNavigation(null)} className="h-10 flex-1 rounded-xl border text-xs font-bold">Stay here</button><button onClick={()=>{const target=pendingNavigation;setPendingNavigation(null);dirtyFormRef.current=false;setDirtyForm(false);navigateTo(target,false,true)}} className="h-10 flex-1 rounded-xl bg-rose-600 text-xs font-bold text-white">Discard &amp; continue</button></div></div></div>}
      {menuOpen && <button aria-label="Close admin navigation" className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" onClick={() => setMenuOpen(false)} />}
      {locked && (
        <div className="fixed inset-0 z-[150] grid place-items-center bg-[#10172a] p-5 text-white">
          <div className="w-full max-w-sm text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-violet-600"><LockKeyhole size={28} /></div>
            <h2 className="mt-5 text-2xl font-bold">Admin console locked</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">This mock lock hides the console on this device. Production unlock will require fresh authentication and MFA.</p>
            <button autoFocus onClick={() => { setLocked(false); action("Mock console unlocked"); }} className="mt-6 h-11 w-full rounded-xl bg-white font-bold text-[#172033]">Unlock mock console</button>
          </div>
        </div>
      )}
      {signOutOpen && (
        <div className="fixed inset-0 z-[140] grid place-items-center bg-slate-950/55 p-4">
          <div role="alertdialog" aria-modal="true" aria-labelledby="sign-out-title" className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <LogOut className="text-rose-600" />
            <h2 id="sign-out-title" className="mt-3 text-lg font-bold">Sign out of admin?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Authentication is not connected yet. Confirming will only simulate sign-out and lock this mock console.</p>
            <div className="mt-5 flex gap-2"><button onClick={() => setSignOutOpen(false)} className="h-10 flex-1 rounded-xl border text-xs font-bold">Cancel</button><button onClick={() => { setSignOutOpen(false); setLocked(true); }} className="h-10 flex-1 rounded-xl bg-rose-600 text-xs font-bold text-white">Mock sign out</button></div>
          </div>
        </div>
      )}
      {commandOpen && (
        <div className="fixed inset-0 z-[120] flex items-start justify-center bg-slate-950/55 p-3 pt-[4vh] sm:p-5 sm:pt-[7vh]" onMouseDown={() => { setCommandOpen(false); setCommandQuery(""); setShowSaveView(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="admin-command-title" className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-center border-b px-4 sm:px-5">
              <Search size={20} className="text-violet-600" />
              <label className="flex h-16 min-w-0 flex-1 items-center px-3">
                <span className="sr-only">Search all admin records and sections</span>
                <input ref={commandInputRef} value={commandQuery} onChange={(event) => { setCommandQuery(event.target.value); setRecordPage(1); }} placeholder="Search name, phone, email, record ID, ticket or campaign…" className="h-full w-full bg-transparent text-sm outline-none sm:text-base" />
              </label>
              <kbd className="hidden rounded border bg-slate-50 px-2 py-1 text-[10px] text-slate-400 sm:block">ESC</kbd>
              <button aria-label="Close search" onClick={() => { setCommandOpen(false); setCommandQuery(""); }} className="ml-2 grid h-10 w-10 place-items-center rounded-xl hover:bg-slate-100"><X size={18}/></button>
            </div>
            <div className="admin-scroll overflow-y-auto">
              <div className="border-b bg-slate-50/70 p-4 sm:p-5">
                <div className="flex flex-wrap gap-2">
                  <label className="flex h-10 items-center gap-2 rounded-xl border bg-white px-3 text-xs"><Filter size={14}/><select aria-label="Record type" value={recordType} onChange={(event) => { setRecordType(event.target.value as "All" | SearchRecordType); setRecordStatus("All statuses"); setRecordPage(1); }} className="bg-transparent outline-none"><option>All</option><option>User</option><option>Transaction</option><option>Withdrawal</option><option>Support</option><option>Campaign</option><option>Store</option><option>Audit Event</option></select></label>
                  <label className="flex h-10 items-center rounded-xl border bg-white px-3 text-xs"><select aria-label="Record status" value={recordStatus} onChange={(event) => { setRecordStatus(event.target.value); setRecordPage(1); }} className="bg-transparent outline-none"><option>All statuses</option>{recordStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
                  <label className="flex h-10 items-center rounded-xl border bg-white px-3 text-xs"><select aria-label="Record priority" value={recordPriority} onChange={(event) => { setRecordPriority(event.target.value); setRecordPage(1); }} className="bg-transparent outline-none"><option>All priorities</option><option>High</option><option>Medium</option><option>Low</option></select></label>
                  <label className="flex h-10 items-center rounded-xl border bg-white px-3 text-xs"><select aria-label="Sort records" value={recordSort} onChange={(event) => { setRecordSort(event.target.value); setRecordPage(1); }} className="bg-transparent outline-none"><option>Recently updated</option><option>Oldest updated</option><option>Priority: high first</option><option>ID: A to Z</option></select></label>
                  <button onClick={() => { setRecordType("All"); setRecordStatus("All statuses"); setRecordPriority("All priorities"); setRecordSort("Recently updated"); setRecordPage(1); }} className="h-10 rounded-xl px-3 text-xs font-bold text-violet-600">Reset</button>
                  <button onClick={() => setShowSaveView(!showSaveView)} className="ml-auto flex h-10 items-center gap-2 rounded-xl border border-violet-200 bg-white px-3 text-xs font-bold text-violet-700"><Pin size={14}/>Save view</button>
                </div>
                {showSaveView && <div className="mt-3 flex flex-col gap-2 rounded-xl border border-violet-100 bg-white p-3 sm:flex-row"><input autoFocus value={saveViewName} onChange={(event) => setSaveViewName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && saveCurrentRecordView()} placeholder="Name this filtered view" className="h-10 flex-1 rounded-lg border px-3 text-xs outline-none focus:border-violet-400"/><button disabled={!saveViewName.trim()} onClick={saveCurrentRecordView} className="h-10 rounded-lg bg-violet-600 px-4 text-xs font-bold text-white disabled:opacity-40">Save current filters</button></div>}
                <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1"><span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400">Saved views</span>{savedRecordViews.map((view) => <button key={view.name} onClick={() => applySavedRecordView(view)} className="shrink-0 rounded-full border bg-white px-3 py-1.5 text-[10px] font-semibold text-slate-600 hover:border-violet-300 hover:text-violet-700">{view.name}</button>)}</div>
              </div>
              {commandQuery && commandResults.length > 0 && <div className="border-b p-4 sm:px-5"><p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Sections</p><div className="flex flex-wrap gap-2">{commandResults.slice(0, 5).map((view) => <button key={view} onClick={() => { navigateTo(view); setCommandOpen(false); setCommandQuery(""); }} className="rounded-xl bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700">Open {view}</button>)}</div></div>}
              <div className="p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between"><div><h2 id="admin-command-title" className="font-bold">Records</h2><p className="text-[11px] text-slate-400">{recordResults.length} mock results across the admin console</p></div><span className="rounded-full bg-violet-50 px-3 py-1 text-[10px] font-bold text-violet-700">Page {Math.min(recordPage, recordPageCount)} of {recordPageCount}</span></div>
                <div className="grid gap-2">
                  {pagedRecordResults.map((record) => <button key={record.id} onClick={() => openRecord(record)} className="grid gap-3 rounded-xl border p-3 text-left hover:border-violet-300 hover:bg-violet-50/30 sm:grid-cols-[110px_1fr_90px_90px_90px] sm:items-center">
                    <span><span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">{record.type}</span><span className="font-mono text-[11px] font-bold text-violet-600">{record.id}</span></span>
                    <span className="min-w-0"><b className="block truncate text-xs text-slate-800">{record.title}</b><span className="block truncate text-[10px] text-slate-400">{record.subtitle}</span></span>
                    <span className={`w-fit rounded-full px-2 py-1 text-[9px] font-bold ${tone(record.status)}`}>{record.status}</span>
                    <span className={`w-fit rounded-full px-2 py-1 text-[9px] font-bold ${record.priority === "High" ? "bg-rose-50 text-rose-700" : record.priority === "Medium" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{record.priority}</span>
                    <span className="text-[10px] text-slate-400 sm:text-right">{record.updated}</span>
                  </button>)}
                  {pagedRecordResults.length === 0 && <div className="rounded-xl border border-dashed p-10 text-center"><Search size={28} className="mx-auto text-slate-300"/><p className="mt-3 text-sm font-bold">No records found</p><p className="mt-1 text-xs text-slate-400">Change the search or reset the filters.</p></div>}
                </div>
                <div className="mt-4 flex items-center justify-between"><p className="text-[10px] text-slate-400">Mock records only · Backend search will replace this index</p><div className="flex gap-2"><button disabled={recordPage <= 1} onClick={() => setRecordPage((page) => Math.max(1, page - 1))} className="grid h-9 w-9 place-items-center rounded-lg border disabled:opacity-30" aria-label="Previous results page"><ChevronLeft size={15}/></button><button disabled={recordPage >= recordPageCount} onClick={() => setRecordPage((page) => Math.min(recordPageCount, page + 1))} className="grid h-9 w-9 place-items-center rounded-lg border disabled:opacity-30" aria-label="Next results page"><ChevronRight size={15}/></button></div></div>
              </div>
            </div>
          </section>
        </div>
      )}
      {selectedRecord && (
        <div className="fixed inset-0 z-[110] flex justify-end bg-slate-950/45" onMouseDown={(event) => event.target === event.currentTarget && closeRecord()}>
          <aside role="dialog" aria-modal="true" aria-labelledby="record-detail-title" className="admin-scroll h-full w-full max-w-xl overflow-y-auto bg-[#f7f8fc] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center border-b bg-white p-5"><div><p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">{selectedRecord.type} · {selectedRecord.id}</p><h2 id="record-detail-title" className="mt-1 text-lg font-bold">{selectedRecord.title}</h2></div><button aria-label="Close record details" onClick={closeRecord} className="ml-auto grid h-10 w-10 place-items-center rounded-xl border"><X size={18}/></button></div>
            <div className="space-y-4 p-5">
              <section className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-[10px] font-bold ${tone(selectedRecord.status)}`}>{selectedRecord.status}</span><span className={`rounded-full px-3 py-1 text-[10px] font-bold ${selectedRecord.priority === "High" ? "bg-rose-50 text-rose-700" : selectedRecord.priority === "Medium" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{selectedRecord.priority} priority</span><span className="ml-auto text-[10px] text-slate-400">Updated {selectedRecord.updated}</span></div><p className="mt-4 text-sm text-slate-600">{selectedRecord.subtitle}</p><div className="mt-5 grid gap-3 sm:grid-cols-2">{selectedRecord.details.map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p><b className="mt-1 block text-xs">{value}</b></div>)}</div></section>
              <section className="rounded-2xl border bg-white p-5"><h3 className="font-bold">Record link</h3><p className="mt-1 text-xs leading-5 text-slate-500">This detail has its own URL. Copy it to reopen or share the same mock record with an authorized administrator.</p><button onClick={() => { navigator.clipboard?.writeText(window.location.href); action("Record link copied"); }} className="mt-4 flex h-10 items-center gap-2 rounded-xl border px-4 text-xs font-bold text-violet-700"><Copy size={15}/>Copy bookmarkable link</button></section>
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900"><b>Mock record:</b> this detail page does not read or change production data. Permissions and server-side record loading will be connected during backend integration.</section>
            </div>
          </aside>
        </div>
      )}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-[#10172a] text-white transition-all duration-300 ${collapsed ? "lg:w-[88px]" : "lg:w-[260px]"} ${menuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="flex h-[76px] items-center gap-3 border-b border-white/10 px-5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#8157ff] to-[#5522da] font-black shadow-lg shadow-purple-950/40">G</div>
          {!collapsed && (
            <div>
              <div className="text-[17px] font-bold">Glonni Ads</div>
              <div className="text-xs text-violet-300">Admin Panel</div>
            </div>
          )}
          <button aria-label="Close menu" className="ml-auto grid h-10 w-10 place-items-center rounded-lg text-slate-300 lg:hidden" onClick={() => setMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <nav className="admin-scroll flex-1 overflow-y-auto px-3 py-4" aria-label="Admin navigation">
          {navGroups.map((group) => (
            <div className="mb-5" key={group.label ?? "main"}>
              {group.label && !collapsed && <p className="mb-2 px-3 text-[10px] font-semibold tracking-[.14em] text-slate-500">{group.label}</p>}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const enabled = adminViews.includes(item.label as AdminView);
                  const authorized = enabled && workspace.views.includes(item.label as AdminView);
                  const active = item.label === activeView;
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.label}
                      href={enabled ? `/admin?section=${adminViewSlugs[item.label as AdminView]}` : undefined}
                      title={collapsed ? item.label : undefined}
                      aria-current={active ? "page" : undefined}
                      aria-disabled={!enabled || !authorized}
                      onClick={(event) => {
                        if (enabled && authorized) {
                          event.preventDefault();
                          const view = item.label as AdminView;
                          if (view !== activeView) navigateTo(view);
                          else setMenuOpen(false);
                        } else {
                          event.preventDefault();
                          action(enabled ? `${currentRole} has no access to ${item.label}` : `${item.label} is not available`);
                        }
                      }}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium ${active ? "bg-gradient-to-r from-[#7748ee] to-[#5b27d8] text-white shadow-lg shadow-purple-950/25" : authorized ? "text-slate-300 hover:bg-white/5 hover:text-white" : "cursor-not-allowed text-slate-600"}`}
                    >
                      <Icon size={18} className="shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="truncate">{item.label}</span>
                          {!authorized && <span className="ml-auto flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-[9px] text-slate-500"><LockKeyhole size={9}/>Restricted</span>}
                          {authorized && item.badge && <span className="ml-auto rounded-full bg-rose-500 px-2 py-0.5 text-[10px] text-white">{item.badge}</span>}
                        </>
                      )}
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <div className={`flex items-center gap-3 rounded-xl bg-white/5 p-3 ${collapsed ? "justify-center" : ""}`}>
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-500 text-sm font-bold">SK</div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">Shaneel Kumarreddy</div>
                <div className="text-[11px] text-slate-400">{currentRole} · Mock</div>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className={`transition-all duration-300 ${collapsed ? "lg:pl-[88px]" : "lg:pl-[260px]"}`}>
        <header className="sticky top-0 z-30 flex h-[76px] items-center border-b border-[#e8eaf1] bg-white/95 px-4 backdrop-blur md:px-7">
          <button aria-label="Open admin navigation" className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 lg:hidden" onClick={() => setMenuOpen(true)}>
            <Menu size={21} />
          </button>
          <button aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="hidden h-11 w-11 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 lg:grid" onClick={() => setCollapsed(!collapsed)}>
            <PanelLeftClose size={21} className={collapsed ? "rotate-180" : ""} />
          </button>
          <div className="ml-2 flex items-center gap-1" aria-label="Admin page history">
            <button aria-label={historyPosition > 0 ? "Go to previous admin section" : "Go to admin home"} title={historyPosition > 0 ? "Back" : "Admin home"} disabled={historyPosition <= 0 && activeView === "Dashboard"} onClick={goBack} className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30">
              <ChevronLeft size={19} />
            </button>
            <button aria-label="Go to next admin section" title="Forward" disabled={historyPosition >= historyLength - 1} onClick={() => window.history.forward()} className="hidden h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 sm:grid">
              <ChevronRight size={19} />
            </button>
          </div>
          <button onClick={() => { setCommandOpen(true); setRecordPage(1); }} className="ml-2 grid h-11 w-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 md:hidden" aria-label="Search all admin records">
            <Search size={19} />
          </button>
          <button onClick={() => { setCommandOpen(true); setRecordPage(1); }} className="ml-3 hidden h-11 w-full max-w-[440px] items-center gap-3 rounded-xl bg-[#f5f6fa] px-4 text-left md:flex" aria-label="Search all admin records">
            <Search size={18} className="text-slate-400" />
            <span className="w-full text-sm text-slate-400">Search users, IDs, tickets, campaigns…</span>
            <kbd className="rounded border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-400">⌘ K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button aria-label="Toggle appearance" onClick={() => action("Admin dark theme is planned for Settings")} className="hidden h-11 w-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 sm:grid">
              <Moon size={19} />
            </button>
            <div className="relative">
              <button aria-label={`Notifications, ${unreadCount} unread`} className="relative grid h-11 w-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100" onClick={() => { setNoticeOpen(!noticeOpen); setProfileOpen(false); }}>
                <Bell size={19} />
                {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{unreadCount}</span>}
              </button>
              {noticeOpen && (
                <div className="absolute right-0 top-14 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl">
                  <div className="flex items-center justify-between px-2 pb-2">
                    <p className="text-sm font-bold">Notifications</p>
                    <button onClick={() => setReadNotifications((current) => Array.from(new Set([...current, ...roleNotifications.map((notification) => notification.id)])))} className="text-[10px] font-semibold text-violet-600">Mark all read</button>
                  </div>
                  {roleNotifications.map((notification) => (
                    <button key={notification.id} onClick={() => { setReadNotifications((current) => current.includes(notification.id) ? current : [...current, notification.id]); navigateTo(notification.view); }} className={`mb-1 flex w-full gap-3 rounded-xl p-3 text-left hover:bg-slate-50 ${readNotifications.includes(notification.id) ? "opacity-60" : ""}`}>
                      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${readNotifications.includes(notification.id) ? "bg-slate-300" : notification.urgent ? "bg-rose-500" : "bg-violet-500"}`} />
                      <span><b className="block text-xs leading-5 text-slate-700">{notification.title}</b><span className="block text-[10px] text-slate-400">{notification.detail} · Open {notification.view}</span></span>
                    </button>
                  ))}
                  <div className="border-t px-2 pt-2 text-[10px] text-slate-400">{unreadCount} unread · Mock notifications</div>
                </div>
              )}
            </div>
            <div className="relative ml-1 block">
            <button aria-label="Open admin profile menu" aria-expanded={profileOpen} onClick={() => { setProfileOpen(!profileOpen); setNoticeOpen(false); }} className="flex items-center gap-3 border-l border-slate-200 py-1 pl-2 text-left sm:pl-4">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-700 text-xs font-bold text-white">SK</div>
              <div className="hidden xl:block">
                <div className="text-sm font-semibold">{currentRole}</div>
                <div className="flex items-center gap-1 text-[11px] text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Online
                </div>
              </div>
              <ChevronDown size={16} className="hidden text-slate-400 xl:block" />
            </button>
            {profileOpen && <div className="absolute right-0 top-14 w-72 rounded-2xl border bg-white p-2 shadow-2xl"><div className="border-b p-3"><p className="text-sm font-bold">Shaneel Kumarreddy</p><p className="text-[10px] text-slate-400">{currentRole} · Mock session</p></div><label className="mx-2 mt-3 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Preview workspace role<select aria-label="Preview admin workspace role" value={currentRole} onChange={(event) => changeRole(event.target.value as AdminRole)} className="mt-2 h-10 w-full rounded-xl border bg-white px-3 text-xs font-semibold normal-case tracking-normal"><option>Super Admin</option><option>Finance Admin</option><option>Support Admin</option><option>Content Admin</option><option>Operations Admin</option><option>Security Admin</option></select></label><p className="mx-2 mt-2 rounded-lg bg-amber-50 p-2 text-[9px] leading-4 text-amber-800">Role switching is a mock QA preview. Production roles come from authenticated permissions.</p><button onClick={() => navigateTo("Settings & Security")} disabled={!workspace.views.includes("Settings & Security")} className="mt-2 flex h-10 w-full items-center gap-3 rounded-xl px-3 text-xs font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><UserRound size={16}/>Profile & session settings</button><button onClick={() => { setProfileOpen(false); setLocked(true); }} className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-xs font-semibold hover:bg-slate-50"><LockKeyhole size={16}/>Lock console</button><button onClick={() => { setProfileOpen(false); setSignOutOpen(true); }} className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50"><LogOut size={16}/>Mock sign out</button></div>}
            </div>
          </div>
        </header>

        <main id="admin-content" tabIndex={-1} className="px-4 py-6 md:px-7 md:py-7">
          <div className="mx-auto max-w-[1500px]">
            <div className="mb-4 flex min-h-10 flex-wrap items-center gap-2 text-xs text-slate-400" aria-label="Breadcrumb">
              <button onClick={() => navigateTo("Dashboard")} className="rounded-lg px-2 py-1 font-semibold text-violet-600 hover:bg-violet-50">Admin home</button>
              {activeView !== "Dashboard" && <><ChevronRight size={14}/><span aria-current="page" className="font-medium text-slate-600">{activeView}</span></>}
              <button onClick={() => togglePinnedView(activeView)} className="ml-auto flex h-9 items-center gap-2 rounded-xl border bg-white px-3 font-semibold text-slate-600 hover:border-violet-300" aria-label={pinnedViews.includes(activeView) ? `Unpin ${activeView}` : `Pin ${activeView}`}>
                {pinnedViews.includes(activeView) ? <PinOff size={14}/> : <Pin size={14}/>}<span className="hidden sm:inline">{pinnedViews.includes(activeView) ? "Unpin" : "Pin section"}</span>
              </button>
            </div>
            {activeView === "Users" ? (
              <UsersManagement action={action} />
            ) : activeView === "Wallet & Transactions" ? (
              <WalletTransactions action={action} />
            ) : activeView === "Withdrawals" ? (
              <WithdrawalsManagement action={action} />
            ) : activeView === "KYC Verification" ? (
              <KycVerification action={action} />
            ) : activeView === "Fraud & Risk" ? (
              <FraudRiskControl action={action} />
            ) : activeView === "Ad Networks" ? (
              <ProviderIntegrations action={action} />
            ) : activeView === "Surveys" ? (
              <SurveysManagement action={action} />
            ) : activeView === "App Install Offers" ? (
              <AppInstallOffersManagement action={action} />
            ) : activeView === "Games" ? (
              <GamesManagement action={action} />
            ) : activeView === "Shop & Earn" ? (
              <ShopEarnManagement action={action} />
            ) : activeView === "Stores & Links" ? (
              <StoresLinksManagement action={action} />
            ) : activeView === "Referrals" ? (
              <ReferralsManagement action={action} />
            ) : activeView === "Content" ? (
              <ContentManagement action={action} />
            ) : activeView === "Support Centre" ? (
              <SupportCentre action={action} />
            ) : activeView === "Reports" ? (
              <ReportsReconciliation action={action} />
            ) : activeView === "Settings & Security" ? (
              <SettingsSecurity action={action} />
            ) : activeView === "Activity Logs" ? (
              <ActivityLogsManagement action={action} />
            ) : (
              <>
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">Dashboard</h1>
                    <p className="mt-1 text-sm text-slate-500">Welcome back, Shaneel. Your {currentRole.toLowerCase()} workspace is focused on {workspace.focus.toLowerCase()}.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => action("Mock report exported")} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:border-violet-300">
                      <Download size={15} />
                      Export report
                    </button>
                    <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600">
                      <CalendarDays size={15} />
                      <select aria-label="Dashboard date range" value={range} onChange={(e) => setRange(e.target.value as keyof typeof chartSets)} className="bg-transparent outline-none">
                        <option>7 days</option>
                        <option>30 days</option>
                        <option>90 days</option>
                      </select>
                    </div>
                    <label className="flex h-10 items-center gap-2 rounded-xl border bg-white px-3 text-xs font-semibold text-slate-600"><UserCheck size={15}/><span className="sr-only">Workspace role</span><select value={currentRole} onChange={(event) => changeRole(event.target.value as AdminRole)} className="bg-transparent outline-none"><option>Super Admin</option><option>Finance Admin</option><option>Support Admin</option><option>Content Admin</option><option>Operations Admin</option><option>Security Admin</option></select></label>
                    <span className="flex h-10 items-center rounded-xl bg-violet-50 px-3 text-xs font-semibold text-violet-700">UX Step 6 · Role personalized</span>
                  </div>
                </div>

                <section aria-labelledby="role-workspace-title" className="mb-6 overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white shadow-sm">
                  <div className="grid gap-5 p-5 lg:grid-cols-[1.1fr_1.2fr_.9fr] lg:p-6">
                    <div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-violet-600">Personalized workspace</p><h2 id="role-workspace-title" className="mt-2 text-lg font-bold">{currentRole}</h2><p className="mt-2 text-xs leading-5 text-slate-600">{workspace.description}</p><div className="mt-4 flex items-center gap-2 rounded-xl border border-violet-100 bg-white p-3 text-[10px] text-slate-500"><ShieldCheck size={15} className="shrink-0 text-violet-600"/><span><b className="text-slate-700">{workspace.views.length} of {adminViews.length} modules available.</b> Restricted modules remain visible but locked for clear permission feedback.</span></div></div>
                    <div><h3 className="text-xs font-bold">Role priorities</h3><div className="mt-3 space-y-2">{workspace.priorities.map((item) => <button key={item.label} onClick={() => navigateTo(item.view)} className="flex w-full items-center gap-3 rounded-xl border bg-white p-3 text-left hover:border-violet-300"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.urgency === "Urgent" ? "bg-rose-500" : item.urgency === "High" ? "bg-amber-500" : "bg-violet-500"}`}/><span className="min-w-0"><b className="block truncate text-xs">{item.label}</b><span className="block truncate text-[10px] text-slate-400">{item.detail}</span></span><ChevronRight size={14} className="ml-auto shrink-0 text-slate-400"/></button>)}</div></div>
                    <div><h3 className="text-xs font-bold">Permission summary</h3><div className="mt-3 space-y-2">{workspace.permissions.map((permission) => <div key={permission.label} className="flex items-center rounded-xl bg-white px-3 py-2.5 text-[10px]"><span className="text-slate-600">{permission.label}</span><span className={`ml-auto rounded-full px-2 py-1 font-bold ${permission.level === "Full action" ? "bg-emerald-50 text-emerald-700" : permission.level === "Guarded action" ? "bg-amber-50 text-amber-700" : permission.level === "View only" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500"}`}>{permission.level}</span></div>)}</div></div>
                  </div>
                  <div className="border-t border-violet-100 bg-white/70 px-5 py-3 text-[10px] leading-5 text-slate-500"><b>QA preview:</b> this role switcher demonstrates intended navigation, search scope and information boundaries only. Backend authorization must enforce every permission server-side.</div>
                </section>

                <section aria-label="Personal admin workspace" className="mb-6 grid gap-4 lg:grid-cols-3">
                  <article className="rounded-2xl border border-[#e7e9f1] bg-white p-5 shadow-sm"><div className="flex items-center"><div><h2 className="font-bold">Pinned sections</h2><p className="mt-1 text-xs text-slate-500">Saved separately for {currentRole}</p></div><Pin size={17} className="ml-auto text-violet-600"/></div><div className="mt-4 flex flex-wrap gap-2">{pinnedViews.filter((view) => workspace.views.includes(view)).length ? pinnedViews.filter((view) => workspace.views.includes(view)).map((view) => <button key={view} onClick={() => navigateTo(view)} className="flex h-9 items-center gap-2 rounded-xl bg-violet-50 px-3 text-xs font-bold text-violet-700 hover:bg-violet-100">{view}<ChevronRight size={13}/></button>) : <p className="text-xs text-slate-400">Pin any permitted section from its breadcrumb.</p>}</div></article>
                  <article className="rounded-2xl border border-[#e7e9f1] bg-white p-5 shadow-sm"><div className="flex items-center"><div><h2 className="font-bold">Recently viewed</h2><p className="mt-1 text-xs text-slate-500">Return to your latest admin work</p></div><Clock3 size={17} className="ml-auto text-slate-400"/></div><div className="mt-4 flex flex-wrap gap-2">{recentViews.filter((view) => view !== "Dashboard").length ? recentViews.filter((view) => view !== "Dashboard").map((view) => <button key={view} onClick={() => navigateTo(view)} className="flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-semibold text-slate-600 hover:border-violet-300">{view}<ChevronRight size={13}/></button>) : <p className="text-xs text-slate-400">Sections you open will appear here.</p>}</div></article>
                  <article className="rounded-2xl border border-[#e7e9f1] bg-white p-5 shadow-sm"><div className="flex items-center"><div><h2 className="font-bold">Saved record views</h2><p className="mt-1 text-xs text-slate-500">Open frequently used filtered queues</p></div><Search size={17} className="ml-auto text-violet-600"/></div><div className="mt-4 flex flex-wrap gap-2">{savedRecordViews.slice(0, 3).map((view) => <button key={view.name} onClick={() => { applySavedRecordView(view); setCommandOpen(true); }} className="flex h-9 items-center gap-2 rounded-xl border border-violet-100 bg-violet-50 px-3 text-xs font-bold text-violet-700 hover:bg-violet-100">{view.name}<ChevronRight size={13}/></button>)}</div></article>
                </section>

                <section aria-labelledby="reliability-title" className="mt-6 grid gap-4 rounded-2xl border border-[#e7e9f1] bg-white p-5 shadow-sm lg:grid-cols-[.75fr_1.25fr]">
                  <div><p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Reusable backend states</p><h2 id="reliability-title" className="mt-1 font-bold">Reliability preview</h2><p className="mt-1 text-xs leading-5 text-slate-500">Every future queue will use the same clear loading, empty, error, offline and ready pattern.</p><div role="tablist" aria-label="Preview a reliability state" className="mt-4 flex flex-wrap gap-2">{(["Ready","Loading","Empty","Error","Offline"] as ReliabilityState[]).map((state,index,states)=><button key={state} role="tab" aria-selected={reliabilityState===state} tabIndex={reliabilityState===state?0:-1} onKeyDown={(event)=>{if(event.key!=="ArrowLeft"&&event.key!=="ArrowRight")return;event.preventDefault();const next=states[(index+(event.key==="ArrowRight"?1:-1)+states.length)%states.length];setReliabilityState(next);window.setTimeout(()=>document.querySelector<HTMLElement>(`[role="tab"][aria-label="Preview ${next} state"]`)?.focus(),0)}} aria-label={`Preview ${state} state`} onClick={()=>setReliabilityState(state)} className={`h-9 rounded-xl px-3 text-[11px] font-bold ${reliabilityState===state?"bg-violet-600 text-white":"border bg-white text-slate-600"}`}>{state}</button>)}</div><p className="mt-4 text-[10px] text-slate-400">Live connection: <b className={isOnline?"text-emerald-600":"text-amber-700"}>{isOnline?"Online":"Offline"}</b>{dirtyForm&&" · A form has unsaved input"}</p></div>
                  <div role="tabpanel" aria-live="polite"><AdminStatePreview state={reliabilityState} onRetry={()=>{setReliabilityState(isOnline?"Loading":"Offline");if(isOnline)window.setTimeout(()=>setReliabilityState("Ready"),700)}}/></div>
                </section>

                <section aria-labelledby="qa-readiness-title" className="my-6 grid gap-5 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm lg:grid-cols-[.8fr_1.2fr]">
                  <div><div className="flex items-center gap-2 text-emerald-700"><ShieldCheck size={18}/><p className="text-[10px] font-bold uppercase tracking-[.14em]">Final UX QA</p></div><h2 id="qa-readiness-title" className="mt-2 text-lg font-bold">Admin interface ready for backend mapping</h2><p className="mt-2 text-xs leading-5 text-slate-600">All six UX completion steps are represented in the mock console. Backend integration must replace local role state, mock records and simulated actions without weakening these safeguards.</p><button onClick={() => navigateTo("Activity Logs")} disabled={!workspace.views.includes("Activity Logs")} className="mt-4 flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"><Activity size={15}/>Open permitted audit evidence</button></div>
                  <div className="grid gap-2 sm:grid-cols-2">{[
                    ["Navigation", "Direct URLs, Back/Forward, mobile drawer", "Passed"],
                    ["Role boundaries", "Six workspaces and restricted modules", "Passed"],
                    ["Search & records", "Permission-scoped results and links", "Passed"],
                    ["Mobile queues", "Cards, tables and guarded bulk actions", "Passed"],
                    ["Reliability", "Drafts, offline, empty, error and retry", "Passed"],
                    ["Accessibility", "Keyboard, focus, dialogs, tabs and summaries", "Passed"],
                    ["Backend authorization", "Server-side policies and RLS", "Pending backend"],
                    ["Live integrations", "Providers, payments, messages and AI", "Pending backend"],
                  ].map(([label, detail, status]) => <div key={label} className="rounded-xl border bg-white p-3"><div className="flex items-start gap-2"><CheckCircle2 size={15} className={status === "Passed" ? "mt-0.5 shrink-0 text-emerald-600" : "mt-0.5 shrink-0 text-amber-600"}/><div><b className="block text-xs">{label}</b><p className="mt-1 text-[10px] leading-4 text-slate-400">{detail}</p></div><span className={`ml-auto shrink-0 rounded-full px-2 py-1 text-[8px] font-bold ${status === "Passed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{status}</span></div></div>)}</div>
                </section>

                <section aria-label="Key performance indicators" className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                  {roleMetricSets[currentRole].map(({ label, value, change, note, icon: Icon, bg, color, positive }) => (
                    <article key={label} className="rounded-2xl border border-[#e7e9f1] bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className={`grid h-12 w-12 place-items-center rounded-2xl ${bg} ${color}`}>
                          <Icon size={22} />
                        </div>
                        <button aria-label={`More options for ${label}`} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100">
                          <MoreHorizontal size={18} />
                        </button>
                      </div>
                      <p className="mt-5 text-xs font-medium text-slate-500">{label}</p>
                      <p className="mt-1 text-[25px] font-bold tracking-tight">{value}</p>
                      <div className="mt-3 flex items-center gap-2 text-[11px]">
                        <span className={`flex items-center gap-1 font-bold ${positive ? "text-emerald-600" : "text-rose-600"}`}>
                          {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />} {change}
                        </span>
                        <span className="text-slate-400">{note}</span>
                      </div>
                    </article>
                  ))}
                </section>

                {(currentRole === "Super Admin" || currentRole === "Finance Admin") && <section className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_.75fr]">
                  <article className="rounded-2xl border border-[#e7e9f1] bg-white p-5 shadow-sm md:p-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="font-bold">Revenue and rewards</h2>
                        <p className="mt-1 text-xs text-slate-500">Provider revenue compared with approved user rewards</p>
                      </div>
                      <div role="tablist" aria-label="Revenue chart period" className="flex rounded-lg bg-slate-100 p-1">
                        {(["7 days", "30 days", "90 days"] as const).map((x, index, periods) => (
                          <button key={x} role="tab" aria-selected={range===x} tabIndex={range===x?0:-1} onKeyDown={(event)=>{if(event.key!=="ArrowLeft"&&event.key!=="ArrowRight")return;event.preventDefault();const next=periods[(index+(event.key==="ArrowRight"?1:-1)+periods.length)%periods.length];setRange(next);window.setTimeout(()=>document.querySelector<HTMLElement>(`[role="tab"][aria-label="Revenue ${next}"]`)?.focus(),0)}} aria-label={`Revenue ${x}`} onClick={() => setRange(x)} className={`rounded-md px-3 py-1.5 text-[11px] font-semibold ${range === x ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"}`}>
                            {x}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mt-5 flex gap-5 text-xs">
                      <span className="flex items-center gap-2 text-slate-500">
                        <i className="h-2.5 w-2.5 rounded-full bg-violet-600" />
                        Revenue ₹8.42L
                      </span>
                      <span className="flex items-center gap-2 text-slate-500">
                        <i className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                        Rewards ₹5.06L
                      </span>
                    </div>
                    <div className="mt-3">
                      <MiniLine values={chartSets[range]} />
                    </div>
                    <p className="sr-only">Accessible summary: provider revenue is ₹8.42 lakh and approved user rewards are ₹5.06 lakh. The selected {range} trend rises overall with minor fluctuations.</p>
                    <div className="flex justify-between border-t border-slate-100 pt-3 text-[10px] text-slate-400">
                      <span>Start</span>
                      <span>Mid-period</span>
                      <span>Today</span>
                    </div>
                  </article>
                  <article className="rounded-2xl border border-[#e7e9f1] bg-white p-5 shadow-sm md:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="font-bold">Reward sources</h2>
                        <p className="mt-1 text-xs text-slate-500">Approved rewards by channel</p>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400">THIS MONTH</span>
                    </div>
                    <div
                      role="img"
                      aria-label="Reward sources: Watch and Earn 36 percent, Games and installs 24 percent, Surveys 18 percent, Shop cashback 12 percent, Referrals 10 percent"
                      className="mx-auto my-6 grid h-44 w-44 place-items-center rounded-full"
                      style={{
                        background: "conic-gradient(#7545e8 0 36%, #28b989 36% 60%, #f3a833 60% 78%, #ee647e 78% 90%, #5f9eea 90% 100%)",
                      }}
                    >
                      <div className="grid h-28 w-28 place-items-center rounded-full bg-white text-center">
                        <div>
                          <p className="text-[11px] text-slate-400">Total rewards</p>
                          <p className="text-lg font-bold">₹5.06L</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {[
                        ["Watch & Earn", "36%", "bg-violet-600"],
                        ["Games & installs", "24%", "bg-emerald-500"],
                        ["Surveys", "18%", "bg-amber-400"],
                        ["Shop cashback", "12%", "bg-rose-400"],
                        ["Referrals", "10%", "bg-blue-400"],
                      ].map((x) => (
                        <div key={x[0]} className="flex items-center text-xs">
                          <span className={`mr-2 h-2.5 w-2.5 rounded-full ${x[2]}`} />
                          <span className="text-slate-500">{x[0]}</span>
                          <b className="ml-auto">{x[1]}</b>
                        </div>
                      ))}
                    </div>
                  </article>
                </section>}

                <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
                  <article className="rounded-2xl border border-[#e7e9f1] bg-white p-5 shadow-sm md:p-6">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <h2 className="font-bold">Action required</h2>
                        <p className="mt-1 text-xs text-slate-500">Queues that need admin attention</p>
                      </div>
                      <button onClick={() => navigateTo(workspace.priorities[0].view)} className="text-xs font-semibold text-violet-600">
                        Open first queue
                      </button>
                    </div>
                    <div className="space-y-3">
                      {workspace.priorities.map((item) => {
                        const Icon = item.view === "Withdrawals" ? HandCoins : item.view === "Support Centre" ? Headphones : item.view === "Content" ? FileText : item.view === "Stores & Links" ? Link2 : item.view === "Reports" ? SlidersHorizontal : ShieldAlert;
                        return <button key={item.label} onClick={() => navigateTo(item.view)} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left hover:border-violet-200 hover:bg-violet-50/30">
                          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${item.urgency === "Urgent" ? "bg-rose-50 text-rose-600" : item.urgency === "High" ? "bg-amber-50 text-amber-600" : "bg-violet-50 text-violet-600"}`}>
                            <Icon size={19}/>
                          </span>
                          <span className="min-w-0">
                            <b className="block truncate text-sm">{item.label}</b>
                            <span className="block truncate text-[11px] text-slate-500">{item.detail}</span>
                          </span>
                          <span className={`ml-auto rounded-full px-2 py-1 text-[9px] font-bold ${item.urgency === "Urgent" ? "bg-rose-100 text-rose-700" : item.urgency === "High" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{item.urgency}</span>
                        </button>;
                      })}
                    </div>
                  </article>
                  <article className="rounded-2xl border border-[#e7e9f1] bg-white p-5 shadow-sm md:p-6">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <h2 className="font-bold">Provider health</h2>
                        <p className="mt-1 text-xs text-slate-500">Mock integration status and success rates</p>
                      </div>
                      <button onClick={() => action("Provider statuses refreshed")} aria-label="Refresh provider status" className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50 text-slate-500">
                        <RefreshCw size={16} />
                      </button>
                    </div>
                    <div className="space-y-5">
                      {[
                        ["Rewarded Ads", "98.7%", "99", "bg-violet-500"],
                        ["Survey Network", "94.2%", "94", "bg-emerald-500"],
                        ["Offerwall & Games", "91.8%", "92", "bg-amber-400"],
                        ["Affiliate tracking", "96.4%", "96", "bg-blue-500"],
                      ].map((x) => (
                        <div key={x[0]}>
                          <div className="mb-2 flex items-center text-xs">
                            <span className="font-semibold">{x[0]}</span>
                            <span className="ml-auto text-slate-500">{x[1]} success</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div className={`h-full rounded-full ${x[3]}`} style={{ width: `${x[2]}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">
                      <CheckCircle2 size={17} />
                      All mock providers operational
                    </div>
                  </article>
                </section>

                {workspace.views.includes("Wallet & Transactions") && <section className="mt-6 overflow-hidden rounded-2xl border border-[#e7e9f1] bg-white shadow-sm">
                  <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between md:px-6">
                    <div>
                      <h2 className="font-bold">Recent transactions</h2>
                      <p className="mt-1 text-xs text-slate-500">Latest reward and withdrawal ledger activity</p>
                    </div>
                    <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                      {["All", "Approved", "Pending", "Review"].map((x) => (
                        <button key={x} onClick={() => setTransactionFilter(x)} className={`rounded-md px-3 py-1.5 text-[11px] font-semibold ${transactionFilter === x ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"}`}>
                          {x}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left">
                      <thead>
                        <tr className="border-b border-slate-100 bg-[#fafafd] text-[10px] uppercase tracking-wider text-slate-400">
                          <th className="px-6 py-3 font-semibold">Reference</th>
                          <th className="px-4 py-3 font-semibold">User</th>
                          <th className="px-4 py-3 font-semibold">Activity</th>
                          <th className="px-4 py-3 font-semibold">Amount</th>
                          <th className="px-4 py-3 font-semibold">Status</th>
                          <th className="px-6 py-3 text-right font-semibold">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTransactions.map((t) => (
                          <tr key={t.id} className="border-b border-slate-50 text-xs hover:bg-slate-50/70">
                            <td className="px-6 py-4 font-mono text-[11px] font-semibold text-violet-600">{t.id}</td>
                            <td className="px-4 py-4 font-semibold">{t.user}</td>
                            <td className="px-4 py-4 text-slate-500">{t.type}</td>
                            <td className={`px-4 py-4 font-bold ${t.amount.startsWith("+") ? "text-emerald-600" : "text-slate-700"}`}>{t.amount}</td>
                            <td className="px-4 py-4">
                              <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${t.color}`}>{t.status}</span>
                            </td>
                            <td className="px-6 py-4 text-right text-slate-400">{t.time}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredTransactions.length === 0 && <div className="p-10 text-center text-sm text-slate-500">No mock transactions match this filter.</div>}
                  </div>
                  <button onClick={() => navigateTo("Wallet & Transactions")} className="m-4 text-xs font-semibold text-violet-600 md:mx-6">
                    View complete ledger →
                  </button>
                </section>}

                {workspace.views.includes("Games") && <section className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
                  <article className="rounded-2xl border border-[#e7e9f1] bg-white p-5 shadow-sm md:p-6">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <h2 className="font-bold">Top earning offers</h2>
                        <p className="mt-1 text-xs text-slate-500">Ranked by verified completions</p>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400">LAST 30 DAYS</span>
                    </div>
                    <div className="space-y-3">
                      {[
                        ["1", "Puzzle Kingdom", "Game", "4,280", "₹1.72L"],
                        ["2", "Quick Opinion India", "Survey", "3,915", "₹94.6K"],
                        ["3", "StreamNow Rewards", "Watch ads", "12,480", "₹82.3K"],
                        ["4", "Fashion Store Cashback", "Shop", "1,806", "₹61.8K"],
                      ].map((r) => (
                        <div key={r[0]} className="grid grid-cols-[28px_1fr_auto] items-center gap-3 rounded-xl border border-slate-100 p-3">
                          <span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-50 text-[11px] font-bold text-violet-600">{r[0]}</span>
                          <div>
                            <p className="text-xs font-bold">{r[1]}</p>
                            <p className="text-[10px] text-slate-400">
                              {r[2]} · {r[3]} completions
                            </p>
                          </div>
                          <b className="text-xs">{r[4]}</b>
                        </div>
                      ))}
                    </div>
                  </article>
                  <article className="rounded-2xl border border-[#e7e9f1] bg-white p-5 shadow-sm md:p-6">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <h2 className="font-bold">Live activity</h2>
                        <p className="mt-1 text-xs text-slate-500">Recent platform events</p>
                      </div>
                      <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600">
                        <i className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                        LIVE MOCK
                      </span>
                    </div>
                    <div className="space-y-5">
                      {[
                        ["New user registered", "Hyderabad · Android", "Just now", Users],
                        ["Withdrawal requested", "₹500 via UPI", "3 min", HandCoins],
                        ["Game milestone verified", "Puzzle Kingdom · Level 10", "7 min", CheckCircle2],
                        ["Risk signal created", "Repeated device fingerprint", "11 min", CircleAlert],
                      ].map(([title, sub, time, Icon], i) => (
                        <div key={title as string} className="flex gap-3">
                          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${i === 3 ? "bg-rose-50 text-rose-600" : "bg-violet-50 text-violet-600"}`}>
                            <Icon size={16} />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold">{title as string}</p>
                            <p className="truncate text-[10px] text-slate-400">{sub as string}</p>
                          </div>
                          <span className="ml-auto shrink-0 text-[10px] text-slate-400">{time as string}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-[11px] leading-5 text-amber-800">
                      <Clock3 size={16} className="shrink-0" />
                      Live events will stream from Supabase after backend integration.
                    </div>
                  </article>
                </section>}
              </>
            )}
          </div>
          <footer className="mx-auto mt-8 flex max-w-[1500px] flex-col gap-2 border-t border-slate-200 py-5 text-[11px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <span>Glonni Ads Admin · UX Completion Step 6</span>
            <span>Fraud, earning and communications gateways are live · External providers remain disabled pending approval and credentials</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
