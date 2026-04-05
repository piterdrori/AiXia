import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";

export default function FinancePage() {
  const navigate = useNavigate();

  return (
    <div className="h-full flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Finance</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a finance section to continue.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => navigate("/finance/clients")}
          className="text-left"
        >
          <Card className="border-border bg-background/40 hover:bg-background/60 transition-colors">
            <CardContent className="p-5">
              <div className="text-white text-lg font-medium">Clients</div>
              <div className="text-sm text-muted-foreground mt-2">
                Manage finance clients and billing entities.
              </div>
            </CardContent>
          </Card>
        </button>

        <button
          type="button"
          onClick={() => navigate("/finance/vendors")}
          className="text-left"
        >
          <Card className="border-border bg-background/40 hover:bg-background/60 transition-colors">
            <CardContent className="p-5">
              <div className="text-white text-lg font-medium">Vendors</div>
              <div className="text-sm text-muted-foreground mt-2">
                Manage vendors and payable counterparties.
              </div>
            </CardContent>
          </Card>
        </button>
      </div>
    </div>
  );
}
