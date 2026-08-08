"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ErrorScreen({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f4f2f8] p-5">
      <section role="alert" className="w-full max-w-md rounded-[28px] border border-rose-100 bg-white p-7 text-center shadow-xl">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-rose-50 text-rose-500"><AlertTriangle className="h-8 w-8" /></span>
        <h1 className="mt-4 text-2xl font-black text-[#241d34]">Something went wrong</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Your data is safe. Check your connection and try loading this screen again.</p>
        <button onClick={reset} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3.5 text-sm font-extrabold text-white"><RotateCcw className="h-4 w-4" /> Try again</button>
      </section>
    </main>
  );
}
