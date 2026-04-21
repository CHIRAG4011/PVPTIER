import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Copy, Menu, ShieldAlert, Swords, X, Settings, Plus, Inbox, Trophy } from "lucide-react";
import { NotificationsBell } from "@/components/NotificationsBell";
import { useState } from "react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSiteSettings } from "@/lib/site-settings";

export function Navbar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const settings = useSiteSettings();

  const serverIp = settings.server_ip || "play.pvp-leaderboard.net";
  const discordUrl = settings.discord_url || "#";
  const siteName = settings.site_name || "PVPTIERS";

  const copyIp = () => {
    navigator.clipboard.writeText(serverIp);
    toast.success("Server IP copied to clipboard!");
  };

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/announcements", label: "Announcements" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-primary/20 bg-background/70 backdrop-blur-xl">
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            {settings.site_logo ? (
              <img src={settings.site_logo} alt={siteName} className="h-8 w-auto max-w-[160px] object-contain" />
            ) : (
              <>
                <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center border border-primary/50 group-hover:border-primary group-hover:shadow-[0_0_18px_-2px_hsl(var(--primary)/0.7)] transition-all">
                  <Swords className="w-5 h-5 text-primary" />
                </div>
                <span className="font-display font-bold text-xl tracking-tight hidden sm:block">
                  {siteName.slice(0, -5).toUpperCase() || "PVP"}<span className="shimmer-text">{siteName.slice(-5).toUpperCase() || "TIERS"}</span>
                </span>
              </>
            )}
          </Link>
          
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = location === link.href;
              return (
              <Link 
                key={link.href} 
                href={link.href}
                className={`relative px-4 py-2 rounded-md text-sm font-medium uppercase tracking-wider transition-all ${
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
                {active && (
                  <>
                    <span className="absolute inset-0 rounded-md bg-primary/10 border border-primary/30 shadow-[0_0_12px_-2px_hsl(var(--primary)/0.5)] -z-10" />
                    <span className="absolute -bottom-[17px] left-1/2 -translate-x-1/2 w-8 h-px bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
                  </>
                )}
              </Link>
            );})}
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            className="border-primary/30 hover:border-primary/60 hover:bg-primary/10 transition-all font-mono text-xs"
            onClick={copyIp}
          >
            <Copy className="w-3 h-3 mr-2" />
            {serverIp}
          </Button>

          {discordUrl && discordUrl !== "#" && (
            <Button 
              variant="default" 
              size="sm" 
              className="bg-[#5865F2] hover:bg-[#4752C4] text-white border-none"
              asChild
            >
              <a href={discordUrl} target="_blank" rel="noopener noreferrer">
                Discord
              </a>
            </Button>
          )}

          {user && (
            <>
              <Button size="sm" className="gap-1.5 h-9" asChild>
                <Link href="/create-match"><Plus className="w-4 h-4" /> Create Match</Link>
              </Button>
              <NotificationsBell />
            </>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8 border border-border">
                    <AvatarImage src={`https://mc-heads.net/avatar/${user.minecraftUsername || user.username}/64`} alt={user.username} />
                    <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.username}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {user.minecraftUsername && (
                  <DropdownMenuItem asChild>
                    <Link href={`/player/${user.id}`} className="cursor-pointer">My Profile</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/create-match" className="cursor-pointer">Create Match</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/my-challenges" className="cursor-pointer flex items-center">
                    <Inbox className="w-4 h-4 mr-2" /> My Matches
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/submit" className="cursor-pointer">Submit Match Video</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/my-submissions" className="cursor-pointer flex items-center">
                    <Trophy className="w-4 h-4 mr-2" /> My Submissions
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/tier-test" className="cursor-pointer">Apply for Tier Test</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/tickets" className="cursor-pointer">Support Tickets</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer flex items-center">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                
                {(user.role === 'admin' || user.role === 'superadmin' || user.role === 'moderator') && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer text-primary font-medium flex items-center">
                        <ShieldAlert className="w-4 h-4 mr-2" />
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()} className="text-destructive cursor-pointer">
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Log in</Link>
              </Button>
              <Button variant="default" size="sm" asChild>
                <Link href="/register">Sign up</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden flex items-center">
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link 
                key={link.href} 
                href={link.href}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  location === link.href 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
          
          <div className="h-px bg-border my-2" />
          
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start font-mono text-xs"
            onClick={copyIp}
          >
            <Copy className="w-4 h-4 mr-2" />
            play.pvp-leaderboard.net
          </Button>

          {user ? (
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex items-center gap-3 mb-2 px-2">
                <Avatar className="h-10 w-10 border border-border">
                  <AvatarImage src={`https://mc-heads.net/avatar/${user.minecraftUsername || user.username}/64`} />
                  <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{user.username}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              
              {user.minecraftUsername && (
                <Button variant="ghost" size="sm" className="justify-start" asChild onClick={() => setMobileMenuOpen(false)}>
                  <Link href={`/player/${user.id}`}>My Profile</Link>
                </Button>
              )}
              <Button variant="ghost" size="sm" className="justify-start" asChild onClick={() => setMobileMenuOpen(false)}>
                <Link href="/create-match">Create Match</Link>
              </Button>
              <Button variant="ghost" size="sm" className="justify-start" asChild onClick={() => setMobileMenuOpen(false)}>
                <Link href="/my-challenges">My Matches</Link>
              </Button>
              <Button variant="ghost" size="sm" className="justify-start" asChild onClick={() => setMobileMenuOpen(false)}>
                <Link href="/submit">Submit Match Video</Link>
              </Button>
              <Button variant="ghost" size="sm" className="justify-start" asChild onClick={() => setMobileMenuOpen(false)}>
                <Link href="/my-submissions">My Submissions</Link>
              </Button>
              <Button variant="ghost" size="sm" className="justify-start" asChild onClick={() => setMobileMenuOpen(false)}>
                <Link href="/tier-test">Apply for Tier Test</Link>
              </Button>
              <Button variant="ghost" size="sm" className="justify-start" asChild onClick={() => setMobileMenuOpen(false)}>
                <Link href="/tickets">Support Tickets</Link>
              </Button>
              
              {(user.role === 'admin' || user.role === 'superadmin' || user.role === 'moderator') && (
                <Button variant="ghost" size="sm" className="justify-start text-primary" asChild onClick={() => setMobileMenuOpen(false)}>
                  <Link href="/admin">
                    <ShieldAlert className="w-4 h-4 mr-2" />
                    Admin Dashboard
                  </Link>
                </Button>
              )}
              
              <Button variant="ghost" size="sm" className="justify-start text-destructive mt-2" onClick={() => { logout(); setMobileMenuOpen(false); }}>
                Log out
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Button variant="outline" className="w-full" asChild onClick={() => setMobileMenuOpen(false)}>
                <Link href="/login">Log in</Link>
              </Button>
              <Button variant="default" className="w-full" asChild onClick={() => setMobileMenuOpen(false)}>
                <Link href="/register">Sign up</Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
