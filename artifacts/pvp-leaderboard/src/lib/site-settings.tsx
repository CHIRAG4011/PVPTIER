import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { apiUrl } from "@/lib/api";

type SiteSettings = Record<string, string>;

function hexToHslTriplet(hex: string): string | null {
  if (!hex) return null;
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let hh = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hh = (g - b) / d + (g < b ? 6 : 0); break;
      case g: hh = (b - r) / d + 2; break;
      case b: hh = (r - g) / d + 4; break;
    }
    hh /= 6;
  }
  return `${Math.round(hh * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyThemeColors(settings: SiteSettings) {
  const root = document.documentElement;
  const primary = hexToHslTriplet(settings.primary_color);
  const accent = hexToHslTriplet(settings.accent_color);
  if (primary) root.style.setProperty("--primary", primary);
  if (accent) root.style.setProperty("--accent", accent);
}

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
  leaderboard_description: "Top players ranked by Score across all gamemodes.",
  primary_color: "#00D4FF",
  accent_color: "#00FF87",
  social_twitter: "",
  social_youtube: "",
  social_twitch: "",
};

const SiteSettingsContext = createContext<SiteSettings>(defaultSettings);

const CACHE_KEY = "pvp_site_settings_v1";

function loadCachedSettings(): SiteSettings {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw) as SiteSettings;
    return { ...defaultSettings, ...parsed };
  } catch {
    return defaultSettings;
  }
}

// Apply theme colors as early as possible (before React mounts) using cached values
// to avoid a flash of the default theme on reload.
if (typeof document !== "undefined") {
  applyThemeColors(loadCachedSettings());
}

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(loadCachedSettings);

  useEffect(() => {
    applyThemeColors(settings);
  }, [settings]);

  useEffect(() => {
    fetch(apiUrl("/api/settings/public"))
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          const merged = { ...defaultSettings, ...data };
          setSettings(merged);
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
          } catch {
            // Ignore quota errors
          }
        }
      })
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
