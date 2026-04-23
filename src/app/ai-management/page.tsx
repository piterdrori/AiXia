export default function AIManagementPage() {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
        <div className="border-b border-white/10 px-6 py-5">
          <div className="space-y-2">
            <div className="w-fit rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-200">
              AI Management
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-white">
              AI Control Panel
            </h1>

            <p className="max-w-3xl text-sm text-white/60">
              This page will manage approved answers, cache review, knowledge
              items, uploads, voice tools, and AI settings.
            </p>
          </div>
        </div>

        <div className="px-6 py-6">
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-5 py-10 text-sm text-white/50">
            Shell coming next.
          </div>
        </div>
      </section>
    </div>
  );
}
