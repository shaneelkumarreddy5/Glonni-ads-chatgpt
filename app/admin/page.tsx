"use client";
/* eslint-disable @typescript-eslint/no-unused-vars -- compact mock document cards retain map indices for future ordering */

import { Activity, ArrowDownRight, ArrowUpRight, BadgeIndianRupee, Bell, CalendarDays, CheckCircle2, ChevronDown, CircleAlert, Clock3, Download, FileText, Gamepad2, Gift, HandCoins, Headphones, LayoutDashboard, Menu, MonitorPlay, Moon, MoreHorizontal, PackageCheck, PanelLeftClose, RefreshCw, Search, Settings, ShieldAlert, ShieldCheck, ShoppingBag, SlidersHorizontal, Store, TrendingUp, UserCheck, Users, WalletCards, X, Ban, ChevronLeft, ChevronRight, Copy, Eye, Filter, Mail, MapPin, Phone, RotateCcw, Smartphone, UserRound, UserX, Wifi } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type NavItem = { label: string; icon: typeof LayoutDashboard; badge?: string };
type NavGroup = { label?: string; items: NavItem[] };
type AdminView = "Dashboard" | "Users" | "Wallet & Transactions" | "Withdrawals" | "KYC Verification" | "Fraud & Risk";

const adminViewSlugs: Record<AdminView, string> = {
  Dashboard: "dashboard",
  Users: "users",
  "Wallet & Transactions": "wallet-transactions",
  Withdrawals: "withdrawals",
  "KYC Verification": "kyc-verification",
  "Fraud & Risk": "fraud-risk",
};

const adminSlugViews = Object.fromEntries(Object.entries(adminViewSlugs).map(([view, slug]) => [slug, view])) as Record<string, AdminView>;

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
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead>
              <tr className="border-b bg-[#fafafd] text-[10px] uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3">Request</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Risk</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Age</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((w) => (
                <tr key={w.id} className="border-b border-slate-50 text-xs hover:bg-violet-50/30">
                  <td className="px-5 py-4 font-mono text-[11px] font-semibold text-violet-600">
                    {w.id}
                    <p className="mt-1 font-sans text-[9px] font-normal text-slate-400">{w.requested}</p>
                  </td>
                  <td className="px-4 py-4 font-semibold">
                    {w.user}
                    <p className="mt-1 text-[10px] font-normal text-slate-400">{w.userId}</p>
                  </td>
                  <td className="px-4 py-4 font-semibold">
                    {w.method}
                    <p className="mt-1 text-[10px] font-normal text-slate-400">{w.destination}</p>
                  </td>
                  <td className="px-4 py-4 text-sm font-bold">₹{w.amount.toFixed(2)}</td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${w.risk === "High" ? "bg-rose-50 text-rose-700" : w.risk === "Medium" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{w.risk}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${tone(w.status)}`}>{w.status}</span>
                  </td>
                  <td className="px-4 py-4 text-slate-500">{w.age}</td>
                  <td className="px-5 py-4 text-right">
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
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="bg-[#fafafd] text-[10px] uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3">Applicant</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Documents</th>
                <th className="px-4 py-3">Name match</th>
                <th className="px-4 py-3">Risk</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((k) => (
                <tr key={k.id} className="border-t border-slate-100 text-xs hover:bg-violet-50/30">
                  <td className="px-5 py-4">
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
                  <td className="px-4 py-4 text-slate-500">{k.submitted}</td>
                  <td className="px-4 py-4">
                    <b>{k.type}</b>
                    <p className="text-[10px] text-emerald-600">2 files received</p>
                  </td>
                  <td className="px-4 py-4">
                    <b className={k.nameMatch < 80 ? "text-rose-600" : "text-emerald-600"}>{k.nameMatch}%</b>
                  </td>
                  <td className="px-4 py-4">
                    <span className={k.risk === "High" ? "text-rose-600" : k.risk === "Medium" ? "text-amber-600" : "text-emerald-600"}>{k.risk}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${tone(k.status)}`}>{k.status}</span>
                  </td>
                  <td className="px-5 py-4 text-right">
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

type RiskCase = {
  id: string;
  user: string;
  userId: string;
  signal: string;
  source: string;
  score: number;
  severity: "Critical" | "High" | "Medium";
  status: "Open" | "Investigating" | "Held" | "Appealed";
  amount: string;
  device: string;
  ip: string;
  created: string;
  evidence: string[];
};
const riskCases: RiskCase[] = [
  {
    id: "RSK-1082",
    user: "Rahul Verma",
    userId: "GLN-10255",
    signal: "6 accounts on one device",
    source: "Device fingerprint",
    score: 96,
    severity: "Critical",
    status: "Open",
    amount: "₹1,284 held",
    device: "Android · FP-8B42",
    ip: "49.37.••.118",
    created: "9 min ago",
    evidence: ["Six accounts created within 41 minutes", "Same Android fingerprint and payout UPI", "23 ad completions from overlapping sessions"],
  },
  {
    id: "RSK-1081",
    user: "Imran Ali",
    userId: "GLN-10240",
    signal: "Reward velocity anomaly",
    source: "Watch & Earn",
    score: 88,
    severity: "High",
    status: "Investigating",
    amount: "₹416 pending",
    device: "Android · FP-3A19",
    ip: "106.51.••.72",
    created: "24 min ago",
    evidence: ["20 ads completed in 3m 12s", "Callback timestamps overlap", "IP changed across three states"],
  },
  {
    id: "RSK-1079",
    user: "Sneha Kapoor",
    userId: "GLN-10258",
    signal: "Duplicate payout identity",
    source: "UPI ownership",
    score: 82,
    severity: "High",
    status: "Held",
    amount: "₹750 held",
    device: "iOS · FP-7E10",
    ip: "103.88.••.41",
    created: "1 hr ago",
    evidence: ["UPI handle used by two accounts", "Names do not match verified KYC", "Withdrawal placed immediately after credit"],
  },
  {
    id: "RSK-1076",
    user: "Arjun Nair",
    userId: "GLN-10251",
    signal: "Offer completion disputed",
    source: "App install",
    score: 64,
    severity: "Medium",
    status: "Appealed",
    amount: "₹180 held",
    device: "Android · FP-2C77",
    ip: "117.203.••.9",
    created: "3 hr ago",
    evidence: ["Provider rejected attribution", "User supplied install screenshot", "Device advertising ID reset twice"],
  },
  {
    id: "RSK-1073",
    user: "Meera Joshi",
    userId: "GLN-10249",
    signal: "Repeated referral cluster",
    source: "Referrals",
    score: 71,
    severity: "Medium",
    status: "Open",
    amount: "₹300 pending",
    device: "Android · FP-9D20",
    ip: "152.58.••.201",
    created: "6 hr ago",
    evidence: ["Five referrals share household IP", "All qualified within 18 minutes", "No completed activity after bonus"],
  },
];

function FraudRiskControl({ action }: { action: (message: string) => void }) {
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("All severity");
  const [status, setStatus] = useState("All statuses");
  const [selected, setSelected] = useState<RiskCase | null>(null);
  const [decision, setDecision] = useState<"clear" | "warn" | "block" | "appeal" | null>(null);
  const [reason, setReason] = useState("");
  const rows = useMemo(() => riskCases.filter((r) => (severity === "All severity" || r.severity === severity) && (status === "All statuses" || r.status === status) && (!query || `${r.id} ${r.user} ${r.userId} ${r.signal} ${r.source}`.toLowerCase().includes(query.toLowerCase()))), [query, severity, status]);
  const severityTone = (s: string) => (s === "Critical" ? "bg-rose-100 text-rose-800" : s === "High" ? "bg-orange-50 text-orange-700" : "bg-amber-50 text-amber-700");
  const statusTone = (s: string) => (s === "Open" ? "bg-rose-50 text-rose-700" : s === "Investigating" ? "bg-blue-50 text-blue-700" : s === "Held" ? "bg-amber-50 text-amber-700" : "bg-violet-50 text-violet-700");
  const confirm = () => {
    if (!selected || !decision || !reason.trim()) return;
    action(`${selected.id}: ${decision} decision saved to mock risk audit`);
    setDecision(null);
    setReason("");
    setSelected(null);
  };
  return (
    <>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 text-xs text-slate-400">
            Home <span className="px-2">›</span> Fraud &amp; Risk
          </div>
          <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">Fraud &amp; Risk Control</h1>
          <p className="mt-1 text-sm text-slate-500">Investigate suspicious behaviour, protect rewards and record proportionate decisions.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => action("Mock risk report exported")} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold">
            <Download size={15} />
            Export cases
          </button>
          <span className="flex h-10 items-center rounded-xl bg-violet-50 px-3 text-xs font-semibold text-violet-700">Step 7 · Mock data</span>
        </div>
      </div>
      <section className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Open risk cases", "27", "5 critical", ShieldAlert, "bg-rose-50 text-rose-600"],
          ["Rewards protected", "₹48,420", "Held pending review", WalletCards, "bg-amber-50 text-amber-600"],
          ["Device clusters", "14", "39 linked accounts", Smartphone, "bg-violet-50 text-violet-600"],
          ["Resolved today", "43", "91% within SLA", CheckCircle2, "bg-emerald-50 text-emerald-600"],
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
        <div className="flex flex-col gap-3 border-b p-4 xl:flex-row">
          <label className="flex h-11 flex-1 items-center gap-3 rounded-xl border border-slate-200 px-4">
            <Search size={17} className="text-slate-400" />
            <input aria-label="Search risk cases" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search case, user or signal" className="w-full bg-transparent text-xs outline-none" />
          </label>
          <select aria-label="Severity filter" value={severity} onChange={(e) => setSeverity(e.target.value)} className="h-11 rounded-xl border bg-white px-4 text-xs">
            <option>All severity</option>
            <option>Critical</option>
            <option>High</option>
            <option>Medium</option>
          </select>
          <select aria-label="Risk status filter" value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 rounded-xl border bg-white px-4 text-xs">
            <option>All statuses</option>
            <option>Open</option>
            <option>Investigating</option>
            <option>Held</option>
            <option>Appealed</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead>
              <tr className="bg-[#fafafd] text-[10px] uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3">Case / user</th>
                <th className="px-4 py-3">Risk signal</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Protected value</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 text-xs hover:bg-violet-50/30">
                  <td className="px-5 py-4">
                    <b>{r.user}</b>
                    <p className="mt-1 font-mono text-[10px] text-violet-600">
                      {r.id} · {r.userId}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <b>{r.signal}</b>
                    <p className="mt-1 text-[10px] text-slate-400">{r.source}</p>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <b className={r.score >= 85 ? "text-rose-600" : "text-amber-600"}>{r.score}</b>
                      <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${severityTone(r.severity)}`}>{r.severity}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 font-semibold">{r.amount}</td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusTone(r.status)}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-4 text-slate-500">{r.created}</td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => setSelected(r)} className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 font-semibold text-violet-600">
                      <Eye size={14} />
                      Investigate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <div className="p-12 text-center">
              <ShieldCheck className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm font-bold">No risk cases match</p>
              <p className="text-xs text-slate-400">Change the search or filters.</p>
            </div>
          )}
        </div>
        <div className="border-t px-5 py-4 text-xs text-slate-500">Showing {rows.length} mock cases · Signals require human review before enforcement</div>
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <article className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="font-bold">Detection coverage</h2>
          <p className="mt-1 text-xs text-slate-500">Mock rules across the earning journey.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              ["Device & account links", "Fingerprint, IP and payout identity", Smartphone],
              ["Reward velocity", "Impossible completion patterns", Activity],
              ["Provider integrity", "Callback and attribution checks", RefreshCw],
              ["Withdrawal protection", "KYC, ownership and hold rules", ShieldCheck],
            ].map(([a, b, I]) => (
              <div key={a as string} className="flex gap-3 rounded-xl bg-slate-50 p-3">
                <I size={18} className="text-violet-600" />
                <div>
                  <b className="text-xs">{a as string}</b>
                  <p className="text-[10px] text-slate-500">{b as string}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
        <article className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="font-bold">Decision safeguards</h2>
          <p className="mt-1 text-xs text-slate-500">Risk score assists review; it does not automatically punish users.</p>
          <div className="mt-4 space-y-3 text-xs">
            {["Evidence shown before every decision", "Reason required for warnings, blocks and clearance", "Held rewards remain traceable in the wallet ledger", "Appeals preserve the original decision and reviewer"].map((x, i) => (
              <div key={x} className="flex gap-3 rounded-xl border p-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet-50 text-[10px] font-bold text-violet-700">{i + 1}</span>
                <span>{x}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
      {selected && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <button aria-label="Close risk investigation" onClick={() => setSelected(null)} className="absolute inset-0 bg-slate-950/40" />
          <aside role="dialog" aria-modal="true" className="admin-scroll relative h-full w-full max-w-[660px] overflow-y-auto bg-[#f7f8fc] shadow-2xl">
            <header className="sticky top-0 z-10 flex items-center border-b bg-white p-5">
              <div>
                <p className="text-xs text-slate-400">Risk investigation</p>
                <h2 className="font-bold">
                  {selected.id} · {selected.user}
                </h2>
              </div>
              <button aria-label="Close investigation" onClick={() => setSelected(null)} className="ml-auto grid h-10 w-10 place-items-center">
                <X />
              </button>
            </header>
            <div className="space-y-4 p-5">
              <section className="rounded-2xl border bg-white p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${severityTone(selected.severity)}`}>
                    {selected.severity} · {selected.score}/100
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone(selected.status)}`}>{selected.status}</span>
                </div>
                <h3 className="mt-4 text-lg font-bold">{selected.signal}</h3>
                <p className="text-xs text-slate-500">
                  {selected.source} · {selected.created}
                </p>
                <dl className="mt-5 grid gap-3 text-xs sm:grid-cols-2">
                  {[
                    ["User", `${selected.user} · ${selected.userId}`],
                    ["Protected value", selected.amount],
                    ["Device", selected.device],
                    ["Last IP", selected.ip],
                  ].map((x) => (
                    <div key={x[0]} className="rounded-xl bg-slate-50 p-3">
                      <dt className="text-[10px] text-slate-400">{x[0]}</dt>
                      <dd className="mt-1 font-bold">{x[1]}</dd>
                    </div>
                  ))}
                </dl>
              </section>
              <section className="rounded-2xl border bg-white p-5">
                <h3 className="font-bold">Evidence timeline</h3>
                <div className="mt-4 space-y-4 border-l-2 border-violet-100 pl-4">
                  {selected.evidence.map((x, i) => (
                    <div key={x}>
                      <b className="text-xs">Signal {i + 1}</b>
                      <p className="mt-1 text-xs text-slate-500">{x}</p>
                    </div>
                  ))}
                </div>
              </section>
              <section className="rounded-2xl border bg-white p-5">
                <h3 className="font-bold">Investigation actions</h3>
                <p className="mt-1 text-xs text-slate-500">Every choice requires a reason and creates a mock audit record.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => setDecision("clear")} className="h-10 rounded-xl border border-emerald-200 px-4 text-xs font-bold text-emerald-700">
                    Clear case
                  </button>
                  <button onClick={() => setDecision("warn")} className="h-10 rounded-xl border border-amber-200 px-4 text-xs font-bold text-amber-700">
                    Warn user
                  </button>
                  <button onClick={() => setDecision("block")} className="h-10 rounded-xl bg-rose-600 px-4 text-xs font-bold text-white">
                    Block account &amp; rewards
                  </button>
                  {selected.status === "Appealed" && (
                    <button onClick={() => setDecision("appeal")} className="h-10 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white">
                      Resolve appeal
                    </button>
                  )}
                </div>
              </section>
            </div>
          </aside>
        </div>
      )}
      {decision && selected && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/50 p-4">
          <div role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold capitalize">Confirm {decision} decision</h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">This is a mock action for {selected.id}. Production will require permissions, server enforcement and an immutable audit record.</p>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Required investigation reason" className="mt-4 h-24 w-full rounded-xl border p-3 text-xs outline-none focus:border-violet-400" />
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  setDecision(null);
                  setReason("");
                }}
                className="h-10 rounded-xl border px-4 text-xs font-bold"
              >
                Cancel
              </button>
              <button disabled={!reason.trim()} onClick={confirm} className={`h-10 rounded-xl px-4 text-xs font-bold text-white disabled:opacity-40 ${decision === "block" ? "bg-rose-600" : "bg-violet-600"}`}>
                Confirm decision
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MiniLine({ values }: { values: number[] }) {
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${100 - v}`).join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-[250px] w-full overflow-visible" role="img" aria-label="Revenue and rewards trend chart">
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

export default function AdminDashboardPage() {
  const [activeView, setActiveView] = useState<AdminView>("Dashboard");
  const [historyPosition, setHistoryPosition] = useState(0);
  const [historyLength, setHistoryLength] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [range, setRange] = useState<keyof typeof chartSets>("30 days");
  const [transactionFilter, setTransactionFilter] = useState("All");
  const [toast, setToast] = useState("");
  const filteredTransactions = useMemo(() => (transactionFilter === "All" ? transactions : transactions.filter((t) => t.status === transactionFilter)), [transactionFilter]);
  const action = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };

  const syncHistoryControls = useCallback(() => {
    const position = Number(window.history.state?.adminPosition ?? 0);
    const length = Number(window.sessionStorage.getItem("glonni-admin-history-length") ?? position + 1);
    setHistoryPosition(position);
    setHistoryLength(Math.max(length, position + 1));
  }, []);

  const navigateTo = useCallback((view: AdminView, replace = false) => {
    const url = new URL(window.location.href);
    url.searchParams.set("section", adminViewSlugs[view]);
    const currentPosition = Number(window.history.state?.adminPosition ?? 0);
    const nextPosition = replace ? currentPosition : currentPosition + 1;
    const nextLength = replace ? Math.max(Number(window.sessionStorage.getItem("glonni-admin-history-length") ?? 1), nextPosition + 1) : nextPosition + 1;
    window.history[replace ? "replaceState" : "pushState"]({ ...window.history.state, adminView: view, adminPosition: nextPosition }, "", url);
    window.sessionStorage.setItem("glonni-admin-history-length", String(nextLength));
    setActiveView(view);
    setHistoryPosition(nextPosition);
    setHistoryLength(nextLength);
    setMenuOpen(false);
    setNoticeOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const initialView = getAdminViewFromUrl();
    const initialPosition = Number(window.history.state?.adminPosition ?? 0);
    const initialUrl = new URL(window.location.href);
    initialUrl.searchParams.set("section", adminViewSlugs[initialView]);
    window.history.replaceState({ ...window.history.state, adminView: initialView, adminPosition: initialPosition }, "", initialUrl);
    setActiveView(initialView);
    syncHistoryControls();

    const handlePopState = () => {
      setActiveView(getAdminViewFromUrl());
      setMenuOpen(false);
      setNoticeOpen(false);
      syncHistoryControls();
      window.scrollTo({ top: 0, behavior: "auto" });
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [syncHistoryControls]);

  return (
    <div className="admin-root min-h-screen bg-[#f7f8fc] text-[#172033]">
      {toast && (
        <div role="status" className="fixed bottom-6 right-6 z-[80] flex items-center gap-2 rounded-xl bg-[#172033] px-4 py-3 text-sm font-medium text-white shadow-2xl">
          <CheckCircle2 size={17} className="text-emerald-400" />
          {toast}
        </div>
      )}
      {menuOpen && <button aria-label="Close admin navigation" className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" onClick={() => setMenuOpen(false)} />}
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
                  const enabled = item.label === "Dashboard" || item.label === "Users" || item.label === "Wallet & Transactions" || item.label === "Withdrawals" || item.label === "KYC Verification" || item.label === "Fraud & Risk";
                  const active = item.label === activeView;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      title={collapsed ? item.label : undefined}
                      onClick={() => {
                        if (enabled) {
                          const view = item.label as AdminView;
                          if (view !== activeView) navigateTo(view);
                          else setMenuOpen(false);
                        } else action(`${item.label} will be built in its planned step`);
                      }}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium ${active ? "bg-gradient-to-r from-[#7748ee] to-[#5b27d8] text-white shadow-lg shadow-purple-950/25" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}
                    >
                      <Icon size={18} className="shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="truncate">{item.label}</span>
                          {item.badge && <span className="ml-auto rounded-full bg-rose-500 px-2 py-0.5 text-[10px] text-white">{item.badge}</span>}
                        </>
                      )}
                    </button>
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
                <div className="text-[11px] text-slate-400">Super Admin · Mock</div>
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
          <div className="ml-2 hidden items-center gap-1 sm:flex" aria-label="Admin page history">
            <button aria-label="Go to previous admin section" title="Back" disabled={historyPosition <= 0} onClick={() => window.history.back()} className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30">
              <ChevronLeft size={19} />
            </button>
            <button aria-label="Go to next admin section" title="Forward" disabled={historyPosition >= historyLength - 1} onClick={() => window.history.forward()} className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30">
              <ChevronRight size={19} />
            </button>
          </div>
          <label className="ml-3 hidden h-11 w-full max-w-[440px] items-center gap-3 rounded-xl bg-[#f5f6fa] px-4 md:flex">
            <Search size={18} className="text-slate-400" />
            <span className="sr-only">Search admin panel</span>
            <input className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="Search users, rewards, withdrawals..." />
            <kbd className="rounded border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-400">⌘ K</kbd>
          </label>
          <div className="ml-auto flex items-center gap-2">
            <button aria-label="Toggle appearance" onClick={() => action("Admin dark theme is planned for Settings")} className="grid h-11 w-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100">
              <Moon size={19} />
            </button>
            <div className="relative">
              <button aria-label="Notifications, 5 unread" className="relative grid h-11 w-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100" onClick={() => setNoticeOpen(!noticeOpen)}>
                <Bell size={19} />
                <span className="absolute right-1.5 top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">5</span>
              </button>
              {noticeOpen && (
                <div className="absolute right-0 top-14 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl">
                  <div className="flex items-center justify-between px-2 pb-2">
                    <p className="text-sm font-bold">Notifications</p>
                    <span className="text-[10px] font-semibold text-violet-600">5 unread</span>
                  </div>
                  {["8 withdrawals await approval", "12 KYC profiles need review", "Unusual activity detected on 3 devices"].map((n, i) => (
                    <button key={n} onClick={() => action("Notification opened")} className="mb-1 flex w-full gap-3 rounded-xl p-3 text-left hover:bg-slate-50">
                      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${i === 2 ? "bg-rose-500" : "bg-violet-500"}`} />
                      <span className="text-xs leading-5 text-slate-600">{n}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="ml-1 hidden items-center gap-3 border-l border-slate-200 pl-4 sm:flex">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-700 text-xs font-bold text-white">SK</div>
              <div className="hidden xl:block">
                <div className="text-sm font-semibold">Super Admin</div>
                <div className="flex items-center gap-1 text-[11px] text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Online
                </div>
              </div>
              <ChevronDown size={16} className="hidden text-slate-400 xl:block" />
            </div>
          </div>
        </header>

        <main className="px-4 py-6 md:px-7 md:py-7">
          <div className="mx-auto max-w-[1500px]">
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
            ) : (
              <>
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="mb-2 text-xs text-slate-400">
                      Home <span className="px-2">›</span> Dashboard
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">Dashboard</h1>
                    <p className="mt-1 text-sm text-slate-500">Welcome back, Shaneel. Here is today&apos;s platform overview.</p>
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
                    <span className="flex h-10 items-center rounded-xl bg-violet-50 px-3 text-xs font-semibold text-violet-700">Step 2 · Mock data</span>
                  </div>
                </div>

                <section aria-label="Key performance indicators" className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                  {metrics.map(({ label, value, change, note, icon: Icon, bg, color, positive }) => (
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

                <section className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_.75fr]">
                  <article className="rounded-2xl border border-[#e7e9f1] bg-white p-5 shadow-sm md:p-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="font-bold">Revenue and rewards</h2>
                        <p className="mt-1 text-xs text-slate-500">Provider revenue compared with approved user rewards</p>
                      </div>
                      <div className="flex rounded-lg bg-slate-100 p-1">
                        {(["7 days", "30 days", "90 days"] as const).map((x) => (
                          <button key={x} onClick={() => setRange(x)} className={`rounded-md px-3 py-1.5 text-[11px] font-semibold ${range === x ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"}`}>
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
                </section>

                <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
                  <article className="rounded-2xl border border-[#e7e9f1] bg-white p-5 shadow-sm md:p-6">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <h2 className="font-bold">Action required</h2>
                        <p className="mt-1 text-xs text-slate-500">Queues that need admin attention</p>
                      </div>
                      <button onClick={() => action("All pending queues opened")} className="text-xs font-semibold text-violet-600">
                        View all
                      </button>
                    </div>
                    <div className="space-y-3">
                      {[
                        ["8 withdrawals awaiting approval", "₹74,260 in requested payouts", "bg-amber-50 text-amber-600", HandCoins, "High"],
                        ["12 KYC profiles to review", "Oldest request is 9 hours old", "bg-violet-50 text-violet-600", UserCheck, "Medium"],
                        ["3 high-risk accounts detected", "Device duplication and rapid-task signals", "bg-rose-50 text-rose-600", ShieldAlert, "Urgent"],
                        ["5 support tickets are open", "2 are waiting beyond response target", "bg-blue-50 text-blue-600", Headphones, "Medium"],
                      ].map(([title, sub, tone, Icon, priority]) => (
                        <button key={title as string} onClick={() => action(`${title} queue opened`)} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left hover:border-violet-200 hover:bg-violet-50/30">
                          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}>
                            <Icon size={19} />
                          </span>
                          <span className="min-w-0">
                            <b className="block truncate text-sm">{title as string}</b>
                            <span className="block truncate text-[11px] text-slate-500">{sub as string}</span>
                          </span>
                          <span className={`ml-auto rounded-full px-2 py-1 text-[9px] font-bold ${priority === "Urgent" ? "bg-rose-100 text-rose-700" : priority === "High" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{priority as string}</span>
                        </button>
                      ))}
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

                <section className="mt-6 overflow-hidden rounded-2xl border border-[#e7e9f1] bg-white shadow-sm">
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
                  <button onClick={() => action("Complete transaction ledger will be built in Step 4")} className="m-4 text-xs font-semibold text-violet-600 md:mx-6">
                    View complete ledger →
                  </button>
                </section>

                <section className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
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
                </section>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
