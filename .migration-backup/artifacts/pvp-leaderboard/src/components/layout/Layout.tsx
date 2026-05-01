import { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { useSiteSettings } from "@/lib/site-settings";

export function Layout({ children }: { children: ReactNode }) {
  const settings = useSiteSettings();
  const siteName = settings.site_name || "PVPTIERS";
  const discordUrl = settings.discord_url || "#";

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground relative overflow-x-hidden">
      {/* Global ambient backdrop */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/5 blur-[140px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent/5 blur-[140px] rounded-full" />
      </div>

      <Navbar />
      <main className="flex-1 w-full relative z-10">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none opacity-50" />
        <div className="relative z-10">
          {children}
        </div>
      </main>
      <footer className="relative z-10 py-10 border-t border-primary/15 bg-card/40 backdrop-blur-xl mt-12">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div>
            {settings.site_logo ? (
              <img src={settings.site_logo} alt={siteName} className="h-8 w-auto max-w-[160px] object-contain mb-1" />
            ) : (
              <span className="font-display font-bold text-lg text-foreground">
                {siteName.slice(0, -5).toUpperCase() || "PVP"}<span className="shimmer-text">{siteName.slice(-5).toUpperCase() || "TIERS"}</span>
              </span>
            )}
            <p className="mt-1">{settings.site_description || "The elite competitive Minecraft PvP ranking platform."}</p>
          </div>
          <div className="flex gap-5">
            {discordUrl && discordUrl !== "#" && (
              <a href={discordUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors uppercase tracking-widest text-xs font-mono">Discord</a>
            )}
            <a href="#" className="hover:text-primary transition-colors uppercase tracking-widest text-xs font-mono">Terms</a>
            <a href="#" className="hover:text-primary transition-colors uppercase tracking-widest text-xs font-mono">Rules</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
