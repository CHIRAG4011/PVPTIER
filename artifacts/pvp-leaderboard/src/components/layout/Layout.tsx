import { ReactNode } from "react";
import { Navbar } from "./Navbar";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1 w-full relative">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none opacity-50" />
        <div className="relative z-10">
          {children}
        </div>
      </main>
      <footer className="py-8 border-t border-border bg-card/30 backdrop-blur-md">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div>
            <span className="font-display font-bold text-lg text-foreground">
              PVP<span className="text-primary">TIERS</span>
            </span>
            <p className="mt-1">The elite competitive Minecraft PvP ranking platform.</p>
          </div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-primary transition-colors">Discord</a>
            <a href="#" className="hover:text-primary transition-colors">Terms</a>
            <a href="#" className="hover:text-primary transition-colors">Rules</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
