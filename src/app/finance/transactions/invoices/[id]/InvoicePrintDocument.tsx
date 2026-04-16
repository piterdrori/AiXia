import { formatFinanceDate, formatFinanceMoney } from "@/lib/finance/invoicesIssued";

type Props = {
  invoice: any;
  lineItems: any[];
  financialSummary: any;
};

export default function InvoicePrintDocument({
  invoice,
  lineItems,
  financialSummary,
}: Props) {
  return (
    <div className="hidden print:block">
      <div className="w-[210mm] min-h-[297mm] bg-white text-black mx-auto p-0">

        {/* HEADER */}
        <div className="bg-black text-white px-10 py-8 relative overflow-hidden">
          <div className="flex justify-between items-start">
            
            {/* LEFT */}
            <div>
              <img
                src="https://leoilrrnwlquunsbulok.supabase.co/storage/v1/object/public/Branding/aixia-logo.png"
                className="h-10 mb-4"
              />
              <div className="text-sm opacity-80 leading-6">
                {invoice.company_name_snapshot}
                <br />
                {invoice.company_address_snapshot}
                <br />
                {invoice.company_email_snapshot}
                <br />
                {invoice.company_phone_snapshot}
              </div>
            </div>

            {/* RIGHT */}
            <div className="text-right">
              <div className="text-3xl font-bold tracking-wider mb-4">
                INVOICE
              </div>
              <div className="text-sm opacity-80 space-y-1">
                <div>Invoice No: {invoice.invoice_number}</div>
                <div>Issue Date: {formatFinanceDate(invoice.issue_date)}</div>
                <div>Due Date: {formatFinanceDate(invoice.due_date)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* BODY */}
        <div className="px-10 py-8">

          {/* BILL TO */}
          <div className="mb-8">
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">
              Bill To
            </div>
            <div className="text-sm leading-6">
              <div className="font-semibold">
                {invoice.client_name_snapshot || "—"}
              </div>
              <div>{invoice.billing_address_snapshot || "—"}</div>
              <div>{invoice.client_email_snapshot || "—"}</div>
              <div>{invoice.client_phone_snapshot || "—"}</div>
            </div>
          </div>

          {/* TABLE */}
          <table className="w-full text-sm border-collapse mb-8">
            <thead>
              <tr className="bg-black text-white">
                <th className="text-left p-3">#</th>
                <th className="text-left p-3">Description</th>
                <th className="text-right p-3">Qty</th>
                <th className="text-right p-3">Unit</th>
                <th className="text-right p-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, i) => (
                <tr key={item.id} className="border-b">
                  <td className="p-3">{i + 1}</td>
                  <td className="p-3">{item.description}</td>
                  <td className="p-3 text-right">{item.quantity}</td>
                  <td className="p-3 text-right">
                    {formatFinanceMoney(item.unitPrice, invoice.currency_code)}
                  </td>
                  <td className="p-3 text-right font-medium">
                    {formatFinanceMoney(item.lineTotal, invoice.currency_code)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* TOTALS */}
          <div className="flex justify-end">
            <div className="w-[300px] space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatFinanceMoney(financialSummary.subtotal, invoice.currency_code)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount</span>
                <span>{formatFinanceMoney(financialSummary.discount, invoice.currency_code)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{formatFinanceMoney(financialSummary.tax, invoice.currency_code)}</span>
              </div>

              <div className="border-t pt-2 font-bold text-base flex justify-between">
                <span>Total</span>
                <span>{formatFinanceMoney(financialSummary.total, invoice.currency_code)}</span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>Paid</span>
                <span>{formatFinanceMoney(financialSummary.paid, invoice.currency_code)}</span>
              </div>

              <div className="flex justify-between font-semibold text-red-600">
                <span>Balance</span>
                <span>{formatFinanceMoney(financialSummary.balance, invoice.currency_code)}</span>
              </div>
            </div>
          </div>

          {/* NOTES */}
          {invoice.notes && (
            <div className="mt-10">
              <div className="text-xs uppercase text-gray-500 mb-2">
                Notes
              </div>
              <div className="text-sm text-gray-700">
                {invoice.notes}
              </div>
            </div>
          )}

          {/* FOOTER */}
          <div className="mt-16 flex justify-between items-end">
            <div className="text-sm text-gray-600">
              Thank you for your business
            </div>

            <div className="text-center">
              <div className="border-t w-[200px] mb-2"></div>
              <div className="text-sm">Authorized Signature</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
