import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { createRequestTracker } from "@/lib/safeAsync";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Mail,
  Bell,
  Palette,
  Shield,
  Save,
  Moon,
  Sun,
  Monitor,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Role = "admin" | "manager" | "employee" | "guest";
type Status = "active" | "pending" | "inactive" | "denied";

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  role: Role;
  status: Status;
  requested_role: Role | null;
  created_at: string;
  updated_at: string;
  display_name?: string | null;
  bio?: string | null;
  phone?: string | null;
  country?: string | null;
  city?: string | null;
  company?: string | null;
  department?: string | null;
  job_title?: string | null;
  avatar_url?: string | null;
  wechat?: string | null;
  whatsapp?: string | null;
  profile_completed?: boolean | null;
  language?: string | null;
  timezone?: string | null;
  date_format?: string | null;
  email_notifications?: boolean | null;
  push_notifications?: boolean | null;
  task_assigned_notifications?: boolean | null;
  due_soon_notifications?: boolean | null;
  mention_notifications?: boolean | null;
  digest_frequency?: string | null;
  theme?: string | null;
  accent_color?: string | null;
  font_size?: string | null;
  compact_mode?: boolean | null;
};

type SaveSection = "profile" | "account" | "notifications" | "appearance" | null;

export default function SettingsPage() {
  const requestTracker = useRef(createRequestTracker());

  const [activeTab, setActiveTab] = useState("profile");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [savingSection, setSavingSection] = useState<SaveSection>(null);

  const [authEmail, setAuthEmail] = useState("");
  const [userId, setUserId] = useState("");

  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [company, setCompany] = useState("");
  const [department, setDepartment] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [wechat, setWechat] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [profileCompleted, setProfileCompleted] = useState(false);

  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("UTC");
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [taskAssigned, setTaskAssigned] = useState(true);
  const [dueSoon, setDueSoon] = useState(true);
  const [mentions, setMentions] = useState(true);
  const [digestFrequency, setDigestFrequency] = useState("daily");

  const [theme, setTheme] = useState("dark");
  const [accentColor, setAccentColor] = useState("indigo");
  const [fontSize, setFontSize] = useState("medium");
  const [compactMode, setCompactMode] = useState(false);

  const fillFromProfile = useCallback((profile: ProfileRow) => {
    setFullName(profile.full_name || "");
    setDisplayName(profile.display_name || "");
    setBio(profile.bio || "");
    setPhone(profile.phone || "");
    setCountry(profile.country || "");
    setCity(profile.city || "");
    setCompany(profile.company || "");
    setDepartment(profile.department || "");
    setJobTitle(profile.job_title || "");
    setAvatarUrl(profile.avatar_url || "");
    setWechat(profile.wechat || "");
    setWhatsapp(profile.whatsapp || "");
    setProfileCompleted(Boolean(profile.profile_completed));

    setLanguage(profile.language || "en");
    setTimezone(profile.timezone || "UTC");
    setDateFormat(profile.date_format || "MM/DD/YYYY");

    setEmailNotifications(profile.email_notifications ?? true);
    setPushNotifications(profile.push_notifications ?? true);
    setTaskAssigned(profile.task_assigned_notifications ?? true);
    setDueSoon(profile.due_soon_notifications ?? true);
    setMentions(profile.mention_notifications ?? true);
    setDigestFrequency(profile.digest_frequency || "daily");

    setTheme(profile.theme || "dark");
    setAccentColor(profile.accent_color || "indigo");
    setFontSize(profile.font_size || "medium");
    setCompactMode(profile.compact_mode ?? false);
  }, []);

  const loadSettings = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    const requestId = requestTracker.current.next();

    if (mode === "initial") {
      setIsBootstrapping(true);
    } else {
      setIsRefreshing(true);
    }

    setSaveError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!requestTracker.current.isLatest(requestId)) return;

      if (authError || !user) {
        setSaveError("Failed to load authenticated user.");
        return;
      }

      setAuthEmail(user.email || "");
      setUserId(user.id);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!requestTracker.current.isLatest(requestId)) return;

      if (error || !data) {
        setSaveError(error?.message || "Failed to load profile settings.");
        return;
      }

      fillFromProfile(data as ProfileRow);
    } catch (error) {
      if (!requestTracker.current.isLatest(requestId)) return;
      console.error("Settings load error:", error);
      setSaveError("Failed to load settings.");
    } finally {
      if (!requestTracker.current.isLatest(requestId)) return;

      if (mode === "initial") {
        setIsBootstrapping(false);
      } else {
        setIsRefreshing(false);
      }
    }
  }, [fillFromProfile]);

  useEffect(() => {
    void loadSettings("initial");
  }, [loadSettings]);

  const showSaved = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3000);
  };

  const updateProfile = async (
    section: Exclude<SaveSection, null>,
    payload: Record<string, unknown>
  ) => {
    if (!userId) return;

    setSavingSection(section);
    setSaveError("");
    setSaved(false);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) {
        console.error("Settings save error:", error);
        setSaveError(error.message || "Failed to save settings.");
        return;
      }

      showSaved();
    } catch (error) {
      console.error("Settings save error:", error);
      setSaveError("Failed to save settings.");
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveProfile = async () => {
    await updateProfile("profile", {
      full_name: fullName.trim() || null,
      display_name: displayName.trim() || null,
      bio: bio.trim() || null,
      phone: phone.trim() || null,
      country: country.trim() || null,
      city: city.trim() || null,
      company: company.trim() || null,
      department: department.trim() || null,
      job_title: jobTitle.trim() || null,
      avatar_url: avatarUrl.trim() || null,
      wechat: wechat.trim() || null,
      whatsapp: whatsapp.trim() || null,
      profile_completed: profileCompleted,
    });
  };

  const handleSaveAccount = async () => {
    await updateProfile("account", {
      language,
      timezone,
      date_format: dateFormat,
    });
  };

  const handleSaveNotifications = async () => {
    await updateProfile("notifications", {
      email_notifications: emailNotifications,
      push_notifications: pushNotifications,
      task_assigned_notifications: taskAssigned,
      due_soon_notifications: dueSoon,
      mention_notifications: mentions,
      digest_frequency: digestFrequency,
    });
  };

  const handleSaveAppearance = async () => {
    await updateProfile("appearance", {
      theme,
      accent_color: accentColor,
      font_size: fontSize,
      compact_mode: compactMode,
    });
  };

  const initials =
    fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  const isSavingProfile = savingSection === "profile";
  const isSavingAccount = savingSection === "account";
  const isSavingNotifications = savingSection === "notifications";
  const isSavingAppearance = savingSection === "appearance";

  const SkeletonBlock = () => (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 bg-slate-800 rounded-lg" />
      <div className="grid md:grid-cols-2 gap-4">
        <div className="h-10 bg-slate-800 rounded-lg" />
        <div className="h-10 bg-slate-800 rounded-lg" />
        <div className="h-10 bg-slate-800 rounded-lg" />
        <div className="h-10 bg-slate-800 rounded-lg" />
      </div>
      <div className="h-28 bg-slate-800 rounded-lg" />
      <div className="h-10 bg-slate-800 rounded-lg w-40" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-slate-400">Manage your account settings and preferences</p>
        </div>

        <Button
          variant="outline"
          className="border-slate-700 text-slate-300 hover:bg-slate-800"
          onClick={() => void loadSettings("refresh")}
          disabled={isRefreshing || savingSection !== null}
        >
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {saved && (
        <Alert className="bg-green-900/20 border-green-800 text-green-400">
          <AlertDescription>Settings saved successfully.</AlertDescription>
        </Alert>
      )}

      {saveError && (
        <Alert className="bg-red-900/20 border-red-800 text-red-400">
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-900 border border-slate-800 flex-wrap h-auto">
          <TabsTrigger value="profile" className="data-[state=active]:bg-slate-800">
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="account" className="data-[state=active]:bg-slate-800">
            <Mail className="w-4 h-4 mr-2" />
            Account
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-slate-800">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="appearance" className="data-[state=active]:bg-slate-800">
            <Palette className="w-4 h-4 mr-2" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-slate-800">
            <Shield className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {isBootstrapping ? (
                <SkeletonBlock />
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={avatarUrl || undefined} />
                      <AvatarFallback className="bg-indigo-600 text-white text-2xl">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <Label htmlFor="avatarUrl" className="text-slate-300">
                        Profile Photo URL
                      </Label>
                      <Input
                        id="avatarUrl"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="Optional image URL"
                        className="mt-2 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-slate-300">
                        Full Name
                      </Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="bg-slate-950 border-slate-800 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="displayName" className="text-slate-300">
                        Display Name
                      </Label>
                      <Input
                        id="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="bg-slate-950 border-slate-800 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-slate-300">
                        Phone
                      </Label>
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="bg-slate-950 border-slate-800 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="country" className="text-slate-300">
                        Country
                      </Label>
                      <Input
                        id="country"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="bg-slate-950 border-slate-800 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-slate-300">
                        City
                      </Label>
                      <Input
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="bg-slate-950 border-slate-800 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="company" className="text-slate-300">
                        Company
                      </Label>
                      <Input
                        id="company"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        className="bg-slate-950 border-slate-800 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="department" className="text-slate-300">
                        Department
                      </Label>
                      <Input
                        id="department"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="bg-slate-950 border-slate-800 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="jobTitle" className="text-slate-300">
                        Job Title
                      </Label>
                      <Input
                        id="jobTitle"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        className="bg-slate-950 border-slate-800 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="whatsapp" className="text-slate-300">
                        WhatsApp
                      </Label>
                      <Input
                        id="whatsapp"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        className="bg-slate-950 border-slate-800 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="wechat" className="text-slate-300">
                        WeChat
                      </Label>
                      <Input
                        id="wechat"
                        value={wechat}
                        onChange={(e) => setWechat(e.target.value)}
                        className="bg-slate-950 border-slate-800 text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio" className="text-slate-300">
                      Short Bio
                    </Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us about yourself..."
                      rows={4}
                      className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Profile Completion</Label>
                    <Select
                      value={profileCompleted ? "completed" : "incomplete"}
                      onValueChange={(value) => setProfileCompleted(value === "completed")}
                    >
                    <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-950 border-slate-800 text-white">
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="incomplete">Incomplete</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={() => void handleSaveProfile()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    disabled={isSavingProfile}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSavingProfile ? "Saving..." : "Save Profile"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Account Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {isBootstrapping ? (
                <SkeletonBlock />
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-300">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={authEmail}
                      disabled
                      className="bg-slate-950 border-slate-800 text-slate-400"
                    />
                    <p className="text-slate-500 text-sm">
                      Email is managed by authentication settings.
                    </p>
                  </div>

                  <Separator className="bg-slate-800" />

                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Language</Label>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-950 border-slate-800 text-white">
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="zh">Chinese</SelectItem>
                          <SelectItem value="ru">Russian</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-300">Timezone</Label>
                      <Select value={timezone} onValueChange={setTimezone}>
                        <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-950 border-slate-800 text-white">
                          <SelectItem value="UTC">UTC</SelectItem>
                          <SelectItem value="Asia/Shanghai">Asia/Shanghai</SelectItem>
                          <SelectItem value="Asia/Jerusalem">Asia/Jerusalem</SelectItem>
                          <SelectItem value="America/New_York">America/New_York</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-300">Date Format</Label>
                      <Select value={dateFormat} onValueChange={setDateFormat}>
                        <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-950 border-slate-800 text-white">
                          <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                          <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                          <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    onClick={() => void handleSaveAccount()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    disabled={isSavingAccount}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSavingAccount ? "Saving..." : "Save Account"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {isBootstrapping ? (
                <SkeletonBlock />
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white">Email Notifications</p>
                      <p className="text-sm text-slate-500">Receive notifications by email</p>
                    </div>
                    <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                  </div>

                  <Separator className="bg-slate-800" />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white">Push Notifications</p>
                      <p className="text-sm text-slate-500">Receive notifications in app</p>
                    </div>
                    <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
                  </div>

                  <Separator className="bg-slate-800" />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white">Task Assigned</p>
                      <p className="text-sm text-slate-500">Notify when a task is assigned</p>
                    </div>
                    <Switch checked={taskAssigned} onCheckedChange={setTaskAssigned} />
                  </div>

                  <Separator className="bg-slate-800" />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white">Due Soon</p>
                      <p className="text-sm text-slate-500">Notify when task due date is near</p>
                    </div>
                    <Switch checked={dueSoon} onCheckedChange={setDueSoon} />
                  </div>

                  <Separator className="bg-slate-800" />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white">Mentions</p>
                      <p className="text-sm text-slate-500">Notify when someone mentions you</p>
                    </div>
                    <Switch checked={mentions} onCheckedChange={setMentions} />
                  </div>

                  <Separator className="bg-slate-800" />

                  <div className="space-y-2">
                    <Label className="text-slate-300">Digest Frequency</Label>
                    <Select value={digestFrequency} onValueChange={setDigestFrequency}>
                      <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-950 border-slate-800 text-white">
                        <SelectItem value="realtime">Realtime</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="never">Never</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={() => void handleSaveNotifications()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    disabled={isSavingNotifications}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSavingNotifications ? "Saving..." : "Save Notifications"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Appearance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {isBootstrapping ? (
                <SkeletonBlock />
              ) : (
                <>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Theme</Label>
                    <Select value={theme} onValueChange={setTheme}>
                      <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-950 border-slate-800 text-white">
                        <SelectItem value="light">
                          <div className="flex items-center gap-2">
                            <Sun className="w-4 h-4" />
                            Light
                          </div>
                        </SelectItem>
                        <SelectItem value="dark">
                          <div className="flex items-center gap-2">
                            <Moon className="w-4 h-4" />
                            Dark
                          </div>
                        </SelectItem>
                        <SelectItem value="system">
                          <div className="flex items-center gap-2">
                            <Monitor className="w-4 h-4" />
                            System
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Accent Color</Label>
                      <Select value={accentColor} onValueChange={setAccentColor}>
                        <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-950 border-slate-800 text-white">
                          <SelectItem value="indigo">Indigo</SelectItem>
                          <SelectItem value="blue">Blue</SelectItem>
                          <SelectItem value="green">Green</SelectItem>
                          <SelectItem value="purple">Purple</SelectItem>
                          <SelectItem value="red">Red</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-300">Font Size</Label>
                      <Select value={fontSize} onValueChange={setFontSize}>
                        <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-950 border-slate-800 text-white">
                          <SelectItem value="small">Small</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="large">Large</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 mt-7">
                      <div>
                        <p className="text-white">Compact Mode</p>
                        <p className="text-xs text-slate-500">Denser layout</p>
                      </div>
                      <Switch checked={compactMode} onCheckedChange={setCompactMode} />
                    </div>
                  </div>

                  <Button
                    onClick={() => void handleSaveAppearance()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    disabled={isSavingAppearance}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSavingAppearance ? "Saving..." : "Save Appearance"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isBootstrapping ? (
                <SkeletonBlock />
              ) : (
                <>
                  <p className="text-slate-400">
                    Password and email authentication settings are managed through Supabase Auth.
                  </p>
                  <p className="text-slate-500 text-sm">
                    The page now opens immediately without route blocking, and save actions are local
                    to each section.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
