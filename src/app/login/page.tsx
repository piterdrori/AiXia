import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Status =
  | "active"
  | "pending_verification"
  | "pending_approval"
  | "rejected";

type LoginProfileRow = {
  status: Status | null;
  role: string | null;
  full_name: string | null;
  profile_completed?: boolean | null;
};

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setInfoMessage("");
    setIsLoading(true);

    try {
      const { error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Unable to load authenticated user.");
        await supabase.auth.signOut();
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("status, role, full_name, profile_completed")
          .eq("user_id", user.id)
          .maybeSingle();

      if (profileError || !profile) {
        setError("User profile not found.");
        await supabase.auth.signOut();
        return;
      }

      const typedProfile = profile as LoginProfileRow;

      if (!typedProfile.status) {
        setError("User status not configured.");
        await supabase.auth.signOut();
        return;
      }

      switch (typedProfile.status) {
        case "pending_verification":
          setInfoMessage(
            "Please verify your email before logging in."
          );
          await supabase.auth.signOut();
          return;

        case "pending_approval":
          setInfoMessage(
            "Your account is waiting for admin approval."
          );
          await supabase.auth.signOut();
          return;

        case "rejected":
          setError(
            "Your registration was rejected. Contact the administrator."
          );
          await supabase.auth.signOut();
          return;

        case "active":
          break;

        default:
          setError("Invalid account state.");
          await supabase.auth.signOut();
          return;
      }

      if (!typedProfile.profile_completed) {
        navigate("/onboarding");
        return;
      }

      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError("Unexpected login error.");
      await supabase.auth.signOut();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <Card className="w-full max-w-md bg-slate-900/60 border-slate-800">
        <CardContent className="p-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-white">
              Sign In
            </h1>
            <p className="text-slate-400 mt-2">
              Access your TaskFlow account
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <Alert className="bg-red-900/20 border-red-800 text-red-300">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {infoMessage && (
              <Alert className="bg-amber-900/20 border-amber-800 text-amber-300">
                <AlertDescription>{infoMessage}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-slate-300"
              >
                Email
              </Label>

              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                className="bg-slate-950 border-slate-800 text-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-slate-300"
              >
                Password
              </Label>

              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                className="bg-slate-950 border-slate-800 text-white"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                disabled={isLoading}
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-400">
            Don&apos;t have an account?{" "}
            <Link
              to="/register"
              className="text-indigo-400 hover:text-indigo-300"
            >
              Create one
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
