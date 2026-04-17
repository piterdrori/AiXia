"use client";

import { useEffect, useState } from "react";
import { getPaymentsReceived } from "@/lib/finance/paymentsReceived";
import { useNavigate } from "react-router-dom";

type PaymentRow = {
  id: string;
  amount: number;
  payment_date: string;
  status: string;
  reference_number: string | null;
  client_name: string | null;
  invoice_number: string | null;
};

export default function PaymentsReceivedPage() {
  const navigate = useNavigate();

  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, []);

  async function loadPayments() {
    try {
      setLoading(true);
      const data = await getPaymentsReceived();
      setPayments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

function goToDetail(id: string) {
  navigate(`/finance/transactions/payments-received/${id}`);
}

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Payments Received</h1>

       <button
  onClick={() => navigate("/finance/transactions/payments-received/new")}
  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
>
          New Payment
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white/5 backdrop-blur rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/10 text-left">
            <tr>
              <th className="p-3">Reference</th>
              <th className="p-3">Invoice</th>
              <th className="p-3">Client</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Date</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="p-6 text-center">
                  Loading...
                </td>
              </tr>
            )}

            {!loading && payments.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center">
                  No payments found
                </td>
              </tr>
            )}

            {!loading &&
              payments.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-white/10 hover:bg-white/5 cursor-pointer"
                  onClick={() => goToDetail(p.id)}
                >
                  <td className="p-3">{p.reference_number || "-"}</td>
                  <td className="p-3">{p.invoice_number || "-"}</td>
                  <td className="p-3">{p.client_name || "-"}</td>
                  <td className="p-3">${p.amount.toFixed(2)}</td>
                  <td className="p-3">
                    {new Date(p.payment_date).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        p.status === "confirmed"
                          ? "bg-green-500/20 text-green-400"
                          : p.status === "draft"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
