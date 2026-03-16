import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ResetPasswordPage() {

  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {

    e.preventDefault();

    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);

    try {

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setMessage("Password updated successfully.");

      setTimeout(() => {
        navigate("/login");
      }, 2000);

    } catch (err) {

      setError("Unexpected error while updating password.");

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
              Reset Password
            </h1>

            <p className="text-slate-400 mt-2">
              Enter your new password
            </p>

          </div>

          <form onSubmit={handleResetPassword} className="space-y-5">

            {error && (
              <Alert className="bg-red-900/20 border-red-800 text-red-300">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {message && (
              <Alert className="bg-green-900/20 border-green-800 text-green-300">
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">

              <Label htmlFor="password" className="text-slate-300">
                New Password
              </Label>

              <Input
                id="password"
                type="password"
                placeholder="Enter new password"
                className="bg-slate-950 border-slate-800 text-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />

            </div>

            <div className="space-y-2">

              <Label htmlFor="confirmPassword" className="text-slate-300">
                Confirm Password
              </Label>

              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm password"
                className="bg-slate-950 border-slate-800 text-white"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                required
              />

            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isLoading ? "Updating..." : "Update Password"}
            </Button>

          </form>

        </CardContent>

      </Card>

    </div>

  );
}
