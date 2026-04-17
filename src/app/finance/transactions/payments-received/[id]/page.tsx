"use client";

import { useEffect, useState } from "react";
import {
  getPaymentReceivedById,
  confirmPaymentReceived,
  cancelPaymentReceived,
} from "@/lib/finance/paymentsReceived";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function PaymentReceivedDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasProof, setHasProof] = useState(false);

  useEffect(() => {
    if (id) {
      loadPayment();
      checkProof();
    }
  }, [id]);

  async function loadPayment() {
    try {
      setLoading(true);
      const data = await getPaymentReceivedById(id);
      setPayment(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function checkProof() {
    const { data } = await supabase
      .from("finance_record_attachments")
      .select("id")
      .eq("entity_type", "finance_payment_received")
      .eq("entity_id", id);

    setHasProof((data || []).length > 0);
  }

  async function handleConfirm() {
    try {
      await confirmPaymentReceived(id);
      await loadPayment();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleCancel() {
    try {
      await cancelPaymentReceived(id);
      await loadPayment();
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;
  if (!payment) return <div className="p-6">Payment not found</div>;

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">
          Payment {payment.reference_number || ""}
        </h1>

        <button
          onClick={() => router.back()}
          className="px-3 py-2 border rounded-lg"
        >
          Back
        </button>
      </div>

      {/* INFO CARD */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-3">
        <div>Amount: {payment.amount}</div>
        <div>Converted: {payment.converted_amount}</div>
        <div>Currency: {payment.payment_currency_code}</div>
        <div>Invoice Currency: {payment.invoice_currency_code}</div>
        <div>Status: {payment.status}</div>
      </div>

      {/* PROOF SECTION */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-3">
        <h2 className="font-semibold">Proof of Payment</h2>

        {hasProof ? (
          <div className="text-green-400">Proof uploaded</div>
        ) : (
          <div className="text-red-400">
            No proof uploaded (required for confirmation)
          </div>
        )}
      </div>

      {/* ACTIONS */}
      <div className="flex gap-3">

        {payment.status === "draft" && (
          <button
            onClick={handleConfirm}
            disabled={!hasProof}
            className={`px-4 py-2 rounded-lg ${
              hasProof
                ? "bg-green-600 hover:bg-green-700"
                : "bg-gray-500 cursor-not-allowed"
            }`}
          >
            Confirm Payment
          </button>
        )}

        {payment.status !== "cancelled" && (
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
