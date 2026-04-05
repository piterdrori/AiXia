import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function FinancePage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/finance/clients");
  }, [navigate]);

  return null;
}
