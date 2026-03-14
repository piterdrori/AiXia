import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CompleteProfilePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid verification link.");
      return;
    }
    // Validate token
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("verification_token", token)
        .single();
      if (error || !data) {
        setError("Invalid or expired token.");
        return;
      }
      if (data.status !== "pending_verification") {
        setError("Profile already submitted or approved.");
        return;
      }
      setProfile(data);
      setFullName(data.full_name || "");
      setPhone(data.phone || "");
      setRole(data.requested_role || "");
    };
    fetchProfile();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    if (!fullName.trim() || !phone.trim()) {
      setError("Full Name and Phone are required.");
      return;
    }
    setIsLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        phone: phone.trim(),
        status: "pending_approval",
      })
      .eq("verification_token", token);

    setIsLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSuccessMessage(
      "Profile submitted! Wait for admin approval before you can log in."
    );
    setTimeout(() => {
      navigate("/login");
    }, 2500);
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Alert className="bg-red-900/20 border-red-800 text-red-300">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <Card className="w-full max-w-md bg-slate-900/60 border-slate-800">
        <CardContent className="p-8">
          <div className="mb-4 text-white">
            <h1 className="text-2xl font-bold">Complete Your Profile</h1>
            <p className="text-slate-400 mt-1">
              Fill in your details below. After submission, an admin will approve
              your account. You cannot log in until approval.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {successMessage && (
              <Alert className="bg-emerald-900/20 border-emerald-800 text-emerald-300">
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-slate-300">
                Full Name
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="bg-slate-950 border-slate-800 text-white"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-300">
                Phone Number
              </Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter your phone number"
                className="bg-slate-950 border-slate-800 text-white"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-slate-300">
                Role
              </Label>
              <Input
                id="role"
                value={role}
                disabled
                className="bg-slate-950 border-slate-800 text-white"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? "Submitting..." : "Submit Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
