"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Proforma = {
  id: string;
  proforma_number: string;
  status: string;
  total_amount: number;
};

export default function ProformaInvoicesPage() {
  const [data, setData] = useState<Proforma[]>([]);
  const router = useRouter();

  const load = async () => {
    const { data } = await supabase
      .from("finance_proforma_invoices")
      .select("id, proforma_number, status, total_amount")
      .order("created_at", { ascending: false });

    setData(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const convert = async (id: string) => {
    const { data, error } = await supabase.rpc(
      "finance_convert_proforma_to_invoice",
      { p_proforma_id: id }
    );

    if (error) {
      alert(error.message);
      return;
    }

    router.push(`/finance/transactions/invoices/${data}`);
  };

  return (
    <div className="p-6 text-white">
      <h1 className="text-xl mb-4">Proforma Invoices</h1>

      <div className="space-y-3">
        {data.map((p) => (
          <div
            key={p.id}
            className="border border-white/10 rounded p-4 flex justify-between"
          >
            <div>
              <div>{p.proforma_number}</div>
              <div className="text-sm text-white/50">
                {p.status} • ${p.total_amount}
              </div>
            </div>

            <button
              onClick={() => convert(p.id)}
              disabled={p.status === "converted"}
              className="bg-cyan-500 px-4 py-2 rounded disabled:opacity-50"
            >
              Convert
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
