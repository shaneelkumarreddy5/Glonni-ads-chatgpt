"use client";

import {
  ArrowLeft,
  BadgeCheck,
  Bell,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  CircleUserRound,
  ClipboardCheck,
  Copy,
  Camera,
  Coins,
  CreditCard,
  Download,
  FileText,
  Flame,
  Gamepad2,
  Gift,
  History,
  ExternalLink,
  Home,
  Landmark,
  LockKeyhole,
  Megaphone,
  MonitorPlay,
  Play,
  Search,
  ShieldCheck,
  Languages,
  LogOut,
  MessageSquare,
  Settings2,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Store,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  Upload,
  X,
  UserRoundPlus,
  Wallet,
  Zap,
  WifiOff,
  KeyRound,
  User,
  ArrowRight,
  RotateCcw,
  AlertTriangle,
  CalendarClock,
  Heart,
  SlidersHorizontal,
  PackageCheck,
  Moon,
  Sun,
  Gauge,
  Accessibility,
  Type,
  Contrast,
  MousePointer2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TouchEvent } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase/client";

type NavKey = "home" | "tasks" | "shop" | "games" | "profile";
type TaskKey = "watch" | "surveys" | "downloads";
type DetailKey =
  | "notifications"
  | "referral"
  | "bonus"
  | "wallet"
  | "history"
  | "earnings"
  | "personal"
  | "payout"
  | "kyc"
  | "preferences"
  | "accessibility"
  | "language"
  | "support"
  | "safety"
  | "legal"
  | "logout"
  | "stores"
  | null;
type AuthStage = "welcome" | "mobile" | "otp" | "onboarding" | "authenticated";
type OnboardingProfile = {
  name: string;
  birthDate: string;
  interests: string[];
};
type OnboardingResult = {
  display_name: string;
  interests: string[];
  onboarding_completed_at: string;
};

const navItems: { key: NavKey; label: string; icon: LucideIcon }[] = [
  { key: "home", label: "Home", icon: Home },
  { key: "tasks", label: "Tasks", icon: ClipboardCheck },
  { key: "shop", label: "Shop & Earn", icon: ShoppingBag },
  { key: "games", label: "Games", icon: Gamepad2 },
  { key: "profile", label: "Profile", icon: CircleUserRound },
];

const purple = "from-[#7357f2] via-[#6844e4] to-[#542bc9]";
const DEMO_AUTH_ENABLED =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_ENABLE_DEMO_AUTH === "true";
const DEMO_MOBILE = "9867654357";
const DEMO_OTP = "123456";
const DEMO_SESSION_KEY = "glonni-demo-session";

export default function App() {
  const [authStage, setAuthStage] = useState<AuthStage>("welcome");
  const [authReady, setAuthReady] = useState(false);
  const [userName, setUserName] = useState("Shaneel");
  const [, setUserMobile] = useState("");
  const [userInterests, setUserInterests] = useState<string[]>(["Watch ads"]);
  const [activeNav, setActiveNav] = useState<NavKey>("home");
  const [taskTab, setTaskTab] = useState<TaskKey>("watch");
  const [watched, setWatched] = useState(12);
  const [toast, setToast] = useState("");
  const [detail, setDetail] = useState<DetailKey>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [readNotifications, setReadNotifications] = useState<string[]>([
    "welcome",
    "ads",
  ]);
  const [isOnline, setIsOnline] = useState(true);
  const [isSlowNetwork, setIsSlowNetwork] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [textScale, setTextScale] = useState("100");
  const toastTimer = useRef<number | null>(null);
  const pullStart = useRef<number | null>(null);
  const navigationReady = useRef(false);
  const restoringHistory = useRef(false);
  const unreadNotifications = 7 - readNotifications.length;

  const hydrateAuthenticatedUser = useCallback(async (userId: string, phone?: string) => {
    const supabase = getSupabaseBrowserClient();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("display_name, interests, onboarding_completed_at, status")
      .eq("id", userId)
      .single();
    if (error || !profile) {
      setAuthStage("welcome");
      return;
    }
    if (profile.status !== "active") {
      await supabase.auth.signOut();
      setAuthStage("welcome");
      return;
    }
    setUserMobile(phone ?? "");
    if (!profile.onboarding_completed_at) {
      setAuthStage("onboarding");
      return;
    }
    setUserName(profile.display_name || "Glonni User");
    setUserInterests(profile.interests?.length ? profile.interests : ["Watch ads"]);
    setAuthStage("authenticated");
  }, []);

  useEffect(() => {
    let active = true;
    const supabase = getSupabaseBrowserClient();
    const demoSessionActive =
      DEMO_AUTH_ENABLED &&
      window.localStorage.getItem(DEMO_SESSION_KEY) === "active";
    if (!DEMO_AUTH_ENABLED) window.localStorage.removeItem(DEMO_SESSION_KEY);
    if (demoSessionActive) {
      setUserName("Shaneel");
      setUserMobile(DEMO_MOBILE);
      setUserInterests(["Watch ads"]);
      setAuthStage("authenticated");
      setAuthReady(true);
    }
    void supabase.auth.getUser().then(({ data }) => {
      if (demoSessionActive) return;
      if (data.user && active) void hydrateAuthenticatedUser(data.user.id, data.user.phone);
      else if (active) setAuthStage("welcome");
      if (active) setAuthReady(true);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (demoSessionActive) return;
      if (session?.user) {
        window.setTimeout(() => {
          void hydrateAuthenticatedUser(session.user.id, session.user.phone);
        }, 0);
      } else if (active) {
        setAuthStage("welcome");
      }
    });
    const savedTheme = window.localStorage.getItem("glonni-theme") || "light";
    document.documentElement.classList.toggle("dark", savedTheme === "dark");
    const savedTextScale = window.localStorage.getItem("glonni-text-scale") || "100";
    setTextScale(savedTextScale);
    document.documentElement.dataset.textScale = savedTextScale;
    document.documentElement.classList.toggle("high-contrast", window.localStorage.getItem("glonni-high-contrast") === "true");
    const updateConnection = () => setIsOnline(navigator.onLine);
    const connection = (navigator as Navigator & {
      connection?: EventTarget & { effectiveType?: string; saveData?: boolean };
    }).connection;
    const updateNetworkQuality = () => {
      const type = connection?.effectiveType;
      setIsSlowNetwork(Boolean(connection?.saveData || type === "slow-2g" || type === "2g"));
    };
    updateConnection();
    updateNetworkQuality();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    connection?.addEventListener("change", updateNetworkQuality);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // The online app remains fully usable if registration is unavailable.
      });
    }
    return () => {
      active = false;
      authListener.subscription.unsubscribe();
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
      connection?.removeEventListener("change", updateNetworkQuality);
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, [hydrateAuthenticatedUser]);

  useEffect(() => {
    if (!authReady || authStage !== "authenticated") return;
    type AppHistoryState = {
      glonni: true;
      activeNav: NavKey;
      taskTab: TaskKey;
      detail: DetailKey;
      searchOpen: boolean;
    };
    const state: AppHistoryState = { glonni: true, activeNav, taskTab, detail, searchOpen };
    if (!navigationReady.current) {
      window.history.replaceState(state, "");
      navigationReady.current = true;
    } else if (restoringHistory.current) {
      restoringHistory.current = false;
    } else {
      window.history.pushState(state, "");
    }
  }, [activeNav, authReady, authStage, detail, searchOpen, taskTab]);

  useEffect(() => {
    if (!authReady || authStage !== "authenticated") return;
    const restore = (event: PopStateEvent) => {
      const state = event.state as Partial<{
        glonni: boolean;
        activeNav: NavKey;
        taskTab: TaskKey;
        detail: DetailKey;
        searchOpen: boolean;
      }> | null;
      if (!state?.glonni) return;
      restoringHistory.current = true;
      if (state.activeNav) setActiveNav(state.activeNav);
      if (state.taskTab) setTaskTab(state.taskTab);
      setDetail(state.detail ?? null);
      setSearchOpen(Boolean(state.searchOpen));
      window.scrollTo({ top: 0, behavior: "auto" });
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [authReady, authStage]);

  useEffect(() => {
    if (!authReady || authStage !== "authenticated") return;
    const closeTopLayer = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (searchOpen) setSearchOpen(false);
      else if (detail) setDetail(null);
    };
    window.addEventListener("keydown", closeTopLayer);
    return () => window.removeEventListener("keydown", closeTopLayer);
  }, [authReady, authStage, detail, searchOpen]);

  const completeAuthentication = async ({ name, birthDate, interests }: OnboardingProfile) => {
    const cleanName = name.trim() || "Glonni User";
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.rpc("complete_my_onboarding", {
      p_display_name: cleanName,
      p_birth_date: birthDate,
      p_interests: interests,
      p_accept_terms: true,
      p_accept_privacy: true,
    });
    if (error) throw new Error("We could not securely finish onboarding. Please try again.");
    const completed = data as OnboardingResult | null;
    setUserName(completed?.display_name || cleanName);
    setUserInterests(completed?.interests?.length ? completed.interests : interests);
    setAuthStage("authenticated");
  };

  const logout = async () => {
    window.localStorage.removeItem(DEMO_SESSION_KEY);
    await getSupabaseBrowserClient().auth.signOut({ scope: "local" });
    setDetail(null);
    setActiveNav("home");
    setAuthStage("welcome");
  };

  const navigate = (key: NavKey, tab?: TaskKey) => {
    setDetail(null);
    setActiveNav(key);
    if (tab) setTaskTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const notify = (message: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(""), 2600);
  };

  const startPull = (event: TouchEvent<HTMLElement>) => {
    if (window.scrollY === 0 && !isRefreshing) {
      pullStart.current = event.touches[0]?.clientY ?? null;
    }
  };

  const movePull = (event: TouchEvent<HTMLElement>) => {
    if (pullStart.current === null || window.scrollY > 0) return;
    const distance = Math.max(
      0,
      Math.min(92, ((event.touches[0]?.clientY ?? pullStart.current) - pullStart.current) * 0.48),
    );
    setPullDistance(distance);
  };

  const endPull = () => {
    pullStart.current = null;
    if (pullDistance < 62) {
      setPullDistance(0);
      return;
    }
    setPullDistance(56);
    setIsRefreshing(true);
    window.setTimeout(() => {
      setIsRefreshing(false);
      setPullDistance(0);
      notify("You’re up to date");
    }, 850);
  };

  if (!authReady) return <AuthLoading />;
  if (authStage !== "authenticated")
    return (
      <AuthFlow
        stage={authStage}
        setStage={setAuthStage}
        onComplete={completeAuthentication}
        onVerified={hydrateAuthenticatedUser}
      />
    );

  return (
    <main
      id="main-content"
      className="app-surface mx-auto min-h-screen w-full max-w-[1180px] bg-[#fbfbfe] pb-28 md:my-5 md:min-h-[calc(100vh-2.5rem)] md:rounded-[32px] md:border md:border-white md:shadow-[0_28px_80px_rgba(50,35,95,.12)]"
    >
      <a
        href="#main-content"
        className="sr-only z-[100] rounded-lg bg-violet-700 px-4 py-2 font-bold text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to main content
      </a>
      <Header
        activeNav={activeNav}
        detail={detail}
        userName={userName}
        unreadNotifications={unreadNotifications}
        onBack={() => setDetail(null)}
        onSearch={() => setSearchOpen(true)}
        onNotifications={() => setDetail("notifications")}
      />
      {!isOnline && (
        <div
          role="status"
          className="network-banner mx-4 mb-4 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 py-3 text-amber-900 md:mx-8 lg:mx-10"
        >
          <WifiOff className="h-5 w-5 shrink-0" />
          <span className="text-xs leading-5">
            <b className="block text-sm">You’re offline</b>Saved screens remain
            available, but earning actions need an internet connection.
          </span>
        </div>
      )}
      {isOnline && isSlowNetwork && (
        <div
          role="status"
          className="network-banner mx-4 mb-4 flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 py-3 text-sky-900 md:mx-8 lg:mx-10"
        >
          <Gauge className="h-5 w-5 shrink-0" />
          <span className="text-xs leading-5">
            <b className="block text-sm">Slow connection detected</b>
            Glonni is reducing non-essential loading. Keep this screen open while an earning action verifies.
          </span>
        </div>
      )}
      <div
        aria-live="polite"
        className="pointer-events-none flex items-center justify-center overflow-hidden transition-[height] duration-200"
        style={{ height: pullDistance }}
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white px-3 py-2 text-[11px] font-extrabold text-violet-700 shadow-sm">
          <RotateCcw
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            style={{ transform: isRefreshing ? undefined : `rotate(${pullDistance * 3}deg)` }}
          />
          {isRefreshing
            ? "Refreshing…"
            : pullDistance >= 62
              ? "Release to refresh"
              : "Pull to refresh"}
        </span>
      </div>
      <section
        className="px-4 pb-4 md:px-8 lg:px-10"
        onTouchStart={startPull}
        onTouchMove={movePull}
        onTouchEnd={endPull}
        onTouchCancel={endPull}
      >
        {detail ? (
          <DetailScreen
            detail={detail}
            open={setDetail}
            notify={notify}
            onLogout={logout}
            readNotifications={readNotifications}
            setReadNotifications={setReadNotifications}
            textScale={textScale}
            setTextScale={setTextScale}
          />
        ) : (
          <>
            {activeNav === "home" && (
              <HomeScreen
                navigate={navigate}
                open={setDetail}
                watched={watched}
                interests={userInterests}
              />
            )}
            {activeNav === "tasks" && (
              <TasksScreen
                active={taskTab}
                setActive={setTaskTab}
                watched={watched}
                setWatched={setWatched}
                notify={notify}
              />
            )}
            {activeNav === "shop" && (
              <ShopScreen notify={notify} open={setDetail} />
            )}
            {activeNav === "games" && <GamesScreen notify={notify} />}
            {activeNav === "profile" && (
              <ProfileScreen open={setDetail} userName={userName} />
            )}
          </>
        )}
      </section>
      <BottomNav active={activeNav} navigate={navigate} />
      {searchOpen && (
        <GlobalSearch
          onClose={() => setSearchOpen(false)}
          navigate={navigate}
          open={setDetail}
        />
      )}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed inset-x-4 bottom-24 z-50 flex justify-center"
      >
        {toast && (
          <div
            role="status"
            className="animate-toast-in max-w-md rounded-full bg-[#1d1534] px-5 py-3 text-center text-sm font-bold text-white shadow-xl"
          >
            {toast}
          </div>
        )}
      </div>
    </main>
  );
}

function AuthLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f5fb]">
      <div role="status" className="text-center">
        <span className="mx-auto grid h-16 w-16 animate-pulse place-items-center rounded-[22px] bg-violet-600 text-2xl font-black text-white">
          G
        </span>
        <p className="mt-4 text-sm font-bold text-slate-500">
          Opening Glonni Ads…
        </p>
      </div>
    </main>
  );
}

function AuthFlow({
  stage,
  setStage,
  onComplete,
  onVerified,
}: {
  stage: AuthStage;
  setStage: (stage: AuthStage) => void;
  onComplete: (profile: OnboardingProfile) => Promise<void>;
  onVerified: (userId: string, phone?: string) => Promise<void>;
}) {
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [interests, setInterests] = useState(["Watch ads"]);
  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setTimeout(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);
  const title =
    stage === "welcome"
      ? "Earn from everyday moments."
      : stage === "mobile"
        ? "Welcome to Glonni."
        : stage === "otp"
          ? "Verify your number."
          : "Make Glonni yours.";
  const body =
    stage === "welcome"
      ? "Watch, discover, shop and play—with clear reward tracking."
      : stage === "mobile"
        ? "Enter your mobile number to sign in or create an account."
        : stage === "otp"
          ? `We sent a code to +91 ${mobile}.`
          : "Choose what you enjoy and confirm your account details.";
  const requestOtp = async () => {
    if (!/^[6-9]\d{9}$/.test(mobile))
      return setError("Enter a valid 10-digit Indian mobile number.");
    if (resendSeconds > 0)
      return setError(`Please wait ${resendSeconds} seconds before requesting another OTP.`);
    setError("");
    if (DEMO_AUTH_ENABLED && mobile === DEMO_MOBILE) {
      setResendSeconds(60);
      setStage("otp");
      return;
    }
    setPending(true);
    const { error: otpError } = await getSupabaseBrowserClient().auth.signInWithOtp({
      phone: `+91${mobile}`,
      options: { channel: "sms", shouldCreateUser: true },
    });
    setPending(false);
    if (otpError) {
      const providerUnavailable = /provider|unsupported|disabled/i.test(otpError.message);
      const rateLimited = otpError.status === 429 || /rate|too many/i.test(otpError.message);
      return setError(
        rateLimited
          ? "Too many OTP requests. Please wait before trying again."
          : providerUnavailable
          ? "Mobile OTP is awaiting SMS provider activation. No account was created."
          : "We could not send the OTP. Please wait and try again.",
      );
    }
    setResendSeconds(60);
    setStage("otp");
  };
  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otp)) return setError("Enter the 6-digit OTP.");
    setError("");
    if (DEMO_AUTH_ENABLED && mobile === DEMO_MOBILE) {
      if (otp !== DEMO_OTP) return setError("Use demo OTP 123456 to continue.");
      window.localStorage.setItem(DEMO_SESSION_KEY, "active");
      setStage("authenticated");
      return;
    }
    setPending(true);
    const { data: verified, error: verifyError } = await getSupabaseBrowserClient().auth.verifyOtp({
      phone: `+91${mobile}`,
      token: otp,
      type: "sms",
    });
    setPending(false);
    if (verifyError) {
      const rateLimited = verifyError.status === 429 || /rate|too many/i.test(verifyError.message);
      return setError(rateLimited
        ? "Too many verification attempts. Please wait and request a new OTP."
        : "That OTP is invalid or expired. Request a new code.");
    }
    if (!verified.user) return setError("Your secure session could not be created. Please try again.");
    await onVerified(verified.user.id, verified.user.phone);
  };
  const finish = async () => {
    if (name.trim().length < 2) return setError("Enter your name.");
    if (!birthDate) return setError("Enter your date of birth.");
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 18);
    if (new Date(`${birthDate}T00:00:00`) > cutoff)
      return setError("You must be at least 18 years old.");
    if (!terms) return setError("Accept the Terms and Privacy Policy to continue.");
    setPending(true);
    try {
      await onComplete({ name, birthDate, interests });
    } catch (finishError) {
      setError(finishError instanceof Error ? finishError.message : "Please try again.");
    } finally {
      setPending(false);
    }
  };
  const toggle = (interest: string) =>
    setInterests((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest],
    );
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,rgba(124,58,237,.18),transparent_32rem),#f7f5fb] p-4 sm:grid sm:place-items-center sm:p-8">
      <section className="mx-auto w-full max-w-md overflow-hidden rounded-[32px] border border-white/80 bg-white shadow-[0_30px_90px_rgba(63,40,115,.16)]">
        <div
          className={`relative overflow-hidden bg-gradient-to-br ${purple} p-7 text-white`}
        >
          <div className="absolute -right-10 -top-14 h-40 w-40 rounded-full bg-white/10" />
          <span className="relative grid h-14 w-14 place-items-center rounded-[20px] bg-white text-2xl font-black text-violet-700">
            G
          </span>
          <p className="relative mt-5 text-xs font-black tracking-[.18em] text-violet-200">
            GLONNI ADS
          </p>
          <h1 className="relative mt-2 text-3xl font-black leading-tight">
            {title}
          </h1>
          <p className="relative mt-2 text-sm leading-6 text-white/70">
            {body}
          </p>
        </div>
        <div className="space-y-5 p-6">
          {stage === "welcome" && (
            <>
              <div className="grid grid-cols-3 gap-2">
                {[
                  [MonitorPlay, "Watch"],
                  [ShoppingBag, "Shop"],
                  [Gamepad2, "Play"],
                ].map(([icon, label]) => {
                  const Icon = icon as LucideIcon;
                  return (
                    <div
                      key={label as string}
                      className="rounded-2xl bg-violet-50 p-3 text-center"
                    >
                      <Icon className="mx-auto h-5 w-5 text-violet-600" />
                      <b className="mt-2 block text-xs">{label as string}</b>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => setStage("mobile")}
                className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r ${purple} py-4 text-sm font-extrabold text-white`}
              >
                Get started <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setStage("mobile")}
                className="w-full text-sm font-extrabold text-violet-700"
              >
                I already have an account
              </button>
              <p className="text-center text-[11px] leading-5 text-slate-400">
                Secure sign-in is provided by Supabase. Never share your OTP.
              </p>
            </>
          )}
          {stage === "mobile" && (
            <>
              <AuthBack onClick={() => setStage("welcome")} />
              <label className="block">
                <span className="text-xs font-extrabold">Mobile number</span>
                <span className="mt-2 flex items-center rounded-2xl border border-[#e7e2ef] bg-[#faf9fc] px-4 focus-within:border-violet-500">
                  <span className="border-r pr-3 text-sm font-bold text-slate-600">
                    +91
                  </span>
                  <input
                    autoFocus
                    inputMode="numeric"
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => {
                      setMobile(e.target.value.replace(/\D/g, ""));
                      setError("");
                    }}
                    placeholder="98765 43210"
                    className="min-w-0 flex-1 bg-transparent px-3 py-4 font-bold outline-none"
                  />
                </span>
              </label>
              <p className="flex gap-2 rounded-2xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">
                <ShieldCheck className="h-5 w-5 shrink-0" />
                Your number is used for account access and reward security.
              </p>
              <AuthError message={error} />
              <PrimaryButton onClick={requestOtp} disabled={pending}>
                {pending ? "Sending securely…" : "Send OTP"}
              </PrimaryButton>
            </>
          )}
          {stage === "otp" && (
            <>
              <AuthBack onClick={() => setStage("mobile")} />
              <label className="block">
                <span className="text-xs font-extrabold">6-digit OTP</span>
                <span className="mt-2 flex items-center rounded-2xl border border-[#e7e2ef] bg-[#faf9fc] px-4 focus-within:border-violet-500">
                  <KeyRound className="h-5 w-5 text-violet-500" />
                  <input
                    autoFocus
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => {
                      setOtp(e.target.value.replace(/\D/g, ""));
                      setError("");
                    }}
                    placeholder="••••••"
                    className="min-w-0 flex-1 bg-transparent px-3 py-4 text-center text-xl font-black tracking-[.3em] outline-none"
                  />
                </span>
              </label>
              <div className="rounded-2xl bg-amber-50 p-3 text-center text-xs text-amber-800">
                {DEMO_AUTH_ENABLED && mobile === DEMO_MOBILE ? (
                  <>Demo OTP: <b className="tracking-widest">{DEMO_OTP}</b></>
                ) : (
                  <>OTPs expire and can be used only once. Glonni support will never ask for your code.</>
                )}
              </div>
              <AuthError message={error} />
              <PrimaryButton onClick={verifyOtp} disabled={pending}>
                {pending ? "Verifying…" : "Verify & continue"}
              </PrimaryButton>
              <button
                onClick={() => {
                  setOtp("");
                  void requestOtp();
                }}
                disabled={pending || resendSeconds > 0}
                className="flex w-full items-center justify-center gap-2 text-xs font-extrabold text-violet-700"
              >
                <RotateCcw className="h-4 w-4" />
                {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : "Resend code"}
              </button>
            </>
          )}
          {stage === "onboarding" && (
            <>
              <AuthBack onClick={() => setStage("otp")} />
              <label className="block">
                <span className="text-xs font-extrabold">Your name</span>
                <span className="mt-2 flex items-center rounded-2xl border border-[#e7e2ef] bg-[#faf9fc] px-4 focus-within:border-violet-500">
                  <User className="h-5 w-5 text-violet-500" />
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setError("");
                    }}
                    placeholder="Enter your full name"
                    className="min-w-0 flex-1 bg-transparent px-3 py-4 text-sm font-bold outline-none"
                  />
                </span>
              </label>
              <label className="block">
                <span className="text-xs font-extrabold">Date of birth</span>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(event) => {
                    setBirthDate(event.target.value);
                    setError("");
                  }}
                  className="mt-2 w-full rounded-2xl border border-[#e7e2ef] bg-[#faf9fc] px-4 py-4 text-sm font-bold outline-none focus:border-violet-500"
                />
                <span className="mt-2 block text-[11px] leading-5 text-slate-400">
                  Glonni Ads is currently available only to users aged 18 or older.
                </span>
              </label>
              <div>
                <p className="text-xs font-extrabold">What interests you?</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {["Watch ads", "Surveys", "Shopping", "Games"].map((item) => (
                    <button
                      key={item}
                      onClick={() => toggle(item)}
                      className={`rounded-full border px-3 py-2 text-xs font-bold ${interests.includes(item) ? "border-violet-500 bg-violet-50 text-violet-700" : "border-[#e7e2ef] text-slate-500"}`}
                    >
                      {interests.includes(item) ? "✓ " : ""}
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3 rounded-2xl bg-[#faf9fc] p-4">
                <Consent checked={terms} onChange={setTerms}>
                  I agree to the Terms of Use, Privacy Policy and Reward Rules.
                </Consent>
              </div>
              <AuthError message={error} />
              <PrimaryButton onClick={finish} disabled={pending}>
                {pending ? "Securing account…" : "Finish secure setup"}
              </PrimaryButton>
              <p className="text-center text-[11px] leading-5 text-slate-400">
                Your consent time and policy versions are recorded for account security.
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
function AuthBack({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 text-xs font-extrabold text-violet-700"
    >
      <ArrowLeft className="h-4 w-4" />
      Back
    </button>
  );
}
function AuthError({ message }: { message: string }) {
  return message ? (
    <p
      role="alert"
      className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600"
    >
      {message}
    </p>
  ) : null;
}
function Consent({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer gap-3 text-xs leading-5 text-slate-600">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-violet-600"
      />
      <span>{children}</span>
    </label>
  );
}

function Header({
  activeNav,
  detail,
  userName,
  unreadNotifications,
  onBack,
  onSearch,
  onNotifications,
}: {
  activeNav: NavKey;
  detail: DetailKey;
  userName: string;
  unreadNotifications: number;
  onBack: () => void;
  onSearch: () => void;
  onNotifications: () => void;
}) {
  const title = navItems.find((item) => item.key === activeNav)?.label;
  const detailTitles: Partial<Record<Exclude<DetailKey, null>, string>> = {
    notifications: "Notifications",
    referral: "Refer & Earn",
    bonus: "Daily Bonus",
    wallet: "Wallet",
    history: "Earning History",
    earnings: "Reward Status",
    personal: "Personal Information",
    payout: "UPI / Bank Details",
    kyc: "KYC Verification",
    preferences: "Preferences",
    language: "Language",
    support: "Help & Support",
    safety: "Trust & Safety",
    legal: "Legal & Policies",
    logout: "Log out",
    stores: "All Stores",
  };
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between bg-[#fbfbfe]/90 px-4 py-5 backdrop-blur-xl md:rounded-t-[32px] md:px-8 lg:px-10">
      <div>
        {detail ? (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-left"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full border border-[#ebe8f3] bg-white">
              <ArrowLeft className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-extrabold tracking-tight text-[#181426]">
              {detailTitles[detail]}
            </h1>
          </button>
        ) : activeNav === "home" ? (
          <>
            <p className="text-xs font-medium text-slate-500">Good morning,</p>
            <h1 className="text-xl font-extrabold tracking-tight text-[#181426]">
              {userName.split(" ")[0]} <span aria-hidden>👋</span>
            </h1>
          </>
        ) : (
          <h1 className="text-2xl font-extrabold tracking-tight text-[#181426]">
            {title}
          </h1>
        )}
      </div>
      <div className="flex items-center gap-2">
        {activeNav !== "home" && (
          <div className="flex items-center gap-1.5 rounded-full border border-[#ebe8f3] bg-white px-3 py-2 text-sm font-extrabold text-[#272034] shadow-sm">
            <Coins className="h-4 w-4 text-amber-400" fill="currentColor" /> 0
          </div>
        )}
        {!detail && (
          <button
            onClick={onSearch}
            aria-label="Search Glonni Ads"
            className="grid h-10 w-10 place-items-center rounded-full border border-[#ebe8f3] bg-white text-[#332c43] shadow-sm transition hover:border-violet-300 hover:text-violet-600"
          >
            <Search className="h-5 w-5" />
          </button>
        )}
        {!detail && (
          <button
            onClick={onNotifications}
            aria-label={`${unreadNotifications} unread notifications`}
            className="relative grid h-10 w-10 place-items-center rounded-full border border-[#ebe8f3] bg-white text-[#332c43] shadow-sm"
          >
            <Bell className="h-5 w-5" />
            {unreadNotifications > 0 && (
              <span className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                {unreadNotifications}
              </span>
            )}
          </button>
        )}
      </div>
    </header>
  );
}

function GlobalSearch({
  onClose,
  navigate,
  open,
}: {
  onClose: () => void;
  navigate: (key: NavKey, tab?: TaskKey) => void;
  open: (detail: DetailKey) => void;
}) {
  const [query, setQuery] = useState("");
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);
  const results = [
    {
      title: "Watch & Earn",
      group: "Tasks",
      keywords: "ads video reward",
      icon: MonitorPlay,
      action: () => navigate("tasks", "watch"),
    },
    {
      title: "Surveys",
      group: "Tasks",
      keywords: "opinion questions",
      icon: ClipboardCheck,
      action: () => navigate("tasks", "surveys"),
    },
    {
      title: "Download Apps",
      group: "Tasks",
      keywords: "install offers",
      icon: Download,
      action: () => navigate("tasks", "downloads"),
    },
    {
      title: "Shop & Earn",
      group: "Shopping",
      keywords: "products compare amazon flipkart myntra ajio",
      icon: ShoppingBag,
      action: () => navigate("shop"),
    },
    {
      title: "Partner Stores",
      group: "Shopping",
      keywords: "amazon flipkart myntra ajio croma",
      icon: Store,
      action: () => open("stores"),
    },
    {
      title: "Games & Missions",
      group: "Games",
      keywords: "play challenge rewards",
      icon: Gamepad2,
      action: () => navigate("games"),
    },
    {
      title: "Wallet",
      group: "Account",
      keywords: "balance withdraw money",
      icon: Wallet,
      action: () => open("wallet"),
    },
    {
      title: "Earning History",
      group: "Account",
      keywords: "transactions rewards activity",
      icon: History,
      action: () => open("history"),
    },
    {
      title: "Reward Status",
      group: "Account",
      keywords: "pending approved rejected credited appeal eligibility",
      icon: BadgeCheck,
      action: () => open("earnings"),
    },
    {
      title: "UPI / Bank Details",
      group: "Account",
      keywords: "payout account withdrawal",
      icon: Landmark,
      action: () => open("payout"),
    },
    {
      title: "KYC Verification",
      group: "Account",
      keywords: "pan identity verify",
      icon: ShieldCheck,
      action: () => open("kyc"),
    },
    {
      title: "Personal Information",
      group: "Account",
      keywords: "name email mobile profile edit",
      icon: CircleUserRound,
      action: () => open("personal"),
    },
    {
      title: "Notification Preferences",
      group: "Account",
      keywords: "alerts settings offers",
      icon: Settings2,
      action: () => open("preferences"),
    },
    {
      title: "Language",
      group: "Account",
      keywords: "english telugu hindi",
      icon: Languages,
      action: () => open("language"),
    },
    {
      title: "Help & Support",
      group: "Support",
      keywords: "faq ticket issue",
      icon: CircleHelp,
      action: () => open("support"),
    },
    {
      title: "Trust & Safety",
      group: "Support",
      keywords: "how glonni works reward rules fraud warning appeal safety delete account",
      icon: ShieldCheck,
      action: () => open("safety"),
    },
    {
      title: "Terms & Privacy",
      group: "Support",
      keywords: "legal policy terms privacy",
      icon: FileText,
      action: () => open("legal"),
    },
    {
      title: "Refer & Earn",
      group: "Rewards",
      keywords: "invite friends referral",
      icon: UserRoundPlus,
      action: () => open("referral"),
    },
    {
      title: "Daily Bonus",
      group: "Rewards",
      keywords: "check in streak gift",
      icon: Gift,
      action: () => open("bonus"),
    },
  ];
  const normalized = query.trim().toLowerCase();
  const visible = results.filter((item) =>
    `${item.title} ${item.group} ${item.keywords}`
      .toLowerCase()
      .includes(normalized),
  );
  const select = (action: () => void) => {
    action();
    onClose();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <div
      className="fixed inset-0 z-[60] bg-[#171022]/45 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Search Glonni Ads"
        onMouseDown={(event) => event.stopPropagation()}
        className="mx-auto mt-12 max-h-[80vh] w-full max-w-xl overflow-hidden rounded-[26px] border border-white/70 bg-[#fbfbfe] shadow-2xl sm:mt-20"
      >
        <div className="flex items-center gap-3 border-b border-[#ebe8f2] p-4">
          <Search className="h-5 w-5 shrink-0 text-violet-600" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tasks, products, games, wallet…"
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[#241d34] outline-none placeholder:text-slate-400"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-500"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs font-extrabold text-violet-600"
          >
            Close
          </button>
        </div>
        <div className="max-h-[calc(80vh-72px)] overflow-y-auto p-3">
          {!query && (
            <p className="px-2 pb-3 text-xs font-bold text-slate-400">
              POPULAR SEARCHES
            </p>
          )}
          <div className="space-y-1">
            {visible.map(({ title, group, icon: Icon, action }) => (
              <button
                key={title}
                onClick={() => select(action)}
                className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition hover:bg-violet-50"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-600">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-sm text-[#282133]">{title}</b>
                  <span className="text-xs text-slate-500">{group}</span>
                </span>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </button>
            ))}
          </div>
          {visible.length === 0 && (
            <EmptyState
              icon={Search}
              title="No results found"
              body="Try a simpler word such as games, wallet, surveys or shopping."
            />
          )}
        </div>
      </section>
    </div>
  );
}

function HomeScreen({
  navigate,
  open,
  watched,
  interests,
}: {
  navigate: (key: NavKey, tab?: TaskKey) => void;
  open: (detail: DetailKey) => void;
  watched: number;
  interests: string[];
}) {
  const shortcuts = [
    {
      label: "Tasks",
      icon: ClipboardCheck,
      color: "bg-violet-100 text-violet-600",
      action: () => navigate("tasks"),
    },
    {
      label: "Shop & Earn",
      icon: ShoppingBag,
      color: "bg-pink-100 text-pink-600",
      action: () => navigate("shop"),
    },
    {
      label: "Games",
      icon: Gamepad2,
      color: "bg-indigo-100 text-indigo-600",
      action: () => navigate("games"),
    },
    {
      label: "Refer & Earn",
      icon: UserRoundPlus,
      color: "bg-sky-100 text-sky-600",
      action: () => open("referral"),
    },
    {
      label: "Surveys",
      icon: ClipboardCheck,
      color: "bg-emerald-100 text-emerald-600",
      action: () => navigate("tasks", "surveys"),
    },
    {
      label: "Daily Bonus",
      icon: Gift,
      color: "bg-orange-100 text-orange-600",
      action: () => open("bonus"),
    },
  ];
  const opportunities = [
    {
      title: "Watch a short ad",
      meta: "30 sec · Instant reward",
      reward: "₹0.80",
      icon: MonitorPlay,
      color: "bg-violet-100 text-violet-600",
      action: () => navigate("tasks", "watch"),
    },
    {
      title: "Shopping habits",
      meta: "Survey · Around 8 min",
      reward: "₹12",
      icon: ClipboardCheck,
      color: "bg-emerald-100 text-emerald-600",
      action: () => navigate("tasks", "surveys"),
    },
    {
      title: "Pocket Budget",
      meta: "Install and register",
      reward: "₹45",
      icon: Download,
      color: "bg-blue-100 text-blue-600",
      action: () => navigate("tasks", "downloads"),
    },
  ];
  const preferredLabel = interests.length
    ? interests.slice(0, 2).join(" · ")
    : "Explore all rewards";
  return (
    <div className="space-y-6">
      <section
        className={`relative overflow-hidden rounded-[28px] bg-gradient-to-br ${purple} p-5 text-white shadow-[0_18px_40px_rgba(90,55,205,.22)] md:p-7`}
      >
        <div className="absolute -right-10 -top-16 h-44 w-44 rounded-full bg-white/10" />
        <div className="absolute -bottom-16 right-24 h-36 w-36 rounded-full bg-fuchsia-300/10" />
        <div className="relative flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white/75">
              Available balance
            </p>
            <p className="mt-1 text-4xl font-black tracking-tight">₹0.00</p>
            <button
              onClick={() => open("wallet")}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-2 text-xs font-extrabold transition hover:bg-white/25"
            >
              View wallet <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid h-24 w-24 place-items-center rounded-[28px] bg-white/12 shadow-inner">
            <Wallet className="h-14 w-14 text-amber-300" strokeWidth={1.6} />
          </div>
        </div>
      </section>
      <div className="grid grid-cols-2 gap-3">
        <MiniStat
          label="Today’s earning"
          value="₹0.00"
          hint="Start your first task"
          icon={Zap}
        />
        <MiniStat
          label="This month"
          value="₹0.00"
          hint="Your progress"
          icon={TrendingUp}
        />
      </div>
      <section>
        <SectionTitle
          title="Continue where you left off"
          side="2 in progress"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => navigate("tasks", "watch")}
            className="rounded-2xl border border-violet-100 bg-white p-4 text-left shadow-[0_8px_25px_rgba(30,20,60,.04)]"
          >
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-600">
                <MonitorPlay className="h-5 w-5" />
              </span>
              <span className="flex-1">
                <span className="flex items-center justify-between gap-2">
                  <b className="text-sm text-[#282133]">Daily ad goal</b>
                  <span className="text-xs font-black text-violet-600">
                    {watched}/20
                  </span>
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  Continue with ad {Math.min(watched + 1, 20)}
                </span>
                <span className="mt-3 block h-2 overflow-hidden rounded-full bg-violet-100">
                  <span
                    className={`block h-full rounded-full bg-gradient-to-r ${purple}`}
                    style={{ width: `${Math.min(100, (watched / 20) * 100)}%` }}
                  />
                </span>
              </span>
            </div>
          </button>
          <button
            onClick={() => navigate("tasks", "downloads")}
            className="rounded-2xl border border-blue-100 bg-white p-4 text-left shadow-[0_8px_25px_rgba(30,20,60,.04)]"
          >
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-600">
                <Download className="h-5 w-5" />
              </span>
              <span className="flex-1">
                <span className="flex items-center justify-between gap-2">
                  <b className="text-sm text-[#282133]">Pocket Budget</b>
                  <span className="rounded-full bg-amber-50 px-2 py-1 text-[9px] font-black text-amber-700">
                    1/3 STEPS
                  </span>
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  Complete registration · Earn ₹45
                </span>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-blue-600">
                  Resume offer <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </span>
            </div>
          </button>
        </div>
        <p className="mt-2 text-[10px] leading-4 text-slate-400">
          Progress shown here is sample dashboard data until provider tracking
          and Supabase are connected.
        </p>
      </section>
      <section className="rounded-[24px] border border-violet-100 bg-white p-5 shadow-[0_10px_30px_rgba(45,28,85,.05)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-[10px] font-black tracking-[.16em] text-violet-500">
              TODAY’S GOAL
            </span>
            <h2 className="mt-1 text-lg font-black text-[#241d34]">
              {watched} of 20 ads watched
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {20 - watched} ads left · Up to ₹
              {((20 - watched) * 0.8).toFixed(2)} still available
            </p>
          </div>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-500">
            <Target className="h-6 w-6" />
          </span>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-violet-100">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${purple}`}
            style={{ width: `${Math.min(100, (watched / 20) * 100)}%` }}
          />
        </div>
        <button
          onClick={() => navigate("tasks", "watch")}
          className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${purple} py-3 text-sm font-extrabold text-white shadow-md`}
        >
          <Play className="h-4 w-4" fill="currentColor" /> Continue watching
        </button>
      </section>
      <section>
        <SectionTitle title="Quick access" />
        <div className="grid grid-cols-3 gap-3">
          {shortcuts.map(({ label, icon: Icon, color, action }) => (
            <button
              key={label}
              onClick={action}
              className="flex min-h-28 flex-col items-center justify-center gap-3 rounded-2xl border border-[#eeebf4] bg-white p-3 text-center shadow-[0_8px_25px_rgba(30,20,60,.04)] transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span
                className={`grid h-11 w-11 place-items-center rounded-2xl ${color}`}
              >
                <Icon className="h-6 w-6" />
              </span>
              <span className="text-xs font-bold text-[#292336]">{label}</span>
            </button>
          ))}
        </div>
      </section>
      <section>
        <SectionTitle
          title="Recommended for you"
          side="View tasks"
          onSide={() => navigate("tasks")}
        />
        <p className="-mt-2 mb-3 text-[11px] text-slate-400">
          Based on your interests: {preferredLabel}
        </p>
        <div className="overflow-hidden rounded-2xl border border-[#ece9f2] bg-white">
          {opportunities.map(
            ({ title, meta, reward, icon: Icon, color, action }) => (
              <button
                key={title}
                onClick={action}
                className="flex w-full items-center gap-3 border-b border-[#f0edf5] p-4 text-left last:border-0 hover:bg-violet-50/40"
              >
                <span
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${color}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-sm text-[#282133]">{title}</b>
                  <span className="text-xs text-slate-500">{meta}</span>
                </span>
                <span className="text-sm font-black text-violet-600">
                  +{reward}
                </span>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </button>
            ),
          )}
        </div>
      </section>
      <section>
        <SectionTitle title="Discover more" />
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => navigate("shop")}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#fff1da] to-[#ffe1eb] p-5 text-left"
          >
            <span className="text-[10px] font-black tracking-[.16em] text-orange-600">
              SHOP & EARN
            </span>
            <b className="mt-2 block max-w-[13rem] text-lg leading-tight text-[#332234]">
              Compare prices and earn on every eligible order
            </b>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-extrabold text-violet-700">
              Explore deals <ChevronRight className="h-4 w-4" />
            </span>
            <ShoppingBag className="absolute -bottom-3 -right-2 h-24 w-24 rotate-[-10deg] text-orange-300/60" />
          </button>
          <button
            onClick={() => navigate("games")}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#eae3ff] to-[#dff4ff] p-5 text-left"
          >
            <span className="text-[10px] font-black tracking-[.16em] text-violet-600">
              FEATURED GAME
            </span>
            <b className="mt-2 block max-w-[13rem] text-lg leading-tight text-[#29213a]">
              Complete the weekly challenge and unlock rewards
            </b>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-extrabold text-violet-700">
              View challenge <ChevronRight className="h-4 w-4" />
            </span>
            <Gamepad2 className="absolute -bottom-3 -right-2 h-24 w-24 rotate-[-8deg] text-violet-300/60" />
          </button>
        </div>
      </section>
      <section>
        <SectionTitle title="Announcements" />
        <button
          onClick={() => open("notifications")}
          className="flex w-full items-center gap-3 rounded-2xl border border-violet-100 bg-violet-50/60 p-4 text-left"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-600 text-white">
            <Megaphone className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <b className="block text-sm text-[#282133]">
              Welcome to the new Glonni Ads
            </b>
            <span className="mt-0.5 block text-xs leading-5 text-slate-500">
              Explore tasks, compare store rewards and complete game missions.
            </span>
          </span>
          <ChevronRight className="h-5 w-5 text-violet-400" />
        </button>
      </section>
      <section className="rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50 to-rose-50 p-4">
        <div className="flex items-center gap-2 text-sm font-extrabold text-orange-700">
          <Flame className="h-5 w-5" fill="currentColor" /> Start your 7-day
          streak
        </div>
        <p className="mt-1 text-xs text-slate-600">
          Complete one task today and keep coming back.
        </p>
        <div className="mt-4 grid grid-cols-7 gap-2">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, index) => (
            <div key={`${d}${index}`} className="text-center">
              <span
                className={`mx-auto grid h-8 w-8 place-items-center rounded-full ${index === 0 ? "bg-orange-500 text-white" : "bg-white text-orange-400"}`}
              >
                <Flame className="h-4 w-4" />
              </span>
              <span className="mt-1 block text-[10px] font-bold text-slate-500">
                {d}
              </span>
            </div>
          ))}
        </div>
      </section>
      <button
        onClick={() => open("referral")}
        className={`flex w-full items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-r ${purple} p-5 text-left text-white`}
      >
        <span>
          <span className="block text-lg font-extrabold">
            Invite friends & earn
          </span>
          <span className="mt-1 block text-xs text-white/75">
            Get rewards when your friends start earning
          </span>
        </span>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-violet-600">
          <ChevronRight className="h-5 w-5" />
        </span>
      </button>
    </div>
  );
}

function TasksScreen({
  active,
  setActive,
  watched,
  setWatched,
  notify,
}: {
  active: TaskKey;
  setActive: (v: TaskKey) => void;
  watched: number;
  setWatched: (v: number) => void;
  notify: (m: string) => void;
}) {
  const tabs: { key: TaskKey; label: string }[] = [
    { key: "watch", label: "Watch & Earn" },
    { key: "surveys", label: "Surveys" },
    { key: "downloads", label: "Download Apps" },
  ];
  return (
    <div className="space-y-5">
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`whitespace-nowrap rounded-full px-4 py-2.5 text-xs font-extrabold transition ${active === t.key ? `bg-gradient-to-r ${purple} text-white shadow-md` : "border border-[#ebe8f2] bg-white text-slate-600"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {active === "watch" && (
        <WatchPanel watched={watched} setWatched={setWatched} notify={notify} />
      )}
      {active === "surveys" && <SurveyPanel notify={notify} />}
      {active === "downloads" && <DownloadPanel notify={notify} />}
    </div>
  );
}

function WatchPanel({
  watched,
  setWatched,
  notify,
}: {
  watched: number;
  setWatched: (v: number) => void;
  notify: (m: string) => void;
}) {
  const [playerOpen, setPlayerOpen] = useState(false);
  const [seconds, setSeconds] = useState(30);
  const [completed, setCompleted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [adsAvailable, setAdsAvailable] = useState(true);
  const [resetSeconds, setResetSeconds] = useState(7 * 60 * 60 + 24 * 60 + 18);
  const limitReached = watched >= 20;

  useEffect(() => {
    const timer = window.setInterval(
      () => setResetSeconds((value) => (value > 0 ? value - 1 : 24 * 60 * 60)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!playerOpen || !playing || completed) return;
    const timer = window.setInterval(
      () =>
        setSeconds((value) => {
          if (value <= 1) {
            setPlaying(false);
            setCompleted(true);
            return 0;
          }
          return value - 1;
        }),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [playerOpen, playing, completed]);
  useEffect(() => {
    if (!playerOpen || completed) return;
    const protect = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [playerOpen, completed]);

  const resetLabel = `${String(Math.floor(resetSeconds / 3600)).padStart(2, "0")}:${String(Math.floor((resetSeconds % 3600) / 60)).padStart(2, "0")}:${String(resetSeconds % 60).padStart(2, "0")}`;
  const startAd = () => {
    if (limitReached)
      return notify(`Daily limit reached · Resets in ${resetLabel}`);
    if (!adsAvailable)
      return notify("No ads available right now · Try again shortly");
    setSeconds(30);
    setCompleted(false);
    setRewardClaimed(false);
    setConfirmExit(false);
    setPlaying(true);
    setPlayerOpen(true);
  };
  const requestExit = () => {
    if (completed) {
      setPlayerOpen(false);
      return;
    }
    setPlaying(false);
    setConfirmExit(true);
  };
  const claim = () => {
    setWatched(Math.min(20, watched + 1));
    setRewardClaimed(true);
    notify("₹0.80 recorded · Pending verification");
  };
  if (playerOpen)
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <button
          onClick={requestExit}
          className="inline-flex items-center gap-2 text-sm font-bold text-violet-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Exit ad
        </button>
        {rewardClaimed ? (
          <section className="rounded-[28px] border border-emerald-100 bg-white p-8 text-center shadow-sm">
            <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-10 w-10" />
            </span>
            <span className="mt-5 inline-block rounded-full bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700">
              Pending verification
            </span>
            <h2 className="mt-3 text-2xl font-black text-[#241d34]">
              Reward recorded
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
              ₹0.80 has been added to pending earnings. Partner verification
              usually completes within a few hours.
            </p>
            <div className="mt-5 rounded-2xl bg-[#faf9fc] p-4 text-left">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Reference</span>
                <b>AD-DEMO-{String(watched).padStart(3, "0")}</b>
              </div>
              <div className="mt-3 flex justify-between text-xs">
                <span className="text-slate-500">Expected update</span>
                <b>By 6:00 PM today</b>
              </div>
            </div>
            <PrimaryButton onClick={() => setPlayerOpen(false)}>
              Back to available ads
            </PrimaryButton>
          </section>
        ) : (
          <>
            <section className="overflow-hidden rounded-[28px] bg-[#171221] text-white shadow-xl">
              <div className="relative grid aspect-video place-items-center bg-gradient-to-br from-[#322250] to-[#15101e]">
                <div className="absolute left-4 top-4 rounded-full bg-black/35 px-3 py-1 text-[10px] font-black tracking-wider">
                  SPONSORED · DEMO
                </div>
                {completed ? (
                  <span className="grid h-20 w-20 place-items-center rounded-full bg-emerald-500">
                    <CheckCircle2 className="h-10 w-10" />
                  </span>
                ) : (
                  <button
                    onClick={() => setPlaying((value) => !value)}
                    aria-label={playing ? "Pause demo ad" : "Play demo ad"}
                    className="grid h-20 w-20 place-items-center rounded-full bg-white/15 backdrop-blur"
                  >
                    <Play
                      className="h-9 w-9 translate-x-0.5"
                      fill="currentColor"
                    />
                  </button>
                )}
                <span className="absolute bottom-4 left-4 rounded-full bg-black/40 px-3 py-1 text-[10px] font-bold">
                  {completed
                    ? "WATCHED IN FULL"
                    : playing
                      ? "PLAYING"
                      : "PAUSED"}
                </span>
                <span className="absolute bottom-4 right-4 rounded-full bg-black/40 px-3 py-1 text-xs font-black">
                  {completed
                    ? "Complete"
                    : `0:${String(seconds).padStart(2, "0")}`}
                </span>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <b className="text-lg">Sponsored video</b>
                    <p className="mt-1 text-xs leading-5 text-white/60">
                      Keep this screen open. Leaving before completion cancels
                      this ad session.
                    </p>
                  </div>
                  <span className="rounded-full bg-violet-500/20 px-3 py-1.5 text-xs font-black text-violet-200">
                    ₹0.80
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-violet-400 transition-all"
                    style={{ width: `${((30 - seconds) / 30) * 100}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-[10px] font-bold text-white/45">
                  <span>
                    {completed ? "Ready to claim" : "Do not close this screen"}
                  </span>
                  <span>{Math.round(((30 - seconds) / 30) * 100)}%</span>
                </div>
              </div>
            </section>
            {completed ? (
              <PrimaryButton onClick={claim}>Claim ₹0.80 reward</PrimaryButton>
            ) : (
              <button
                onClick={() => setPlaying((value) => !value)}
                className="w-full rounded-xl border border-violet-200 bg-white py-3.5 text-sm font-extrabold text-violet-600"
              >
                {playing ? "Pause demo ad" : "Resume demo ad"}
              </button>
            )}
            <InfoCard
              title="Reward rules"
              lines={[
                "Watch the full video without leaving this screen",
                "Closing early cancels the current ad without reward",
                "Rewards remain pending until provider verification",
              ]}
            />
          </>
        )}
        {confirmExit && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="exit-ad-title"
            className="fixed inset-0 z-50 grid place-items-end bg-[#171221]/60 p-4 backdrop-blur-sm sm:place-items-center"
          >
            <section className="w-full max-w-sm rounded-[28px] bg-white p-6 shadow-2xl">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-amber-700">
                <AlertTriangle className="h-6 w-6" />
              </span>
              <h2 id="exit-ad-title" className="mt-4 text-xl font-black">
                Leave this ad?
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Your current progress will be lost and no ₹0.80 reward will be
                issued.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setConfirmExit(false);
                    setPlayerOpen(false);
                  }}
                  className="rounded-xl border border-rose-200 py-3 text-sm font-extrabold text-rose-600"
                >
                  Leave ad
                </button>
                <button
                  autoFocus
                  onClick={() => {
                    setConfirmExit(false);
                    setPlaying(true);
                  }}
                  className="rounded-xl bg-violet-600 py-3 text-sm font-extrabold text-white"
                >
                  Keep watching
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    );
  if (limitReached)
    return (
      <div className="space-y-5">
        <Hero
          icon={Trophy}
          eyebrow="DAILY GOAL COMPLETE"
          title="You watched all 20 ads"
          body="Today’s Watch & Earn limit is complete. New ads unlock automatically after the daily reset."
          action="View reward status"
          onClick={() => notify("Open Reward Status from Home or Profile")}
          mint
        />
        <div className="grid grid-cols-3 gap-3">
          <Metric label="Watched" value="20/20" />
          <Metric label="Earned" value="₹16.00" />
          <Metric label="Resets in" value={resetLabel.slice(0, 5)} />
        </div>
        <ProgressCard current={20} total={20} />
        <InfoCard
          title="What happens next"
          lines={[
            "Pending rewards are checked by the ad provider",
            "Your daily limit resets automatically at midnight",
            "Come back after the reset for a fresh set of ads",
          ]}
        />
      </div>
    );
  return (
    <>
      <Hero
        icon={MonitorPlay}
        eyebrow="WATCH & EARN"
        title="Turn spare moments into rewards"
        body="Watch short sponsored videos and earn ₹0.80 for every completed ad."
        action="Watch now"
        onClick={startAd}
      />
      <div className="grid grid-cols-3 gap-3">
        <Metric label="Per ad" value="₹0.80" />
        <Metric label="Watched" value={`${watched}/20`} />
        <Metric label="Resets in" value={resetLabel.slice(0, 5)} />
      </div>
      <section
        className={`flex items-center gap-3 rounded-2xl border p-4 ${adsAvailable ? "border-emerald-100 bg-emerald-50" : "border-amber-100 bg-amber-50"}`}
      >
        <span
          className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-xl ${adsAvailable ? "bg-emerald-500 text-white" : "bg-amber-100 text-amber-700"}`}
        >
          {adsAvailable ? (
            <MonitorPlay className="h-5 w-5" />
          ) : (
            <CalendarClock className="h-5 w-5" />
          )}
          {adsAvailable && (
            <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-300" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <b
            className={`block text-sm ${adsAvailable ? "text-emerald-900" : "text-amber-900"}`}
          >
            {adsAvailable
              ? "Ads are available now"
              : "No ads available right now"}
          </b>
          <span
            className={`mt-0.5 block text-xs ${adsAvailable ? "text-emerald-700" : "text-amber-700"}`}
          >
            {adsAvailable
              ? `${20 - watched} rewards remain in today’s limit`
              : "Availability changes throughout the day. Check again soon."}
          </span>
        </span>
        <button
          onClick={() => setAdsAvailable((value) => !value)}
          className="rounded-full bg-white px-3 py-2 text-[10px] font-black text-violet-700 shadow-sm"
        >
          {adsAvailable ? "PREVIEW EMPTY" : "CHECK AGAIN"}
        </button>
      </section>
      <section>
        <SectionTitle
          title={adsAvailable ? "Available ads" : "Ad availability"}
          side={
            adsAvailable ? `${20 - watched} remaining` : "Updates automatically"
          }
        />
        {adsAvailable ? (
          <div className="overflow-hidden rounded-2xl border border-[#ece9f2] bg-white">
            {[
              "Featured sponsor",
              "Recommended for you",
              "Quick reward",
              "New campaign",
            ].map((title, n) => (
              <button
                onClick={startAd}
                key={title}
                className="flex w-full items-center gap-3 border-b border-[#f0edf5] p-3.5 text-left last:border-0 hover:bg-violet-50/40"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-violet-100 text-violet-600">
                  <Play className="h-5 w-5" fill="currentColor" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-extrabold text-[#282133]">
                    {title}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                    <Timer className="h-3.5 w-3.5" /> {30 + n * 5} seconds · Ad{" "}
                    {watched + n + 1}
                  </span>
                </span>
                <span className="text-sm font-black text-violet-600">
                  +₹0.80
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-amber-200 bg-white p-7 text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-amber-50 text-amber-600">
              <CalendarClock className="h-8 w-8" />
            </span>
            <h3 className="mt-4 text-lg font-black">More ads are on the way</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
              Advertisers release campaigns at different times. Your daily limit
              and progress are safe.
            </p>
            <button
              onClick={() => {
                setAdsAvailable(true);
                notify("Fresh ad availability checked");
              }}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-extrabold text-white"
            >
              <RotateCcw className="h-4 w-4" />
              Check again
            </button>
          </div>
        )}
      </section>
      <ProgressCard current={watched} total={20} />
      <InfoCard
        title="How it works"
        lines={[
          "Check the live availability indicator before starting",
          "Keep the ad open until its countdown finishes",
          "Claim the reward and track provider verification",
        ]}
      />
    </>
  );
}

function SurveyPanel({ notify }: { notify: (m: string) => void }) {
  const surveys = [
    {
      title: "Shopping habits",
      time: "8 min",
      reward: "₹12",
      questions: 12,
      match: "Best match",
      status: "available",
    },
    {
      title: "Lifestyle & daily routine",
      time: "6 min",
      reward: "₹8",
      questions: 9,
      match: "92% match",
      status: "available",
    },
    {
      title: "Food & beverages",
      time: "10 min",
      reward: "₹15",
      questions: 16,
      match: "88% match",
      status: "full",
    },
    {
      title: "Travel preferences",
      time: "12 min",
      reward: "₹18",
      questions: 20,
      match: "New",
      status: "expired",
    },
  ];
  const [selected, setSelected] = useState<(typeof surveys)[number] | null>(
    null,
  );
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState("");
  const [tracking, setTracking] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [report, setReport] = useState("");
  const questions = [
    "How often do you shop online?",
    "Which category do you buy most?",
    "What matters most when choosing a product?",
  ];
  const options = [
    ["Every week", "Every month", "Occasionally"],
    ["Electronics", "Fashion", "Home & grocery"],
    ["Price", "Quality", "Reviews"],
  ];
  if (selected) {
    const finished = step >= questions.length;
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <button
          onClick={() => {
            setSelected(null);
            setStep(0);
            setAnswer("");
            setTracking(false);
          }}
          className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to surveys
        </button>
        <section className="rounded-[26px] bg-gradient-to-br from-[#36c6a0] to-[#168d77] p-6 text-white">
          <span className="text-[10px] font-black tracking-[.18em] text-white/70">
            {selected.match.toUpperCase()}
          </span>
          <h2 className="mt-2 text-2xl font-black">{selected.title}</h2>
          <div className="mt-4 flex gap-2 text-xs font-bold">
            <span className="rounded-full bg-white/15 px-3 py-1.5">
              {selected.time}
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1.5">
              Earn {selected.reward}
            </span>
          </div>
        </section>
        {!tracking ? (
          <>
            <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
              <div className="flex gap-3">
                <ShieldCheck className="h-6 w-6 shrink-0 text-emerald-600" />
                <div>
                  <b className="text-sm text-emerald-900">
                    Eligibility confirmed
                  </b>
                  <p className="mt-1 text-xs leading-5 text-emerald-700">
                    You match this survey. Once started, finish within 20
                    minutes without changing device.
                  </p>
                </div>
              </div>
            </section>
            <PrimaryButton
              onClick={() => {
                setTracking(true);
                notify("Survey tracking started · SV-DEMO-1042");
              }}
            >
              Start tracked survey
            </PrimaryButton>
          </>
        ) : finished ? (
          <section className="rounded-2xl border border-emerald-100 bg-white p-8 text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </span>
            <span className="mt-4 inline-block rounded-full bg-amber-50 px-3 py-1 text-[10px] font-black text-amber-700">
              VERIFYING RESPONSES
            </span>
            <h3 className="mt-3 text-xl font-black">Survey submitted</h3>
            <p className="mt-2 text-sm text-slate-500">
              Expected verification within 24 hours. Tracking ID:{" "}
              <b>SV-DEMO-1042</b>
            </p>
            <button
              onClick={() => {
                notify(`${selected.reward} survey reward pending`);
                setSelected(null);
                setStep(0);
              }}
              className="mt-5 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white"
            >
              Finish
            </button>
            <button
              onClick={() => setReportOpen(true)}
              className="mt-3 block w-full text-xs font-extrabold text-violet-600"
            >
              Report missing reward
            </button>
          </section>
        ) : (
          <section className="rounded-2xl border border-[#ece9f2] bg-white p-5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-emerald-600">
                Question {step + 1} of {questions.length}
              </span>
              <span className="text-emerald-600">Tracking active</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-50">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${(step / questions.length) * 100}%` }}
              />
            </div>
            <h3 className="mt-6 text-lg font-black">{questions[step]}</h3>
            <div className="mt-4 space-y-2">
              {options[step].map((option) => (
                <button
                  key={option}
                  onClick={() => setAnswer(option)}
                  className={`w-full rounded-xl border p-3 text-left text-sm font-bold ${answer === option ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-[#ece9f2]"}`}
                >
                  {option}
                </button>
              ))}
            </div>
            <button
              disabled={!answer}
              onClick={() => {
                setStep(step + 1);
                setAnswer("");
              }}
              className="mt-5 w-full rounded-xl bg-emerald-600 py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {step === questions.length - 1
                ? "Submit survey"
                : "Next question"}
            </button>
          </section>
        )}
        <InfoCard
          title="Survey protection"
          lines={[
            "Tracking ID remains attached to this attempt",
            "Responses are normally verified within 24 hours",
            "Report a missing reward after the expected time passes",
          ]}
        />
        {reportOpen && (
          <ReportDialog
            value={report}
            setValue={setReport}
            onClose={() => setReportOpen(false)}
            onSubmit={() => {
              setReportOpen(false);
              setReport("");
              notify("Missing reward report MR-DEMO-204 created");
            }}
          />
        )}
      </div>
    );
  }
  const openSurvey = (survey: (typeof surveys)[number]) => {
    if (survey.status !== "available") {
      notify(
        survey.status === "expired"
          ? "This survey has expired"
          : "This survey is currently full",
      );
      return;
    }
    setSelected(survey);
    setStep(0);
    setAnswer("");
    setTracking(false);
  };
  return (
    <>
      <Hero
        icon={ClipboardCheck}
        eyebrow="SHARE YOUR OPINION"
        title="Quick surveys, real rewards"
        body="Answer simple questions from trusted research partners."
        action="View best survey"
        onClick={() => openSurvey(surveys[0])}
        mint
      />
      <div className="grid grid-cols-3 gap-3">
        <Metric label="Available" value="2" />
        <Metric label="Full" value="1" />
        <Metric label="Expired" value="1" />
      </div>
      <section>
        <SectionTitle title="Survey matches" side="Status updated" />
        <div className="overflow-hidden rounded-2xl border border-[#ece9f2] bg-white">
          {surveys.map((s) => (
            <button
              key={s.title}
              onClick={() => openSurvey(s)}
              className={`flex w-full items-center gap-3 border-b border-[#f0edf5] p-4 text-left last:border-0 ${s.status === "available" ? "hover:bg-emerald-50/40" : "bg-slate-50 opacity-70"}`}
            >
              <span
                className={`grid h-11 w-11 place-items-center rounded-xl ${s.status === "available" ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-500"}`}
              >
                <ClipboardCheck className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold text-[#282133]">
                  {s.title}
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  {s.time} · {s.questions} questions · {s.match}
                </span>
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${s.status === "available" ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600"}`}
              >
                {s.status === "available" ? `+${s.reward}` : s.status}
              </span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

function DownloadPanel({ notify }: { notify: (m: string) => void }) {
  const apps = [
    {
      name: "Pocket Budget",
      cat: "Finance",
      reward: "₹45",
      color: "bg-blue-500",
      time: "Within 3 days",
      status: "available",
      steps: [
        "Install through Glonni Ads",
        "Create a new account",
        "Add your first expense",
      ],
    },
    {
      name: "Fresh Basket",
      cat: "Shopping",
      reward: "₹28",
      color: "bg-emerald-500",
      time: "Within 24 hours",
      status: "tracking",
      steps: [
        "Install the app",
        "Register with your mobile number",
        "Browse any three products",
      ],
    },
    {
      name: "FitSteps",
      cat: "Health",
      reward: "₹35",
      color: "bg-orange-500",
      time: "Within 5 days",
      status: "expired",
      steps: [
        "Install and allow activity access",
        "Create your profile",
        "Reach 2,000 tracked steps",
      ],
    },
  ];
  const [selected, setSelected] = useState<(typeof apps)[number] | null>(null);
  const [stage, setStage] = useState<"details" | "confirm" | "tracking">(
    "details",
  );
  const [reportOpen, setReportOpen] = useState(false);
  const [report, setReport] = useState("");
  const openApp = (app: (typeof apps)[number]) => {
    setSelected(app);
    setStage(app.status === "tracking" ? "tracking" : "details");
  };
  if (selected)
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <button
          onClick={() => setSelected(null)}
          className="inline-flex items-center gap-2 text-sm font-bold text-violet-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to app offers
        </button>
        <section
          className={`rounded-[28px] bg-gradient-to-br ${purple} p-6 text-white`}
        >
          <span
            className={`grid h-16 w-16 place-items-center rounded-2xl ${selected.color}`}
          >
            <Download className="h-8 w-8" />
          </span>
          <p className="mt-5 text-xs font-bold text-white/65">
            {selected.cat} · New users only
          </p>
          <h2 className="mt-1 text-2xl font-black">{selected.name}</h2>
          <div className="mt-5 flex items-end justify-between">
            <span>
              <span className="block text-xs text-white/70">Total reward</span>
              <b className="text-3xl">{selected.reward}</b>
            </span>
            <span className="rounded-full bg-white/15 px-3 py-2 text-xs font-bold">
              {selected.time}
            </span>
          </div>
        </section>
        {selected.status === "expired" ? (
          <section className="rounded-[26px] border border-rose-100 bg-white p-7 text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-rose-50 text-rose-600">
              <CalendarClock className="h-8 w-8" />
            </span>
            <h3 className="mt-4 text-xl font-black">This offer has expired</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              The partner stopped accepting new installations. Do not install it
              expecting a reward.
            </p>
            <button
              onClick={() => setSelected(null)}
              className="mt-5 rounded-xl bg-violet-600 px-5 py-3 text-sm font-extrabold text-white"
            >
              Browse active offers
            </button>
          </section>
        ) : (
          <>
            <section>
              <SectionTitle title="Complete these steps" />
              <div className="space-y-3">
                {selected.steps.map((step, index) => (
                  <div
                    key={step}
                    className="flex gap-3 rounded-2xl border border-[#ece9f2] bg-white p-4"
                  >
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-black ${stage === "tracking" && index === 0 ? "bg-emerald-100 text-emerald-700" : "bg-violet-100 text-violet-600"}`}
                    >
                      {stage === "tracking" && index === 0 ? "✓" : index + 1}
                    </span>
                    <span>
                      <b className="block text-sm">{step}</b>
                      <span className="mt-1 block text-xs text-slate-500">
                        {stage === "tracking"
                          ? index === 0
                            ? "Install click recorded"
                            : "Waiting for partner update"
                          : "Waiting to start"}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </section>
            {stage === "details" && (
              <>
                <section className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                  <div className="flex gap-3">
                    <ShieldCheck className="h-5 w-5 shrink-0 text-amber-600" />
                    <p className="text-xs leading-5 text-amber-800">
                      <b className="block">Tracking not started</b>Previous
                      installs, VPN use or installing outside the tracked button
                      may make this offer ineligible.
                    </p>
                  </div>
                </section>
                <PrimaryButton onClick={() => setStage("confirm")}>
                  Check eligibility & continue
                </PrimaryButton>
              </>
            )}
            {stage === "confirm" && (
              <section className="rounded-2xl border border-violet-100 bg-white p-5">
                <h3 className="text-lg font-black">
                  Confirm before installing
                </h3>
                <div className="mt-4 space-y-3 text-xs leading-5 text-slate-600">
                  <p>
                    ✓ I have never installed {selected.name} on this device.
                  </p>
                  <p>
                    ✓ I will use the same device and complete all steps in{" "}
                    {selected.time.toLowerCase()}.
                  </p>
                  <p>
                    ✓ I understand tracking starts only after pressing the
                    button below.
                  </p>
                </div>
                <PrimaryButton
                  onClick={() => {
                    setStage("tracking");
                    notify("Tracking started · APP-DEMO-7841");
                  }}
                >
                  Start tracking & open app
                </PrimaryButton>
              </section>
            )}
            {stage === "tracking" && (
              <>
                <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                  <div className="flex gap-3">
                    <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
                    <div>
                      <b className="text-sm text-emerald-900">
                        Tracking started successfully
                      </b>
                      <p className="mt-1 text-xs leading-5 text-emerald-700">
                        Reference APP-DEMO-7841 · Started today, 4:20 PM
                      </p>
                      <p className="mt-2 text-xs font-bold text-emerald-800">
                        Expected verification: {selected.time}
                      </p>
                    </div>
                  </div>
                </section>
                <button
                  onClick={() => setReportOpen(true)}
                  className="w-full rounded-xl border border-violet-200 bg-white py-3 text-sm font-extrabold text-violet-600"
                >
                  Report missing reward
                </button>
              </>
            )}
            <InfoCard
              title="Verification timeline"
              lines={[
                "Install click is recorded immediately",
                "Partner checks registration and required activity",
                "Reward becomes pending, then available after validation",
              ]}
            />
          </>
        )}
        {reportOpen && (
          <ReportDialog
            value={report}
            setValue={setReport}
            onClose={() => setReportOpen(false)}
            onSubmit={() => {
              setReportOpen(false);
              setReport("");
              notify("Missing reward report MR-DEMO-318 created");
            }}
          />
        )}
      </div>
    );
  return (
    <>
      <Hero
        icon={Download}
        eyebrow="APP OFFERS"
        title="Discover apps and earn"
        body="Install, open and complete the required step to unlock rewards."
        action="Browse offers"
        onClick={() =>
          document
            .getElementById("app-offers")
            ?.scrollIntoView({ behavior: "smooth" })
        }
      />
      <div className="grid grid-cols-3 gap-3">
        <Metric label="Available" value="1" />
        <Metric label="Tracking" value="1" />
        <Metric label="Expired" value="1" />
      </div>
      <section id="app-offers">
        <SectionTitle title="App offers" side="Live status" />
        <div className="space-y-3">
          {apps.map((a) => (
            <article
              key={a.name}
              className={`rounded-2xl border p-4 ${a.status === "expired" ? "border-slate-200 bg-slate-50 opacity-70" : "border-[#ece9f2] bg-white"}`}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => openApp(a)}
                  className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white ${a.color}`}
                  aria-label={`View ${a.name}`}
                >
                  <Download className="h-6 w-6" />
                </button>
                <button
                  onClick={() => openApp(a)}
                  className="min-w-0 flex-1 text-left"
                >
                  <b className="block text-sm text-[#282133]">{a.name}</b>
                  <span className="text-xs text-slate-500">
                    {a.cat} · {a.steps[a.steps.length - 1]}
                  </span>
                </button>
                <span
                  className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${a.status === "tracking" ? "bg-emerald-50 text-emerald-700" : a.status === "expired" ? "bg-slate-200 text-slate-600" : "bg-violet-50 text-violet-600"}`}
                >
                  {a.status === "available" ? `Earn ${a.reward}` : a.status}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
      <InfoCard
        title="How app rewards work"
        lines={[
          "Confirm eligibility before starting",
          "Install only through the tracked Glonni Ads button",
          "Use the tracking reference for support or missing rewards",
        ]}
      />
    </>
  );
}

function ReportDialog({
  value,
  setValue,
  onClose,
  onSubmit,
}: {
  value: string;
  setValue: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="missing-reward-title"
      className="fixed inset-0 z-[80] grid place-items-end bg-[#171221]/60 p-4 backdrop-blur-sm sm:place-items-center"
    >
      <section className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-black tracking-wider text-violet-500">
              SUPPORT REQUEST
            </span>
            <h3 id="missing-reward-title" className="mt-1 text-xl font-black">
              Report missing reward
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close report"
            className="grid h-9 w-9 place-items-center rounded-full bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Submit only after the expected verification time. Your tracking
          reference will be attached automatically.
        </p>
        <textarea
          autoFocus
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Tell us which steps you completed and when…"
          className="mt-4 min-h-28 w-full rounded-2xl border border-[#e8e4ef] p-4 text-sm outline-none focus:border-violet-500"
        />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-[#e8e4ef] py-3 text-sm font-extrabold text-slate-600"
          >
            Cancel
          </button>
          <button
            disabled={value.trim().length < 10}
            onClick={onSubmit}
            className="rounded-xl bg-violet-600 py-3 text-sm font-extrabold text-white disabled:opacity-40"
          >
            Create report
          </button>
        </div>
      </section>
    </div>
  );
}

function ShopScreen({
  notify,
  open,
}: {
  notify: (m: string) => void;
  open: (detail: DetailKey) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState<string | null>(null);
  const [sort, setSort] = useState("Recommended");
  const [saved, setSaved] = useState<string[]>([]);
  const [shopView, setShopView] = useState<"browse" | "tracking" | "claim">(
    "browse",
  );
  const [claimText, setClaimText] = useState("");
  const stores = [
    {
      name: "Amazon",
      rate: "Up to 8%",
      letter: "a",
      color: "bg-[#fff5df] text-[#111]",
    },
    {
      name: "Flipkart",
      rate: "Up to 6%",
      letter: "F",
      color: "bg-[#fff7d6] text-blue-600",
    },
    {
      name: "Myntra",
      rate: "Up to 7%",
      letter: "M",
      color: "bg-pink-50 text-pink-600",
    },
    {
      name: "AJIO",
      rate: "Up to 5%",
      letter: "A",
      color: "bg-slate-100 text-slate-800",
    },
  ];
  const products = [
    {
      name: "Samsung Galaxy A55 5G",
      category: "Mobiles",
      icon: "📱",
      subtitle: "8GB · 128GB",
      best: "₹24,999",
      earn: "₹500",
      priceValue: 24999,
      earnValue: 500,
      popularity: 98,
      offers: [
        { store: "Flipkart", price: "₹24,999", earning: "₹500", best: true },
        { store: "Amazon", price: "₹25,499", earning: "₹255", best: false },
        { store: "Croma", price: "₹26,199", earning: "₹393", best: false },
      ],
    },
    {
      name: "boAt Airdopes 141",
      category: "Electronics",
      icon: "🎧",
      subtitle: "42-hour playback",
      best: "₹999",
      earn: "₹80",
      priceValue: 999,
      earnValue: 80,
      popularity: 94,
      offers: [
        { store: "Amazon", price: "₹999", earning: "₹80", best: true },
        { store: "Flipkart", price: "₹1,049", earning: "₹63", best: false },
      ],
    },
    {
      name: "Puma Running Shoes",
      category: "Fashion",
      icon: "👟",
      subtitle: "Men's lightweight shoes",
      best: "₹2,249",
      earn: "₹157",
      priceValue: 2249,
      earnValue: 157,
      popularity: 89,
      offers: [
        { store: "Myntra", price: "₹2,249", earning: "₹157", best: true },
        { store: "AJIO", price: "₹2,399", earning: "₹120", best: false },
      ],
    },
    {
      name: "Whiskas Adult Cat Food",
      category: "Pet Care",
      icon: "🐾",
      subtitle: "Ocean fish · 3 kg",
      best: "₹1,099",
      earn: "₹66",
      priceValue: 1099,
      earnValue: 66,
      popularity: 82,
      offers: [
        { store: "Amazon", price: "₹1,099", earning: "₹66", best: true },
        { store: "Flipkart", price: "₹1,149", earning: "₹46", best: false },
      ],
    },
  ];
  const categories = ["All", "Mobiles", "Electronics", "Fashion", "Pet Care"];
  const visible = products
    .filter(
      (p) =>
        (category === "All" || p.category === category) &&
        `${p.name} ${p.category}`.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) => {
      if (sort === "Lowest price") return a.priceValue - b.priceValue;
      if (sort === "Highest cashback") return b.earnValue - a.earnValue;
      if (sort === "Popular") return b.popularity - a.popularity;
      return b.earnValue / b.priceValue - a.earnValue / a.priceValue;
    });
  const product = products.find((p) => p.name === selected);
  const toggleSaved = (name: string) =>
    setSaved((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name],
    );
  if (shopView === "tracking")
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <button onClick={() => setShopView("browse")} className="inline-flex items-center gap-2 text-sm font-bold text-violet-600">
          <ArrowLeft className="h-4 w-4" /> Back to Shop & Earn
        </button>
        <Hero icon={PackageCheck} eyebrow="PURCHASE TRACKING" title="Your cashback journey" body="Follow every step from store visit to confirmed earnings." action="View claim help" onClick={() => setShopView("claim")} />
        <section className="rounded-[28px] border border-[#ece9f2] bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-[10px] font-black uppercase tracking-wider text-violet-600">Demo order · GL-SH-48219</p><h2 className="mt-1 font-black text-[#241d34]">boAt Airdopes 141</h2><p className="mt-1 text-xs text-slate-500">Amazon · ₹999 · Estimated ₹80 cashback</p></div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-black text-amber-700">TRACKING</span>
          </div>
          <div className="mt-6 space-y-0">
            {[
              [true, "Store visit tracked", "Today, 2:14 PM", "Your Glonni click was recorded."],
              [true, "Purchase reported", "Today, 2:27 PM", "The partner has reported your order."],
              [false, "Return period", "Expected by 22 Aug", "Cashback stays pending until returns close."],
              [false, "Cashback confirmed", "Expected by 25 Aug", "₹80 will move to available balance."],
            ].map(([done, title, time, body], index) => (
              <div key={String(title)} className="flex gap-3">
                <div className="flex flex-col items-center"><span className={`grid h-8 w-8 place-items-center rounded-full ${done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>{done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}</span>{index < 3 && <span className="h-12 w-px bg-slate-200" />}</div>
                <div className="pb-5"><div className="flex flex-wrap items-center gap-2"><b className="text-sm text-[#292236]">{String(title)}</b><span className="text-[10px] font-bold text-slate-400">{String(time)}</span></div><p className="mt-1 text-xs text-slate-500">{String(body)}</p></div>
              </div>
            ))}
          </div>
          <button onClick={() => setShopView("claim")} className="w-full rounded-xl border border-violet-200 py-3 text-sm font-extrabold text-violet-700">Report missing cashback</button>
        </section>
        <InfoCard title="Tracking protection" lines={["Do not cancel or modify the order from another link", "Partner confirmation can take 24–72 hours", "Keep the invoice until cashback is confirmed"]} />
      </div>
    );
  if (shopView === "claim")
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <button onClick={() => setShopView("tracking")} className="inline-flex items-center gap-2 text-sm font-bold text-violet-600"><ArrowLeft className="h-4 w-4" /> Back to tracking</button>
        <section className="rounded-[28px] border border-[#ece9f2] bg-white p-5">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-600"><CircleHelp className="h-6 w-6" /></span>
          <h2 className="mt-4 text-xl font-black text-[#241d34]">Missing cashback claim</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">We’ll attach tracking ID GL-SH-48219 automatically. Claims can be submitted 72 hours after purchase.</p>
          <label className="mt-5 block text-xs font-extrabold text-slate-700">What went wrong?</label>
          <textarea value={claimText} onChange={(e) => setClaimText(e.target.value)} placeholder="Add the order date, store order ID and what you expected…" className="mt-2 min-h-32 w-full rounded-2xl border border-[#e8e4ef] p-4 text-sm outline-none focus:border-violet-500" />
          <button disabled={claimText.trim().length < 15} onClick={() => { notify("Missing cashback claim created: MC-2048"); setClaimText(""); setShopView("tracking"); }} className="mt-4 w-full rounded-xl bg-violet-600 py-3.5 text-sm font-extrabold text-white disabled:opacity-40">Submit claim</button>
        </section>
      </div>
    );
  if (product)
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <button
          onClick={() => setSelected(null)}
          className="inline-flex items-center gap-2 text-sm font-bold text-violet-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to products
        </button>
        <section className="rounded-[28px] border border-[#ece9f2] bg-white p-5">
          <div className="mb-3 flex justify-end">
            <button onClick={() => toggleSaved(product.name)} aria-label={saved.includes(product.name) ? "Remove from saved" : "Save product"} className={`grid h-10 w-10 place-items-center rounded-full border ${saved.includes(product.name) ? "border-rose-200 bg-rose-50 text-rose-600" : "border-slate-200 text-slate-500"}`}>
              <Heart className={`h-5 w-5 ${saved.includes(product.name) ? "fill-current" : ""}`} />
            </button>
          </div>
          <div className="flex gap-4">
            <span className="grid h-24 w-24 shrink-0 place-items-center rounded-3xl bg-gradient-to-br from-violet-50 to-pink-50 text-5xl">
              {product.icon}
            </span>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-violet-600">
                {product.category}
              </span>
              <h2 className="mt-1 text-xl font-black text-[#241d34]">
                {product.name}
              </h2>
              <p className="mt-1 text-xs text-slate-500">{product.subtitle}</p>
              <p className="mt-3 text-sm font-bold text-slate-500">
                Best price{" "}
                <span className="text-lg text-[#241d34]">{product.best}</span>
              </p>
            </div>
          </div>
          <div className="mt-5 rounded-2xl bg-emerald-50 p-4">
            <div className="flex items-center gap-2 text-emerald-700">
              <Sparkles className="h-5 w-5" />
              <b className="text-sm">Best earning opportunity</b>
            </div>
            <p className="mt-1 text-2xl font-black text-emerald-700">
              Earn up to {product.earn}
            </p>
            <p className="mt-1 text-xs text-emerald-700/75">
              Estimated reward after the return period ends.
            </p>
          </div>
        </section>
        <section>
          <SectionTitle
            title="Compare store offers"
            side={`${product.offers.length} stores`}
          />
          <div className="space-y-3">
            {product.offers.map((o) => (
              <article
                key={o.store}
                className={`rounded-2xl border bg-white p-4 ${o.best ? "border-emerald-300 ring-2 ring-emerald-100" : "border-[#ece9f2]"}`}
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-violet-50 font-black text-violet-600">
                    {o.store[0]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <b className="text-sm">{o.store}</b>
                      {o.best && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black text-emerald-700">
                          BEST VALUE
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      Price {o.price}
                    </span>
                  </span>
                  <span className="text-right">
                    <b className="block text-sm text-emerald-600">
                      Earn {o.earning}
                    </b>
                    <button
                      onClick={() => {
                        notify(`${o.store} store visit tracked in this demo`);
                        setShopView("tracking");
                        setSelected(null);
                      }}
                      className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-violet-600"
                    >
                      Shop now
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
        <InfoCard
          title="Before you shop"
          lines={[
            "Always open the store through Glonni Ads",
            "Complete the purchase in the same session",
            "Earnings are confirmed after the return period",
            "Prices and cashback can change before checkout—verify on the store",
          ]}
        />
      </div>
    );
  return (
    <div className="space-y-5">
      <Hero
        icon={ShoppingBag}
        eyebrow="SHOP & EARN"
        title="Compare prices. Earn more."
        body="Find the best store price and see your estimated earnings before you buy."
        action="Browse top deals"
        onClick={() =>
          document
            .getElementById("shop-products")
            ?.scrollIntoView({ behavior: "smooth" })
        }
      />
      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => setShopView("tracking")} className="rounded-2xl border border-[#ece9f2] bg-white p-3 text-left"><PackageCheck className="h-5 w-5 text-violet-600" /><b className="mt-2 block text-xs">Track purchase</b><span className="text-[10px] text-slate-500">1 active</span></button>
        <button onClick={() => { setCategory("All"); setQuery(""); notify(`${saved.length} saved product${saved.length === 1 ? "" : "s"}`); }} className="rounded-2xl border border-[#ece9f2] bg-white p-3 text-left"><Heart className="h-5 w-5 text-rose-500" /><b className="mt-2 block text-xs">Saved</b><span className="text-[10px] text-slate-500">{saved.length} products</span></button>
        <button onClick={() => setSelected("boAt Airdopes 141")} className="rounded-2xl border border-[#ece9f2] bg-white p-3 text-left"><History className="h-5 w-5 text-amber-500" /><b className="mt-2 block text-xs">Viewed</b><span className="text-[10px] text-slate-500">See recent</span></button>
      </div>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search products or stores"
          placeholder="Search products or categories"
          className="w-full rounded-2xl border border-[#ece9f2] bg-white py-3.5 pl-11 pr-11 text-sm outline-none focus:border-violet-400"
        />
        {query && (
          <button
            aria-label="Clear search"
            onClick={() => setQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {categories.map((c) => (
          <button
            onClick={() => setCategory(c)}
            key={c}
            className={`whitespace-nowrap rounded-full px-4 py-2.5 text-xs font-bold ${category === c ? "bg-[#241b38] text-white" : "border border-[#ece9f2] bg-white text-slate-600"}`}
          >
            {c}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-3 rounded-2xl border border-[#ece9f2] bg-white px-4 py-3">
        <SlidersHorizontal className="h-4 w-4 text-violet-600" />
        <span className="text-xs font-extrabold text-slate-600">Sort by</span>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="ml-auto bg-transparent text-xs font-extrabold text-[#241d34] outline-none" aria-label="Sort products">
          {["Recommended", "Lowest price", "Highest cashback", "Popular"].map((option) => <option key={option}>{option}</option>)}
        </select>
      </label>
      <section>
        <SectionTitle
          title="Top stores"
          side="View all"
          onSide={() => open("stores")}
        />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {stores.map((s) => (
            <button
              onClick={() => notify(`${s.name} affiliate feed coming soon`)}
              key={s.name}
              className="rounded-2xl border border-[#ece9f2] bg-white p-4 text-left"
            >
              <span
                className={`grid h-11 w-11 place-items-center rounded-xl text-xl font-black ${s.color}`}
              >
                {s.letter}
              </span>
              <b className="mt-3 block text-sm text-[#282133]">{s.name}</b>
              <span className="text-xs font-semibold text-emerald-600">
                {s.rate} cashback
              </span>
            </button>
          ))}
        </div>
      </section>
      <section id="shop-products">
        <SectionTitle title="Compare & earn" side={`${visible.length} deals`} />
        {visible.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {visible.map((p) => (
              <article
                key={p.name}
                className="relative rounded-2xl border border-[#ece9f2] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
              >
                <button onClick={() => toggleSaved(p.name)} aria-label={saved.includes(p.name) ? `Remove ${p.name} from saved` : `Save ${p.name}`} className={`absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white shadow-sm ${saved.includes(p.name) ? "text-rose-600" : "text-slate-400"}`}><Heart className={`h-4 w-4 ${saved.includes(p.name) ? "fill-current" : ""}`} /></button>
                <button onClick={() => setSelected(p.name)} className="w-full text-left">
                <div className="flex gap-3">
                  <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-50 to-pink-50 text-3xl">
                    {p.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-violet-500">
                      {p.category}
                    </span>
                    <b className="mt-0.5 block truncate text-sm text-[#282133]">
                      {p.name}
                    </b>
                    <span className="text-xs text-slate-500">{p.subtitle}</span>
                  </span>
                </div>
                <div className="mt-4 flex items-end justify-between border-t border-[#f0edf5] pt-3">
                  <span>
                    <span className="block text-[10px] text-slate-400">
                      Best price
                    </span>
                    <b className="text-base text-[#241d34]">{p.best}</b>
                  </span>
                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
                    Earn {p.earn}
                  </span>
                </div>
                </button>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Search}
            title="No matching deals"
            body="Try another product name or category."
          />
        )}
      </section>
      <p className="rounded-2xl bg-amber-50 px-4 py-3 text-[11px] leading-5 text-amber-800"><b>Price & cashback disclaimer:</b> Estimates are based on demo partner data. The store’s checkout price and Glonni tracking confirmation determine the final reward.</p>
      <section className="rounded-2xl border border-[#ece9f2] bg-white p-5">
        <SectionTitle title="How it works" />
        {[
          [Store, "Choose a store", "Compare cashback and prices"],
          [CreditCard, "Complete purchase", "Shop on the partner website"],
          [Coins, "Earn cashback", "Reward appears after confirmation"],
        ].map(([Icon, title, body], i) => (
          <div key={String(title)} className="flex gap-3 py-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 text-violet-600">
              <Icon className="h-5 w-5" />
            </span>
            <span>
              <b className="block text-sm text-[#292236]">
                {i + 1}. {String(title)}
              </b>
              <span className="text-xs text-slate-500">{String(body)}</span>
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}

function GamesScreen({ notify }: { notify: (m: string) => void }) {
  const [filter, setFilter] = useState("All games");
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [trackedGames, setTrackedGames] = useState<string[]>([
    "Puzzle Quest",
    "Word Master",
    "Ludo Club",
  ]);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const games = [
    {
      name: "Puzzle Quest",
      category: "Puzzle",
      goal: "Complete level 10",
      reward: "₹50",
      icon: "🧩",
      tag: "Trending",
      time: "25–35 min",
      players: "12.4K",
      progress: 4,
      total: 10,
      expires: "5 days 8 hours",
      trackingId: "GM-PQ-48291",
      milestones: [
        ["Installed & opened", "Verified", "₹0"],
        ["Reach level 5", "In progress", "₹15"],
        ["Complete level 10", "Locked", "₹35"],
      ],
      steps: [
        "Install and open the game",
        "Reach level 5 to unlock tracking",
        "Complete level 10 within 7 days",
      ],
    },
    {
      name: "Cricket League",
      category: "Sports",
      goal: "Win 3 matches",
      reward: "₹35",
      icon: "🏏",
      tag: "New",
      time: "15–20 min",
      players: "8.1K",
      progress: 0,
      total: 3,
      expires: "7 days",
      trackingId: "Not started",
      milestones: [
        ["Install & finish practice", "Ready", "₹5"],
        ["Win first match", "Locked", "₹10"],
        ["Win 3 matches", "Locked", "₹20"],
      ],
      steps: [
        "Install through Glonni Ads",
        "Finish the practice match",
        "Win 3 multiplayer matches",
      ],
    },
    {
      name: "Word Master",
      category: "Word",
      goal: "Find 500 words",
      reward: "₹25",
      icon: "🔤",
      tag: "Trending",
      time: "20–30 min",
      players: "6.8K",
      progress: 180,
      total: 500,
      expires: "3 days 14 hours",
      trackingId: "GM-WM-73104",
      milestones: [
        ["Tutorial completed", "Verified", "₹5"],
        ["Find 250 words", "In progress", "₹8"],
        ["Find 500 words", "Locked", "₹12"],
      ],
      steps: [
        "Open the tracked game link",
        "Complete the tutorial",
        "Find a total of 500 words",
      ],
    },
    {
      name: "Ludo Club",
      category: "Board",
      goal: "Win 5 games",
      reward: "₹40",
      icon: "🎲",
      tag: "Top paying",
      time: "30–45 min",
      players: "15.2K",
      progress: 2,
      total: 5,
      expires: "8 days 2 hours",
      trackingId: "GM-LC-62018",
      milestones: [
        ["Player ID created", "Verified", "₹5"],
        ["Win 3 games", "In progress", "₹15"],
        ["Win 5 games", "Locked", "₹20"],
      ],
      steps: [
        "Install and create your player ID",
        "Play only eligible classic matches",
        "Win 5 matches within 10 days",
      ],
    },
  ];
  const visible = games.filter(
    (g) =>
      (filter === "All games" || g.tag === filter) &&
      `${g.name} ${g.goal} ${g.tag}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const game = games.find((g) => g.name === selected);
  if (game) {
    const pct = Math.min(100, (game.progress / game.total) * 100);
    const isTracked = trackedGames.includes(game.name);
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <button
          onClick={() => setSelected(null)}
          className="inline-flex items-center gap-2 text-sm font-bold text-violet-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to games
        </button>
        <section
          className={`relative overflow-hidden rounded-[28px] bg-gradient-to-br ${purple} p-6 text-white`}
        >
          <div className="absolute -right-8 -top-10 text-[120px] opacity-15">
            {game.icon}
          </div>
          <div className="relative">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white/15 text-4xl">
              {game.icon}
            </span>
            <span className="mt-5 inline-block rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-wider">
              {game.tag}
            </span>
            <h2 className="mt-2 text-3xl font-black">{game.name}</h2>
            <p className="mt-1 text-sm text-white/75">
              {game.category} game · {game.players} players
            </p>
            <div className="mt-5 flex items-end justify-between">
              <span>
                <span className="block text-xs text-white/70">
                  Mission reward
                </span>
                <b className="text-3xl">{game.reward}</b>
              </span>
              <span className="rounded-2xl bg-white px-4 py-2 text-xs font-black text-violet-700">
                {game.goal}
              </span>
            </div>
          </div>
        </section>
        <section className="rounded-2xl border border-[#ece9f2] bg-white p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#f0edf5] pb-4">
            <span className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700">
              <ShieldCheck className="h-4 w-4" /> New-install eligibility checked
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700">
              <CalendarClock className="h-4 w-4" /> Expires in {game.expires}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <b className="text-sm">Mission progress</b>
              <p className="mt-1 text-xs text-slate-500">
                {game.progress} of {game.total} completed
              </p>
            </div>
            <span className="text-lg font-black text-violet-600">
              {Math.round(pct)}%
            </span>
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-violet-100">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${purple}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {isTracked && (
            <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">
              <b className="block">Tracking active on this device</b>
              Reference: {game.trackingId} · Last synced just now
            </div>
          )}
        </section>
        <section>
          <SectionTitle title="Milestone rewards" side="Demo progress" />
          <div className="space-y-3">
            {game.milestones.map(([title, status, reward], index) => (
              <div key={title} className="flex items-center gap-3 rounded-2xl border border-[#ece9f2] bg-white p-4">
                <span className={`grid h-9 w-9 place-items-center rounded-full ${status === "Verified" ? "bg-emerald-100 text-emerald-700" : status === "In progress" || status === "Ready" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-400"}`}>
                  {status === "Verified" ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-sm">{title}</b>
                  <span className="text-xs text-slate-500">{status} · partner verification may take up to 24 hours</span>
                </span>
                <b className="text-sm text-violet-700">{reward}</b>
              </div>
            ))}
          </div>
        </section>
        <section>
          <SectionTitle title="How to earn" side={game.time} />
          <div className="space-y-3">
            {game.steps.map((step, index) => (
              <div
                key={step}
                className="flex gap-3 rounded-2xl border border-[#ece9f2] bg-white p-4"
              >
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-black ${index === 0 ? "bg-violet-600 text-white" : "bg-violet-50 text-violet-600"}`}
                >
                  {index + 1}
                </span>
                <span>
                  <b className="block text-sm">{step}</b>
                  <span className="mt-1 block text-xs text-slate-500">
                    Progress is verified automatically by the game partner.
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>
        <InfoCard
          title="Important requirements"
          lines={[
            "Start the game only through Glonni Ads",
            "Use the same device until the mission is complete",
            "New users only; reinstalling does not qualify",
          ]}
        />
        <PrimaryButton
          onClick={() => {
            if (!isTracked) {
              setTrackedGames((current) => [...current, game.name]);
              notify(`Tracking started · ${game.name}`);
              return;
            }
            notify(`Opening ${game.name} with tracking active`);
          }}
        >
          {isTracked ? "Continue playing with tracking" : "Start tracked mission"}
        </PrimaryButton>
        {isTracked && (
          <button onClick={() => setReportOpen(true)} className="w-full rounded-2xl border border-violet-200 bg-white px-4 py-3 text-sm font-bold text-violet-700">
            Report missing game reward
          </button>
        )}
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-[11px] leading-5 text-amber-800"><b>Demo notice:</b> Game progress and rewards are sample data. Real verification will begin after a game partner is connected.</p>
        {reportOpen && (
          <div role="dialog" aria-modal="true" aria-label="Report missing game reward" className="fixed inset-0 z-50 grid place-items-end bg-slate-950/45 p-4 sm:place-items-center">
            <div className="w-full max-w-md rounded-[28px] bg-white p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div><h3 className="text-lg font-black">Missing game reward</h3><p className="mt-1 text-xs text-slate-500">Reference {game.trackingId}</p></div>
                <button aria-label="Close report" onClick={() => setReportOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-slate-100"><X className="h-4 w-4" /></button>
              </div>
              <label className="mt-5 block text-xs font-bold text-slate-600">What went wrong?</label>
              <select value={reportReason} onChange={(event) => setReportReason(event.target.value)} className="mt-2 w-full rounded-2xl border border-[#e8e4ee] bg-white p-3 text-sm outline-none focus:border-violet-400">
                <option value="">Select a reason</option>
                <option>Milestone completed but not verified</option>
                <option>Progress stopped updating</option>
                <option>Reward approved but not credited</option>
              </select>
              <button disabled={!reportReason} onClick={() => { setReportOpen(false); setReportReason(""); notify("Game reward report submitted · GR-20841"); }} className="mt-4 w-full rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">Submit report</button>
              <p className="mt-3 text-center text-[11px] text-slate-500">Please report only after the 24-hour verification window.</p>
            </div>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <Hero
        icon={Gamepad2}
        eyebrow="PLAY & EARN"
        title="Play games. Complete missions."
        body="Discover fun challenges and unlock rewards as you progress."
        action="Explore games"
        onClick={() =>
          document
            .getElementById("game-list")
            ?.scrollIntoView({ behavior: "smooth" })
        }
      />
      <div className="grid grid-cols-3 gap-3">
        <Metric label="In progress" value="3" />
        <Metric label="Completed" value="0" />
        <Metric label="Earned" value="₹0" />
      </div>
      <section>
        <SectionTitle title="Continue playing" side="3 active" />
        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
          {games.filter((g) => trackedGames.includes(g.name)).map((g) => (
            <button key={g.name} onClick={() => setSelected(g.name)} className="min-w-[220px] rounded-2xl border border-violet-100 bg-white p-4 text-left shadow-sm">
              <div className="flex items-center gap-3"><span className="text-3xl">{g.icon}</span><span><b className="block text-sm">{g.name}</b><span className="text-[11px] text-slate-500">Expires in {g.expires}</span></span></div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-violet-100"><div className="h-full rounded-full bg-violet-600" style={{ width: `${Math.min(100, (g.progress / g.total) * 100)}%` }} /></div>
              <span className="mt-2 block text-xs font-bold text-violet-700">Continue tracked mission</span>
            </button>
          ))}
        </div>
      </section>
      <section className="rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-400 text-white">
            <Trophy className="h-6 w-6" />
          </span>
          <span className="flex-1">
            <b className="block text-sm text-amber-900">
              Weekly game challenge
            </b>
            <span className="text-xs text-amber-700">
              Complete 3 missions to unlock a bonus.
            </span>
          </span>
          <span className="text-sm font-black text-amber-700">0 / 3</span>
        </div>
      </section>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search games"
          placeholder="Search games or missions"
          className="w-full rounded-2xl border border-[#ece9f2] bg-white py-3.5 pl-11 pr-11 text-sm outline-none focus:border-violet-400"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            aria-label="Clear game search"
            className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-slate-100 text-slate-500"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {["All games", "Trending", "Top paying", "New"].map((t) => (
          <button
            onClick={() => setFilter(t)}
            key={t}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold ${filter === t ? "bg-[#241b38] text-white" : "border border-[#ece9f2] bg-white text-slate-600"}`}
          >
            {t}
          </button>
        ))}
      </div>
      <div id="game-list" className="grid gap-3 md:grid-cols-2">
        {visible.map((g) => (
          <button
            onClick={() => setSelected(g.name)}
            key={g.name}
            className="rounded-2xl border border-[#ece9f2] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-100 to-pink-100 text-3xl">
                {g.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="inline-block rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-black uppercase text-violet-600">
                  {g.tag}
                </span>
                <b className="mt-1 block text-sm text-[#282133]">{g.name}</b>
                <span className="text-xs text-slate-500">{g.goal}</span>
              </span>
              <ChevronRight className="h-5 w-5 text-slate-300" />
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-[#f0edf5] pt-3">
              <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                <Timer className="h-3.5 w-3.5" />
                {g.time}
              </span>
              <span className="text-sm font-black text-violet-600">
                Earn {g.reward}
              </span>
            </div>
          </button>
        ))}
      </div>
      {visible.length === 0 && (
        <EmptyState
          icon={Gamepad2}
          title="No games in this category"
          body="Try another filter to see available game missions."
        />
      )}
    </div>
  );
}

function ProfileScreen({
  open,
  userName,
}: {
  open: (detail: DetailKey) => void;
  userName: string;
}) {
  const account = [
    {
      icon: CircleUserRound,
      title: "Personal information",
      body: "Name, mobile number and email",
      key: "personal",
    },
    {
      icon: Wallet,
      title: "Wallet",
      body: "Balance and withdrawals",
      key: "wallet",
    },
    {
      icon: BadgeCheck,
      title: "Reward status",
      body: "Pending, credited and rejected rewards",
      key: "earnings",
    },
    {
      icon: History,
      title: "Earning history",
      body: "All reward activity",
      key: "history",
    },
    {
      icon: Landmark,
      title: "UPI / Bank details",
      body: "Manage payout account",
      key: "payout",
    },
    {
      icon: ShieldCheck,
      title: "KYC verification",
      body: "1 of 4 steps complete",
      key: "kyc",
    },
  ] as const;
  const settings = [
    {
      icon: Settings2,
      title: "Personalization & settings",
      body: "Theme, alerts, interests and data use",
      key: "preferences",
    },
    { icon: Languages, title: "Language", body: "English", key: "language" },
    { icon: Accessibility, title: "Accessibility", body: "Text size, contrast and navigation", key: "accessibility" },
    {
      icon: CircleHelp,
      title: "Help & support",
      body: "FAQs and support tickets",
      key: "support",
    },
    {
      icon: ShieldCheck,
      title: "Trust & safety",
      body: "Rules, warnings, appeals and account control",
      key: "safety",
    },
    {
      icon: FileText,
      title: "Terms & privacy",
      body: "Policies and account rules",
      key: "legal",
    },
  ] as const;
  const menu = (items: typeof account | typeof settings) => (
    <div className="overflow-hidden rounded-2xl border border-[#ece9f2] bg-white">
      {items.map(({ icon: Icon, title, body, key }) => (
        <button
          onClick={() => open(key)}
          key={title}
          className="flex w-full items-center gap-3 border-b border-[#f0edf5] p-4 text-left transition last:border-0 hover:bg-violet-50/40"
        >
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-violet-50 text-violet-600">
            <Icon className="h-5 w-5" />
          </span>
          <span className="flex-1">
            <b className="block text-sm text-[#282133]">{title}</b>
            <span className="text-xs text-slate-500">{body}</span>
          </span>
          <ChevronRight className="h-5 w-5 text-slate-300" />
        </button>
      ))}
    </div>
  );
  return (
    <div className="space-y-5">
      <section
        className={`rounded-[28px] bg-gradient-to-br ${purple} p-6 text-white`}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => open("personal")}
            aria-label="Edit profile photo"
            className="relative grid h-16 w-16 place-items-center rounded-full bg-white/20"
          >
            <CircleUserRound className="h-9 w-9" />
            <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-white text-violet-600">
              <Camera className="h-3.5 w-3.5" />
            </span>
          </button>
          <span className="flex-1">
            <b className="block text-xl">{userName}</b>
            <span className="mt-1 flex items-center gap-1 text-xs text-white/75">
              <BadgeCheck className="h-4 w-4" /> Demo member account
            </span>
          </span>
          <button
            onClick={() => open("personal")}
            className="rounded-full bg-white/15 px-3 py-2 text-xs font-extrabold"
          >
            Edit
          </button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/10 p-3">
            <span className="text-xs text-white/70">Available balance</span>
            <b className="mt-1 block text-xl">₹0.00</b>
          </div>
          <div className="rounded-2xl bg-white/10 p-3">
            <span className="text-xs text-white/70">KYC status</span>
            <b className="mt-1 block text-xl">25%</b>
          </div>
        </div>
      </section>
      <section>
        <SectionTitle title="Account & rewards" />
        {menu(account)}
      </section>
      <section>
        <SectionTitle title="Settings & support" />
        {menu(settings)}
      </section>
      <button
        onClick={() => open("logout")}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-white py-4 text-sm font-extrabold text-rose-500"
      >
        <LogOut className="h-4 w-4" />
        Log out
      </button>
      <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-800">
        <LockKeyhole className="h-5 w-5" />
        <p className="text-xs leading-5">
          <b className="block">Your rewards stay protected</b>Secure
          verification will be required before withdrawal.
        </p>
      </div>
      <p className="text-center text-[10px] font-semibold text-slate-400">
        Glonni Ads v0.1 · Frontend preview
      </p>
    </div>
  );
}

function WalletExperience({
  open,
  notify,
}: {
  open: (detail: DetailKey) => void;
  notify: (message: string) => void;
}) {
  const [step, setStep] = useState<"overview" | "amount" | "review" | "status">(
    "overview",
  );
  const [amount, setAmount] = useState("500");
  const [method, setMethod] = useState<"upi" | "bank">("upi");
  const [status, setStatus] = useState<"pending" | "success" | "failed">(
    "pending",
  );
  const [receiptOpen, setReceiptOpen] = useState(false);
  const numericAmount = Number(amount) || 0;
  const canContinue = numericAmount >= 500;
  if (step === "status") {
    const states = {
      pending: {
        icon: Timer,
        title: "Withdrawal submitted",
        body: "Security review is in progress. Expected approval by 9 Aug, 6:00 PM; payout should arrive by 12 Aug.",
        tone: "bg-amber-100 text-amber-600",
        label: "Pending",
      },
      success: {
        icon: CheckCircle2,
        title: "Withdrawal successful",
        body: "The payout was sent to your verified account. Keep the receipt and provider reference for support.",
        tone: "bg-emerald-100 text-emerald-600",
        label: "Paid",
      },
      failed: {
        icon: X,
        title: "Withdrawal failed",
        body: "The provider rejected this attempt. No fee was charged and the full amount has been returned to your available balance.",
        tone: "bg-rose-100 text-rose-600",
        label: "Failed",
      },
    } as const;
    const current = states[status];
    const StatusIcon = current.icon;
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <section className="rounded-[28px] border border-[#ece9f2] bg-white p-7 text-center">
          <span
            className={`mx-auto grid h-20 w-20 place-items-center rounded-full ${current.tone}`}
          >
            <StatusIcon className="h-10 w-10" />
          </span>
          <span
            className={`mt-5 inline-block rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${current.tone}`}
          >
            {current.label}
          </span>
          <h2 className="mt-3 text-2xl font-black text-[#241d34]">
            {current.title}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            {current.body}
          </p>
          <div className="mt-6 rounded-2xl bg-[#f8f7fb] p-4 text-left">
            <SummaryRow label="Amount" value={`₹${numericAmount.toFixed(2)}`} />
            <SummaryRow label="Fee charged" value="₹0.00" />
            <SummaryRow
              label="Payout to"
              value={method === "upi" ? "Verified UPI · sha•••@upi" : "Verified bank · •••• 4582"}
            />
            <SummaryRow label="Glonni reference" value="GLN-WD-000128" />
            <SummaryRow label="Provider reference" value={status === "success" ? "UTR 628491730152" : "Assigned after payout"} last />
          </div>
          <button onClick={() => setReceiptOpen(!receiptOpen)} className="mt-4 text-xs font-extrabold text-violet-600">
            {receiptOpen ? "Hide" : "View"} complete receipt
          </button>
          {receiptOpen && <div className="mt-4 rounded-2xl border border-dashed border-violet-200 p-4 text-left text-xs leading-5 text-slate-600">
            <b className="block text-sm text-[#282133]">Withdrawal receipt</b>
            <p>Requested: 8 Aug 2026 · 4:30 PM</p><p>Expected arrival: 1–3 working days after approval</p><p>Status updates: App notification + SMS</p>
            <button onClick={() => notify("Receipt download will be enabled with real payout data")} className="mt-3 inline-flex items-center gap-2 font-extrabold text-violet-600"><Download className="h-4 w-4" />Download receipt</button>
          </div>}
        </section>
        {status === "failed" && <section className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
          <b className="text-sm text-rose-900">What can you do?</b><p className="mt-1 text-xs leading-5 text-rose-700">Check that the payout account is active and its name matches KYC. If retry fails, share GLN-WD-000128 with support.</p>
          <div className="mt-3 grid grid-cols-2 gap-2"><button onClick={() => { setStatus("pending"); notify("Demo withdrawal submitted again"); }} className="rounded-xl bg-rose-600 py-2.5 text-xs font-extrabold text-white">Retry payout</button><button onClick={() => open("support")} className="rounded-xl bg-white py-2.5 text-xs font-extrabold text-rose-600">Contact support</button></div>
        </section>}
        <section className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
          <b className="text-sm text-violet-900">Preview all status screens</b>
          <p className="mt-1 text-xs text-violet-700">
            These are frontend previews until secure payouts are connected.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(["pending", "success", "failed"] as const).map((item) => (
              <button
                key={item}
                onClick={() => setStatus(item)}
                className={`rounded-xl py-2 text-xs font-extrabold capitalize ${status === item ? "bg-violet-600 text-white" : "bg-white text-violet-600"}`}
              >
                {item}
              </button>
            ))}
          </div>
        </section>
        <button
          onClick={() => setStep("overview")}
          className="w-full rounded-xl border border-violet-200 py-3 text-sm font-extrabold text-violet-600"
        >
          Back to wallet
        </button>
      </div>
    );
  }
  if (step === "amount" || step === "review")
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <button
          onClick={() => setStep(step === "review" ? "amount" : "overview")}
          className="inline-flex items-center gap-2 text-sm font-bold text-violet-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <section className="rounded-[26px] border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-5">
          <span className="text-[10px] font-black tracking-[.16em] text-violet-500">
            WITHDRAW REWARDS
          </span>
          <h2 className="mt-2 text-2xl font-black text-[#241d34]">
            {step === "amount"
              ? "Enter withdrawal amount"
              : "Review your request"}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Available balance: ₹0.00 · Minimum withdrawal: ₹500
          </p>
        </section>
        {step === "amount" ? (
          <>
            <section className="rounded-2xl border border-[#ece9f2] bg-white p-5">
              <label className="text-xs font-bold text-slate-600">Amount</label>
              <div className="mt-2 flex items-center rounded-2xl border border-[#e8e4ef] px-4 focus-within:border-violet-400">
                <span className="text-xl font-black text-slate-500">₹</span>
                <input
                  inputMode="numeric"
                  value={amount}
                  onChange={(event) =>
                    setAmount(event.target.value.replace(/\D/g, ""))
                  }
                  className="min-w-0 flex-1 bg-transparent px-3 py-4 text-2xl font-black outline-none"
                />
                <button
                  onClick={() => setAmount("500")}
                  className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-extrabold text-violet-600"
                >
                  MIN
                </button>
              </div>
              {!canContinue && (
                <p className="mt-2 text-xs font-bold text-rose-500">
                  Enter at least ₹500.
                </p>
              )}
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[500, 750, 1000].map((value) => (
                  <button
                    key={value}
                    onClick={() => setAmount(String(value))}
                    className="rounded-xl border border-violet-100 py-2 text-xs font-bold text-violet-600"
                  >
                    ₹{value}
                  </button>
                ))}
              </div>
            </section>
            <section>
              <SectionTitle title="Payout method" />
              <div className="space-y-3">
                <PayoutChoice
                  active={method === "upi"}
                  icon={Smartphone}
                  title="UPI · Verified"
                  body="sha•••@upi · Usually within 24 hours"
                  onClick={() => setMethod("upi")}
                />
                <PayoutChoice
                  active={method === "bank"}
                  icon={Landmark}
                  title="Bank account · Verified"
                  body="•••• 4582 · 1–3 working days"
                  onClick={() => setMethod("bank")}
                />
              </div>
              <button
                onClick={() => open("payout")}
                className="mt-3 text-xs font-extrabold text-violet-600"
              >
                + Manage payout methods
              </button>
            </section>
            <div className="rounded-2xl bg-amber-50 p-4 text-xs leading-5 text-amber-800">
              <b className="block">Demo balance is ₹0.00</b>You can preview the
              request flow, but a real withdrawal will require sufficient
              balance, completed KYC and backend verification.
            </div>
            <PrimaryButton
              onClick={() =>
                canContinue
                  ? setStep("review")
                  : notify("Minimum withdrawal is ₹500")
              }
            >
              Review withdrawal
            </PrimaryButton>
          </>
        ) : (
          <>
            <section className="rounded-2xl border border-[#ece9f2] bg-white p-5">
              <SummaryRow
                label="Withdrawal amount"
                value={`₹${numericAmount.toFixed(2)}`}
              />
              <SummaryRow label="Processing fee" value="₹0.00" />
              <SummaryRow
                label="You receive"
                value={`₹${numericAmount.toFixed(2)}`}
              />
              <SummaryRow label="Expected arrival" value={method === "upi" ? "Within 24 hours after approval" : "1–3 working days after approval"} />
              <SummaryRow
                label="Payout method"
                value={
                  method === "upi" ? "Verified UPI · sha•••@upi" : "Verified bank · •••• 4582"
                }
                last
              />
            </section>
            <InfoCard
              title="Before you confirm"
              lines={[
                "KYC must be verified before processing",
                "Requests are checked for suspicious activity",
                "Expected processing time is 1–3 working days",
              ]}
            />
            <PrimaryButton
              onClick={() => {
                setStatus("pending");
                setStep("status");
              }}
            >
              Submit demo request
            </PrimaryButton>
          </>
        )}
      </div>
    );
  return (
    <DetailShell
      icon={Wallet}
      title="₹0.00 available"
      body="Track available, pending and lifetime rewards in one place."
    >
      <div className="grid grid-cols-3 gap-3">
        <Metric label="Available" value="₹0.00" />
        <Metric label="Pending" value="₹0.00" />
        <Metric label="Lifetime" value="₹0.00" />
      </div>
      <section
        className={`relative overflow-hidden rounded-[24px] bg-gradient-to-r ${purple} p-5 text-white`}
      >
        <div className="absolute -right-7 -top-8 h-28 w-28 rounded-full bg-white/10" />
        <p className="text-xs font-semibold text-white/70">Ready to withdraw</p>
        <div className="mt-1 flex items-end justify-between">
          <b className="text-3xl">₹0.00</b>
          <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-black">
            MIN ₹500
          </span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
          <div className="h-full w-0 rounded-full bg-amber-300" />
        </div>
        <p className="mt-2 text-[11px] text-white/70">
          Earn ₹500 more to unlock withdrawals
        </p>
      </section>
      <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><div className="flex gap-3"><BadgeCheck className="h-5 w-5 shrink-0 text-emerald-600" /><span><b className="block text-sm text-emerald-900">Payout protection</b><span className="mt-1 block text-xs leading-5 text-emerald-800">Verified payout methods · ₹0 processing fee · Full wallet refund if a payout fails</span></span></div></section>
      <PrimaryButton onClick={() => setStep("amount")}> 
        Preview withdrawal flow
      </PrimaryButton>
      <button
        onClick={() => open("history")}
        className="flex w-full items-center justify-between rounded-2xl border border-[#ece9f2] bg-white p-4 text-left"
      >
        <span className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600">
            <History className="h-5 w-5" />
          </span>
          <span>
            <b className="block text-sm">Transaction history</b>
            <span className="text-xs text-slate-500">
              Rewards, withdrawals and refunds
            </span>
          </span>
        </span>
        <ChevronRight className="h-5 w-5 text-slate-300" />
      </button>
      <InfoCard
        title="Withdrawal rules"
        lines={[
          "Minimum withdrawal is ₹500",
          "Complete KYC and add a verified payout method",
          "UPI and bank payouts take 1–3 working days",
          "Failed payouts return to your available balance",
        ]}
      />
    </DetailShell>
  );
}

type RewardState = "Pending" | "Approved" | "Credited" | "Rejected";

function EarningStatusExperience({
  notify,
}: {
  notify: (message: string) => void;
}) {
  const [filter, setFilter] = useState<"All" | RewardState>("All");
  const [selected, setSelected] = useState(0);
  const [appealOpen, setAppealOpen] = useState(false);
  const [appealReason, setAppealReason] = useState("");
  const rewards = [
    {
      title: "Watch & Earn · Ad 12",
      source: "Rewarded ad",
      amount: "₹0.80",
      status: "Pending" as RewardState,
      submitted: "Today · 10:42 AM",
      expected: "Expected by 6:00 PM today",
      detail:
        "The ad completion was recorded and is waiting for provider verification.",
      reason:
        "No action needed. Keep the app installed while verification completes.",
    },
    {
      title: "Shopping habits survey",
      source: "Survey",
      amount: "₹12.00",
      status: "Approved" as RewardState,
      submitted: "Today · 9:18 AM",
      expected: "Moves to wallet within 2 hours",
      detail: "Your responses passed the provider quality review.",
      reason: "Approved rewards are queued for the next wallet update.",
    },
    {
      title: "Daily check-in · Day 3",
      source: "Daily bonus",
      amount: "₹1.00",
      status: "Credited" as RewardState,
      submitted: "7 Aug · 8:05 AM",
      expected: "Credited 7 Aug · 8:06 AM",
      detail: "This reward is available in your wallet balance.",
      reason: "Reference GLN-RW-10421",
    },
    {
      title: "Pocket Budget offer",
      source: "App download",
      amount: "₹45.00",
      status: "Rejected" as RewardState,
      submitted: "6 Aug · 6:20 PM",
      expected: "Review completed 7 Aug",
      detail:
        "The provider could not confirm a first-time installation from the tracked link.",
      reason:
        "Possible previous install or tracking was interrupted before registration.",
    },
  ];
  const visible = rewards
    .map((reward, index) => ({ ...reward, index }))
    .filter((reward) => filter === "All" || reward.status === filter);
  const reward = rewards[selected];
  const tones: Record<RewardState, string> = {
    Pending: "bg-amber-100 text-amber-700",
    Approved: "bg-sky-100 text-sky-700",
    Credited: "bg-emerald-100 text-emerald-700",
    Rejected: "bg-rose-100 text-rose-700",
  };
  const icons: Record<RewardState, LucideIcon> = {
    Pending: Timer,
    Approved: BadgeCheck,
    Credited: CheckCircle2,
    Rejected: AlertTriangle,
  };
  const StatusIcon = icons[reward.status];
  const submitAppeal = () => {
    if (appealReason.trim().length < 10)
      return notify("Please add a little more detail");
    setAppealOpen(false);
    setAppealReason("");
    notify("Demo appeal submitted · reference GLN-AP-0042");
  };
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section
        className={`relative overflow-hidden rounded-[28px] bg-gradient-to-br ${purple} p-6 text-white`}
      >
        <div className="absolute -right-10 -top-14 h-40 w-40 rounded-full bg-white/10" />
        <span className="text-[10px] font-black tracking-[.18em] text-white/70">
          REWARD TRACKER
        </span>
        <h2 className="mt-2 text-2xl font-black">Know where every rupee is</h2>
        <p className="mt-2 max-w-lg text-sm leading-6 text-white/75">
          See verification progress, expected credit time and the exact reason
          if a reward needs attention.
        </p>
        <div className="mt-5 grid grid-cols-4 gap-2">
          {(
            [
              ["Pending", "2"],
              ["Approved", "1"],
              ["Credited", "1"],
              ["Rejected", "1"],
            ] as const
          ).map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl bg-white/10 p-2.5 text-center"
            >
              <b className="block text-lg">{value}</b>
              <span className="text-[9px] font-bold text-white/70">
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
        <div className="flex gap-3">
          <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
          <span>
            <b className="block text-sm text-emerald-900">
              Eligibility check before you start
            </b>
            <span className="mt-1 block text-xs leading-5 text-emerald-800">
              Account active · Device eligible · Daily limit available · No
              duplicate completion detected
            </span>
          </span>
        </div>
        <button
          onClick={() =>
            notify("Eligibility rechecked · you can start eligible tasks")
          }
          className="mt-3 rounded-full bg-white px-4 py-2 text-xs font-extrabold text-emerald-700 shadow-sm"
        >
          Recheck eligibility
        </button>
      </section>
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {(["All", "Pending", "Approved", "Credited", "Rejected"] as const).map(
          (item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold ${filter === item ? "bg-[#241b38] text-white" : "border border-[#ece9f2] bg-white text-slate-600"}`}
            >
              {item}
            </button>
          ),
        )}
      </div>
      <div className="grid gap-5 md:grid-cols-[.9fr_1.1fr]">
        <section className="overflow-hidden rounded-2xl border border-[#ece9f2] bg-white">
          {visible.map((item) => {
            const Icon = icons[item.status];
            return (
              <button
                key={item.title}
                onClick={() => setSelected(item.index)}
                className={`flex w-full items-center gap-3 border-b border-[#f0edf5] p-4 text-left last:border-0 ${selected === item.index ? "bg-violet-50/70" : ""}`}
              >
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tones[item.status]}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-sm">{item.title}</b>
                  <span className="mt-0.5 block text-[11px] text-slate-500">
                    {item.source} · {item.submitted}
                  </span>
                </span>
                <span className="text-right">
                  <b className="block text-sm text-emerald-600">
                    {item.amount}
                  </b>
                  <span
                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-black ${tones[item.status]}`}
                  >
                    {item.status}
                  </span>
                </span>
              </button>
            );
          })}
          {visible.length === 0 && (
            <div className="p-6 text-center text-xs text-slate-500">
              No rewards in this status.
            </div>
          )}
        </section>
        <section className="rounded-2xl border border-[#ece9f2] bg-white p-5">
          <div className="flex items-start gap-3">
            <span
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${tones[reward.status]}`}
            >
              <StatusIcon className="h-6 w-6" />
            </span>
            <span className="min-w-0">
              <span
                className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-black ${tones[reward.status]}`}
              >
                {reward.status}
              </span>
              <h3 className="mt-2 text-lg font-black">{reward.title}</h3>
              <p className="mt-1 text-sm font-black text-emerald-600">
                {reward.amount}
              </p>
            </span>
          </div>
          <div className="mt-5 rounded-2xl bg-[#f8f7fb] p-4">
            <SummaryRow label="Started" value={reward.submitted} />
            <SummaryRow label="Expected update" value={reward.expected} last />
          </div>
          <div className="mt-4 space-y-3 text-xs leading-5 text-slate-600">
            <p>
              <b className="block text-[#282133]">What this means</b>
              {reward.detail}
            </p>
            <p>
              <b className="block text-[#282133]">Details</b>
              {reward.reason}
            </p>
          </div>
          {reward.status === "Rejected" && (
            <button
              onClick={() => setAppealOpen(true)}
              className="mt-5 w-full rounded-xl bg-rose-600 py-3 text-sm font-extrabold text-white"
            >
              Appeal this decision
            </button>
          )}
          {reward.status === "Pending" && (
            <div className="mt-5 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
              <CalendarClock className="h-5 w-5 shrink-0" />
              We will notify you if verification takes longer than expected.
            </div>
          )}
        </section>
      </div>
      <InfoCard
        title="How reward statuses work"
        lines={[
          "Pending: completion received and under verification",
          "Approved: verified and queued for your wallet",
          "Credited: available in your wallet balance",
          "Rejected: not verified; open the reward to see why and appeal",
        ]}
      />
      <p className="text-center text-[11px] leading-5 text-slate-400">
        Sample statuses are shown for this frontend preview. Providers and
        Supabase will supply real verification data later.
      </p>
      {appealOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="appeal-title"
          className="fixed inset-0 z-50 grid place-items-end bg-black/45 p-4 sm:place-items-center"
        >
          <section className="w-full max-w-md rounded-[26px] bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black tracking-wider text-rose-500">
                  REWARD APPEAL
                </span>
                <h3 id="appeal-title" className="mt-1 text-xl font-black">
                  Tell us what happened
                </h3>
              </div>
              <button
                onClick={() => setAppealOpen(false)}
                aria-label="Close appeal"
                className="grid h-9 w-9 place-items-center rounded-full bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Explain why the installation should qualify. Support will review
              tracking evidence after backend integration.
            </p>
            <textarea
              autoFocus
              value={appealReason}
              onChange={(event) => setAppealReason(event.target.value)}
              placeholder="Example: I installed the app for the first time and completed registration through Glonni Ads…"
              className="mt-4 min-h-28 w-full rounded-2xl border border-[#e8e4ef] p-4 text-sm outline-none focus:border-violet-500"
            />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => setAppealOpen(false)}
                className="rounded-xl border border-[#e8e4ef] py-3 text-sm font-extrabold text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={submitAppeal}
                className="rounded-xl bg-violet-600 py-3 text-sm font-extrabold text-white"
              >
                Submit appeal
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function HistoryExperience() {
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const transactions = [
    {
      title: "Watch & Earn",
      category: "Ads",
      date: "Today · 10:42 AM",
      amount: "+₹0.80",
      status: "Pending",
      icon: MonitorPlay,
      tone: "bg-violet-100 text-violet-600",
    },
    {
      title: "Shopping habits survey",
      category: "Tasks",
      date: "Today · 9:18 AM",
      amount: "+₹12.00",
      status: "Pending",
      icon: ClipboardCheck,
      tone: "bg-emerald-100 text-emerald-600",
    },
    {
      title: "Pocket Budget offer",
      category: "Tasks",
      date: "Yesterday · 6:20 PM",
      amount: "+₹45.00",
      status: "Tracking",
      icon: Download,
      tone: "bg-blue-100 text-blue-600",
    },
    {
      title: "Demo withdrawal",
      category: "Withdrawals",
      date: "7 Aug · 3:05 PM",
      amount: "−₹500.00",
      status: "Failed",
      icon: Landmark,
      tone: "bg-rose-100 text-rose-600",
    },
  ];
  const visible = transactions.filter(
    (item) =>
      (filter === "All" || item.category === filter) &&
      `${item.title} ${item.category} ${item.status}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <DetailShell
      icon={History}
      title="Earning history"
      body="Search and filter every reward, withdrawal, refund and tracking update."
    >
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search transactions"
          className="w-full rounded-2xl border border-[#ece9f2] bg-white py-3.5 pl-11 pr-11 text-sm outline-none focus:border-violet-400"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {["All", "Ads", "Tasks", "Shopping", "Withdrawals"].map((item) => (
          <button
            onClick={() => setFilter(item)}
            key={item}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold ${filter === item ? "bg-[#241b38] text-white" : "border border-[#ece9f2] bg-white text-slate-600"}`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-[#ece9f2] bg-white">
        {visible.map(
          ({ title, category, date, amount, status, icon: Icon, tone }) => (
            <article
              key={`${title}-${date}`}
              className="flex items-center gap-3 border-b border-[#f0edf5] p-4 last:border-0"
            >
              <span
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tone}`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-sm text-[#282133]">{title}</b>
                <span className="text-xs text-slate-500">
                  {category} · {date}
                </span>
              </span>
              <span className="text-right">
                <b
                  className={`block text-sm ${amount.startsWith("+") ? "text-emerald-600" : "text-rose-500"}`}
                >
                  {amount}
                </b>
                <span
                  className={`text-[10px] font-bold ${status === "Failed" ? "text-rose-500" : "text-amber-600"}`}
                >
                  {status}
                </span>
              </span>
            </article>
          ),
        )}
      </div>
      {visible.length === 0 && (
        <EmptyState
          icon={History}
          title="No matching transactions"
          body="Try another search or transaction filter."
        />
      )}
      <p className="text-center text-[11px] leading-5 text-slate-400">
        Sample activity is shown to preview the frontend. Real transactions will
        appear after backend integration.
      </p>
    </DetailShell>
  );
}

function PayoutChoice({
  active,
  icon: Icon,
  title,
  body,
  onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left ${active ? "border-violet-500 bg-violet-50" : "border-[#ece9f2] bg-white"}`}
    >
      <span
        className={`grid h-11 w-11 place-items-center rounded-xl ${active ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500"}`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="flex-1">
        <b className="block text-sm">{title}</b>
        <span className="text-xs text-slate-500">{body}</span>
      </span>
      <span
        className={`grid h-5 w-5 place-items-center rounded-full border ${active ? "border-violet-600 bg-violet-600" : "border-slate-300"}`}
      >
        {active && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
      </span>
    </button>
  );
}
function SummaryRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-3 text-sm ${last ? "" : "border-b border-[#ece9f2]"}`}
    >
      <span className="text-slate-500">{label}</span>
      <b className="text-right text-[#282133]">{value}</b>
    </div>
  );
}

function DetailScreen({
  detail,
  open,
  notify,
  onLogout,
  readNotifications,
  setReadNotifications,
  textScale,
  setTextScale,
}: {
  detail: Exclude<DetailKey, null>;
  open: (detail: DetailKey) => void;
  notify: (message: string) => void;
  onLogout: () => void;
  readNotifications: string[];
  setReadNotifications: React.Dispatch<React.SetStateAction<string[]>>;
  textScale: string;
  setTextScale: (value: string) => void;
}) {
  if (detail === "notifications")
    return (
      <NotificationsExperience
        open={open}
        notify={notify}
        readNotifications={readNotifications}
        setReadNotifications={setReadNotifications}
      />
    );
  if (detail === "referral") return <ReferralExperience notify={notify} />;
  if (detail === "bonus") return <DailyBonusExperience notify={notify} />;
  if (detail === "wallet")
    return <WalletExperience open={open} notify={notify} />;
  if (detail === "history") return <HistoryExperience />;
  if (detail === "earnings") return <EarningStatusExperience notify={notify} />;
  if (detail === "personal") return <PersonalInformation notify={notify} />;
  if (detail === "payout") return <PayoutDetails notify={notify} />;
  if (detail === "kyc") return <KycExperience notify={notify} />;
  if (detail === "preferences") return <Preferences notify={notify} />;
  if (detail === "language") return <LanguageSettings notify={notify} />;
  if (detail === "accessibility") return <AccessibilitySettings notify={notify} textScale={textScale} setTextScale={setTextScale} />;
  if (detail === "support") return <SupportExperience notify={notify} />;
  if (detail === "safety") return <TrustSafetyExperience notify={notify} />;
  if (detail === "legal") return <LegalPolicies />;
  if (detail === "logout") return <LogoutPreview onLogout={onLogout} />;
  return <StoreDirectory notify={notify} />;
}

function NotificationsExperience({
  open,
  notify,
  readNotifications,
  setReadNotifications,
}: {
  open: (detail: DetailKey) => void;
  notify: (message: string) => void;
  readNotifications: string[];
  setReadNotifications: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const [filter, setFilter] = useState("All");
  const notifications = [
    {
      id: "bonus",
      category: "Rewards",
      title: "Your daily bonus is ready",
      body: "Claim Day 4 now to continue your three-day streak.",
      time: "2 min",
      icon: Gift,
      tone: "bg-orange-100 text-orange-600",
      action: "bonus" as DetailKey,
      actionLabel: "Claim bonus",
    },
    {
      id: "survey",
      category: "Tasks",
      title: "New ₹18 survey available",
      body: "Share your entertainment preferences. Estimated time: 4 minutes.",
      time: "18 min",
      icon: ClipboardCheck,
      tone: "bg-emerald-100 text-emerald-600",
      action: null,
      actionLabel: "View tasks",
    },
    {
      id: "withdrawal",
      category: "Withdrawals",
      title: "Withdrawal rules updated",
      body: "Complete KYC and reach ₹500 before requesting your first payout.",
      time: "1 hr",
      icon: Landmark,
      tone: "bg-blue-100 text-blue-600",
      action: "wallet" as DetailKey,
      actionLabel: "View wallet",
    },
    {
      id: "deal",
      category: "Offers",
      title: "Featured shopping reward",
      body: "Compare partner-store prices and preview your estimated earning.",
      time: "3 hr",
      icon: ShoppingBag,
      tone: "bg-pink-100 text-pink-600",
      action: "stores" as DetailKey,
      actionLabel: "Explore stores",
    },
    {
      id: "kyc",
      category: "Account",
      title: "Protect your account",
      body: "Preview the four-step KYC journey before backend verification is enabled.",
      time: "Yesterday",
      icon: ShieldCheck,
      tone: "bg-violet-100 text-violet-600",
      action: "kyc" as DetailKey,
      actionLabel: "View KYC",
    },
    {
      id: "ads",
      category: "Tasks",
      title: "12 ads watched today",
      body: "Eight more ads are available in today’s demo progress.",
      time: "Yesterday",
      icon: MonitorPlay,
      tone: "bg-indigo-100 text-indigo-600",
      action: null,
      actionLabel: "Continue watching",
    },
    {
      id: "welcome",
      category: "Offers",
      title: "Welcome to Glonni Ads",
      body: "Explore tasks, shopping rewards, game missions and daily bonuses.",
      time: "7 Aug",
      icon: Sparkles,
      tone: "bg-amber-100 text-amber-600",
      action: null,
      actionLabel: "Explore app",
    },
  ];
  const visible = notifications.filter(
    (item) => filter === "All" || item.category === filter,
  );
  const unreadCount = notifications.filter(
    (item) => !readNotifications.includes(item.id),
  ).length;
  const markRead = (id: string) =>
    setReadNotifications((current) =>
      current.includes(id) ? current : [...current, id],
    );
  const act = (item: (typeof notifications)[number]) => {
    markRead(item.id);
    if (item.action) open(item.action);
    else notify(`${item.actionLabel} opened in this frontend demo`);
  };
  const markAll = () => {
    setReadNotifications(notifications.map((item) => item.id));
    notify("All notifications marked as read");
  };
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <section
        className={`relative overflow-hidden rounded-[26px] bg-gradient-to-r ${purple} p-5 text-white shadow-[0_18px_45px_rgba(91,56,190,.2)]`}
      >
        <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <span className="text-[10px] font-black tracking-[.18em] text-white/70">
              NOTIFICATION CENTRE
            </span>
            <h2 className="mt-2 text-2xl font-black">
              {unreadCount
                ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}`
                : "You’re all caught up"}
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-white/75">
              Rewards, task progress, withdrawals and useful offers in one
              place.
            </p>
          </div>
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/15">
            <Bell className="h-7 w-7" />
          </span>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAll}
            className="relative mt-4 rounded-full bg-white px-4 py-2 text-xs font-black text-violet-700"
          >
            Mark all as read
          </button>
        )}
      </section>
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {["All", "Rewards", "Tasks", "Withdrawals", "Offers", "Account"].map(
          (item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition ${filter === item ? "bg-[#241b38] text-white" : "border border-[#ece9f2] bg-white text-slate-600"}`}
            >
              {item}
            </button>
          ),
        )}
      </div>
      <section className="overflow-hidden rounded-[22px] border border-[#ece9f2] bg-white">
        {visible.map((item) => {
          const unread = !readNotifications.includes(item.id);
          const Icon = item.icon;
          return (
            <article
              key={item.id}
              className={`relative border-b border-[#f0edf5] p-4 last:border-0 ${unread ? "bg-violet-50/45" : "bg-white"}`}
            >
              {unread && (
                <span className="absolute right-4 top-4 h-2.5 w-2.5 rounded-full bg-violet-600 ring-4 ring-violet-100" />
              )}
              <button
                onClick={() => act(item)}
                className="flex w-full gap-3 pr-4 text-left"
              >
                <span
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${item.tone}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-3">
                    <b
                      className={`block text-sm ${unread ? "text-[#241d34]" : "text-slate-600"}`}
                    >
                      {item.title}
                    </b>
                    <span className="shrink-0 text-[10px] text-slate-400">
                      {item.time}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    {item.body}
                  </span>
                  <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-extrabold text-violet-600">
                    {item.actionLabel}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </span>
              </button>
            </article>
          );
        })}
      </section>
      {visible.length === 0 && (
        <EmptyState
          icon={Bell}
          title="No notifications here"
          body="New updates in this category will appear here."
        />
      )}
      <button
        onClick={() => open("preferences")}
        className="flex w-full items-center justify-between rounded-2xl border border-[#ece9f2] bg-white p-4 text-left"
      >
        <span className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600">
            <Settings2 className="h-5 w-5" />
          </span>
          <span>
            <b className="block text-sm">Notification preferences</b>
            <span className="text-xs text-slate-500">
              Choose the updates you want to receive
            </span>
          </span>
        </span>
        <ChevronRight className="h-5 w-5 text-slate-300" />
      </button>
      <p className="text-center text-[11px] leading-5 text-slate-400">
        Sample notifications are shown for the frontend preview. Live updates
        will use Supabase later.
      </p>
    </div>
  );
}

function DailyBonusExperience({
  notify,
}: {
  notify: (message: string) => void;
}) {
  const [claimed, setClaimed] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const currentDay = 4;
  const rewards = [
    { day: 1, reward: "₹0.50", label: "Starter" },
    { day: 2, reward: "₹0.75", label: "Keep going" },
    { day: 3, reward: "₹1.00", label: "Momentum" },
    { day: 4, reward: "₹1.25", label: "Today" },
    { day: 5, reward: "₹1.50", label: "On fire" },
    { day: 6, reward: "₹2.00", label: "Almost there" },
    { day: 7, reward: "₹5.00", label: "Weekly prize" },
  ];
  const claim = () => {
    if (claimed) {
      notify("Today’s demo bonus is already claimed");
      return;
    }
    setClaimed(true);
    setCelebrating(true);
    notify("Day 4 bonus claimed in this demo");
    window.setTimeout(() => setCelebrating(false), 2200);
  };
  return (
    <DetailShell
      icon={Gift}
      title="Your daily reward is ready"
      body="Check in every day and complete one eligible activity to keep your streak growing."
    >
      <section
        className={`relative overflow-hidden rounded-[26px] bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-400 p-5 text-white shadow-[0_18px_40px_rgba(245,158,11,.22)]`}
      >
        <div className="absolute -right-9 -top-12 h-40 w-40 rounded-full bg-white/15" />
        <div className="absolute -bottom-12 left-20 h-28 w-28 rounded-full bg-orange-300/20" />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black tracking-[.18em] text-white/75">
              CURRENT STREAK
            </span>
            <div className="mt-1 flex items-center gap-2">
              <Flame className="h-9 w-9 fill-white" />
              <b className="text-4xl font-black">{claimed ? 4 : 3} days</b>
            </div>
            <p className="mt-2 text-xs font-semibold text-white/80">
              Come back tomorrow to protect your streak.
            </p>
          </div>
          <span className="grid h-20 w-20 shrink-0 place-items-center rounded-[24px] bg-white/20 shadow-inner">
            <Trophy className="h-11 w-11 text-yellow-100" />
          </span>
        </div>
      </section>
      <section className="rounded-[24px] border border-orange-100 bg-white p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black tracking-[.16em] text-orange-500">
              7-DAY CHECK-IN
            </span>
            <h3 className="mt-1 text-lg font-black text-[#241d34]">
              Weekly reward calendar
            </h3>
          </div>
          <span className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-black text-orange-600">
            ₹11.00 total
          </span>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7">
          {rewards.map((item) => {
            const completed =
              item.day < currentDay || (item.day === currentDay && claimed);
            const active = item.day === currentDay && !claimed;
            return (
              <button
                key={item.day}
                disabled={!active}
                onClick={claim}
                aria-label={`Day ${item.day}: ${item.reward}`}
                className={`relative min-h-24 rounded-2xl border p-2 text-center transition ${completed ? "border-emerald-200 bg-emerald-50 text-emerald-700" : active ? "border-orange-400 bg-orange-50 text-orange-600 ring-2 ring-orange-100 hover:-translate-y-0.5" : "border-slate-100 bg-slate-50 text-slate-400"}`}
              >
                {completed ? (
                  <CheckCircle2 className="mx-auto h-5 w-5" />
                ) : (
                  <Gift
                    className={`mx-auto h-5 w-5 ${active ? "animate-bounce" : ""}`}
                  />
                )}
                <b className="mt-1 block text-[10px] uppercase">
                  Day {item.day}
                </b>
                <strong className="mt-1 block text-sm">{item.reward}</strong>
                <span className="mt-1 block truncate text-[9px] font-bold">
                  {completed ? "Claimed" : item.label}
                </span>
                {active && (
                  <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-orange-500 ring-4 ring-orange-100" />
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-orange-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-500"
            style={{ width: `${((claimed ? 4 : 3) / 7) * 100}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[11px] font-bold">
          <span className="text-orange-600">
            {claimed ? 4 : 3} days completed
          </span>
          <span className="text-slate-400">₹5 weekly prize on Day 7</span>
        </div>
      </section>
      <section
        className={`rounded-2xl border p-5 text-center ${claimed ? "border-emerald-100 bg-emerald-50" : "border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50"}`}
      >
        <span
          className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${claimed ? "bg-emerald-500 text-white" : "bg-orange-500 text-white shadow-lg shadow-orange-200"}`}
        >
          {claimed ? (
            <CheckCircle2 className="h-8 w-8" />
          ) : (
            <Gift className="h-8 w-8" />
          )}
        </span>
        <h3 className="mt-3 text-lg font-black text-[#241d34]">
          {claimed ? "Today’s bonus claimed" : "Claim ₹1.25 today"}
        </h3>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">
          {claimed
            ? "Your demo streak is now 4 days. The reward will remain mock data until the wallet backend is connected."
            : "Your eligible task is marked complete in this frontend preview. Claim before midnight."}
        </p>
        {!claimed && (
          <button
            onClick={claim}
            className="mt-4 w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-3.5 text-sm font-extrabold text-white shadow-md shadow-orange-100"
          >
            Claim daily bonus
          </button>
        )}
      </section>
      <div className="grid grid-cols-3 gap-3">
        <Metric label="This week" value={claimed ? "₹3.50" : "₹2.25"} />
        <Metric label="Best streak" value="6 days" />
        <Metric label="Next prize" value="₹1.50" />
      </div>
      <section>
        <SectionTitle title="Recent check-ins" />
        <div className="overflow-hidden rounded-2xl border border-[#ece9f2] bg-white">
          <BonusHistory day="Yesterday · Day 3" reward="+₹1.00" />
          <BonusHistory day="6 Aug · Day 2" reward="+₹0.75" />
          <BonusHistory day="5 Aug · Day 1" reward="+₹0.50" last />
        </div>
      </section>
      <InfoCard
        title="How the streak works"
        lines={[
          "Open the app and complete one eligible activity each day",
          "Claim your reward before 11:59 PM local time",
          "Missing a day resets the streak to Day 1",
          "Bonus amounts and eligibility will be controlled by the backend later",
        ]}
      />
      {celebrating && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-[#1b1128]/55 p-5 backdrop-blur-sm"
          onClick={() => setCelebrating(false)}
        >
          <div
            className="w-full max-w-sm animate-bounce rounded-[30px] border border-white/60 bg-white p-7 text-center shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-xl shadow-orange-200">
              <Gift className="h-12 w-12" />
            </span>
            <span className="mt-5 block text-xs font-black tracking-[.18em] text-orange-500">
              DAY 4 COMPLETE
            </span>
            <h3 className="mt-2 text-3xl font-black text-[#241d34]">+₹1.25</h3>
            <p className="mt-2 text-sm text-slate-500">
              Daily bonus claimed in this frontend demo.
            </p>
            <button
              onClick={() => setCelebrating(false)}
              className="mt-5 w-full rounded-xl bg-orange-500 py-3 text-sm font-extrabold text-white"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </DetailShell>
  );
}

function BonusHistory({
  day,
  reward,
  last = false,
}: {
  day: string;
  reward: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 p-4 ${last ? "" : "border-b border-[#f0edf5]"}`}
    >
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-50 text-orange-500">
        <Flame className="h-5 w-5" />
      </span>
      <span className="flex-1">
        <b className="block text-sm text-[#282133]">Daily check-in</b>
        <span className="text-xs text-slate-500">{day}</span>
      </span>
      <b className="text-sm text-emerald-600">{reward}</b>
    </div>
  );
}

function ReferralExperience({ notify }: { notify: (message: string) => void }) {
  const [tab, setTab] = useState<"friends" | "earnings">("friends");
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const referralCode = "GLONNI-SHANEEL";
  const referralLink = "https://glonni.app/invite/GLONNI-SHANEEL";
  const friends = [
    {
      name: "Akhil R.",
      joined: "Joined 7 Aug",
      status: "Qualified",
      progress: 100,
      reward: "₹25.00",
      tone: "bg-emerald-100 text-emerald-700",
    },
    {
      name: "Priya S.",
      joined: "Joined 6 Aug",
      status: "In progress",
      progress: 60,
      reward: "₹0.00",
      tone: "bg-amber-100 text-amber-700",
    },
    {
      name: "Ravi K.",
      joined: "Invited 5 Aug",
      status: "Invited",
      progress: 20,
      reward: "₹0.00",
      tone: "bg-sky-100 text-sky-700",
    },
    {
      name: "Meena V.",
      joined: "Joined 3 Aug",
      status: "Not eligible",
      progress: 35,
      reward: "₹0.00",
      tone: "bg-slate-100 text-slate-600",
    },
  ];
  const visible = friends.filter(
    (friend) =>
      (filter === "All" || friend.status === filter) &&
      `${friend.name} ${friend.status}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      notify(`${label} copied`);
    } catch {
      notify(`${label} ready to copy`);
    }
  };
  const share = async () => {
    try {
      if (navigator.share)
        await navigator.share({
          title: "Join me on Glonni Ads",
          text: "Use my referral code GLONNI-SHANEEL",
          url: referralLink,
        });
      else await copy(referralLink, "Invite link");
    } catch {
      /* User closed the native share sheet. */
    }
  };
  return (
    <DetailShell
      icon={UserRoundPlus}
      title="Invite friends. Earn together."
      body="Track every invite from signup to verified reward in one place."
    >
      <section
        className={`relative overflow-hidden rounded-[24px] bg-gradient-to-r ${purple} p-5 text-white`}
      >
        <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10" />
        <div className="relative">
          <p className="text-xs font-bold text-white/70">YOUR REFERRAL CODE</p>
          <div className="mt-2 flex items-center justify-between rounded-xl bg-white/15 px-4 py-3">
            <b className="text-sm tracking-[.14em] sm:text-base">
              {referralCode}
            </b>
            <button
              aria-label="Copy referral code"
              onClick={() => copy(referralCode, "Referral code")}
              className="grid h-9 w-9 place-items-center rounded-full bg-white/15"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-3 text-xs leading-5 text-white/75">
            Earn a demo ₹25 after your friend completes the qualifying activity
            and passes verification.
          </p>
        </div>
      </section>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={share}
          className="rounded-xl bg-violet-600 py-3.5 text-sm font-extrabold text-white shadow-md"
        >
          Share invite
        </button>
        <button
          onClick={() => copy(referralLink, "Invite link")}
          className="rounded-xl border border-violet-200 bg-white py-3.5 text-sm font-extrabold text-violet-600"
        >
          Copy link
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Metric label="Invited" value="4" />
        <Metric label="Qualified" value="1" />
        <Metric label="Earned" value="₹25" />
      </div>
      <section className="rounded-2xl border border-[#ece9f2] bg-white p-5">
        <div className="flex items-center justify-between">
          <span>
            <b className="block text-sm">Next referral reward</b>
            <span className="text-xs text-slate-500">
              Priya completed 3 of 5 steps
            </span>
          </span>
          <span className="text-sm font-black text-violet-600">60%</span>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-violet-100">
          <div
            className={`h-full w-3/5 rounded-full bg-gradient-to-r ${purple}`}
          />
        </div>
      </section>
      <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
        {(
          [
            ["friends", "Invited friends"],
            ["earnings", "Earnings history"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-lg py-2.5 text-xs font-extrabold transition ${tab === key ? "bg-white text-violet-600 shadow-sm" : "text-slate-500"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "friends" ? (
        <>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search invited friends"
              className="w-full rounded-2xl border border-[#ece9f2] bg-white py-3.5 pl-11 pr-11 text-sm outline-none focus:border-violet-400"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear referral search"
                className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {["All", "Invited", "In progress", "Qualified", "Not eligible"].map(
              (item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold ${filter === item ? "bg-[#241b38] text-white" : "border border-[#ece9f2] bg-white text-slate-600"}`}
                >
                  {item}
                </button>
              ),
            )}
          </div>
          <div className="space-y-3">
            {visible.map((friend) => (
              <article
                key={friend.name}
                className="rounded-2xl border border-[#ece9f2] bg-white p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-violet-100 font-black text-violet-600">
                    {friend.name[0]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block text-sm">{friend.name}</b>
                    <span className="text-xs text-slate-500">
                      {friend.joined}
                    </span>
                  </span>
                  <span className="text-right">
                    <span
                      className={`block rounded-full px-2.5 py-1 text-[10px] font-black ${friend.tone}`}
                    >
                      {friend.status}
                    </span>
                    <b className="mt-1 block text-xs text-emerald-600">
                      {friend.reward}
                    </b>
                  </span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-violet-500"
                    style={{ width: `${friend.progress}%` }}
                  />
                </div>
              </article>
            ))}
          </div>
          {visible.length === 0 && (
            <EmptyState
              icon={UserRoundPlus}
              title="No matching referrals"
              body="Try another name or clear the status filter."
            />
          )}
        </>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#ece9f2] bg-white">
          <ReferralEarning
            title="Referral reward · Akhil R."
            date="7 Aug 2026"
            amount="+₹25.00"
            status="Verified"
          />
          <ReferralEarning
            title="Referral reward · Priya S."
            date="Pending qualification"
            amount="₹0.00"
            status="In progress"
          />
          <ReferralEarning
            title="Joining bonus campaign"
            date="1 Aug 2026"
            amount="₹0.00"
            status="Expired"
            last
          />
        </div>
      )}
      <InfoCard
        title="Referral rules"
        lines={[
          "Your friend must join through your link or enter your code",
          "Only one account per person and device is eligible",
          "The qualifying activity must be completed within 7 days",
          "Rewards are credited only after fraud and partner verification",
        ]}
      />
      <p className="text-center text-[11px] leading-5 text-slate-400">
        Invites and earnings shown here are sample data. Real referral tracking
        starts after backend integration.
      </p>
    </DetailShell>
  );
}

function ReferralEarning({
  title,
  date,
  amount,
  status,
  last = false,
}: {
  title: string;
  date: string;
  amount: string;
  status: string;
  last?: boolean;
}) {
  return (
    <article
      className={`flex items-center gap-3 p-4 ${last ? "" : "border-b border-[#f0edf5]"}`}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-600">
        <UserRoundPlus className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <b className="block truncate text-sm">{title}</b>
        <span className="text-xs text-slate-500">{date}</span>
      </span>
      <span className="text-right">
        <b className="block text-sm text-emerald-600">{amount}</b>
        <span className="text-[10px] font-bold text-slate-500">{status}</span>
      </span>
    </article>
  );
}

function PersonalInformation({
  notify,
}: {
  notify: (message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("Shaneel Kumarreddy");
  const [email, setEmail] = useState("shaneel@example.com");
  const [mobile, setMobile] = useState("+91 98••• ••742");
  return (
    <DetailShell
      icon={CircleUserRound}
      title="Your personal details"
      body="Keep your name and contact information accurate for rewards and verification."
    >
      <section className="rounded-2xl border border-[#ece9f2] bg-white p-5">
        <div className="flex items-center gap-4">
          <button
            onClick={() =>
              notify("Photo upload will be stored after backend integration")
            }
            className="relative grid h-20 w-20 place-items-center rounded-full bg-violet-100 text-violet-600"
          >
            <CircleUserRound className="h-11 w-11" />
            <span className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full bg-violet-600 text-white">
              <Camera className="h-4 w-4" />
            </span>
          </button>
          <div>
            <b className="text-lg text-[#282133]">{name}</b>
            <p className="mt-1 text-xs text-slate-500">
              Member since August 2026
            </p>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
              <BadgeCheck className="h-3 w-3" />
              Mobile verified
            </span>
          </div>
        </div>
      </section>
      <section className="space-y-4 rounded-2xl border border-[#ece9f2] bg-white p-5">
        <ProfileInput
          label="Full name"
          value={name}
          onChange={setName}
          disabled={!editing}
        />
        <ProfileInput
          label="Email address"
          value={email}
          onChange={setEmail}
          disabled={!editing}
        />
        <ProfileInput
          label="Mobile number"
          value={mobile}
          onChange={setMobile}
          disabled={!editing}
        />
        <ProfileInput label="Date of birth" value="Not added" disabled />
        <p className="text-[11px] leading-5 text-slate-400">
          Your verified mobile number and date of birth require OTP or KYC
          verification to change.
        </p>
      </section>
      {editing ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setEditing(false)}
            className="rounded-xl border border-violet-200 py-3.5 text-sm font-extrabold text-violet-600"
          >
            Cancel
          </button>
          <PrimaryButton
            onClick={() => {
              setEditing(false);
              notify("Profile changes saved in this demo");
            }}
          >
            Save changes
          </PrimaryButton>
        </div>
      ) : (
        <PrimaryButton onClick={() => setEditing(true)}>
          Edit personal information
        </PrimaryButton>
      )}
    </DetailShell>
  );
}

function ProfileInput({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block text-xs font-bold text-slate-600">
      {label}
      <input
        value={value}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value)}
        className="mt-2 w-full rounded-xl border border-[#e8e4ef] bg-white px-4 py-3 text-sm font-medium outline-none focus:border-violet-400 disabled:bg-slate-50 disabled:text-slate-500"
      />
    </label>
  );
}

function PayoutDetails({ notify }: { notify: (message: string) => void }) {
  const [tab, setTab] = useState<"upi" | "bank">("upi");
  const [upi, setUpi] = useState("");
  const [holder, setHolder] = useState("");
  const [account, setAccount] = useState("");
  const [ifsc, setIfsc] = useState("");
  const valid =
    tab === "upi"
      ? upi.includes("@")
      : holder.length > 2 && account.length >= 8 && ifsc.length === 11;
  return (
    <DetailShell
      icon={Landmark}
      title="Payout methods"
      body="Add one verified UPI ID or bank account to receive future withdrawals."
    >
      <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
        <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500 text-white"><BadgeCheck className="h-5 w-5" /></span><span className="flex-1"><b className="block text-sm text-emerald-900">Primary payout method verified</b><span className="mt-1 block text-xs leading-5 text-emerald-800">UPI · sha•••@upi · Name matched with demo KYC</span><span className="mt-2 inline-block rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-emerald-700">READY FOR PAYOUTS</span></span></div>
      </section>
      <div className="grid grid-cols-2 rounded-2xl bg-violet-50 p-1">
        <button
          onClick={() => setTab("upi")}
          className={`rounded-xl py-3 text-xs font-extrabold ${tab === "upi" ? "bg-white text-violet-600 shadow-sm" : "text-slate-500"}`}
        >
          UPI
        </button>
        <button
          onClick={() => setTab("bank")}
          className={`rounded-xl py-3 text-xs font-extrabold ${tab === "bank" ? "bg-white text-violet-600 shadow-sm" : "text-slate-500"}`}
        >
          Bank account
        </button>
      </div>
      <section className="space-y-4 rounded-2xl border border-[#ece9f2] bg-white p-5">
        {tab === "upi" ? (
          <>
            <FieldValue
              label="UPI ID"
              placeholder="name@bank"
              value={upi}
              onChange={setUpi}
              icon={Smartphone}
            />
            <p className="text-xs leading-5 text-slate-500">
              We will send a secure verification request before this UPI ID
              becomes active.
            </p>
          </>
        ) : (
          <>
            <FieldValue
              label="Account holder name"
              placeholder="Name as shown by bank"
              value={holder}
              onChange={setHolder}
              icon={CircleUserRound}
            />
            <FieldValue
              label="Account number"
              placeholder="Enter account number"
              value={account}
              onChange={setAccount}
              icon={CreditCard}
            />
            <FieldValue
              label="IFSC code"
              placeholder="e.g. SBIN0001234"
              value={ifsc}
              onChange={(value) => setIfsc(value.toUpperCase())}
              icon={Landmark}
            />
          </>
        )}
      </section>
      <div className="rounded-2xl bg-amber-50 p-4 text-xs leading-5 text-amber-800">
        <b className="block">Verification required</b>Your payout name must
        match your KYC identity. Never share your UPI PIN, OTP or bank password.
      </div>
      <InfoCard title="How verification protects you" lines={["A small provider validation confirms the account exists", "The account-holder name must match verified KYC", "Glonni never asks for a UPI PIN, bank password or card PIN", "Changing a verified method may temporarily pause withdrawals"]} />
      <button
        disabled={!valid}
        onClick={() =>
          notify(
            `${tab === "upi" ? "UPI ID" : "Bank account"} ready for backend verification`,
          )
        }
        className={`w-full rounded-xl bg-gradient-to-r ${purple} py-3.5 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40`}
      >
        Save & verify
      </button>
    </DetailShell>
  );
}

function FieldValue({
  label,
  placeholder,
  value,
  onChange,
  icon: Icon,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  icon: LucideIcon;
}) {
  return (
    <label className="block text-xs font-bold text-slate-600">
      {label}
      <span className="relative mt-2 block">
        <Icon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-[#e8e4ef] bg-white py-3 pl-11 pr-4 text-sm font-normal outline-none focus:border-violet-400"
        />
      </span>
    </label>
  );
}

function KycExperience({ notify }: { notify: (message: string) => void }) {
  const [stage, setStage] = useState(1);
  const stages = [
    {
      title: "Mobile verification",
      body: "Verified mobile number",
      done: true,
    },
    { title: "PAN verification", body: "Enter and verify your PAN" },
    {
      title: "Identity document",
      body: "Upload Aadhaar, passport or voter ID",
    },
    { title: "Selfie check", body: "Complete a secure face match" },
  ];
  return (
    <DetailShell
      icon={ShieldCheck}
      title="Complete your KYC"
      body="Identity verification protects your account and unlocks reward withdrawals."
    >
      <section
        className={`rounded-2xl bg-gradient-to-r ${purple} p-5 text-white`}
      >
        <div className="flex items-center justify-between">
          <span>
            <span className="text-xs text-white/70">Verification progress</span>
            <b className="mt-1 block text-2xl">{stage} of 4 steps</b>
          </span>
          <span className="grid h-14 w-14 place-items-center rounded-full bg-white/15 text-lg font-black">
            {stage * 25}%
          </span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-amber-300 transition-all"
            style={{ width: `${stage * 25}%` }}
          />
        </div>
      </section>
      <div className="space-y-3">
        {stages.map((item, index) => (
          <button
            key={item.title}
            disabled={index > stage}
            onClick={() =>
              index <= stage && setStage(Math.max(stage, index + 1))
            }
            className={`flex w-full gap-3 rounded-2xl border p-4 text-left ${index < stage ? "border-emerald-100 bg-emerald-50" : index === stage ? "border-violet-300 bg-white ring-2 ring-violet-100" : "border-[#ece9f2] bg-white opacity-55"}`}
          >
            <span
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${index < stage ? "bg-emerald-500 text-white" : "bg-violet-100 text-violet-600"}`}
            >
              {index < stage ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
            </span>
            <span className="flex-1">
              <b className="block text-sm">{item.title}</b>
              <span className="text-xs text-slate-500">{item.body}</span>
            </span>
            {index === stage && (
              <ChevronRight className="h-5 w-5 text-violet-500" />
            )}
          </button>
        ))}
      </div>
      {stage < 4 ? (
        <section className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 p-5 text-center">
          <Upload className="mx-auto h-8 w-8 text-violet-500" />
          <b className="mt-3 block text-sm">{stages[stage].title}</b>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            This preview does not upload or store any document.
          </p>
          <button
            onClick={() => {
              setStage(Math.min(4, stage + 1));
              notify("Demo KYC step completed");
            }}
            className="mt-4 rounded-xl bg-violet-600 px-5 py-3 text-xs font-extrabold text-white"
          >
            Preview this step
          </button>
        </section>
      ) : (
        <div className="rounded-2xl bg-emerald-50 p-5 text-center text-emerald-800">
          <CheckCircle2 className="mx-auto h-9 w-9" />
          <b className="mt-2 block text-sm">KYC flow preview complete</b>
          <p className="mt-1 text-xs">
            Real verification will begin after a licensed KYC provider is
            connected.
          </p>
        </div>
      )}
      <InfoCard
        title="Keep your identity safe"
        lines={[
          "Documents are processed only by a secure KYC provider",
          "Your name must match your payout account",
          "Never share an OTP with anyone claiming to be support",
        ]}
      />
    </DetailShell>
  );
}

function Preferences({ notify }: { notify: (message: string) => void }) {
  const defaultSettings = {
    rewards: true,
    tasks: true,
    withdrawals: true,
    promotions: false,
    email: false,
  };
  const [settings, setSettings] = useState(defaultSettings);
  const [theme, setTheme] = useState("light");
  const [dataSaver, setDataSaver] = useState(false);
  const [interests, setInterests] = useState<string[]>(["Watch ads"]);
  const [quietHours, setQuietHours] = useState(true);
  const interestOptions = ["Watch ads", "Surveys", "App offers", "Shopping", "Games"];

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("glonni-theme") || "light";
    setTheme(savedTheme);
    setDataSaver(window.localStorage.getItem("glonni-data-saver") === "on");
    setQuietHours(window.localStorage.getItem("glonni-quiet-hours") !== "off");
    try {
      const savedNotifications = window.localStorage.getItem("glonni-notifications");
      if (savedNotifications) setSettings(JSON.parse(savedNotifications));
      const savedInterests = window.localStorage.getItem("glonni-demo-interests");
      if (savedInterests) setInterests(JSON.parse(savedInterests));
    } catch {
      setSettings(defaultSettings);
    }
  // Defaults are intentionally used only when this screen first opens.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyTheme = (nextTheme: string) => {
    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    window.localStorage.setItem("glonni-theme", nextTheme);
  };

  const save = () => {
    window.localStorage.setItem("glonni-notifications", JSON.stringify(settings));
    window.localStorage.setItem("glonni-demo-interests", JSON.stringify(interests));
    window.localStorage.setItem("glonni-data-saver", dataSaver ? "on" : "off");
    window.localStorage.setItem("glonni-quiet-hours", quietHours ? "on" : "off");
    notify("Personalization settings saved on this device");
  };
  const rows = [
    {
      key: "rewards",
      title: "Reward updates",
      body: "Credits, pending rewards and confirmations",
    },
    {
      key: "tasks",
      title: "New earning tasks",
      body: "Fresh ads, surveys, apps and games",
    },
    {
      key: "withdrawals",
      title: "Withdrawal updates",
      body: "Request, verification and payout status",
    },
    {
      key: "promotions",
      title: "Deals & promotions",
      body: "Shopping offers and partner campaigns",
    },
    {
      key: "email",
      title: "Email summary",
      body: "Weekly account and earning summary",
    },
  ] as const;
  return (
    <DetailShell
      icon={Settings2}
      title="Personalization & settings"
      body="Make Glonni Ads comfortable, relevant and lighter on your mobile data."
    >
      <section>
        <SectionTitle title="Appearance" />
        <div className="grid grid-cols-2 gap-3">
          {[{ key: "light", label: "Light", icon: Sun }, { key: "dark", label: "Dark", icon: Moon }].map((item) => {
            const Icon = item.icon;
            return <button key={item.key} onClick={() => applyTheme(item.key)} className={`flex items-center justify-center gap-2 rounded-2xl border p-4 text-sm font-extrabold ${theme === item.key ? "border-violet-500 bg-violet-50 text-violet-700" : "border-[#ece9f2] bg-white text-slate-500"}`}>
              <Icon className="h-5 w-5" />{item.label}
            </button>;
          })}
        </div>
      </section>

      <section>
        <SectionTitle title="Your earning interests" />
        <p className="mb-3 text-xs leading-5 text-slate-500">Used to order recommendations on Home. It never blocks other task types.</p>
        <div className="flex flex-wrap gap-2">
          {interestOptions.map((interest) => <button key={interest} onClick={() => setInterests((current) => current.includes(interest) ? current.filter((value) => value !== interest) : [...current, interest])} className={`rounded-full border px-3 py-2 text-xs font-extrabold ${interests.includes(interest) ? "border-violet-500 bg-violet-50 text-violet-700" : "border-[#e7e2ef] bg-white text-slate-500"}`}>
            {interests.includes(interest) && "✓ "}{interest}
          </button>)}
        </div>
      </section>

      <section>
        <SectionTitle title="Notifications" />
      <div className="overflow-hidden rounded-2xl border border-[#ece9f2] bg-white">
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex items-center gap-4 border-b border-[#f0edf5] p-4 last:border-0"
          >
            <span className="flex-1">
              <b className="block text-sm">{row.title}</b>
              <span className="mt-1 block text-xs text-slate-500">
                {row.body}
              </span>
            </span>
            <button
              role="switch"
              aria-checked={settings[row.key]}
              onClick={() =>
                setSettings((current) => ({
                  ...current,
                  [row.key]: !current[row.key],
                }))
              }
              className={`relative h-7 w-12 rounded-full transition ${settings[row.key] ? "bg-violet-600" : "bg-slate-200"}`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${settings[row.key] ? "left-6" : "left-1"}`}
              />
            </button>
          </div>
        ))}
      </div>
        <ToggleRow title="Quiet hours" body="Pause promotional alerts from 10 PM to 8 AM" value={quietHours} onChange={() => setQuietHours((value) => !value)} />
      </section>

      <section>
        <SectionTitle title="Mobile data" />
        <div className="rounded-2xl border border-[#ece9f2] bg-white p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><Gauge className="h-5 w-5" /></span>
            <span className="flex-1"><b className="block text-sm">Data-saving mode</b><span className="mt-1 block text-xs leading-5 text-slate-500">Reduce image quality and stop automatic media previews. Reward tracking is unchanged.</span></span>
            <Switch value={dataSaver} onChange={() => setDataSaver((value) => !value)} label="Data-saving mode" />
          </div>
          {dataSaver && <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700">On · Best for slower mobile connections</p>}
        </div>
      </section>

      <p className="rounded-2xl bg-amber-50 px-4 py-3 text-[11px] leading-5 text-amber-800">These frontend preferences are stored only on this device. Account-wide sync will begin after Supabase is connected.</p>
      <PrimaryButton onClick={save}>Save all settings</PrimaryButton>
    </DetailShell>
  );
}

function Switch({ value, onChange, label }: { value: boolean; onChange: () => void; label: string }) {
  return <button role="switch" aria-label={label} aria-checked={value} onClick={onChange} className={`relative h-7 w-12 shrink-0 rounded-full transition ${value ? "bg-violet-600" : "bg-slate-200"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${value ? "left-6" : "left-1"}`} /></button>;
}

function ToggleRow({ title, body, value, onChange }: { title: string; body: string; value: boolean; onChange: () => void }) {
  return <div className="mt-3 flex items-center gap-4 rounded-2xl border border-[#ece9f2] bg-white p-4"><span className="flex-1"><b className="block text-sm">{title}</b><span className="mt-1 block text-xs text-slate-500">{body}</span></span><Switch value={value} onChange={onChange} label={title} /></div>;
}

function AccessibilitySettings({
  notify,
  textScale,
  setTextScale,
}: {
  notify: (message: string) => void;
  textScale: string;
  setTextScale: (value: string) => void;
}) {
  const [highContrast, setHighContrast] = useState(false);
  useEffect(() => {
    setHighContrast(window.localStorage.getItem("glonni-high-contrast") === "true");
  }, []);
  const applyScale = (value: string) => {
    setTextScale(value);
    document.documentElement.dataset.textScale = value;
    window.localStorage.setItem("glonni-text-scale", value);
    notify(`Text size set to ${value}%`);
  };
  const toggleContrast = () => {
    const next = !highContrast;
    setHighContrast(next);
    document.documentElement.classList.toggle("high-contrast", next);
    window.localStorage.setItem("glonni-high-contrast", String(next));
    notify(next ? "High contrast enabled" : "Standard contrast restored");
  };
  return (
    <DetailShell
      icon={Accessibility}
      title="Accessibility"
      body="Adjust readability and interaction settings for this device."
    >
      <section className="rounded-2xl border border-[#ece9f2] bg-white p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700"><Type className="h-5 w-5" aria-hidden="true" /></span>
          <span><b className="block text-sm">Text size</b><span className="mt-1 block text-xs leading-5 text-slate-500">Increase text across the app without zooming the whole screen.</span></span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2" role="radiogroup" aria-label="App text size">
          {[{ value: "100", label: "Default" }, { value: "112", label: "Large" }, { value: "125", label: "Extra large" }].map((option) => (
            <button key={option.value} role="radio" aria-checked={textScale === option.value} onClick={() => applyScale(option.value)} className={`min-h-12 rounded-xl border px-2 text-xs font-extrabold ${textScale === option.value ? "border-violet-600 bg-violet-600 text-white" : "border-[#e7e2ef] bg-white text-slate-600"}`}>{option.label}<span className="mt-0.5 block text-[10px]">{option.value}%</span></button>
          ))}
        </div>
      </section>
      <button role="switch" aria-checked={highContrast} onClick={toggleContrast} className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-[#ece9f2] bg-white p-4 text-left">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700"><Contrast className="h-5 w-5" aria-hidden="true" /></span>
        <span className="flex-1"><b className="block text-sm">High contrast</b><span className="mt-1 block text-xs leading-5 text-slate-500">Strengthen borders, text and keyboard focus indicators.</span></span>
        <span aria-hidden="true" className={`relative h-7 w-12 shrink-0 rounded-full ${highContrast ? "bg-violet-600" : "bg-slate-200"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow ${highContrast ? "left-6" : "left-1"}`} /></span>
      </button>
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
        <div className="flex gap-3"><MousePointer2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /><div><b className="block text-sm">Navigation improvements active</b><ul className="mt-2 space-y-1 text-xs leading-5"><li>• 48 px minimum touch controls</li><li>• Visible keyboard focus</li><li>• Escape closes the current overlay or screen</li><li>• Screen-reader status announcements</li></ul></div></div>
      </section>
      <p className="rounded-2xl bg-sky-50 px-4 py-3 text-xs leading-5 text-sky-900" role="status">Accessibility settings are stored on this device and apply immediately.</p>
    </DetailShell>
  );
}

function LanguageSettings({ notify }: { notify: (message: string) => void }) {
  const [language, setLanguage] = useState("English");
  useEffect(() => setLanguage(window.localStorage.getItem("glonni-language") || "English"), []);
  return (
    <DetailShell
      icon={Languages}
      title="Choose app language"
      body="Select the language used for navigation, task instructions and support."
    >
      <div className="overflow-hidden rounded-2xl border border-[#ece9f2] bg-white">
        {[
          { name: "English", native: "English" },
          { name: "Telugu", native: "తెలుగు" },
          { name: "Hindi", native: "हिन्दी" },
        ].map((item) => (
          <button
            key={item.name}
            onClick={() => setLanguage(item.name)}
            className="flex w-full items-center gap-3 border-b border-[#f0edf5] p-4 text-left last:border-0"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-violet-50 text-lg font-black text-violet-600">
              {item.name[0]}
            </span>
            <span className="flex-1">
              <b className="block text-sm">{item.native}</b>
              <span className="text-xs text-slate-500">{item.name}</span>
            </span>
            <span
              className={`grid h-5 w-5 place-items-center rounded-full border ${language === item.name ? "border-violet-600 bg-violet-600" : "border-slate-300"}`}
            >
              {language === item.name && (
                <CheckCircle2 className="h-3.5 w-3.5 text-white" />
              )}
            </span>
          </button>
        ))}
      </div>
      <p className="text-xs leading-5 text-slate-500">
        Telugu and Hindi content will become available after translations are
        reviewed.
      </p>
      <PrimaryButton
        onClick={() => {
          window.localStorage.setItem("glonni-language", language);
          notify(`${language} saved as your app language`);
        }}
      >
        Apply language
      </PrimaryButton>
    </DetailShell>
  );
}

function SupportExperience({ notify }: { notify: (message: string) => void }) {
  const [view, setView] = useState<"help" | "create" | "tickets">("help");
  const [topic, setTopic] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Missing reward");
  const [reference, setReference] = useState("");
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState("");
  const [tickets, setTickets] = useState([
    { id: "GLN-SUP-1042", category: "Withdrawal issue", subject: "Payout verification", status: "Waiting for you", updated: "Today, 11:20 AM" },
    { id: "GLN-SUP-0981", category: "Missing reward", subject: "Game milestone reward", status: "Resolved", updated: "06 Aug, 4:45 PM" },
  ]);
  const faqs = [
    {
      q: "Why is my reward pending?",
      a: "Partner tasks are checked before rewards become available. The expected time is shown inside each offer.",
      tags: "reward pending verification task",
    },
    {
      q: "Why did task tracking fail?",
      a: "Start through Glonni Ads, use the same device and complete every requirement before the deadline.",
      tags: "tracking app survey game install",
    },
    {
      q: "When will a withdrawal arrive?",
      a: "Verified UPI and bank payouts are expected within 1–3 working days after approval.",
      tags: "withdrawal payout upi bank money",
    },
    {
      q: "Is KYC required?",
      a: "Yes. KYC will be required before your first withdrawal to protect users and prevent fraud.",
      tags: "kyc identity verification",
    },
    {
      q: "How do I report missing cashback?",
      a: "Wait until the store's expected tracking time has passed, then share the order ID, purchase date and tracked store-visit reference.",
      tags: "shop cashback missing purchase order",
    },
    {
      q: "What evidence helps resolve an issue?",
      a: "Attach a clear screenshot showing the completion, order or payout status. Never upload passwords, OTPs, PINs or full card details.",
      tags: "screenshot proof evidence attachment safety",
    },
  ];
  const filteredFaqs = faqs.filter((item) => `${item.q} ${item.a} ${item.tags}`.toLowerCase().includes(query.toLowerCase()));
  const categories = ["Missing reward", "Withdrawal issue", "Task tracking", "Shop cashback", "Account & KYC", "Technical problem", "Other"];
  const submitTicket = () => {
    if (message.trim().length < 10) return;
    const id = `GLN-SUP-${String(1100 + tickets.length)}`;
    setTickets([{ id, category, subject: message.trim().slice(0, 42), status: "Submitted", updated: "Just now" }, ...tickets]);
    setMessage(""); setReference(""); setAttachment(""); setView("tickets");
    notify(`Support ticket ${id} created`);
  };
  return (
    <DetailShell
      icon={CircleHelp}
      title="How can we help?"
      body="Find a quick answer or create a support request."
    >
      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-[#eeeaf8] p-1.5">
        {([ ["help", "Help centre"], ["create", "New ticket"], ["tickets", "My tickets"] ] as const).map(([key, label]) => <button key={key} onClick={() => setView(key)} className={`rounded-xl px-2 py-2.5 text-[11px] font-extrabold transition ${view === key ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"}`}>{label}</button>)}
      </div>

      {view === "help" && <>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search rewards, withdrawals, KYC…" className="w-full rounded-2xl border border-[#ece9f2] bg-white py-3.5 pl-11 pr-4 text-sm outline-none focus:border-violet-400" />
        </div>
        <section>
          <SectionTitle title={query ? `${filteredFaqs.length} help results` : "Frequently asked questions"} />
          <div className="overflow-hidden rounded-2xl border border-[#ece9f2] bg-white">
          {filteredFaqs.map((item) => (
            <button
              key={item.q}
              onClick={() => setTopic(topic === item.q ? null : item.q)}
              className="w-full border-b border-[#f0edf5] p-4 text-left last:border-0"
            >
              <span className="flex items-center justify-between gap-3">
                <b className="text-sm">{item.q}</b>
                <ChevronRight
                  className={`h-4 w-4 shrink-0 text-violet-500 transition ${topic === item.q ? "rotate-90" : ""}`}
                />
              </span>
              {topic === item.q && (
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  {item.a}
                </p>
              )}
            </button>
          ))}
          {filteredFaqs.length === 0 && <div className="p-6 text-center"><CircleHelp className="mx-auto h-7 w-7 text-slate-300" /><b className="mt-2 block text-sm">No exact answer found</b><p className="mt-1 text-xs text-slate-500">Create a ticket and include the relevant tracking reference.</p><button onClick={() => setView("create")} className="mt-4 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-extrabold text-white">Create ticket</button></div>}
          </div>
        </section>
        <button onClick={() => { setCategory("Missing reward"); setView("create"); }} className="flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left"><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-700"><Coins className="h-5 w-5" /></span><span className="flex-1"><b className="block text-sm text-amber-950">Reward not received?</b><span className="text-xs text-amber-700">Open a priority missing-reward report</span></span><ChevronRight className="h-4 w-4 text-amber-600" /></button>
      </>}

      {view === "create" && <section className="rounded-2xl border border-[#ece9f2] bg-white p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-violet-100 text-violet-600">
            <MessageSquare className="h-5 w-5" />
          </span>
          <span>
            <b className="block text-sm">Create support ticket</b><span className="text-xs text-slate-500">Expected first reply: within 24 hours</span>
          </span>
        </div>
        <label className="mt-4 block text-xs font-bold text-slate-600">Issue category</label>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`shrink-0 rounded-full px-3 py-2 text-[11px] font-bold ${category === item ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600"}`}>{item}</button>)}</div>
        <label className="mt-4 block text-xs font-bold text-slate-600">Tracking, order or withdrawal reference</label>
        <input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Example: GLN-WD-000128 (optional)" className="mt-2 w-full rounded-xl border border-[#e8e4ef] p-3 text-sm outline-none focus:border-violet-400" />
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Tell us what happened…"
          className="mt-4 min-h-28 w-full resize-none rounded-xl border border-[#e8e4ef] p-3 text-sm outline-none focus:border-violet-400"
        />
        <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-violet-300 bg-violet-50 p-3 text-violet-700"><Upload className="h-5 w-5" /><span className="flex-1"><b className="block text-xs">{attachment || "Attach screenshot"}</b><span className="text-[10px] text-violet-500">PNG or JPG · demo filename only</span></span><input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={(event) => setAttachment(event.target.files?.[0]?.name || "")} /></label>
        <p className="mt-3 text-[10px] leading-4 text-slate-400">Do not upload OTPs, UPI PINs, passwords or full bank/card details.</p>
        <button
          disabled={message.trim().length < 10}
          onClick={submitTicket}
          className="mt-3 w-full rounded-xl bg-violet-600 py-3 text-xs font-extrabold text-white disabled:opacity-40"
        >
          Submit ticket
        </button>
      </section>}

      {view === "tickets" && <section><div className="flex items-end justify-between"><SectionTitle title="Your support tickets" /><button onClick={() => setView("create")} className="mb-3 text-xs font-extrabold text-violet-600">+ New ticket</button></div><div className="space-y-3">{tickets.map((ticket) => <article key={ticket.id} className="rounded-2xl border border-[#ece9f2] bg-white p-4"><div className="flex items-start justify-between gap-3"><span><span className="text-[10px] font-extrabold uppercase tracking-wider text-violet-600">{ticket.category}</span><b className="mt-1 block text-sm">{ticket.subject}</b><span className="mt-1 block text-[11px] text-slate-400">{ticket.id} · {ticket.updated}</span></span><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${ticket.status === "Resolved" ? "bg-emerald-100 text-emerald-700" : ticket.status === "Waiting for you" ? "bg-amber-100 text-amber-700" : "bg-violet-100 text-violet-700"}`}>{ticket.status}</span></div><div className="mt-4 grid grid-cols-3 gap-1 text-center text-[9px] font-bold text-slate-400"><span className="text-emerald-600">Submitted</span><span className={ticket.status !== "Submitted" ? "text-emerald-600" : ""}>In review</span><span className={ticket.status === "Resolved" ? "text-emerald-600" : ""}>Resolved</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full bg-emerald-500 ${ticket.status === "Resolved" ? "w-full" : ticket.status === "Waiting for you" ? "w-2/3" : "w-1/3"}`} /></div>{ticket.status === "Waiting for you" && <button onClick={() => { setMessage(`Reply for ${ticket.id}: `); setReference(ticket.id); setCategory(ticket.category); setView("create"); }} className="mt-3 w-full rounded-xl border border-amber-200 bg-amber-50 py-2.5 text-xs font-extrabold text-amber-700">Reply with requested details</button>}</article>)}</div></section>}
      <p className="text-center text-[11px] text-slate-400">
        This frontend preview stores tickets only for the current session. Real ticket sync and replies require backend integration.
      </p>
    </DetailShell>
  );
}

function TrustSafetyExperience({ notify }: { notify: (message: string) => void }) {
  const [section, setSection] = useState<
    "overview" | "rules" | "account" | "control"
  >("overview");
  const [warningOpen, setWarningOpen] = useState(false);
  const [appealOpen, setAppealOpen] = useState(false);
  const [appealText, setAppealText] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const tabs = [
    { key: "overview" as const, label: "How it works" },
    { key: "rules" as const, label: "Rules" },
    { key: "account" as const, label: "Account" },
    { key: "control" as const, label: "Your data" },
  ];
  const earningSteps = [
    ["1", "Choose an eligible offer", "Check device, location, deadline and first-user requirements."],
    ["2", "Start through Glonni Ads", "A tracking reference links your activity to the partner offer."],
    ["3", "Complete every requirement", "Keep the app installed or purchase active until verification finishes."],
    ["4", "Partner verifies the activity", "The reward moves from pending to approved, credited or rejected."],
    ["5", "Withdraw verified earnings", "KYC and a verified UPI or bank account will be required."],
  ];
  const rules = [
    ["One genuine account", "Do not create duplicate accounts or share devices to repeat new-user offers."],
    ["Use accurate details", "Profile, KYC and payout information must belong to the account holder."],
    ["Complete tasks honestly", "Bots, VPN manipulation, emulators, automated clicks and fabricated proof are prohibited."],
    ["Keep purchases valid", "Cancelled, returned or refunded orders do not qualify for cashback."],
    ["Wait for verification", "Do not uninstall an offer app or change tracking permissions before the stated check is complete."],
  ];
  const submitAppeal = () => {
    notify("Demo account appeal submitted · GLN-SA-0091");
    setAppealOpen(false);
    setAppealText("");
  };
  const requestDeletion = () => {
    notify("Demo deletion request prepared · not sent to a server");
    setDeleteOpen(false);
    setDeleteText("");
  };
  return (
    <DetailShell
      icon={ShieldCheck}
      title="Trust & safety centre"
      body="Understand every reward, protect your account and stay in control of your data."
    >
      <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Trust and safety sections">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSection(tab.key)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-extrabold transition ${
              section === tab.key
                ? "bg-violet-600 text-white"
                : "border border-[#e8e4ef] bg-white text-slate-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {section === "overview" && (
        <>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
            <div className="flex gap-3">
              <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-xs leading-5">
                <b className="block text-sm">Know where every rupee is</b>
                Glonni Ads shows eligibility, tracking status, expected verification time and the final decision for each reward.
              </p>
            </div>
          </div>
          <section>
            <SectionTitle title="How earning works" />
            <div className="space-y-3">
              {earningSteps.map(([number, title, body]) => (
                <div key={number} className="flex gap-3 rounded-2xl border border-[#ece9f2] bg-white p-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-100 text-sm font-black text-violet-700">
                    {number}
                  </span>
                  <p className="text-xs leading-5 text-slate-500">
                    <b className="block text-sm text-[#282133]">{title}</b>{body}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {section === "rules" && (
        <>
          <section className="rounded-2xl border border-[#ece9f2] bg-white p-5">
            <div className="flex items-center gap-3">
              <LockKeyhole className="h-5 w-5 text-violet-600" />
              <b>Rules that protect genuine users</b>
            </div>
            <div className="mt-4 space-y-4">
              {rules.map(([title, body]) => (
                <div key={title} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <p className="text-xs leading-5 text-slate-500"><b className="block text-[#282133]">{title}</b>{body}</p>
                </div>
              ))}
            </div>
          </section>
          <div className="rounded-2xl bg-amber-50 p-4 text-xs leading-5 text-amber-900">
            <b className="block">Fair review before action</b>
            Suspicious activity may pause rewards for review. Users should see the reason, evidence requested and an appeal option before a final restriction.
          </div>
        </>
      )}

      {section === "account" && (
        <>
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <span>
                <span className="text-xs text-emerald-700">Account standing</span>
                <b className="mt-1 block text-lg text-emerald-950">Good standing</b>
              </span>
              <BadgeCheck className="h-9 w-9 text-emerald-600" />
            </div>
            <p className="mt-3 text-xs leading-5 text-emerald-800">No active restrictions. One resolved demo warning is available below to preview the review and appeal experience.</p>
          </section>
          <section className="overflow-hidden rounded-2xl border border-[#ece9f2] bg-white">
            <button onClick={() => setWarningOpen(!warningOpen)} className="flex w-full items-center gap-3 p-4 text-left">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-700"><AlertTriangle className="h-5 w-5" /></span>
              <span className="flex-1"><b className="block text-sm">Tracking mismatch · resolved</b><span className="text-xs text-slate-500">Game mission · Demo example</span></span>
              <ChevronRight className={`h-4 w-4 text-violet-500 transition ${warningOpen ? "rotate-90" : ""}`} />
            </button>
            {warningOpen && (
              <div className="border-t border-[#f0edf5] p-4 text-xs leading-5 text-slate-500">
                <b className="text-[#282133]">Why it appeared</b>
                <p>The partner reported a different device identifier during milestone verification. No reward was removed.</p>
                <b className="mt-3 block text-[#282133]">What users can do</b>
                <p>Review the tracking reference, attach relevant proof and appeal within 30 days.</p>
                <button onClick={() => setAppealOpen(true)} className="mt-4 flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 font-extrabold text-white"><RotateCcw className="h-4 w-4" />Preview appeal</button>
              </div>
            )}
          </section>
        </>
      )}

      {section === "control" && (
        <>
          <section className="rounded-2xl border border-[#ece9f2] bg-white p-5">
            <div className="flex items-center gap-3"><FileText className="h-5 w-5 text-violet-600" /><b>Your privacy controls</b></div>
            <div className="mt-4 space-y-3 text-xs leading-5 text-slate-500">
              <p><b className="text-[#282133]">Access:</b> Request a copy of account, reward and support data after backend integration.</p>
              <p><b className="text-[#282133]">Correction:</b> Update profile details or contact support for verified-field changes.</p>
              <p><b className="text-[#282133]">Deletion:</b> Request account deletion. Legal, fraud-prevention or payment records may be retained only where required.</p>
            </div>
          </section>
          <button onClick={() => setDeleteOpen(true)} className="flex w-full items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-left text-rose-800">
            <span><b className="block text-sm">Request account deletion</b><span className="text-xs">Preview the protected deletion flow</span></span><ChevronRight className="h-5 w-5" />
          </button>
          <p className="text-center text-[11px] leading-5 text-slate-400">This frontend preview stores only local demo data. No deletion request is sent to a server.</p>
        </>
      )}

      {appealOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="safety-appeal-title" className="fixed inset-0 z-50 grid place-items-end bg-slate-950/40 p-4 md:place-items-center">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3"><span><span className="text-xs font-bold text-violet-600">DEMO APPEAL</span><h3 id="safety-appeal-title" className="mt-1 text-xl font-black">Explain what happened</h3></span><button onClick={() => setAppealOpen(false)} aria-label="Close appeal"><X className="h-5 w-5" /></button></div>
            <textarea value={appealText} onChange={(event) => setAppealText(event.target.value)} placeholder="Add tracking details or evidence…" className="mt-4 min-h-28 w-full resize-none rounded-xl border border-[#e8e4ef] p-3 text-sm outline-none focus:border-violet-400" />
            <button disabled={appealText.trim().length < 10} onClick={submitAppeal} className="mt-3 w-full rounded-xl bg-violet-600 py-3 text-sm font-extrabold text-white disabled:opacity-40">Submit demo appeal</button>
          </div>
        </div>
      )}

      {deleteOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="delete-title" className="fixed inset-0 z-50 grid place-items-end bg-slate-950/40 p-4 md:place-items-center">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3"><span><span className="text-xs font-bold text-rose-600">SENSITIVE ACTION</span><h3 id="delete-title" className="mt-1 text-xl font-black">Delete your account?</h3></span><button onClick={() => setDeleteOpen(false)} aria-label="Close deletion request"><X className="h-5 w-5" /></button></div>
            <p className="mt-3 text-xs leading-5 text-slate-500">Production deletion will first block new earning activity, settle eligible pending rewards, verify identity and provide a cancellation window. Type <b>DELETE</b> to preview the request.</p>
            <input value={deleteText} onChange={(event) => setDeleteText(event.target.value)} placeholder="Type DELETE" className="mt-4 w-full rounded-xl border border-[#e8e4ef] p-3 text-sm outline-none focus:border-rose-400" />
            <button disabled={deleteText !== "DELETE"} onClick={requestDeletion} className="mt-3 w-full rounded-xl bg-rose-500 py-3 text-sm font-extrabold text-white disabled:opacity-40">Prepare deletion request</button>
            <button onClick={() => setDeleteOpen(false)} className="mt-2 w-full py-2 text-xs font-extrabold text-slate-500">Keep my account</button>
          </div>
        </div>
      )}
    </DetailShell>
  );
}

function LegalPolicies() {
  const [open, setOpen] = useState("Terms of use");
  const policies = [
    {
      title: "Terms of use",
      body: "Explains eligibility, genuine task completion, reward verification and prohibited misuse.",
    },
    {
      title: "Privacy policy",
      body: "Explains what account, device, task and payout data may be collected and why.",
    },
    {
      title: "Reward policy",
      body: "Covers pending periods, reversals, returns, duplicate activity and partner validation.",
    },
    {
      title: "Account deletion",
      body: "Explains how a user can request account and associated personal-data deletion.",
    },
  ];
  return (
    <DetailShell
      icon={FileText}
      title="Legal & policies"
      body="Review the rules that govern your account, privacy and rewards."
    >
      <div className="overflow-hidden rounded-2xl border border-[#ece9f2] bg-white">
        {policies.map((item) => (
          <button
            key={item.title}
            onClick={() => setOpen(open === item.title ? "" : item.title)}
            className="w-full border-b border-[#f0edf5] p-4 text-left last:border-0"
          >
            <span className="flex items-center justify-between">
              <b className="text-sm">{item.title}</b>
              <ChevronRight
                className={`h-4 w-4 text-violet-500 transition ${open === item.title ? "rotate-90" : ""}`}
              />
            </span>
            {open === item.title && (
              <p className="mt-3 text-xs leading-5 text-slate-500">
                {item.body} Full legally reviewed text will be added before
                launch.
              </p>
            )}
          </button>
        ))}
      </div>
      <div className="rounded-2xl bg-violet-50 p-4 text-xs leading-5 text-violet-800">
        <b className="block">Pre-launch notice</b>These summaries are UI
        placeholders, not the final legal documents.
      </div>
    </DetailShell>
  );
}

function LogoutPreview({ onLogout }: { onLogout: () => void }) {
  return (
    <DetailShell
      icon={LogOut}
      title="Log out of Glonni Ads?"
      body="You will need to verify your mobile number again to access your wallet, tasks and reward history."
    >
      <section className="rounded-2xl border border-[#ece9f2] bg-white p-6 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-rose-50 text-rose-500">
          <LogOut className="h-8 w-8" />
        </span>
        <b className="mt-4 block text-lg">Confirm logout</b>
        <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-slate-500">
          Your local demo session will be cleared. No reward data is stored on a
          server yet.
        </p>
      </section>
      <button
        onClick={onLogout}
        className="w-full rounded-xl bg-rose-500 py-3.5 text-sm font-extrabold text-white"
      >
        Yes, log me out
      </button>
      <p className="text-center text-xs text-slate-400">
        Production logout will revoke the Supabase session during backend
        integration.
      </p>
    </DetailShell>
  );
}

function StoreDirectory({ notify }: { notify: (message: string) => void }) {
  const [query, setQuery] = useState("");
  const stores = [
    "Amazon",
    "Flipkart",
    "Myntra",
    "AJIO",
    "Croma",
    "Tata CLiQ",
    "Nykaa",
    "Reliance Digital",
  ];
  const visible = stores.filter((store) =>
    store.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <DetailShell
      icon={Store}
      title="Compare partner stores"
      body="Affiliate rates and product comparison will update after provider integration."
    >
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search stores"
          aria-label="Search partner stores"
          className="w-full rounded-2xl border border-[#ece9f2] bg-white py-3.5 pl-11 pr-11 text-sm outline-none focus:border-violet-400"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            aria-label="Clear store search"
            className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-slate-100 text-slate-500"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {visible.map((store) => (
          <button
            key={store}
            onClick={() => notify(`${store} integration coming soon`)}
            className="rounded-2xl border border-[#ece9f2] bg-white p-4 text-left"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 font-black text-violet-600">
              {store[0]}
            </span>
            <b className="mt-3 block text-sm">{store}</b>
            <span className="text-xs text-emerald-600">Rates coming soon</span>
          </button>
        ))}
      </div>
      {visible.length === 0 && (
        <EmptyState
          icon={Store}
          title="Store not found"
          body="Try another store name or clear your search."
        />
      )}
    </DetailShell>
  );
}

function DetailShell({
  icon: Icon,
  title,
  body,
  children,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <section className="rounded-[26px] border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-5">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-600 text-white">
          <Icon className="h-6 w-6" />
        </span>
        <h2 className="mt-4 text-2xl font-black text-[#241d34]">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">{body}</p>
      </section>
      {children}
    </div>
  );
}
function PrimaryButton({
  onClick,
  disabled = false,
  children,
}: {
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`interactive-card w-full rounded-xl bg-gradient-to-r ${purple} py-3.5 text-sm font-extrabold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {children}
    </button>
  );
}
function InfoCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <section className="surface-card rounded-2xl border border-[#ece9f2] bg-white p-5">
      <b className="text-sm">{title}</b>
      <div className="mt-3 space-y-3">
        {lines.map((line) => (
          <div
            key={line}
            className="flex gap-2 text-xs leading-5 text-slate-500"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            {line}
          </div>
        ))}
      </div>
    </section>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card rounded-2xl border border-[#ece9f2] bg-white p-4">
      <span className="text-xs text-slate-500">{label}</span>
      <b className="mt-1 block text-xl">{value}</b>
    </div>
  );
}
function EmptyState({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="empty-state rounded-2xl border border-dashed border-violet-200 bg-white p-8 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-violet-50 text-violet-500">
        <Icon className="h-7 w-7" />
      </span>
      <b className="mt-3 block text-sm">{title}</b>
      <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-slate-500">
        {body}
      </p>
    </div>
  );
}

function Hero({
  icon: Icon,
  eyebrow,
  title,
  body,
  action,
  onClick,
  mint = false,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  body: string;
  action: string;
  onClick: () => void;
  mint?: boolean;
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-[26px] ${mint ? "bg-gradient-to-br from-[#36c6a0] to-[#189f83]" : `bg-gradient-to-br ${purple}`} p-5 text-white shadow-[0_18px_38px_rgba(90,55,205,.18)] md:p-7`}
    >
      <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/10" />
      <div className="relative flex items-center justify-between gap-4">
        <div className="max-w-md">
          <span className="text-[10px] font-black tracking-[.2em] text-white/70">
            {eyebrow}
          </span>
          <h2 className="mt-2 text-2xl font-black leading-tight">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-white/80">{body}</p>
          <button
            onClick={onClick}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-extrabold text-violet-700 shadow-sm"
          >
            {action}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <span className="hidden h-28 w-28 shrink-0 place-items-center rounded-[30px] bg-white/15 sm:grid">
          <Icon className="h-16 w-16" strokeWidth={1.5} />
        </span>
      </div>
    </section>
  );
}

function MiniStat({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
}) {
  return (
    <div className="surface-card rounded-2xl border border-[#eeebf4] bg-white p-4 shadow-[0_8px_25px_rgba(30,20,60,.04)]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500">{label}</span>
        <Icon className="h-4 w-4 text-violet-500" />
      </div>
      <b className="mt-2 block text-xl text-[#211a31]">{value}</b>
      <span className="text-[10px] text-slate-400">{hint}</span>
    </div>
  );
}
function SectionTitle({
  title,
  side,
  onSide,
}: {
  title: string;
  side?: string;
  onSide?: () => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-base font-extrabold text-[#241e30]">{title}</h3>
      {side &&
        (onSide ? (
          <button
            onClick={onSide}
            className="text-xs font-bold text-violet-600"
          >
            {side}
          </button>
        ) : (
          <span className="text-xs font-bold text-violet-600">{side}</span>
        ))}
    </div>
  );
}
function ProgressCard({ current, total }: { current: number; total: number }) {
  const pct = Math.min(100, (current / total) * 100);
  return (
    <section className="surface-card rounded-2xl border border-[#ece9f2] bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <b className="text-sm text-[#292236]">Daily reward progress</b>
          <p className="mt-1 text-xs text-slate-500">
            Complete {total} ads to finish today’s goal
          </p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-500">
          <Target className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-violet-100">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${purple} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-xs font-bold">
        <span className="text-violet-600">{current} completed</span>
        <span className="text-slate-400">{total} total</span>
      </div>
    </section>
  );
}
function BottomNav({
  active,
  navigate,
}: {
  active: NavKey;
  navigate: (key: NavKey) => void;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[1180px] border-t border-[#ebe8f1] bg-white/95 px-2 pb-[max(.65rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:bottom-5 md:rounded-b-[32px]">
      <div className="grid grid-cols-5">
        {navItems.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => navigate(key)}
            className={`relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-bold transition ${active === key ? "text-violet-600" : "text-slate-500 hover:text-violet-500"}`}
          >
            {active === key && (
              <span className="absolute top-0 h-1 w-6 rounded-full bg-violet-600" />
            )}
            <Icon className="h-5 w-5" strokeWidth={active === key ? 2.7 : 2} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
