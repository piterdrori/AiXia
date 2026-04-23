export default function AIManagementPage() {
  const sections = [
    {
      title: "Overview",
      description: "System status, counts, and quick health indicators.",
    },
    {
      title: "Approved Answers",
      description: "Controlled answers that override cache and AI.",
    },
    {
      title: "Cache Review",
      description: "Review, block, delete, and promote cached answers.",
    },
    {
      title: "Knowledge Items",
      description: "Manual knowledge records that feed the AI context.",
    },
    {
      title: "Uploads",
      description: "Future document upload, extraction, and chunking area.",
    },
    {
      title: "Voice",
      description: "Future TTS, STT, and voice configuration tools.",
    },
    {
      title: "Settings",
      description: "Model, refresh, and future AI behavior controls.",
    },
    {
      title: "Activity",
      description: "Admin actions and AI management history.",
    },
  ];

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
              Manage approved answers, cache, knowledge items, uploads, voice,
              settings, and AI administration from one place.
            </p>
          </div>
        </div>

        <div className="grid gap-4 px-6 py-6 md:grid-cols-2 xl:grid-cols-4">
          {sections.map((section) => (
            <div
              key={section.title}
              className="rounded-[24px] border border-white/10 bg-black/20 p-5"
            >
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-white">
                  {section.title}
                </h2>
                <p className="text-sm leading-6 text-white/55">
                  {section.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
