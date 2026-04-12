import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

import { createVendor } from "@/lib/finance/vendors";

function emptyRow() {
  return {
    id: crypto.randomUUID(),
    label: "",
    value: "",
  };
}

export default function FinanceVendorCreatePage() {
  const navigate = useNavigate();

  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    legal_name: "",
    company_email: "",
    personnel_email: "",
    company_phone: "",
    personnel_phone: "",
    company_related_personnel: "",
    country: "",
    address_line_1: "",
    address_line_2: "",
    shipping_address_line_1: "",
    shipping_address_line_2: "",
    delivery_term: "",
    currency_code: "USD",
    payment_terms_id: "",
    notes: "",
  });

  const [personnel, setPersonnel] = useState([emptyRow()]);
  const [communication, setCommunication] = useState([emptyRow()]);
  const [addresses, setAddresses] = useState([emptyRow()]);
  const [shipping, setShipping] = useState([emptyRow()]);

  async function handleSave() {
    setIsSaving(true);

    try {
      await createVendor({
        legal_name: form.legal_name,
        company_email: form.company_email,
        personnel_email: form.personnel_email,
        company_phone: form.company_phone,
        personnel_phone: form.personnel_phone,
        company_related_personnel: form.company_related_personnel,
        country: form.country,
        address_line_1: form.address_line_1,
        address_line_2: form.address_line_2,
        shipping_address_line_1: form.shipping_address_line_1,
        shipping_address_line_2: form.shipping_address_line_2,
        delivery_term: form.delivery_term,
        currency_code: form.currency_code,
        payment_terms_id: form.payment_terms_id,
        notes: form.notes,
        metadata: {
          personnel,
          communication,
          addresses,
          shipping,
        },
      });

      navigate("/finance/master-data/vendors");
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  }

  function renderRepeatable(title: string, data: any[], setData: any) {
    return (
      <Card className="rounded-[26px] border border-white/10 bg-white/[0.045]">
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex justify-between items-center">
            <div className="text-white font-semibold">{title}</div>

            <Button
              variant="outline"
              onClick={() => setData((prev: any) => [...prev, emptyRow()])}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>

          {data.map((row: any) => (
            <div key={row.id} className="flex gap-3">
              <Input
                placeholder="Label"
                value={row.label}
                onChange={(e) =>
                  setData((prev: any) =>
                    prev.map((r: any) =>
                      r.id === row.id ? { ...r, label: e.target.value } : r
                    )
                  )
                }
              />
              <Input
                placeholder="Value"
                value={row.value}
                onChange={(e) =>
                  setData((prev: any) =>
                    prev.map((r: any) =>
                      r.id === row.id ? { ...r, value: e.target.value } : r
                    )
                  )
                }
              />

              {data.length > 1 && (
                <Button
                  variant="outline"
                  onClick={() =>
                    setData((prev: any) =>
                      prev.filter((r: any) => r.id !== row.id)
                    )
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="mx-auto w-full max-w-[1400px] flex flex-col gap-6 p-6">

        <div className="flex justify-between items-center">
          <Button onClick={() => navigate(-1)} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Create Vendor"}
          </Button>
        </div>

        <Card className="rounded-[30px] border border-white/10 bg-white/[0.045]">
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">

            <Input
              placeholder="Legal Name"
              value={form.legal_name}
              onChange={(e) =>
                setForm((p) => ({ ...p, legal_name: e.target.value }))
              }
            />

            <Input
              placeholder="Country"
              value={form.country}
              onChange={(e) =>
                setForm((p) => ({ ...p, country: e.target.value }))
              }
            />

            <Input
              placeholder="Company Email"
              value={form.company_email}
              onChange={(e) =>
                setForm((p) => ({ ...p, company_email: e.target.value }))
              }
            />

            <Input
              placeholder="Company Phone"
              value={form.company_phone}
              onChange={(e) =>
                setForm((p) => ({ ...p, company_phone: e.target.value }))
              }
            />

            <Input
              placeholder="Currency"
              value={form.currency_code}
              onChange={(e) =>
                setForm((p) => ({ ...p, currency_code: e.target.value }))
              }
            />

            <Input
              placeholder="Payment Terms"
              value={form.payment_terms_id}
              onChange={(e) =>
                setForm((p) => ({ ...p, payment_terms_id: e.target.value }))
              }
            />

            <Input
              placeholder="Delivery Term"
              value={form.delivery_term}
              onChange={(e) =>
                setForm((p) => ({ ...p, delivery_term: e.target.value }))
              }
            />

            <Input
              placeholder="Address Line 1"
              value={form.address_line_1}
              onChange={(e) =>
                setForm((p) => ({ ...p, address_line_1: e.target.value }))
              }
            />

            <Input
              placeholder="Address Line 2"
              value={form.address_line_2}
              onChange={(e) =>
                setForm((p) => ({ ...p, address_line_2: e.target.value }))
              }
            />
          </CardContent>
        </Card>

        {renderRepeatable("Personnel", personnel, setPersonnel)}
        {renderRepeatable("Communication", communication, setCommunication)}
        {renderRepeatable("Addresses", addresses, setAddresses)}
        {renderRepeatable("Shipping", shipping, setShipping)}

      </div>
    </div>
  );
}
