import { AdminLayout } from "@/components/layout/AdminLayout";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save, Globe, Monitor, MessageSquare, Trophy, Palette, Share2, Server } from "lucide-react";
import { apiUrl } from "@/lib/api";

type Settings = Record<string, string>;

const SECTION_FIELDS = {
  general: {
    label: "General",
    icon: Globe,
    fields: [
      { key: "site_name", label: "Site Name", placeholder: "PVPTIERS" },
      { key: "site_description", label: "Site Description", placeholder: "The most prestigious Minecraft PvP ranking platform.", multiline: true },
      { key: "server_ip", label: "Server IP Address", placeholder: "play.pvp-leaderboard.net", icon: Server },
    ],
  },
  homepage: {
    label: "Homepage",
    icon: Monitor,
    fields: [
      { key: "homepage_season_badge", label: "Season Badge Text", placeholder: "Season 4 is currently active" },
      { key: "homepage_hero_title", label: "Hero Title (use \\n for line break)", placeholder: "DOMINATE THE\nCOMPETITION", multiline: true },
      { key: "homepage_hero_subtitle", label: "Hero Subtitle", placeholder: "Battle top players...", multiline: true },
    ],
  },
  leaderboard: {
    label: "Leaderboard",
    icon: Trophy,
    fields: [
      { key: "leaderboard_title", label: "Leaderboard Title", placeholder: "Global Rankings" },
      { key: "leaderboard_description", label: "Leaderboard Description", placeholder: "Top players ranked by ELO..." },
    ],
  },
  discord: {
    label: "Discord",
    icon: MessageSquare,
    fields: [
      { key: "discord_url", label: "Discord Invite URL", placeholder: "https://discord.gg/pvptiers" },
    ],
  },
  social: {
    label: "Social Links",
    icon: Share2,
    fields: [
      { key: "social_twitter", label: "Twitter/X URL", placeholder: "https://twitter.com/pvptiers" },
      { key: "social_youtube", label: "YouTube URL", placeholder: "https://youtube.com/@pvptiers" },
      { key: "social_twitch", label: "Twitch URL", placeholder: "https://twitch.tv/pvptiers" },
    ],
  },
  theme: {
    label: "Theme Colors",
    icon: Palette,
    fields: [
      { key: "primary_color", label: "Primary Color (hex)", placeholder: "#00D4FF", type: "color" },
      { key: "accent_color", label: "Accent Color (hex)", placeholder: "#00FF87", type: "color" },
    ],
  },
};

export default function AdminSettings() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState("general");

  useEffect(() => {
    const token = localStorage.getItem("pvp_token");
    fetch(apiUrl("/api/admin/settings"), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.message || "Failed to load settings");
        setSettings(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : "Failed to load settings");
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const token = localStorage.getItem("pvp_token");
    try {
      const res = await fetch(apiUrl("/api/admin/settings"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        toast.success("Settings saved successfully.");
        window.dispatchEvent(new Event("settings-updated"));
      } else {
        toast.error("Failed to save settings.");
      }
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  };

  const currentSection = SECTION_FIELDS[activeSection as keyof typeof SECTION_FIELDS];
  const SectionIcon = currentSection.icon;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Site Settings</h1>
            <p className="text-muted-foreground">Configure all aspects of your platform.</p>
          </div>
          <Button onClick={handleSave} disabled={saving || loading} className="gap-2 min-w-[120px]">
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save All"}
          </Button>
        </div>

        <div className="flex gap-6">
          <nav className="w-48 shrink-0 space-y-1">
            {Object.entries(SECTION_FIELDS).map(([key, section]) => {
              const Icon = section.icon;
              return (
                <button
                  key={key}
                  onClick={() => setActiveSection(key)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                    activeSection === key
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {section.label}
                </button>
              );
            })}
          </nav>

          <div className="flex-1 glass-card rounded-xl border-border p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <SectionIcon className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold font-display">{currentSection.label}</h2>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => <div key={i} className="h-10 bg-muted/30 rounded animate-pulse" />)}
              </div>
            ) : (
              <div className="space-y-5">
                {currentSection.fields.map(field => (
                  <div key={field.key} className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{field.label}</label>
                    {field.type === "color" ? (
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={settings[field.key] || "#888888"}
                          onChange={e => setSettings(s => ({ ...s, [field.key]: e.target.value }))}
                          className="w-12 h-10 rounded border border-border cursor-pointer bg-transparent"
                        />
                        <Input
                          value={settings[field.key] || ""}
                          onChange={e => setSettings(s => ({ ...s, [field.key]: e.target.value }))}
                          placeholder={field.placeholder}
                          className="flex-1 bg-background/50 border-border/50 font-mono"
                        />
                      </div>
                    ) : field.multiline ? (
                      <Textarea
                        value={settings[field.key] || ""}
                        onChange={e => setSettings(s => ({ ...s, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="bg-background/50 border-border/50 min-h-[100px]"
                      />
                    ) : (
                      <Input
                        value={settings[field.key] || ""}
                        onChange={e => setSettings(s => ({ ...s, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="bg-background/50 border-border/50"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
