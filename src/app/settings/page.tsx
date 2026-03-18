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

  const handleSaveAppearance = async () => {
    await updateProfile("appearance", {
      theme,
      accent_color: accentColor,
      font_size: fontSize,
      compact_mode: compactMode,
    });
  };

  const handleProfilePhotoUpload = async (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setIsUploadingPhoto(true);
    setSaveError("");

    try {
      const result = await uploadProfilePhoto({
        file,
        userId,
      });

      setAvatarUrl(result.publicUrl);
    } catch (error) {
      console.error("Settings photo upload error:", error);
      setSaveError(
        error instanceof Error
          ? error.message
          : "Failed to upload profile photo."
      );
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = "";
    }
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
          <p className="text-slate-400">
            Manage your account settings and preferences
          </p>
        </div>

        <Button
          variant="outline"
          className="border-slate-700 text-slate-300 hover:bg-slate-800"
          onClick={() => void loadSettings("refresh")}
          disabled={isRefreshing || savingSection !== null || isUploadingPhoto}
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
          <TabsTrigger
            value="profile"
            className="data-[state=active]:bg-slate-800"
          >
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger
            value="account"
            className="data-[state=active]:bg-slate-800"
          >
            <Mail className="w-4 h-4 mr-2" />
            Account
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="data-[state=active]:bg-slate-800"
          >
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger
            value="appearance"
            className="data-[state=active]:bg-slate-800"
          >
            <Palette className="w-4 h-4 mr-2" />
            Appearance
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="data-[state=active]:bg-slate-800"
          >
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

                    <div className="flex-1 space-y-3">
                      <Label className="text-slate-300">Profile Photo</Label>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          type="button"
                          variant="outline"
                          className="border-slate-700 text-slate-300 hover:bg-slate-800"
                          onClick={() => profilePhotoInputRef.current?.click()}
                          disabled={isUploadingPhoto || isSavingProfile}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {isUploadingPhoto ? "Uploading..." : "Upload Photo"}
                        </Button>

                        {avatarUrl && (
                          <Button
                            type="button"
                            variant="outline"
                            className="border-red-800 text-red-400 hover:bg-red-900/20"
                            onClick={() => setAvatarUrl("")}
                            disabled={isUploadingPhoto || isSavingProfile}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove Photo
                          </Button>
                        )}
                      </div>

                      {avatarUrl ? (
                        <div className="text-xs text-slate-500 break-all">
                          {avatarUrl}
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500">
                          No profile photo uploaded yet.
                        </div>
                      )}

                      <input
                        ref={profilePhotoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleProfilePhotoUpload}
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
                      <Label
                        htmlFor="shippingAddress"
                        className="text-slate-300"
                      >
                        Shipping Address
                      </Label>
                      <Input
                        id="shippingAddress"
                        value={shippingAddress}
                        onChange={(e) => setShippingAddress(e.target.value)}
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
                      <Label className="text-slate-300">Role</Label>
                      <Input
                        value={getRoleLabel(requestedRole || role)}
                        disabled
                        className="bg-slate-950 border-slate-800 text-slate-400"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-300">Member Type</Label>
                      <Select
                        value={memberType}
                        onValueChange={(value) =>
                          setMemberType(value as MemberType)
                        }
                        disabled={effectiveRoleForMemberType === "admin"}
                      >
                        <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                          <SelectValue placeholder="Select member type" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-950 border-slate-800 text-white">
                          {availableMemberTypes.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      onValueChange={(value) =>
                        setProfileCompleted(value === "completed")
                      }
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
                    disabled={isSavingProfile || isUploadingPhoto}
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
                          <SelectItem value="Asia/Shanghai">
                            Asia/Shanghai
                          </SelectItem>
                          <SelectItem value="Asia/Jerusalem">
                            Asia/Jerusalem
                          </SelectItem>
                          <SelectItem value="America/New_York">
                            America/New_York
                          </SelectItem>
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
              <CardTitle className="text-white">
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {isBootstrapping ? (
                <SkeletonBlock />
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white">Email Notifications</p>
                      <p className="text-sm text-slate-500">
                        Receive notifications by email
                      </p>
                    </div>
                    <Switch
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                    />
                  </div>

                  <Separator className="bg-slate-800" />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white">Push Notifications</p>
                      <p className="text-sm text-slate-500">
                        Receive notifications in app
                      </p>
                    </div>
                    <Switch
                      checked={pushNotifications}
                      onCheckedChange={setPushNotifications}
                    />
                  </div>

                  <Separator className="bg-slate-800" />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white">Task Assigned</p>
                      <p className="text-sm text-slate-500">
                        Notify when a task is assigned
                      </p>
                    </div>
                    <Switch
                      checked={taskAssigned}
                      onCheckedChange={setTaskAssigned}
                    />
                  </div>

                  <Separator className="bg-slate-800" />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white">Due Soon</p>
                      <p className="text-sm text-slate-500">
                        Notify when task due date is near
                      </p>
                    </div>
                    <Switch checked={dueSoon} onCheckedChange={setDueSoon} />
                  </div>

                  <Separator className="bg-slate-800" />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white">Mentions</p>
                      <p className="text-sm text-slate-500">
                        Notify when someone mentions you
                      </p>
                    </div>
                    <Switch checked={mentions} onCheckedChange={setMentions} />
                  </div>

                  <Separator className="bg-slate-800" />

                  <div className="space-y-2">
                    <Label className="text-slate-300">Digest Frequency</Label>
                    <Select
                      value={digestFrequency}
                      onValueChange={setDigestFrequency}
                    >
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
                      <Switch
                        checked={compactMode}
                        onCheckedChange={setCompactMode}
                      />
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
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                    <p className="text-white font-medium">Authentication</p>
                    <p className="text-sm text-slate-500 mt-1">
                      Password and email authentication settings are managed
                      through Supabase Auth.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                    <p className="text-white font-medium">Current Role</p>
                    <p className="text-sm text-slate-400 mt-1">
                      {getRoleLabel(role)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                    <p className="text-white font-medium">Requested Role</p>
                    <p className="text-sm text-slate-400 mt-1">
                      {getRoleLabel(requestedRole || role)}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
