"use client";

import {
  Activity, BadgeIndianRupee, Bell, ChevronDown, CircleHelp, FileText,
  Gamepad2, Gift, HandCoins, Headphones, LayoutDashboard, Menu, MonitorPlay,
  Moon, PackageCheck, PanelLeftClose, Search, Settings, ShieldCheck, ShoppingBag,
  SlidersHorizontal, Store, Users, WalletCards, X,
} from "lucide-react";
import { useState } from "react";

type NavItem = { label: string; icon: typeof LayoutDashboard; badge?: string };
type NavGroup = { label?: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  { items: [
    { label: "Dashboard", icon: LayoutDashboard },
    { label: "Users", icon: Users },
    { label: "Wallet & Transactions", icon: WalletCards },
    { label: "Withdrawals", icon: HandCoins, badge: "8" },
    { label: "KYC Verification", icon: ShieldCheck, badge: "12" },
    { label: "Fraud & Risk", icon: Activity },
  ]},
  { label: "EARNINGS", items: [
    { label: "Ad Networks", icon: MonitorPlay },
    { label: "Surveys", icon: FileText },
    { label: "App Install Offers", icon: PackageCheck },
    { label: "Games", icon: Gamepad2 },
  ]},
  { label: "SHOP & GROW", items: [
    { label: "Shop & Earn", icon: ShoppingBag },
    { label: "Stores & Links", icon: Store },
    { label: "Referrals", icon: Gift },
  ]},
  { label: "OPERATIONS", items: [
    { label: "Content", icon: FileText },
    { label: "Support Centre", icon: Headphones, badge: "5" },
    { label: "Reports", icon: SlidersHorizontal },
  ]},
  { label: "SYSTEM", items: [
    { label: "Settings & Security", icon: Settings },
    { label: "Activity Logs", icon: Activity },
  ]},
];

const modules = [
  { name: "Users", detail: "Accounts, status and devices", icon: Users, tone: "bg-violet-50 text-violet-600" },
  { name: "Rewards", detail: "Tasks, offers and approvals", icon: BadgeIndianRupee, tone: "bg-emerald-50 text-emerald-600" },
  { name: "Withdrawals", detail: "Payout queues and failures", icon: HandCoins, tone: "bg-amber-50 text-amber-600" },
  { name: "Risk", detail: "Fraud signals and appeals", icon: ShieldCheck, tone: "bg-rose-50 text-rose-600" },
];

export default function AdminFoundationPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);

  return (
    <div className="admin-root min-h-screen bg-[#f7f8fc] text-[#172033]">
      {menuOpen && <button aria-label="Close admin navigation" className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" onClick={() => setMenuOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-[#10172a] text-white transition-all duration-300 ${collapsed ? "lg:w-[88px]" : "lg:w-[260px]"} w-[280px] ${menuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="flex h-[76px] items-center gap-3 border-b border-white/10 px-5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#8157ff] to-[#5522da] font-black shadow-lg shadow-purple-950/40">G</div>
          {!collapsed && <div><div className="text-[17px] font-bold">Glonni Ads</div><div className="text-xs text-violet-300">Admin Panel</div></div>}
          <button aria-label="Close menu" className="ml-auto grid h-10 w-10 place-items-center rounded-lg text-slate-300 lg:hidden" onClick={() => setMenuOpen(false)}><X size={20}/></button>
        </div>
        <nav className="admin-scroll flex-1 overflow-y-auto px-3 py-4" aria-label="Admin navigation">
          {navGroups.map((group, groupIndex) => (
            <div className="mb-5" key={group.label ?? "main"}>
              {group.label && !collapsed && <p className="mb-2 px-3 text-[10px] font-semibold tracking-[.14em] text-slate-500">{group.label}</p>}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = groupIndex === 0 && item.label === "Dashboard";
                  const Icon = item.icon;
                  return <button key={item.label} title={collapsed ? item.label : undefined} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium ${active ? "bg-gradient-to-r from-[#7748ee] to-[#5b27d8] text-white shadow-lg shadow-purple-950/25" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}>
                    <Icon size={18} className="shrink-0" />
                    {!collapsed && <><span className="truncate">{item.label}</span>{item.badge && <span className="ml-auto rounded-full bg-rose-500 px-2 py-0.5 text-[10px] text-white">{item.badge}</span>}</>}
                  </button>;
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <div className={`flex items-center gap-3 rounded-xl bg-white/5 p-3 ${collapsed ? "justify-center" : ""}`}>
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-500 text-sm font-bold">SK</div>
            {!collapsed && <div className="min-w-0"><div className="truncate text-sm font-semibold">Shaneel Kumarreddy</div><div className="text-[11px] text-slate-400">Super Admin · Mock</div></div>}
          </div>
        </div>
      </aside>

      <div className={`transition-all duration-300 ${collapsed ? "lg:pl-[88px]" : "lg:pl-[260px]"}`}>
        <header className="sticky top-0 z-30 flex h-[76px] items-center border-b border-[#e8eaf1] bg-white/95 px-4 backdrop-blur md:px-7">
          <button aria-label="Open admin navigation" className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 lg:hidden" onClick={() => setMenuOpen(true)}><Menu size={21}/></button>
          <button aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="hidden h-11 w-11 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 lg:grid" onClick={() => setCollapsed(!collapsed)}><PanelLeftClose size={21} className={collapsed ? "rotate-180" : ""}/></button>
          <label className="ml-3 hidden h-11 w-full max-w-[440px] items-center gap-3 rounded-xl bg-[#f5f6fa] px-4 md:flex">
            <Search size={18} className="text-slate-400"/><span className="sr-only">Search admin panel</span><input className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="Search users, rewards, withdrawals..."/><kbd className="rounded border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-400">⌘ K</kbd>
          </label>
          <div className="ml-auto flex items-center gap-2">
            <button aria-label="Toggle appearance" className="grid h-11 w-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"><Moon size={19}/></button>
            <div className="relative">
              <button aria-label="Notifications, 5 unread" className="relative grid h-11 w-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100" onClick={() => setNoticeOpen(!noticeOpen)}><Bell size={19}/><span className="absolute right-1.5 top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">5</span></button>
              {noticeOpen && <div className="absolute right-0 top-14 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl"><p className="px-2 pb-2 text-sm font-bold">Notifications</p><div className="rounded-xl bg-violet-50 p-3 text-xs text-slate-600"><b className="text-slate-800">Mock activity</b><br/>Notifications will connect to live admin events after Supabase integration.</div></div>}
            </div>
            <div className="ml-1 hidden items-center gap-3 border-l border-slate-200 pl-4 sm:flex">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-700 text-xs font-bold text-white">SK</div>
              <div className="hidden xl:block"><div className="text-sm font-semibold">Super Admin</div><div className="flex items-center gap-1 text-[11px] text-emerald-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>Online</div></div><ChevronDown size={16} className="hidden text-slate-400 xl:block"/>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 md:px-7 md:py-7">
          <div className="mx-auto max-w-[1500px]">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div><div className="mb-2 text-xs text-slate-400">Home <span className="px-2">›</span> Admin Foundation</div><h1 className="text-2xl font-bold tracking-tight md:text-[28px]">Admin Foundation</h1><p className="mt-1 text-sm text-slate-500">The control centre structure for Glonni Ads</p></div>
              <span className="w-fit rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">Step 1 of 18 · Mock data</span>
            </div>

            <section className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-[#692de0] via-[#7540eb] to-[#8b5cf6] p-6 text-white shadow-xl shadow-violet-200/50 md:p-8">
              <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                <div className="max-w-2xl"><p className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-violet-200">Foundation ready</p><h2 className="text-2xl font-bold md:text-3xl">Welcome to Glonni Ads Admin</h2><p className="mt-3 max-w-xl text-sm leading-6 text-violet-100">The navigation, responsive shell, header tools and reusable interface patterns are prepared. Operational figures shown in this preview are mock data only.</p></div>
                <div className="grid grid-cols-2 gap-3 sm:flex">
                  <div className="rounded-xl border border-white/20 bg-white/10 px-5 py-4 backdrop-blur"><div className="text-2xl font-bold">18</div><div className="text-xs text-violet-100">Admin modules</div></div>
                  <div className="rounded-xl border border-white/20 bg-white/10 px-5 py-4 backdrop-blur"><div className="text-2xl font-bold">1 / 18</div><div className="text-xs text-violet-100">Built now</div></div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {modules.map(({name, detail, icon: Icon, tone}) => <article key={name} className="rounded-2xl border border-[#e7e9f1] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className={`mb-4 grid h-11 w-11 place-items-center rounded-xl ${tone}`}><Icon size={21}/></div><h3 className="font-bold">{name}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p><span className="mt-4 inline-block rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">Coming in later step</span></article>)}
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_.75fr]">
              <div className="rounded-2xl border border-[#e7e9f1] bg-white p-5 shadow-sm md:p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-bold">Foundation checklist</h2><p className="mt-1 text-xs text-slate-500">Step 1 deliverables</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Complete</span></div>
                <div className="divide-y divide-slate-100">{["Separate /admin workspace", "Responsive dark sidebar navigation", "Global search and notification header", "Reusable cards, badges and content layout", "Desktop, tablet and mobile behaviour", "Mock admin identity and data labels"].map((item) => <div key={item} className="flex items-center gap-3 py-3 text-sm"><span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-50 text-emerald-600">✓</span>{item}</div>)}</div>
              </div>
              <div className="rounded-2xl border border-[#e7e9f1] bg-white p-5 shadow-sm md:p-6"><div className="mb-5 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600"><CircleHelp size={20}/></div><div><h2 className="font-bold">Preview guidance</h2><p className="text-xs text-slate-500">What works in Step 1</p></div></div><ul className="space-y-3 text-sm leading-5 text-slate-600"><li>• Sidebar collapses on desktop.</li><li>• Mobile menu opens from the header.</li><li>• Notification popover is interactive.</li><li>• Other menu modules are structural placeholders.</li></ul><div className="mt-5 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800"><b>No real operations yet.</b> Supabase, payouts and provider integrations remain disconnected during the mock UI phase.</div></div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
