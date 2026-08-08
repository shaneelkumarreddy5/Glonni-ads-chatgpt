"use client";

import {
  BadgeIndianRupee,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  ClipboardCheck,
  Download,
  Gamepad2,
  History,
  Home,
  Landmark,
  LifeBuoy,
  MonitorPlay,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Trophy,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";

type NavKey = "home" | "tasks" | "shop" | "games" | "profile";
type TaskKey = "watch" | "surveys" | "downloads";

type NavItem = {
  key: NavKey;
  label: string;
  icon: LucideIcon;
};

type TaskTab = {
  key: TaskKey;
  label: string;
};

const navItems: NavItem[] = [
  { key: "home", label: "Home", icon: Home },
  { key: "tasks", label: "Tasks", icon: ClipboardCheck },
  { key: "shop", label: "Shop & Earn", icon: ShoppingBag },
  { key: "games", label: "Games", icon: Gamepad2 },
  { key: "profile", label: "Profile", icon: CircleUserRound },
];

const taskTabs: TaskTab[] = [
  { key: "watch", label: "Watch & Earn" },
  { key: "surveys", label: "Surveys" },
  { key: "downloads", label: "App Downloads" },
];

const watchedAds = 12;
const dailyAdLimit = 20;
const adReward = 0.8;

function currency(value: number) {
  return `₹${value.toFixed(2)}`;
}

export default function App() {
  const [activeNav, setActiveNav] = useState<NavKey>("home");
  const [activeTask, setActiveTask] = useState<TaskKey>("watch");

  const activeNavLabel = useMemo(
    () => navItems.find((item) => item.key === activeNav)?.label ?? "Home",
    [activeNav],
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col bg-white shadow-soft md:my-6 md:min-h-[92vh] md:rounded-[28px]">
      <header className="sticky top-0 z-20 border-b border-glonni-line bg-white/95 px-4 py-4 backdrop-blur md:rounded-t-[28px] md:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-glonni-green">
              Glonni Ads
            </p>
            <h1 className="text-xl font-bold text-glonni-ink md:text-2xl">
              {activeNavLabel}
            </h1>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-glonni-mint px-3 py-2 text-sm font-bold text-glonni-green">
            <Wallet className="h-4 w-4" />
            ₹0.00
          </div>
        </div>
      </header>

      <section className="flex-1 px-4 pb-28 pt-5 md:px-8">
        {activeNav === "home" && <HomeScreen goToTasks={() => setActiveNav("tasks")} />}
        {activeNav === "tasks" && (
          <TasksScreen activeTask={activeTask} setActiveTask={setActiveTask} />
        )}
        {activeNav === "shop" && <ShopEarnScreen />}
        {activeNav === "games" && <GamesScreen />}
        {activeNav === "profile" && <ProfileScreen />}
      </section>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-glonni-line bg-white/95 px-2 pb-3 pt-2 backdrop-blur md:left-1/2 md:max-w-5xl md:-translate-x-1/2 md:rounded-b-[28px]">
        <div className="grid grid-cols-5 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.key === activeNav;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveNav(item.key)}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-semibold transition ${
                  isActive
                    ? "bg-glonni-mint text-glonni-green"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="leading-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </main>
  );
}

function HomeScreen({ goToTasks }: { goToTasks: () => void }) {
  return (
    <div className="space-y-5">
      <section className="rounded-[24px] bg-glonni-ink p-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-semibold text-emerald-200">
              Today&apos;s earning plan
            </p>
            <h2 className="max-w-md text-2xl font-bold leading-tight">
              Complete small tasks, track every rupee, withdraw when ready.
            </h2>
          </div>
          <Sparkles className="h-7 w-7 text-glonni-gold" />
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3">
          <Metric label="Ads" value="20/day" />
          <Metric label="Reward" value="₹0.80" />
          <Metric label="Wallet" value="₹0.00" />
        </div>
      </section>

      <button
        type="button"
        onClick={goToTasks}
        className="flex w-full items-center justify-between rounded-2xl border border-glonni-line bg-white p-4 text-left shadow-sm"
      >
        <span>
          <span className="block text-sm font-semibold text-slate-500">
            Start with Watch & Earn
          </span>
          <span className="text-lg font-bold text-glonni-ink">
            {watchedAds}/{dailyAdLimit} ads watched today
          </span>
        </span>
        <ChevronRight className="h-5 w-5 text-slate-400" />
      </button>

      <div className="grid gap-3 md:grid-cols-3">
        <FeatureCard
          icon={MonitorPlay}
          title="Watch ads"
          body="Rewarded video flow prepared for provider integration later."
        />
        <FeatureCard
          icon={Store}
          title="Shop & Earn"
          body="Future-ready product comparison with estimated user cashback."
        />
        <FeatureCard
          icon={Trophy}
          title="Games"
          body="Play-to-earn section ready for offerwall or game partners."
        />
      </div>
    </div>
  );
}

function TasksScreen({
  activeTask,
  setActiveTask,
}: {
  activeTask: TaskKey;
  setActiveTask: (task: TaskKey) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto rounded-2xl bg-slate-100 p-1">
        {taskTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTask(tab.key)}
            className={`min-w-fit flex-1 rounded-xl px-4 py-3 text-sm font-bold transition ${
              activeTask === tab.key
                ? "bg-white text-glonni-green shadow-sm"
                : "text-slate-500"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTask === "watch" && <WatchEarnPanel />}
      {activeTask === "surveys" && <SurveysPanel />}
      {activeTask === "downloads" && <DownloadsPanel />}
    </div>
  );
}

function WatchEarnPanel() {
  const progress = (watchedAds / dailyAdLimit) * 100;

  return (
    <div className="space-y-4">
      <section className="rounded-[24px] border border-glonni-line bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">Rewarded video</p>
            <h2 className="text-2xl font-bold text-glonni-ink">
              Earn {currency(adReward)} per ad
            </h2>
          </div>
          <div className="rounded-full bg-glonni-mint p-3 text-glonni-green">
            <MonitorPlay className="h-6 w-6" />
          </div>
        </div>

        <div className="mt-5 rounded-3xl bg-slate-950 p-5 text-white">
          <div className="flex aspect-video items-center justify-center rounded-2xl border border-white/10 bg-white/5">
            <button
              type="button"
              className="rounded-full bg-glonni-green px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/30"
            >
              Watch Ad (+{currency(adReward)})
            </button>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-600">Daily progress</span>
            <span className="font-bold text-glonni-ink">
              {watchedAds}/{dailyAdLimit} ads
            </span>
          </div>
          <div className="h-3 rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-glonni-green"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs font-medium text-slate-500">
            Daily cap: 20 ads. Backend fraud checks and provider tracking will be added later.
          </p>
        </div>
      </section>

      <section className="rounded-[24px] bg-glonni-mint p-5">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-white p-3 text-glonni-green">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-glonni-green">AI Recommended Deal</p>
            <h3 className="mt-1 text-lg font-bold text-glonni-ink">
              Top mobile accessory deal
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Placeholder affiliate card for future Amazon, Flipkart, and Myntra feeds.
            </p>
            <button
              type="button"
              className="mt-4 rounded-full bg-white px-4 py-2 text-sm font-bold text-glonni-ink"
            >
              View Deal on Amazon
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function SurveysPanel() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <TaskCard
        icon={ClipboardCheck}
        title="Daily consumer survey"
        reward="Earn ₹12.00"
        detail="Answer 8 quick questions. Provider connection pending."
      />
      <TaskCard
        icon={CheckCircle2}
        title="Brand preference poll"
        reward="Earn ₹4.00"
        detail="Short survey placeholder for future survey partner API."
      />
    </div>
  );
}

function DownloadsPanel() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <TaskCard
        icon={Download}
        title="Install finance app"
        reward="Earn ₹45.00"
        detail="Download, register, and open once to claim reward."
      />
      <TaskCard
        icon={Download}
        title="Try shopping app"
        reward="Earn ₹18.00"
        detail="Install and complete first login. Offerwall integration pending."
      />
    </div>
  );
}

function ShopEarnScreen() {
  const stores = [
    { name: "Amazon", rate: "1% - 8%", earning: "Est. ₹24" },
    { name: "Flipkart", rate: "2% - 10%", earning: "Est. ₹36" },
    { name: "Myntra", rate: "4% - 12%", earning: "Est. ₹52" },
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-[24px] border border-glonni-line bg-white p-5 shadow-sm">
        <p className="text-sm font-bold text-glonni-green">Future affiliate engine</p>
        <h2 className="mt-1 text-2xl font-bold text-glonni-ink">
          Compare stores before the user shops
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          This section is structured for daily top products, multi-store comparison,
          commission rules, and estimated user earnings.
        </p>
      </section>

      <div className="space-y-3">
        {stores.map((store) => (
          <div
            key={store.name}
            className="flex items-center justify-between rounded-2xl border border-glonni-line bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-slate-100 p-3 text-glonni-green">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-glonni-ink">{store.name}</h3>
                <p className="text-sm text-slate-500">Commission range {store.rate}</p>
              </div>
            </div>
            <span className="rounded-full bg-glonni-mint px-3 py-1 text-sm font-bold text-glonni-green">
              {store.earning}
            </span>
          </div>
        ))}
      </div>

      <section className="rounded-[24px] bg-slate-50 p-5">
        <h3 className="font-bold text-glonni-ink">Best earning logic</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          When the same product appears in multiple stores, Glonni can rank by final
          price, commission rate, confirmed tracking, and estimated user reward.
        </p>
      </section>
    </div>
  );
}

function GamesScreen() {
  return (
    <div className="space-y-4">
      <section className="rounded-[24px] bg-glonni-ink p-5 text-white">
        <Gamepad2 className="h-8 w-8 text-glonni-gold" />
        <h2 className="mt-4 text-2xl font-bold">Games rewards hub</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Placeholder for play-to-earn games, partner offers, daily limits, and
          anti-fraud checks.
        </p>
      </section>
      <div className="grid gap-3 md:grid-cols-2">
        <TaskCard
          icon={Trophy}
          title="Spin challenge"
          reward="Coming soon"
          detail="Daily game reward card prepared for future provider setup."
        />
        <TaskCard
          icon={BadgeIndianRupee}
          title="Score-based rewards"
          reward="Coming soon"
          detail="Track eligible game sessions after backend integration."
        />
      </div>
    </div>
  );
}

function ProfileScreen() {
  const items = [
    { icon: Wallet, title: "Wallet", detail: "Balance, withdraw threshold, payout status" },
    { icon: History, title: "Earning History", detail: "Ads, tasks, shopping, games, withdrawals" },
    { icon: Landmark, title: "UPI/Bank Details", detail: "Add payout account after verification" },
    { icon: ShieldCheck, title: "KYC", detail: "Identity checks for secure withdrawals" },
    { icon: LifeBuoy, title: "Support", detail: "Help center, tickets, and account issues" },
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-[24px] bg-glonni-mint p-5">
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-white p-4 text-glonni-green">
            <CircleUserRound className="h-8 w-8" />
          </div>
          <div>
            <p className="text-sm font-semibold text-glonni-green">Glonni user</p>
            <h2 className="text-2xl font-bold text-glonni-ink">Profile & payouts</h2>
          </div>
        </div>
      </section>

      <div className="space-y-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.title}
              type="button"
              className="flex w-full items-center justify-between rounded-2xl border border-glonni-line bg-white p-4 text-left shadow-sm"
            >
              <span className="flex items-center gap-3">
                <span className="rounded-2xl bg-slate-100 p-3 text-glonni-green">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-bold text-glonni-ink">{item.title}</span>
                  <span className="block text-sm text-slate-500">{item.detail}</span>
                </span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3">
      <p className="text-xs font-semibold text-slate-300">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <section className="rounded-2xl border border-glonni-line bg-white p-4 shadow-sm">
      <Icon className="h-6 w-6 text-glonni-green" />
      <h3 className="mt-3 font-bold text-glonni-ink">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
    </section>
  );
}

function TaskCard({
  icon: Icon,
  title,
  reward,
  detail,
}: {
  icon: LucideIcon;
  title: string;
  reward: string;
  detail: string;
}) {
  return (
    <section className="rounded-2xl border border-glonni-line bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-2xl bg-glonni-mint p-3 text-glonni-green">
          <Icon className="h-5 w-5" />
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-glonni-ink">
          {reward}
        </span>
      </div>
      <h3 className="mt-4 font-bold text-glonni-ink">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p>
    </section>
  );
}
