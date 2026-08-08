"use client";

import {
  Activity, ArrowDownRight, ArrowUpRight, BadgeIndianRupee, Bell, CalendarDays,
  CheckCircle2, ChevronDown, CircleAlert, Clock3, Download, FileText, Gamepad2,
  Gift, HandCoins, Headphones, LayoutDashboard, Menu, MonitorPlay, Moon,
  MoreHorizontal, PackageCheck, PanelLeftClose, RefreshCw, Search, Settings,
  ShieldAlert, ShieldCheck, ShoppingBag, SlidersHorizontal, Store, TrendingUp,
  UserCheck, Users, WalletCards, X,
} from "lucide-react";
import { useMemo, useState } from "react";

type NavItem = { label: string; icon: typeof LayoutDashboard; badge?: string };
type NavGroup = { label?: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  { items: [
    { label: "Dashboard", icon: LayoutDashboard }, { label: "Users", icon: Users },
    { label: "Wallet & Transactions", icon: WalletCards }, { label: "Withdrawals", icon: HandCoins, badge: "8" },
    { label: "KYC Verification", icon: ShieldCheck, badge: "12" }, { label: "Fraud & Risk", icon: Activity },
  ]},
  { label: "EARNINGS", items: [
    { label: "Ad Networks", icon: MonitorPlay }, { label: "Surveys", icon: FileText },
    { label: "App Install Offers", icon: PackageCheck }, { label: "Games", icon: Gamepad2 },
  ]},
  { label: "SHOP & GROW", items: [
    { label: "Shop & Earn", icon: ShoppingBag }, { label: "Stores & Links", icon: Store }, { label: "Referrals", icon: Gift },
  ]},
  { label: "OPERATIONS", items: [
    { label: "Content", icon: FileText }, { label: "Support Centre", icon: Headphones, badge: "5" }, { label: "Reports", icon: SlidersHorizontal },
  ]},
  { label: "SYSTEM", items: [{ label: "Settings & Security", icon: Settings }, { label: "Activity Logs", icon: Activity }]},
];

const metrics = [
  { label: "Total users", value: "24,892", change: "+12.5%", note: "vs previous period", icon: Users, bg: "bg-[#eee9ff]", color: "text-[#7046df]", positive: true },
  { label: "Gross provider revenue", value: "₹8,42,680", change: "+18.2%", note: "mock provider total", icon: TrendingUp, bg: "bg-[#e5f8f1]", color: "text-[#119568]", positive: true },
  { label: "User rewards approved", value: "₹5,06,420", change: "+9.8%", note: "60.1% of revenue", icon: BadgeIndianRupee, bg: "bg-[#fff1dc]", color: "text-[#d98714]", positive: true },
  { label: "Pending withdrawals", value: "₹74,260", change: "-6.4%", note: "8 requests need review", icon: HandCoins, bg: "bg-[#ffe8ec]", color: "text-[#df5269]", positive: false },
];

const transactions = [
  { id: "GLN-RW-90284", user: "Aarav Mehta", type: "Game milestone", amount: "+₹120.00", status: "Approved", time: "2 min ago", color: "bg-violet-100 text-violet-700" },
  { id: "GLN-WD-90283", user: "Priya Reddy", type: "UPI withdrawal", amount: "-₹500.00", status: "Pending", time: "8 min ago", color: "bg-amber-100 text-amber-700" },
  { id: "GLN-RW-90282", user: "Karthik Rao", type: "Survey reward", amount: "+₹32.00", status: "Approved", time: "14 min ago", color: "bg-emerald-100 text-emerald-700" },
  { id: "GLN-RW-90281", user: "Sana Khan", type: "Shop cashback", amount: "+₹184.50", status: "Tracking", time: "21 min ago", color: "bg-blue-100 text-blue-700" },
  { id: "GLN-RW-90280", user: "Vikram Singh", type: "App install", amount: "+₹45.00", status: "Review", time: "32 min ago", color: "bg-rose-100 text-rose-700" },
];

const chartSets = {
  "7 days": [42, 55, 48, 66, 61, 78, 86],
  "30 days": [38, 44, 49, 43, 58, 63, 59, 71, 68, 76, 82, 88],
  "90 days": [31, 36, 42, 39, 48, 51, 57, 55, 64, 68, 73, 79],
};

function MiniLine({ values }: { values: number[] }) {
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${100 - v}`).join(" ");
  return <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-[250px] w-full overflow-visible" role="img" aria-label="Revenue and rewards trend chart">
    {[20,40,60,80].map(y => <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="#e9e7ef" strokeWidth=".4" />)}
    <defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7c4dff" stopOpacity=".28"/><stop offset="1" stopColor="#7c4dff" stopOpacity="0"/></linearGradient></defs>
    <polygon points={`0,100 ${points} 100,100`} fill="url(#area)" />
    <polyline points={points} fill="none" stroke="#7545e8" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
    {values.map((v,i) => <circle key={i} cx={(i/(values.length-1))*100} cy={100-v} r="1.2" fill="white" stroke="#7545e8" strokeWidth=".8" />)}
  </svg>;
}

export default function AdminDashboardPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [range, setRange] = useState<keyof typeof chartSets>("30 days");
  const [transactionFilter, setTransactionFilter] = useState("All");
  const [toast, setToast] = useState("");
  const filteredTransactions = useMemo(() => transactionFilter === "All" ? transactions : transactions.filter(t => t.status === transactionFilter), [transactionFilter]);
  const action = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2400); };

  return <div className="admin-root min-h-screen bg-[#f7f8fc] text-[#172033]">
    {toast && <div role="status" className="fixed bottom-6 right-6 z-[80] flex items-center gap-2 rounded-xl bg-[#172033] px-4 py-3 text-sm font-medium text-white shadow-2xl"><CheckCircle2 size={17} className="text-emerald-400"/>{toast}</div>}
    {menuOpen && <button aria-label="Close admin navigation" className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" onClick={() => setMenuOpen(false)} />}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-[#10172a] text-white transition-all duration-300 ${collapsed ? "lg:w-[88px]" : "lg:w-[260px]"} ${menuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
      <div className="flex h-[76px] items-center gap-3 border-b border-white/10 px-5"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#8157ff] to-[#5522da] font-black shadow-lg shadow-purple-950/40">G</div>{!collapsed && <div><div className="text-[17px] font-bold">Glonni Ads</div><div className="text-xs text-violet-300">Admin Panel</div></div>}<button aria-label="Close menu" className="ml-auto grid h-10 w-10 place-items-center rounded-lg text-slate-300 lg:hidden" onClick={() => setMenuOpen(false)}><X size={20}/></button></div>
      <nav className="admin-scroll flex-1 overflow-y-auto px-3 py-4" aria-label="Admin navigation">{navGroups.map((group, groupIndex) => <div className="mb-5" key={group.label ?? "main"}>{group.label && !collapsed && <p className="mb-2 px-3 text-[10px] font-semibold tracking-[.14em] text-slate-500">{group.label}</p>}<div className="space-y-1">{group.items.map(item => { const active = groupIndex === 0 && item.label === "Dashboard"; const Icon=item.icon; return <button key={item.label} title={collapsed ? item.label : undefined} onClick={() => !active && action(`${item.label} will be built in its planned step`)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium ${active ? "bg-gradient-to-r from-[#7748ee] to-[#5b27d8] text-white shadow-lg shadow-purple-950/25" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}><Icon size={18} className="shrink-0"/>{!collapsed && <><span className="truncate">{item.label}</span>{item.badge && <span className="ml-auto rounded-full bg-rose-500 px-2 py-0.5 text-[10px] text-white">{item.badge}</span>}</>}</button>})}</div></div>)}</nav>
      <div className="border-t border-white/10 p-3"><div className={`flex items-center gap-3 rounded-xl bg-white/5 p-3 ${collapsed ? "justify-center" : ""}`}><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-500 text-sm font-bold">SK</div>{!collapsed && <div className="min-w-0"><div className="truncate text-sm font-semibold">Shaneel Kumarreddy</div><div className="text-[11px] text-slate-400">Super Admin · Mock</div></div>}</div></div>
    </aside>

    <div className={`transition-all duration-300 ${collapsed ? "lg:pl-[88px]" : "lg:pl-[260px]"}`}>
      <header className="sticky top-0 z-30 flex h-[76px] items-center border-b border-[#e8eaf1] bg-white/95 px-4 backdrop-blur md:px-7">
        <button aria-label="Open admin navigation" className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 lg:hidden" onClick={() => setMenuOpen(true)}><Menu size={21}/></button><button aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="hidden h-11 w-11 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 lg:grid" onClick={() => setCollapsed(!collapsed)}><PanelLeftClose size={21} className={collapsed ? "rotate-180" : ""}/></button>
        <label className="ml-3 hidden h-11 w-full max-w-[440px] items-center gap-3 rounded-xl bg-[#f5f6fa] px-4 md:flex"><Search size={18} className="text-slate-400"/><span className="sr-only">Search admin panel</span><input className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="Search users, rewards, withdrawals..."/><kbd className="rounded border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-400">⌘ K</kbd></label>
        <div className="ml-auto flex items-center gap-2"><button aria-label="Toggle appearance" onClick={() => action("Admin dark theme is planned for Settings") } className="grid h-11 w-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"><Moon size={19}/></button><div className="relative"><button aria-label="Notifications, 5 unread" className="relative grid h-11 w-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100" onClick={() => setNoticeOpen(!noticeOpen)}><Bell size={19}/><span className="absolute right-1.5 top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">5</span></button>{noticeOpen && <div className="absolute right-0 top-14 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl"><div className="flex items-center justify-between px-2 pb-2"><p className="text-sm font-bold">Notifications</p><span className="text-[10px] font-semibold text-violet-600">5 unread</span></div>{["8 withdrawals await approval","12 KYC profiles need review","Unusual activity detected on 3 devices"].map((n,i)=><button key={n} onClick={()=>action("Notification opened")} className="mb-1 flex w-full gap-3 rounded-xl p-3 text-left hover:bg-slate-50"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${i===2?"bg-rose-500":"bg-violet-500"}`}/><span className="text-xs leading-5 text-slate-600">{n}</span></button>)}</div>}</div><div className="ml-1 hidden items-center gap-3 border-l border-slate-200 pl-4 sm:flex"><div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-700 text-xs font-bold text-white">SK</div><div className="hidden xl:block"><div className="text-sm font-semibold">Super Admin</div><div className="flex items-center gap-1 text-[11px] text-emerald-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>Online</div></div><ChevronDown size={16} className="hidden text-slate-400 xl:block"/></div></div>
      </header>

      <main className="px-4 py-6 md:px-7 md:py-7"><div className="mx-auto max-w-[1500px]">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-2 text-xs text-slate-400">Home <span className="px-2">›</span> Dashboard</div><h1 className="text-2xl font-bold tracking-tight md:text-[28px]">Dashboard</h1><p className="mt-1 text-sm text-slate-500">Welcome back, Shaneel. Here is today&apos;s platform overview.</p></div><div className="flex flex-wrap gap-2"><button onClick={()=>action("Mock report exported")} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:border-violet-300"><Download size={15}/>Export report</button><div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600"><CalendarDays size={15}/><select aria-label="Dashboard date range" value={range} onChange={e=>setRange(e.target.value as keyof typeof chartSets)} className="bg-transparent outline-none"><option>7 days</option><option>30 days</option><option>90 days</option></select></div><span className="flex h-10 items-center rounded-xl bg-violet-50 px-3 text-xs font-semibold text-violet-700">Step 2 · Mock data</span></div></div>

        <section aria-label="Key performance indicators" className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">{metrics.map(({label,value,change,note,icon:Icon,bg,color,positive})=><article key={label} className="rounded-2xl border border-[#e7e9f1] bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div className={`grid h-12 w-12 place-items-center rounded-2xl ${bg} ${color}`}><Icon size={22}/></div><button aria-label={`More options for ${label}`} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><MoreHorizontal size={18}/></button></div><p className="mt-5 text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-[25px] font-bold tracking-tight">{value}</p><div className="mt-3 flex items-center gap-2 text-[11px]"><span className={`flex items-center gap-1 font-bold ${positive?"text-emerald-600":"text-rose-600"}`}>{positive?<ArrowUpRight size={14}/>:<ArrowDownRight size={14}/>} {change}</span><span className="text-slate-400">{note}</span></div></article>)}</section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_.75fr]">
          <article className="rounded-2xl border border-[#e7e9f1] bg-white p-5 shadow-sm md:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold">Revenue and rewards</h2><p className="mt-1 text-xs text-slate-500">Provider revenue compared with approved user rewards</p></div><div className="flex rounded-lg bg-slate-100 p-1">{(["7 days","30 days","90 days"] as const).map(x=><button key={x} onClick={()=>setRange(x)} className={`rounded-md px-3 py-1.5 text-[11px] font-semibold ${range===x?"bg-white text-violet-700 shadow-sm":"text-slate-500"}`}>{x}</button>)}</div></div><div className="mt-5 flex gap-5 text-xs"><span className="flex items-center gap-2 text-slate-500"><i className="h-2.5 w-2.5 rounded-full bg-violet-600"/>Revenue ₹8.42L</span><span className="flex items-center gap-2 text-slate-500"><i className="h-2.5 w-2.5 rounded-full bg-emerald-400"/>Rewards ₹5.06L</span></div><div className="mt-3"><MiniLine values={chartSets[range]}/></div><div className="flex justify-between border-t border-slate-100 pt-3 text-[10px] text-slate-400"><span>Start</span><span>Mid-period</span><span>Today</span></div></article>
          <article className="rounded-2xl border border-[#e7e9f1] bg-white p-5 shadow-sm md:p-6"><div className="flex items-center justify-between"><div><h2 className="font-bold">Reward sources</h2><p className="mt-1 text-xs text-slate-500">Approved rewards by channel</p></div><span className="text-[10px] font-semibold text-slate-400">THIS MONTH</span></div><div className="mx-auto my-6 grid h-44 w-44 place-items-center rounded-full" style={{background:"conic-gradient(#7545e8 0 36%, #28b989 36% 60%, #f3a833 60% 78%, #ee647e 78% 90%, #5f9eea 90% 100%)"}}><div className="grid h-28 w-28 place-items-center rounded-full bg-white text-center"><div><p className="text-[11px] text-slate-400">Total rewards</p><p className="text-lg font-bold">₹5.06L</p></div></div></div><div className="space-y-3">{[["Watch & Earn","36%","bg-violet-600"],["Games & installs","24%","bg-emerald-500"],["Surveys","18%","bg-amber-400"],["Shop cashback","12%","bg-rose-400"],["Referrals","10%","bg-blue-400"]].map(x=><div key={x[0]} className="flex items-center text-xs"><span className={`mr-2 h-2.5 w-2.5 rounded-full ${x[2]}`}/><span className="text-slate-500">{x[0]}</span><b className="ml-auto">{x[1]}</b></div>)}</div></article>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
          <article className="rounded-2xl border border-[#e7e9f1] bg-white p-5 shadow-sm md:p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-bold">Action required</h2><p className="mt-1 text-xs text-slate-500">Queues that need admin attention</p></div><button onClick={()=>action("All pending queues opened")} className="text-xs font-semibold text-violet-600">View all</button></div><div className="space-y-3">{[
            ["8 withdrawals awaiting approval","₹74,260 in requested payouts","bg-amber-50 text-amber-600",HandCoins,"High"],
            ["12 KYC profiles to review","Oldest request is 9 hours old","bg-violet-50 text-violet-600",UserCheck,"Medium"],
            ["3 high-risk accounts detected","Device duplication and rapid-task signals","bg-rose-50 text-rose-600",ShieldAlert,"Urgent"],
            ["5 support tickets are open","2 are waiting beyond response target","bg-blue-50 text-blue-600",Headphones,"Medium"],
          ].map(([title,sub,tone,Icon,priority])=><button key={title as string} onClick={()=>action(`${title} queue opened`)} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left hover:border-violet-200 hover:bg-violet-50/30"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}><Icon size={19}/></span><span className="min-w-0"><b className="block truncate text-sm">{title as string}</b><span className="block truncate text-[11px] text-slate-500">{sub as string}</span></span><span className={`ml-auto rounded-full px-2 py-1 text-[9px] font-bold ${priority==="Urgent"?"bg-rose-100 text-rose-700":priority==="High"?"bg-amber-100 text-amber-700":"bg-slate-100 text-slate-600"}`}>{priority as string}</span></button>)}</div></article>
          <article className="rounded-2xl border border-[#e7e9f1] bg-white p-5 shadow-sm md:p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-bold">Provider health</h2><p className="mt-1 text-xs text-slate-500">Mock integration status and success rates</p></div><button onClick={()=>action("Provider statuses refreshed")} aria-label="Refresh provider status" className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50 text-slate-500"><RefreshCw size={16}/></button></div><div className="space-y-5">{[["Rewarded Ads","98.7%","99","bg-violet-500"],["Survey Network","94.2%","94","bg-emerald-500"],["Offerwall & Games","91.8%","92","bg-amber-400"],["Affiliate tracking","96.4%","96","bg-blue-500"]].map(x=><div key={x[0]}><div className="mb-2 flex items-center text-xs"><span className="font-semibold">{x[0]}</span><span className="ml-auto text-slate-500">{x[1]} success</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${x[3]}`} style={{width:`${x[2]}%`}}/></div></div>)}</div><div className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800"><CheckCircle2 size={17}/>All mock providers operational</div></article>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-[#e7e9f1] bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between md:px-6"><div><h2 className="font-bold">Recent transactions</h2><p className="mt-1 text-xs text-slate-500">Latest reward and withdrawal ledger activity</p></div><div className="flex gap-1 rounded-lg bg-slate-100 p-1">{["All","Approved","Pending","Review"].map(x=><button key={x} onClick={()=>setTransactionFilter(x)} className={`rounded-md px-3 py-1.5 text-[11px] font-semibold ${transactionFilter===x?"bg-white text-violet-700 shadow-sm":"text-slate-500"}`}>{x}</button>)}</div></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead><tr className="border-b border-slate-100 bg-[#fafafd] text-[10px] uppercase tracking-wider text-slate-400"><th className="px-6 py-3 font-semibold">Reference</th><th className="px-4 py-3 font-semibold">User</th><th className="px-4 py-3 font-semibold">Activity</th><th className="px-4 py-3 font-semibold">Amount</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-6 py-3 text-right font-semibold">Time</th></tr></thead><tbody>{filteredTransactions.map(t=><tr key={t.id} className="border-b border-slate-50 text-xs hover:bg-slate-50/70"><td className="px-6 py-4 font-mono text-[11px] font-semibold text-violet-600">{t.id}</td><td className="px-4 py-4 font-semibold">{t.user}</td><td className="px-4 py-4 text-slate-500">{t.type}</td><td className={`px-4 py-4 font-bold ${t.amount.startsWith("+")?"text-emerald-600":"text-slate-700"}`}>{t.amount}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${t.color}`}>{t.status}</span></td><td className="px-6 py-4 text-right text-slate-400">{t.time}</td></tr>)}</tbody></table>{filteredTransactions.length===0&&<div className="p-10 text-center text-sm text-slate-500">No mock transactions match this filter.</div>}</div><button onClick={()=>action("Complete transaction ledger will be built in Step 4")} className="m-4 text-xs font-semibold text-violet-600 md:mx-6">View complete ledger →</button></section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
          <article className="rounded-2xl border border-[#e7e9f1] bg-white p-5 shadow-sm md:p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-bold">Top earning offers</h2><p className="mt-1 text-xs text-slate-500">Ranked by verified completions</p></div><span className="text-[10px] font-semibold text-slate-400">LAST 30 DAYS</span></div><div className="space-y-3">{[["1","Puzzle Kingdom","Game","4,280","₹1.72L"],["2","Quick Opinion India","Survey","3,915","₹94.6K"],["3","StreamNow Rewards","Watch ads","12,480","₹82.3K"],["4","Fashion Store Cashback","Shop","1,806","₹61.8K"]].map(r=><div key={r[0]} className="grid grid-cols-[28px_1fr_auto] items-center gap-3 rounded-xl border border-slate-100 p-3"><span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-50 text-[11px] font-bold text-violet-600">{r[0]}</span><div><p className="text-xs font-bold">{r[1]}</p><p className="text-[10px] text-slate-400">{r[2]} · {r[3]} completions</p></div><b className="text-xs">{r[4]}</b></div>)}</div></article>
          <article className="rounded-2xl border border-[#e7e9f1] bg-white p-5 shadow-sm md:p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-bold">Live activity</h2><p className="mt-1 text-xs text-slate-500">Recent platform events</p></div><span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600"><i className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"/>LIVE MOCK</span></div><div className="space-y-5">{[["New user registered","Hyderabad · Android","Just now",Users],["Withdrawal requested","₹500 via UPI","3 min",HandCoins],["Game milestone verified","Puzzle Kingdom · Level 10","7 min",CheckCircle2],["Risk signal created","Repeated device fingerprint","11 min",CircleAlert]].map(([title,sub,time,Icon],i)=><div key={title as string} className="flex gap-3"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${i===3?"bg-rose-50 text-rose-600":"bg-violet-50 text-violet-600"}`}><Icon size={16}/></span><div className="min-w-0"><p className="truncate text-xs font-bold">{title as string}</p><p className="truncate text-[10px] text-slate-400">{sub as string}</p></div><span className="ml-auto shrink-0 text-[10px] text-slate-400">{time as string}</span></div>)}</div><div className="mt-5 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-[11px] leading-5 text-amber-800"><Clock3 size={16} className="shrink-0"/>Live events will stream from Supabase after backend integration.</div></article>
        </section>
      </div></main>
    </div>
  </div>;
}
