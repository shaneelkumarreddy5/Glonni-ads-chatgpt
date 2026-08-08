"use client";

import {
  BadgeCheck, Bell, ChevronRight, CircleHelp, CircleUserRound, ClipboardCheck,
  Coins, CreditCard, Download, Flame, Gamepad2, Gift, History,
  Home, Landmark, LockKeyhole, MonitorPlay, Play, Search, ShieldCheck,
  ShoppingBag, Star, Store, Target, Timer, TrendingUp,
  UserRoundPlus, Wallet, Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";

type NavKey = "home" | "tasks" | "shop" | "games" | "profile";
type TaskKey = "watch" | "surveys" | "downloads";

const navItems: { key: NavKey; label: string; icon: LucideIcon }[] = [
  { key: "home", label: "Home", icon: Home },
  { key: "tasks", label: "Tasks", icon: ClipboardCheck },
  { key: "shop", label: "Shop & Earn", icon: ShoppingBag },
  { key: "games", label: "Games", icon: Gamepad2 },
  { key: "profile", label: "Profile", icon: CircleUserRound },
];

const purple = "from-[#7357f2] via-[#6844e4] to-[#542bc9]";

export default function App() {
  const [activeNav, setActiveNav] = useState<NavKey>("home");
  const [taskTab, setTaskTab] = useState<TaskKey>("watch");
  const [watched, setWatched] = useState(12);
  const [toast, setToast] = useState("");

  const navigate = (key: NavKey, tab?: TaskKey) => {
    setActiveNav(key);
    if (tab) setTaskTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1180px] bg-[#fbfbfe] pb-28 md:my-5 md:min-h-[calc(100vh-2.5rem)] md:rounded-[32px] md:border md:border-white md:shadow-[0_28px_80px_rgba(50,35,95,.12)]">
      <Header activeNav={activeNav} />
      <section className="px-4 pb-4 md:px-8 lg:px-10">
        {activeNav === "home" && <HomeScreen navigate={navigate} />}
        {activeNav === "tasks" && <TasksScreen active={taskTab} setActive={setTaskTab} watched={watched} setWatched={setWatched} notify={notify} />}
        {activeNav === "shop" && <ShopScreen notify={notify} />}
        {activeNav === "games" && <GamesScreen notify={notify} />}
        {activeNav === "profile" && <ProfileScreen notify={notify} />}
      </section>
      <BottomNav active={activeNav} navigate={navigate} />
      {toast && <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#1d1534] px-5 py-3 text-sm font-bold text-white shadow-xl">{toast}</div>}
    </main>
  );
}

function Header({ activeNav }: { activeNav: NavKey }) {
  const title = navItems.find((item) => item.key === activeNav)?.label;
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between bg-[#fbfbfe]/90 px-4 py-5 backdrop-blur-xl md:rounded-t-[32px] md:px-8 lg:px-10">
      <div>
        {activeNav === "home" ? <><p className="text-xs font-medium text-slate-500">Good morning,</p><h1 className="text-xl font-extrabold tracking-tight text-[#181426]">Shaneel <span aria-hidden>👋</span></h1></> : <h1 className="text-2xl font-extrabold tracking-tight text-[#181426]">{title}</h1>}
      </div>
      <div className="flex items-center gap-2">
        {activeNav !== "home" && <div className="flex items-center gap-1.5 rounded-full border border-[#ebe8f3] bg-white px-3 py-2 text-sm font-extrabold text-[#272034] shadow-sm"><Coins className="h-4 w-4 text-amber-400" fill="currentColor" /> 0</div>}
        <button aria-label="Notifications" className="relative grid h-10 w-10 place-items-center rounded-full border border-[#ebe8f3] bg-white text-[#332c43] shadow-sm"><Bell className="h-5 w-5" /><span className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">3</span></button>
      </div>
    </header>
  );
}

function HomeScreen({ navigate }: { navigate: (key: NavKey, tab?: TaskKey) => void }) {
  const shortcuts = [
    { label: "Tasks", icon: ClipboardCheck, color: "bg-violet-100 text-violet-600", action: () => navigate("tasks") },
    { label: "Shop & Earn", icon: ShoppingBag, color: "bg-pink-100 text-pink-600", action: () => navigate("shop") },
    { label: "Games", icon: Gamepad2, color: "bg-indigo-100 text-indigo-600", action: () => navigate("games") },
    { label: "Refer & Earn", icon: UserRoundPlus, color: "bg-sky-100 text-sky-600", action: () => {} },
    { label: "Surveys", icon: ClipboardCheck, color: "bg-emerald-100 text-emerald-600", action: () => navigate("tasks", "surveys") },
    { label: "Daily Bonus", icon: Gift, color: "bg-orange-100 text-orange-600", action: () => {} },
  ];
  return <div className="space-y-5">
    <section className={`relative overflow-hidden rounded-[28px] bg-gradient-to-br ${purple} p-5 text-white shadow-[0_18px_40px_rgba(90,55,205,.22)] md:p-7`}>
      <div className="absolute -right-10 -top-16 h-44 w-44 rounded-full bg-white/10" /><div className="absolute -bottom-16 right-24 h-36 w-36 rounded-full bg-fuchsia-300/10" />
      <div className="relative flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-white/75">Total balance</p><p className="mt-1 text-4xl font-black tracking-tight">₹0.00</p><div className="mt-4 flex items-center gap-2 text-sm font-bold"><Coins className="h-5 w-5 text-amber-300" fill="currentColor" /> 0 Glonni Coins</div></div><div className="grid h-24 w-24 place-items-center rounded-[28px] bg-white/12 shadow-inner"><Wallet className="h-14 w-14 text-amber-300" strokeWidth={1.6} /></div></div>
    </section>
    <div className="grid grid-cols-2 gap-3"><MiniStat label="Today’s earning" value="₹0.00" hint="Start your first task" icon={Zap} /><MiniStat label="This month" value="₹0.00" hint="Your progress" icon={TrendingUp} /></div>
    <section><SectionTitle title="Quick access" /><div className="grid grid-cols-3 gap-3">{shortcuts.map(({label, icon: Icon, color, action}) => <button key={label} onClick={action} className="flex min-h-28 flex-col items-center justify-center gap-3 rounded-2xl border border-[#eeebf4] bg-white p-3 text-center shadow-[0_8px_25px_rgba(30,20,60,.04)] transition hover:-translate-y-0.5 hover:shadow-md"><span className={`grid h-11 w-11 place-items-center rounded-2xl ${color}`}><Icon className="h-6 w-6" /></span><span className="text-xs font-bold text-[#292336]">{label}</span></button>)}</div></section>
    <section className="rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50 to-rose-50 p-4"><div className="flex items-center gap-2 text-sm font-extrabold text-orange-700"><Flame className="h-5 w-5" fill="currentColor" /> Start your 7-day streak</div><p className="mt-1 text-xs text-slate-600">Complete one task today and keep coming back.</p><div className="mt-4 grid grid-cols-7 gap-2">{["M","T","W","T","F","S","S"].map((d,index) => <div key={`${d}${index}`} className="text-center"><span className={`mx-auto grid h-8 w-8 place-items-center rounded-full ${index === 0 ? "bg-orange-500 text-white" : "bg-white text-orange-400"}`}><Flame className="h-4 w-4" /></span><span className="mt-1 block text-[10px] font-bold text-slate-500">{d}</span></div>)}</div></section>
    <button className={`flex w-full items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-r ${purple} p-5 text-left text-white`}><span><span className="block text-lg font-extrabold">Invite friends & earn</span><span className="mt-1 block text-xs text-white/75">Get rewards when your friends start earning</span></span><span className="grid h-10 w-10 place-items-center rounded-full bg-white text-violet-600"><ChevronRight className="h-5 w-5" /></span></button>
  </div>;
}

function TasksScreen({ active, setActive, watched, setWatched, notify }: { active: TaskKey; setActive: (v: TaskKey) => void; watched: number; setWatched: (v: number) => void; notify: (m: string) => void }) {
  const tabs: {key: TaskKey; label: string}[] = [{key:"watch",label:"Watch & Earn"},{key:"surveys",label:"Surveys"},{key:"downloads",label:"Download Apps"}];
  return <div className="space-y-5"><div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">{tabs.map(t => <button key={t.key} onClick={() => setActive(t.key)} className={`whitespace-nowrap rounded-full px-4 py-2.5 text-xs font-extrabold transition ${active === t.key ? `bg-gradient-to-r ${purple} text-white shadow-md` : "border border-[#ebe8f2] bg-white text-slate-600"}`}>{t.label}</button>)}</div>{active === "watch" && <WatchPanel watched={watched} setWatched={setWatched} notify={notify} />}{active === "surveys" && <SurveyPanel notify={notify} />}{active === "downloads" && <DownloadPanel notify={notify} />}</div>;
}

function WatchPanel({ watched, setWatched, notify }: { watched: number; setWatched: (v: number) => void; notify: (m: string) => void }) {
  const handleWatch = () => { if (watched >= 20) return notify("Daily limit reached"); setWatched(watched + 1); notify("Demo ad completed · ₹0.80 pending"); };
  return <><Hero icon={MonitorPlay} eyebrow="WATCH & EARN" title="Turn spare moments into rewards" body="Watch short sponsored videos and earn ₹0.80 for every completed ad." action="Watch now" onClick={handleWatch} />
    <section><SectionTitle title="Available ads" side={`${20-watched} remaining`} /><div className="overflow-hidden rounded-2xl border border-[#ece9f2] bg-white">{[1,2,3,4].map((n) => <button onClick={handleWatch} key={n} className="flex w-full items-center gap-3 border-b border-[#f0edf5] p-3.5 text-left last:border-0 hover:bg-violet-50/40"><span className="grid h-11 w-11 place-items-center rounded-xl bg-violet-100 text-violet-600"><Play className="h-5 w-5" fill="currentColor" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-extrabold text-[#282133]">Watch video ad</span><span className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><Timer className="h-3.5 w-3.5" /> 30 seconds</span></span><span className="text-sm font-black text-violet-600">+₹0.80</span></button>)}</div></section>
    <ProgressCard current={watched} total={20} />
  </>;
}

function SurveyPanel({ notify }: { notify: (m:string)=>void }) {
  const surveys = [{title:"Shopping habits",time:"8 min",reward:"₹12",rating:5},{title:"Lifestyle & daily routine",time:"6 min",reward:"₹8",rating:4},{title:"Food & beverages",time:"10 min",reward:"₹15",rating:4},{title:"Travel preferences",time:"12 min",reward:"₹18",rating:3}];
  return <><Hero icon={ClipboardCheck} eyebrow="SHARE YOUR OPINION" title="Quick surveys, real rewards" body="Answer simple questions from trusted research partners." action="View best survey" onClick={() => notify("Survey providers will be connected later")} mint />
    <section><SectionTitle title="Available surveys" side="4 matched" /><div className="overflow-hidden rounded-2xl border border-[#ece9f2] bg-white">{surveys.map(s => <button key={s.title} onClick={() => notify("Survey providers will be connected later")} className="flex w-full items-center gap-3 border-b border-[#f0edf5] p-4 text-left last:border-0"><span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-100 text-emerald-600"><ClipboardCheck className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-extrabold text-[#282133]">{s.title}</span><span className="mt-1 flex items-center gap-2 text-xs text-slate-500">{s.time}<span className="flex text-amber-400">{Array.from({length:s.rating}).map((_,i)=><Star key={i} className="h-3 w-3" fill="currentColor" />)}</span></span></span><span className="text-sm font-black text-emerald-600">+{s.reward}</span></button>)}</div></section>
  </>;
}

function DownloadPanel({ notify }: { notify: (m:string)=>void }) {
  const apps=[{name:"Pocket Budget",cat:"Finance",reward:"₹45",color:"bg-blue-500"},{name:"Fresh Basket",cat:"Shopping",reward:"₹28",color:"bg-emerald-500"},{name:"FitSteps",cat:"Health",reward:"₹35",color:"bg-orange-500"}];
  return <><Hero icon={Download} eyebrow="APP OFFERS" title="Discover apps and earn" body="Install, open and complete the required step to unlock rewards." action="How it works" onClick={()=>notify("Offerwall tracking will be connected later")} />
  <section><SectionTitle title="Recommended apps" side="New today" /><div className="space-y-3">{apps.map(a=><article key={a.name} className="rounded-2xl border border-[#ece9f2] bg-white p-4"><div className="flex items-center gap-3"><span className={`grid h-12 w-12 place-items-center rounded-2xl text-white ${a.color}`}><Download className="h-6 w-6" /></span><span className="flex-1"><b className="block text-sm text-[#282133]">{a.name}</b><span className="text-xs text-slate-500">{a.cat} · Install & register</span></span><span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-600">Earn {a.reward}</span></div><button onClick={()=>notify("App offer partner will be connected later")} className="mt-4 w-full rounded-xl bg-[#1f1930] py-3 text-sm font-bold text-white">Install & open</button></article>)}</div></section></>;
}

function ShopScreen({ notify }: { notify: (m:string)=>void }) {
  const stores=[{name:"Amazon",rate:"Up to 8%",letter:"a",color:"bg-[#fff5df] text-[#111]"},{name:"Flipkart",rate:"Up to 6%",letter:"F",color:"bg-[#fff7d6] text-blue-600"},{name:"Myntra",rate:"Up to 7%",letter:"M",color:"bg-pink-50 text-pink-600"},{name:"AJIO",rate:"Up to 5%",letter:"A",color:"bg-slate-100 text-slate-800"}];
  return <div className="space-y-5"><Hero icon={ShoppingBag} eyebrow="SHOP & EARN" title="Cashback on things you already buy" body="Compare stores, shop normally and earn after your order is confirmed." action="Explore stores" onClick={()=>notify("Affiliate stores will be connected later")} />
  <div className="relative"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input aria-label="Search products or stores" placeholder="Search products or stores" className="w-full rounded-2xl border border-[#ece9f2] bg-white py-3.5 pl-11 pr-4 text-sm outline-none focus:border-violet-400" /></div>
  <section><SectionTitle title="Top stores" side="View all"/><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{stores.map(s=><button onClick={()=>notify(`${s.name} affiliate feed coming soon`)} key={s.name} className="rounded-2xl border border-[#ece9f2] bg-white p-4 text-left"><span className={`grid h-11 w-11 place-items-center rounded-xl text-xl font-black ${s.color}`}>{s.letter}</span><b className="mt-3 block text-sm text-[#282133]">{s.name}</b><span className="text-xs font-semibold text-emerald-600">{s.rate} cashback</span></button>)}</div></section>
  <section className="rounded-2xl border border-[#ece9f2] bg-white p-5"><SectionTitle title="How it works" />{[[Store,"Choose a store","Compare cashback and prices"],[CreditCard,"Complete purchase","Shop on the partner website"],[Coins,"Earn cashback","Reward appears after confirmation"]].map(([Icon,title,body],i)=><div key={String(title)} className="flex gap-3 py-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 text-violet-600"><Icon className="h-5 w-5" /></span><span><b className="block text-sm text-[#292236]">{i+1}. {String(title)}</b><span className="text-xs text-slate-500">{String(body)}</span></span></div>)}</section></div>;
}

function GamesScreen({ notify }: { notify:(m:string)=>void }) {
  const games=[{name:"Puzzle Quest",goal:"Complete level 10",reward:"₹50",icon:"🧩"},{name:"Cricket League",goal:"Win 3 matches",reward:"₹35",icon:"🏏"},{name:"Word Master",goal:"Find 500 words",reward:"₹25",icon:"🔤"},{name:"Ludo Club",goal:"Win 5 games",reward:"₹40",icon:"🎲"}];
  return <div className="space-y-5"><Hero icon={Gamepad2} eyebrow="PLAY & EARN" title="Play games. Complete missions." body="Discover fun challenges and unlock rewards as you progress." action="Explore games" onClick={()=>notify("Game partners will be connected later")} />
  <div className="no-scrollbar flex gap-2 overflow-x-auto">{["All games","Trending","Top paying","New"].map((t,i)=><button key={t} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold ${i===0?"bg-[#241b38] text-white":"border border-[#ece9f2] bg-white text-slate-600"}`}>{t}</button>)}</div>
  <div className="overflow-hidden rounded-2xl border border-[#ece9f2] bg-white">{games.map(g=><button onClick={()=>notify("Game offer tracking coming soon")} key={g.name} className="flex w-full items-center gap-3 border-b border-[#f0edf5] p-4 text-left last:border-0"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-100 to-pink-100 text-2xl">{g.icon}</span><span className="flex-1"><b className="block text-sm text-[#282133]">{g.name}</b><span className="text-xs text-slate-500">{g.goal}</span></span><span className="text-sm font-black text-violet-600">+{g.reward}</span></button>)}</div></div>;
}

function ProfileScreen({ notify }: { notify:(m:string)=>void }) {
  const items=[{icon:Wallet,title:"Wallet",body:"Balance and withdrawals"},{icon:History,title:"Earning history",body:"All reward activity"},{icon:Landmark,title:"UPI / Bank details",body:"Manage payout account"},{icon:ShieldCheck,title:"KYC verification",body:"Secure your withdrawals"},{icon:CircleHelp,title:"Help & support",body:"FAQs and support tickets"}];
  return <div className="space-y-5"><section className={`rounded-[28px] bg-gradient-to-br ${purple} p-6 text-white`}><div className="flex items-center gap-4"><span className="grid h-16 w-16 place-items-center rounded-full bg-white/20"><CircleUserRound className="h-9 w-9" /></span><span><b className="block text-xl">Shaneel</b><span className="mt-1 flex items-center gap-1 text-xs text-white/75"><BadgeCheck className="h-4 w-4"/> Member account</span></span></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-white/10 p-3"><span className="text-xs text-white/70">Available balance</span><b className="mt-1 block text-xl">₹0.00</b></div><div className="rounded-2xl bg-white/10 p-3"><span className="text-xs text-white/70">Minimum withdrawal</span><b className="mt-1 block text-xl">₹500</b></div></div></section>
  <div className="overflow-hidden rounded-2xl border border-[#ece9f2] bg-white">{items.map(({icon:Icon,title,body})=><button onClick={()=>notify(`${title} backend will be connected later`)} key={title} className="flex w-full items-center gap-3 border-b border-[#f0edf5] p-4 text-left last:border-0"><span className="grid h-11 w-11 place-items-center rounded-xl bg-violet-50 text-violet-600"><Icon className="h-5 w-5"/></span><span className="flex-1"><b className="block text-sm text-[#282133]">{title}</b><span className="text-xs text-slate-500">{body}</span></span><ChevronRight className="h-5 w-5 text-slate-300"/></button>)}</div>
  <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-800"><LockKeyhole className="h-5 w-5"/><p className="text-xs leading-5"><b className="block">Your rewards stay protected</b>Secure verification will be required before withdrawal.</p></div></div>;
}

function Hero({ icon: Icon, eyebrow, title, body, action, onClick, mint=false }: {icon:LucideIcon;eyebrow:string;title:string;body:string;action:string;onClick:()=>void;mint?:boolean}) { return <section className={`relative overflow-hidden rounded-[26px] ${mint ? "bg-gradient-to-br from-[#36c6a0] to-[#189f83]" : `bg-gradient-to-br ${purple}`} p-5 text-white shadow-[0_18px_38px_rgba(90,55,205,.18)] md:p-7`}><div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/10"/><div className="relative flex items-center justify-between gap-4"><div className="max-w-md"><span className="text-[10px] font-black tracking-[.2em] text-white/70">{eyebrow}</span><h2 className="mt-2 text-2xl font-black leading-tight">{title}</h2><p className="mt-2 text-sm leading-6 text-white/80">{body}</p><button onClick={onClick} className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-extrabold text-violet-700 shadow-sm">{action}<ChevronRight className="h-4 w-4"/></button></div><span className="hidden h-28 w-28 shrink-0 place-items-center rounded-[30px] bg-white/15 sm:grid"><Icon className="h-16 w-16" strokeWidth={1.5}/></span></div></section> }

function MiniStat({label,value,hint,icon:Icon}:{label:string;value:string;hint:string;icon:LucideIcon}) { return <div className="rounded-2xl border border-[#eeebf4] bg-white p-4 shadow-[0_8px_25px_rgba(30,20,60,.04)]"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-500">{label}</span><Icon className="h-4 w-4 text-violet-500"/></div><b className="mt-2 block text-xl text-[#211a31]">{value}</b><span className="text-[10px] text-slate-400">{hint}</span></div> }
function SectionTitle({title,side}:{title:string;side?:string}) { return <div className="mb-3 flex items-center justify-between"><h3 className="text-base font-extrabold text-[#241e30]">{title}</h3>{side&&<span className="text-xs font-bold text-violet-600">{side}</span>}</div> }
function ProgressCard({current,total}:{current:number;total:number}) { const pct=Math.min(100,current/total*100); return <section className="rounded-2xl border border-[#ece9f2] bg-white p-4"><div className="flex items-center justify-between"><div><b className="text-sm text-[#292236]">Daily reward progress</b><p className="mt-1 text-xs text-slate-500">Complete {total} ads to finish today’s goal</p></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-500"><Target className="h-5 w-5"/></span></div><div className="mt-4 h-2.5 overflow-hidden rounded-full bg-violet-100"><div className={`h-full rounded-full bg-gradient-to-r ${purple} transition-all`} style={{width:`${pct}%`}}/></div><div className="mt-2 flex justify-between text-xs font-bold"><span className="text-violet-600">{current} completed</span><span className="text-slate-400">{total} total</span></div></section> }
function BottomNav({active,navigate}:{active:NavKey;navigate:(key:NavKey)=>void}) { return <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[1180px] border-t border-[#ebe8f1] bg-white/95 px-2 pb-[max(.65rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:bottom-5 md:rounded-b-[32px]"><div className="grid grid-cols-5">{navItems.map(({key,label,icon:Icon})=><button key={key} onClick={()=>navigate(key)} className={`relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-bold transition ${active===key?"text-violet-600":"text-slate-500 hover:text-violet-500"}`}>{active===key&&<span className="absolute top-0 h-1 w-6 rounded-full bg-violet-600"/>}<Icon className="h-5 w-5" strokeWidth={active===key?2.7:2}/><span>{label}</span></button>)}</div></nav> }
