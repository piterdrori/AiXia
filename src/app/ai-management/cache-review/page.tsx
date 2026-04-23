import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type CacheItem = {
  id: string;
  question: string;
  answer: string;
  is_blocked: boolean;
  created_at: string;
};

export default function AICacheReviewPage() {
  const [items, setItems] = useState<CacheItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadCache() {
    setLoading(true);

    const { data } = await supabase
      .from("ai_qa_cache")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    setItems(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadCache();
  }, []);

  async function deleteItem(id: string) {
    await supabase.from("ai_qa_cache").delete().eq("id", id);
    await loadCache();
  }

  async function blockItem(id: string, value: boolean) {
    await supabase
      .from("ai_qa_cache")
      .update({ is_blocked: value })
      .eq("id", id);

    await loadCache();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
        <h1 className="text-xl font-semibold text-white">
          Cache Review
        </h1>
        <p className="text-sm text-white/50 mt-1">
          Inspect, block, and delete cached AI answers.
        </p>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-black/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10 text-white/60">
              <tr>
                <th className="text-left p-4">Question</th>
                <th className="text-left p-4">Answer</th>
                <th className="text-left p-4">Status</th>
                <th className="text-right p-4">Actions</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-white/5">
                  <td className="p-4 text-white/80 max-w-[300px]">
                    {item.question}
                  </td>

                  <td className="p-4 text-white/60 max-w-[400px]">
                    {item.answer}
                  </td>

                  <td className="p-4">
                    {item.is_blocked ? (
                      <span className="text-red-400">Blocked</span>
                    ) : (
                      <span className="text-emerald-400">Active</span>
                    )}
                  </td>

                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => blockItem(item.id, !item.is_blocked)}
                      className="px-3 py-1 rounded-lg border border-white/10 hover:bg-white/10 text-xs"
                    >
                      {item.is_blocked ? "Unblock" : "Block"}
                    </button>

                    <button
                      onClick={() => deleteItem(item.id)}
                      className="px-3 py-1 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-white/40">
                    No cache data found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
