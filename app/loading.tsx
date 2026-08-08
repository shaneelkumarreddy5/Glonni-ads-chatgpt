export default function Loading() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[1180px] animate-pulse bg-[#fbfbfe] px-4 py-6 md:my-5 md:rounded-[32px] md:px-8">
      <span className="sr-only">Loading Glonni Ads</span>
      <div className="h-8 w-36 rounded-lg bg-violet-100" />
      <div className="mt-8 h-48 rounded-[28px] bg-violet-100" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="h-24 rounded-2xl bg-slate-100" />
        <div className="h-24 rounded-2xl bg-slate-100" />
      </div>
      <div className="mt-6 h-40 rounded-2xl bg-slate-100" />
    </main>
  );
}
