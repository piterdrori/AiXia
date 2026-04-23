import { useState } from "react";

type KnowledgeItem = {
  id: string;
  title: string;
  type: string;
  status: "active" | "inactive";
  source: "github" | "manual" | "upload";
  updated_at: string;
};

export default function AIKnowledgeBankPage() {
  const [search, setSearch] = useState("");

  const mockData: KnowledgeItem[] = [
    {
      id: "1",
      title: "Master Prompt",
      type: "markdown",
      status: "active",
      source: "github",
      updated_at: "2026-04-23",
    },
    {
      id: "2",
      title: "Finance Rules",
      type: "markdown",
      status: "active",
      source: "github",
      updated_at: "2026-04-22",
    },
    {
      id: "3",
      title: "Manual Instructions",
      type: "text",
      status: "inactive",
      source: "manual",
      updated_at: "2026-04-20",
    },
  ];

  const filtered = mockData.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
        <div className="border-b border-white/10 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="w-fit rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-200">
                Knowledge Bank
              </div>

              <h1 className="text-2xl font-semibold text-white">
                AI Knowledge System
              </h1>

              <p className="text-sm text-white/60">
                Manage all knowledge sources used by the AI system.
              </p>
            </div>

            <button className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/20">
              Upload File
            </button>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search knowledge..."
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none placeholder:text-white/40 md:w-[320px]"
          />

          <div className="flex gap-2">
            <button className="rounded-lg border border-white/10 px-3 py-1 text-xs text-white/70 hover:bg-white/10">
              All
            </button>
            <button className="rounded-lg border border-white/10 px-3 py-1 text-xs text-white/70 hover:bg-white/10">
              GitHub
            </button>
            <button className="rounded-lg border border-white/10 px-3 py-1 text-xs text-white/70 hover:bg-white/10">
              Manual
            </button>
            <button className="rounded-lg border border-white/10 px-3 py-1 text-xs text-white/70 hover:bg-white/10">
              Uploads
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="px-6 pb-6">
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-sm text-white">
              <thead className="bg-white/[0.04] text-white/60">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Source</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Updated</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-white/5 hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3">{item.title}</td>
                    <td className="px-4 py-3 text-white/70">
                      {item.type}
                    </td>
                    <td className="px-4 py-3 text-white/70">
                      {item.source}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          item.status === "active"
                            ? "bg-green-500/10 text-green-300"
                            : "bg-gray-500/10 text-gray-400"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/50">
                      {item.updated_at}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button className="text-xs text-white/60 hover:text-white">
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="p-6 text-center text-sm text-white/40">
                No knowledge found
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
