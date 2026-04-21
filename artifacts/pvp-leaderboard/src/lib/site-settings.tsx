import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { apiUrl } from "@/lib/api";

type SiteSettings = Record<string, string>;

const defaultSettings: SiteSettings = {
  site_name: "PVPTIERS",
  site_logo: "",
  site_description: "The most prestigious Minecraft PvP ranking platform.",
  server_ip: "play.pvp-leaderboard.net",
  discord_url: "https://discord.gg/pvptiers",
  homepage_hero_title: "DOMINATE THE\nCOMPETITION",
  homepage_hero_subtitle: "The most prestigious Minecraft PvP ranking platform. Battle top players, climb the tiers, and prove your worth in the ultimate arena.",
  homepage_season_badge: "Season 4 is currently active",
  leaderboard_title: "Global Rankings",
  leaderboard_description: "Top players ranked by ELO across all gamemodes.",
  primary_color: "#00D4FF",
  accent_color: "#00FF87",
  social_twitter: "",
  social_youtube: "",
  social_twitch: "",
};

const SiteSettingsContext = createContext<SiteSettings>(defaultSettings);

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);

  useEffect(() => {
    fetch(apiUrl("/api/settings/public"))
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setSettings(data); })
      .catch(() => {});
  }, []);

  return (
    <SiteSettingsContext.Provider value={settings}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
