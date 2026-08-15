"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { BadgeCheck, KeyRound, LoaderCircle, LockKeyhole, ShieldAlert } from "lucide-react";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";

type Screen = "loading" | "signin" | "forbidden" | "enroll" | "verify" | "ready";
type AdminAccess = { authorized: boolean; roles: string[] };

export default function AdminAccessPage() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [factorId, setFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const prepareAccess = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: userResult } = await supabase.auth.getUser();
    if (!userResult.user) return setScreen("signin");

    const { data, error: accessError } = await supabase.rpc("get_my_admin_access");
    const access = data as AdminAccess | null;
    if (accessError || !access?.authorized) return setScreen("forbidden");

    const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance?.currentLevel === "aal2") return setScreen("ready");

    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) {
      setError("We could not check your security factors. Please try again.");
      return setScreen("verify");
    }
    const verified = factors.totp.find((factor) => factor.status === "verified");
    if (verified) {
      setFactorId(verified.id);
      return setScreen("verify");
    }

    const { data: enrollment, error: enrollmentError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Glonni Ads Admin",
    });
    if (enrollmentError) {
      setError("Authenticator setup could not be started. Please try again.");
      return setScreen("verify");
    }
    setFactorId(enrollment.id);
    setQrCode(enrollment.totp.qr_code);
    setSecret(enrollment.totp.secret);
    setScreen("enroll");
  }, []);

  useEffect(() => {
    void prepareAccess();
  }, [prepareAccess]);

  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError("");
    const { error: signInError } = await getSupabaseBrowserClient().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setPending(false);
    if (signInError) return setError("The email or password is incorrect.");
    setScreen("loading");
    await prepareAccess();
  };

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code) || !factorId) return setError("Enter the 6-digit authenticator code.");
    setPending(true);
    setError("");
    const supabase = getSupabaseBrowserClient();
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) {
      setPending(false);
      return setError("Security verification could not be started.");
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });
    setPending(false);
    if (verifyError) return setError("That authenticator code is invalid or expired.");
    window.location.assign("/admin");
  };

  const signOut = async () => {
    await getSupabaseBrowserClient().auth.signOut();
    setScreen("signin");
  };

  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f6fb] p-5 text-[#241d34]">
      <section className="w-full max-w-md rounded-[28px] border border-violet-100 bg-white p-7 shadow-xl shadow-violet-100/60">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-600 text-white"><LockKeyhole /></span>
          <span><p className="text-xs font-black uppercase tracking-widest text-violet-600">Protected console</p><h1 className="text-xl font-black">Glonni Ads Admin</h1></span>
        </div>

        {screen === "loading" && <Status icon={LoaderCircle} title="Checking secure access" body="Verifying your account, role and security level…" spin />}

        {screen === "signin" && (
          <form onSubmit={signIn} className="mt-7 space-y-4">
            <p className="text-sm leading-6 text-slate-500">Use your pre-authorized administrator account. Public account creation is disabled here.</p>
            <label className="block text-xs font-bold text-slate-600">Admin email<input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-violet-500" /></label>
            <label className="block text-xs font-bold text-slate-600">Password<input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-violet-500" /></label>
            <ErrorMessage message={error} />
            <button disabled={pending} className="w-full rounded-xl bg-violet-600 py-3 text-sm font-extrabold text-white disabled:opacity-50">{pending ? "Signing in…" : "Continue securely"}</button>
          </form>
        )}

        {screen === "forbidden" && <><Status icon={ShieldAlert} title="Admin access not assigned" body="This account is valid, but it has no active Glonni Ads administrator role." /><button onClick={signOut} className="mt-5 w-full rounded-xl border border-slate-200 py-3 text-sm font-bold">Sign out</button></>}

        {screen === "enroll" && (
          <form onSubmit={verify} className="mt-7 space-y-4">
            <p className="text-sm font-bold">Set up mandatory two-step verification</p>
            <p className="text-xs leading-5 text-slate-500">Scan this QR code using Google Authenticator, Microsoft Authenticator, 1Password or another TOTP app.</p>
            {/* Supabase returns a trusted data URL for this newly created TOTP factor. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {qrCode && <img src={qrCode} alt="Authenticator setup QR code" className="mx-auto h-48 w-48 rounded-xl border p-2" />}
            {secret && <p className="break-all rounded-xl bg-slate-50 p-3 text-center font-mono text-xs">{secret}</p>}
            <CodeInput value={code} onChange={setCode} />
            <ErrorMessage message={error} />
            <button disabled={pending} className="w-full rounded-xl bg-violet-600 py-3 text-sm font-extrabold text-white disabled:opacity-50">Verify and activate MFA</button>
          </form>
        )}

        {screen === "verify" && (
          <form onSubmit={verify} className="mt-7 space-y-4">
            <Status icon={KeyRound} title="Authenticator verification required" body="Enter the current code from your authenticator app." />
            <CodeInput value={code} onChange={setCode} />
            <ErrorMessage message={error} />
            <button disabled={pending} className="w-full rounded-xl bg-violet-600 py-3 text-sm font-extrabold text-white disabled:opacity-50">{pending ? "Verifying…" : "Open admin console"}</button>
          </form>
        )}

        {screen === "ready" && <><Status icon={BadgeCheck} title="Secure access verified" body="Your authenticated account, administrator role and MFA session are valid." /><button onClick={() => window.location.assign("/admin")} className="mt-5 w-full rounded-xl bg-violet-600 py-3 text-sm font-extrabold text-white">Open admin console</button></>}
      </section>
    </main>
  );
}

function CodeInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <input aria-label="Six-digit authenticator code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={value} onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))} placeholder="000000" className="w-full rounded-xl border border-slate-200 p-3 text-center text-xl font-black tracking-[0.35em] outline-none focus:border-violet-500" />;
}

function ErrorMessage({ message }: { message: string }) {
  return message ? <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{message}</p> : null;
}

function Status({ icon: Icon, title, body, spin = false }: { icon: typeof LockKeyhole; title: string; body: string; spin?: boolean }) {
  return <div className="mt-7 text-center"><Icon className={`mx-auto h-10 w-10 text-violet-600 ${spin ? "animate-spin" : ""}`} /><h2 className="mt-4 font-black">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{body}</p></div>;
}
