import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Status =
  | "pending_verification"
  | "pending_profile"
  | "pending_approval"
  | "active"
  | "rejected";

type OnboardingProfileRow = {
  user_id: string;
  full_name: string | null;
  display_name?: string | null;
  phone?: string | null;
  country?: string | null;
  city?: string | null;
  company?: string | null;
  department?: string | null;
  job_title?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  wechat?: string | null;
  whatsapp?: string | null;
  profile_completed?: boolean | null;
  status: Status | null;
};

function normalizeOptional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [userId, setUserId] = useState("");
  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [company, setCompany] = useState("");
  const [department, setDepartment] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [wechat, setWechat] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const waitForAuthenticatedUser = useCallback(async () => {
    for (let i = 0; i < 12; i += 1) {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        return session.user;
      }

      await new Promise((resolve) => window.setTimeout(resolve, 500));
    }

    return null;
  }, []);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const searchParams = new URLSearchParams(location.search);
      const errorCode = searchParams.get("error_code");
      const errorDescription = searchParams.get("error_description");

      if (errorCode) {
        setError(errorDescription || "The email link is invalid or expired.");
        setIsLoading(false);
        return;
      }

      const user = await waitForAuthenticatedUser();

      if (!user) {
        setError(
          "Your session could not be created from the email link. Please sign in and complete your profile."
        );
        setIsLoading(false);
        return;
      }

      setUserId(user.id);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError || !profileData) {
        setError(profileError?.message || "Failed to load your profile.");
        setIsLoading(false);
        return;
      }

      const profile = profileData as OnboardingProfileRow;

      if (!profile.status) {
        setError("Profile status is not configured.");
        setIsLoading(false);
        return;
      }

      if (profile.status === "pending_verification") {
        const { error: statusUpdateError } = await supabase
          .from("profiles")
          .update({
            status: "pending_profile",
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);

        if (statusUpdateError) {
          setError(
            statusUpdateError.message ||
              "Failed to prepare your profile for onboarding."
          );
          setIsLoading(false);
          return;
        }

        profile.status = "pending_profile";
      }

      if (profile.status === "pending_approval") {
        setError(
          "Your profile has already been submitted and is waiting for admin approval."
        );
        setIsLoading(false);
        return;
      }

      if (profile.status === "rejected") {
        setError(
          "Your registration was rejected. Please contact the administrator."
        );
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      if (profile.status === "active" && profile.profile_completed) {
        navigate("/dashboard", { replace: true });
        return;
      }

      setFullName(profile.full_name || "");
      setDisplayName(profile.display_name || "");
      setPhone(profile.phone || "");
      setCountry(profile.country || "");
      setCity(profile.city || "");
      setCompany(profile.company || "");
      setDepartment(profile.department || "");
      setJobTitle(profile.job_title || "");
      setBio(profile.bio || "");
      setAvatarUrl(profile.avatar_url || "");
      setWechat(profile.wechat || "");
      setWhatsapp(profile.whatsapp || "");

      setIsLoading(false);
    } catch (err) {
      console.error("Onboarding load error:", err);
      setError("Failed to load onboarding page.");
      setIsLoading(false);
    }
  }, [location.search, navigate, waitForAuthenticatedUser]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const validate = () => {
    if (!fullName.trim()) return "Full name is required.";
    if (!displayName.trim()) return "Display name is required.";
    if (!phone.trim()) return "Phone is required.";
    if (!country.trim()) return "Country is required.";
    if (!city.trim()) return "City is required.";
    if (!company.trim()) return "Company is required.";
    if (!department.trim()) return "Department is required.";
    if (!jobTitle.trim()) return "Job title is required.";
    return "";
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isSaving) return;

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!userId) {
      setError("Missing user session.");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const { error: saveError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          display_name: displayName.trim(),
          phone: phone.trim(),
          country: country.trim(),
          city: city.trim(),
          company: company.trim(),
          department: department.trim(),
          job_title: jobTitle.trim(),
          bio: normalizeOptional(bio),
          avatar_url: normalizeOptional(avatarUrl),
          wechat: normalizeOptional(wechat),
          whatsapp: normalizeOptional(whatsapp),
          profile_completed: true,
          status: "pending_approval",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (saveError) {
        setError(saveError.message || "Failed to submit your profile.");
        setIsSaving(false);
        return;
      }

      setSuccessMessage(
        "Your details were submitted successfully. Your account is now waiting for admin approval."
      );

      await supabase.auth.signOut();

      window.setTimeout(() => {
        navigate("/login", { replace: true });
      }, 2000);
    } catch (err) {
      console.error("Onboarding save error:", err);
      setError("Unexpected error while submitting your profile.");
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-3xl bg-slate-900/60 border-slate-800">
        <CardContent className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">
              Complete Your Profile
            </h1>
            <p className="text-slate-400 mt-2">
              Please fill in your details below to complete your registration.
              After you submit this form, your request will be sent to the admin
              for approval.
            </p>
            <p className="text-slate-400 mt-2">
              You will not be able to enter the platform until the admin approves
              your account.
            </p>
          </div>

          {error && (
            <Alert className="mb-6 bg-red-900/20 border-red-800 text-red-300">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert className="mb-6 bg-emerald-900/20 border-emerald-800 text-emerald-300">
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Full Name *</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white"
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Display Name *</Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white"
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Phone *</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white"
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Country *</Label>
                <Input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white"
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">City *</Label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white"
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Company *</Label>
                <Input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white"
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Department *</Label>
                <Input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white"
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Job Title *</Label>
                <Input
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white"
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">WhatsApp</Label>
                <Input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white"
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">WeChat</Label>
                <Input
                  value={wechat}
                  onChange={(e) => setWechat(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white"
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-slate-300">Profile Photo URL</Label>
                <Input
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="Optional image URL"
                  className="bg-slate-950 border-slate-800 text-white"
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-slate-300">Short Bio</Label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  className="bg-slate-950 border-slate-800 text-white resize-none"
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
                onClick={handleSignOut}
                disabled={isSaving}
              >
                Sign Out
              </Button>

              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={isSaving}
              >
                {isSaving ? "Submitting..." : "Submit For Approval"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
