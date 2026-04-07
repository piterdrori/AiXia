import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function FinancePaymentMethodsPage() {
  const navigate = useNavigate();

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">
            Finance — Payment Methods
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage finance payment methods.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/finance")}
            className="border-border bg-background/40 text-white hover:bg-background/60"
          >
            Finance Home
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/finance/bank-accounts")}
            className="border-border bg-background/40 text-white hover:bg-background/60"
          >
            Bank Accounts
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-4 border border-border rounded-xl p-4">
        <div className="text-muted-foreground">Coming soon</div>
      </div>
    </div>
  );
}
