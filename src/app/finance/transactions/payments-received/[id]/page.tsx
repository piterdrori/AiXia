"use client";

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  getPaymentReceivedById,
  confirmPaymentReceived,
  cancelPaymentReceived,
} from "@/lib/finance/paymentsReceived";
import { supabase } from "@/lib/supabase";

type PaymentReceivedDetail = {
  id: string;
  amount: number;
  converted_amount: number;
  payment_currency_code: string;
  invoice_currency_code: string;
  status: string;
  reference_number: string | null;
};

export default function PaymentReceivedDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [payment, setPayment] = useState<PaymentReceivedDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasProof, setHasProof] = useState(false);

  useEffect(() => {
    if (!id) return;

    void loadPayment();
    void checkProof();
  }, [id]);

  async function loadPayment() {
    if (!id) return;

    try {
      setLoading(true);
      const data = await getPaymentReceivedById(id);
      setPayment(data as PaymentReceivedDetail);
    } catch (err) {
      console.error(err);
      setPayment(null);
    } finally {
      setLoading(false);
    }
  }

  async function checkProof() {
    if (!id) return;

    const { data, error } = await supabase
      .from("finance_record_attachments")
      .select("id")
      .eq("entity_type", "finance_payment_received")
      .eq("entity_id", id);

    if (error) {
      console.error(error);
      setHasProof(false);
      return;
    }

    setHasProof((data || []).length > 0);
  }

  async function handleConfirm() {
    if (!id) return;

    try {
      await confirmPaymentReceived(id);
      await loadPayment();
      await checkProof();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to confirm payment.";
      alert(message);
    }
  }

  async function handleCancel() {
    if (!id) return;

    try {
      await cancelPaymentReceived(id);
      await loadPayment();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to cancel payment.";
      alert(message);
    }
  }

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!payment) {
    return <div className="p-6">Payment not found</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          Payment {payment.reference_number || ""}
        </h1>

        <button
          onClick={() => navigate("/finance/transactions/payments-received")}
          className="rounded-lg border px-3 py-2"
        >
          Back
        </button>
      </div>

      <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-6">
        <div>Amount: {payment.amount}</div>
        <div>Converted: {payment.converted_amount}</div>
        <div>Currency: {payment.payment_currency_code}</div>
        <div>Invoice Currency: {payment.invoice_currency_code}</div>
        <div>Status: {payment.status}</div>
      </div>

      <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="font-semibold">Proof of Payment</h2>

        {hasProof ? (
          <div className="text-green-400">Proof uploaded</div>
        ) : (
          <div className="text-red-400">
            No proof uploaded (required for confirmation)
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {payment.status === "draft" ? (
          <button
            onClick={handleConfirm}
            disabled={!hasProof}
            className={`rounded-lg px-4 py-2 ${
              hasProof
                ? "bg-green-600 hover:bg-green-700"
                : "cursor-not-allowed bg-gray-500"
            }`}
          >
            Confirm Payment
          </button>
        ) : null}

        {payment.status !== "cancelled" ? (
          <button
            onClick={handleCancel}
            className="rounded-lg bg-red-600 px-4 py-2 hover:bg-red-700"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}
