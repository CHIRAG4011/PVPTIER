import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/lib/auth";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { User, Lock, Image, Save, ArrowLeft, Gamepad2, Upload, Trash2 } from "lucide-react";
import { useRef } from "react";
import { Link } from "wouter";
import { apiUrl } from "@/lib/api";

function apiRequest(method: string, path: string, body: unknown) {
  const token = localStorage.getItem("pvp_token");
  return fetch(apiUrl(`/api${path}`), {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  }).then(r => r.json());
}

export default function Settings() {
  const { user, setToken, logout } = useAuth();
  const queryClient = useQueryClient();
  const refreshMe = () => queryClient.invalidateQueries({ queryKey: ["me"] });
  const [username, setUsername] = useState(user?.username || "");
  const [bio, setBio] = useState((user as { bio?: string })?.bio || "");
  const [avatarUrl, setAvatarUrl] = useState((user as { avatarUrl?: string })?.avatarUrl || "");
  const [minecraftUsername, setMinecraftUsername] = useState(user?.minecraftUsername || "");
  const [customSkinUrl, setCustomSkinUrl] = useState((user as { customSkinUrl?: string })?.customSkinUrl || "");
  const skinFileInputRef = useRef<HTMLInputElement>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground">You must be logged in to access settings.</p>
          <Link href="/login"><Button className="mt-4">Log In</Button></Link>
        </div>
      </Layout>
    );
  }

  const handleUsernameChange = async () => {
    if (username === user.username) { toast.info("No change"); return; }
    setSaving("username");
    const data = await apiRequest("PATCH", "/users/me/username", { username });
    setSaving(null);
    if (data.success) {
      toast.success("Username updated!");
      if (data.token) setToken(data.token);
      refreshMe();
    } else {
      toast.error(data.message || "Failed to update username");
    }
  };

  const handleBioChange = async () => {
    setSaving("bio");
    const data = await apiRequest("PATCH", "/users/me/bio", { bio });
    setSaving(null);
    if (data.success) {
      toast.success("Bio updated!");
      refreshMe();
    } else {
      toast.error(data.message || "Failed to update bio");
    }
  };

  const handleAvatarChange = async () => {
    setSaving("avatar");
    const data = await apiRequest("PATCH", "/users/me/avatar", { avatarUrl });
    setSaving(null);
    if (data.success) {
      toast.success("Profile picture updated!");
      refreshMe();
    } else {
      toast.error(data.message || "Invalid URL");
    }
  };

  const handleSkinUpload = async (file: File) => {
    if (file.size > 200 * 1024) {
      toast.error("Skin file is too large (max 200 KB).");
      return;
    }
    if (file.type !== "image/png") {
      toast.error("Skin must be a PNG file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setSaving("skin-upload");
      const data = await apiRequest("POST", "/users/me/skin-upload", { skinDataUrl: dataUrl });
      setSaving(null);
      if (data.success) {
        setCustomSkinUrl(dataUrl);
        toast.success("Custom skin uploaded!");
        refreshMe();
      } else {
        toast.error(data.message || "Failed to upload skin");
      }
    };
    reader.onerror = () => toast.error("Could not read the file");
    reader.readAsDataURL(file);
  };

  const handleSkinRemove = async () => {
    if (!confirm("Remove your uploaded skin?")) return;
    setSaving("skin-upload");
    const token = localStorage.getItem("pvp_token");
    const data = await fetch(apiUrl("/api/users/me/skin-upload"), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json());
    setSaving(null);
    if (data.success) {
      setCustomSkinUrl("");
      toast.success("Custom skin removed.");
      refreshMe();
    } else {
      toast.error(data.message || "Failed to remove skin");
    }
  };

  const handleSkinChange = async () => {
    setSaving("skin");
    const data = await apiRequest("PATCH", "/users/me/minecraft", {
      minecraftUsername: minecraftUsername.trim() || null,
    });
    setSaving(null);
    if (data.success) {
      toast.success(minecraftUsername.trim() ? "Minecraft skin saved!" : "Skin removed.");
      refreshMe();
    } else {
      toast.error(data.message || "Failed to save skin");
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setSaving("password");
    const data = await apiRequest("PATCH", "/users/me/password", { currentPassword, newPassword });
    setSaving(null);
    if (data.success) {
      toast.success("Password changed!");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } else {
      toast.error(data.message || "Failed to change password");
    }
  };

  const displayAvatar = avatarUrl || (user.minecraftUsername ? `https://mc-heads.net/avatar/${user.minecraftUsername}/64` : undefined);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10 max-w-2xl">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 mb-4">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
          <h1 className="text-3xl font-display font-bold">Account Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your profile and security.</p>
        </div>

        <div className="space-y-6">
          <div className="glass-card rounded-xl border-border p-6 space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <User className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">Profile</h2>
            </div>

            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-primary/50">
                <AvatarImage src={displayAvatar} />
                <AvatarFallback className="text-xl font-bold">{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{user.username}</p>
                <p>{user.email}</p>
                <p className="capitalize">{user.role}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Username</label>
              <div className="flex gap-2">
                <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="Your username" className="bg-background/50 border-border/50" />
                <Button onClick={handleUsernameChange} disabled={saving === "username"} size="sm">
                  {saving === "username" ? "..." : <Save className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Letters, numbers, underscores and hyphens only.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Bio</label>
              <div className="flex gap-2">
                <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell the community about yourself..." className="bg-background/50 border-border/50 min-h-[80px]" maxLength={300} />
              </div>
              <div className="flex justify-between">
                <p className="text-xs text-muted-foreground">{bio.length}/300</p>
                <Button onClick={handleBioChange} disabled={saving === "bio"} size="sm" variant="outline">
                  {saving === "bio" ? "Saving..." : "Save Bio"}
                </Button>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl border-border p-6 space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <Image className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">Profile Picture</h2>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Avatar URL</label>
              <div className="flex gap-2">
                <Input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://example.com/avatar.png" className="bg-background/50 border-border/50" />
                <Button onClick={handleAvatarChange} disabled={saving === "avatar"} size="sm">
                  {saving === "avatar" ? "..." : <Save className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Paste a direct image URL. Leave empty to use your Minecraft skin.</p>
            </div>

            {avatarUrl && (
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border border-border">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback>?</AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground">Preview</span>
              </div>
            )}
          </div>

          <div className="glass-card rounded-xl border-border p-6 space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <Gamepad2 className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">Minecraft Skin</h2>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Minecraft Username</label>
              <div className="flex gap-2">
                <Input
                  value={minecraftUsername}
                  onChange={e => setMinecraftUsername(e.target.value)}
                  placeholder="e.g. Notch"
                  maxLength={16}
                  className="bg-background/50 border-border/50"
                />
                <Button onClick={handleSkinChange} disabled={saving === "skin"} size="sm">
                  {saving === "skin" ? "..." : <Save className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Used to show your Minecraft skin on your profile. Also acts as a fallback profile picture when no avatar URL is set.
              </p>
            </div>

            {minecraftUsername.trim().length >= 3 && !customSkinUrl && (
              <div className="flex items-center gap-4 p-4 rounded-lg bg-background/40 border border-border/50">
                <img
                  src={`https://mc-heads.net/body/${minecraftUsername.trim()}/100`}
                  alt="Skin body"
                  className="h-28 w-auto"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
                <img
                  src={`https://mc-heads.net/head/${minecraftUsername.trim()}/100`}
                  alt="Skin head"
                  className="h-20 w-20 rounded-md"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
                <div className="text-sm">
                  <p className="font-bold">{minecraftUsername.trim()}</p>
                  <p className="text-muted-foreground text-xs">Skin preview</p>
                </div>
              </div>
            )}

            {/* Upload skin (for cracked / non-premium accounts) */}
            <div className="space-y-2 pt-2 border-t border-border/50">
              <label className="text-sm font-medium flex items-center gap-2">
                <Upload className="w-4 h-4" /> Upload Skin (.png)
              </label>
              <p className="text-xs text-muted-foreground">
                For cracked accounts or custom skins not on Mojang. Upload a 64×64 (or 64×32) PNG, max 200 KB. Overrides the username preview above.
              </p>
              <input
                ref={skinFileInputRef}
                type="file"
                accept="image/png"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleSkinUpload(file);
                  if (skinFileInputRef.current) skinFileInputRef.current.value = "";
                }}
              />
              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => skinFileInputRef.current?.click()}
                  disabled={saving === "skin-upload"}
                  className="gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  {saving === "skin-upload"
                    ? "Uploading..."
                    : customSkinUrl
                      ? "Replace skin"
                      : "Choose skin file"}
                </Button>
                {customSkinUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleSkinRemove}
                    disabled={saving === "skin-upload"}
                    className="gap-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" /> Remove
                  </Button>
                )}
              </div>

              {customSkinUrl && (
                <div className="flex items-center gap-4 p-4 rounded-lg bg-background/40 border border-primary/40 mt-2">
                  <div
                    className="w-20 h-20 rounded-md border border-border bg-black/40"
                    style={{
                      backgroundImage: `url(${customSkinUrl})`,
                      backgroundSize: "512px 512px",
                      backgroundPosition: "-64px -64px",
                      imageRendering: "pixelated",
                    }}
                    title="Face crop"
                  />
                  <img
                    src={customSkinUrl}
                    alt="Uploaded skin (atlas)"
                    className="h-20 w-20 rounded-md border border-border bg-black/40"
                    style={{ imageRendering: "pixelated" }}
                  />
                  <div className="text-sm">
                    <p className="font-bold flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
                      Custom skin active
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Used wherever your skin is shown.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card rounded-xl border-border p-6 space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <Lock className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">Change Password</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Password</label>
                <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="bg-background/50 border-border/50" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">New Password</label>
                <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="bg-background/50 border-border/50" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm New Password</label>
                <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="bg-background/50 border-border/50" />
              </div>
              <Button onClick={handlePasswordChange} disabled={saving === "password"} className="w-full">
                {saving === "password" ? "Changing..." : "Change Password"}
              </Button>
            </div>
          </div>

          <div className="glass-card rounded-xl border-border p-6">
            <h2 className="text-lg font-bold text-destructive mb-2">Danger Zone</h2>
            <Button variant="destructive" onClick={() => { logout(); toast.success("Logged out"); }} className="w-full">
              Log Out
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
