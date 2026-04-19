import { Layout } from "@/components/layout/Layout";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useGetGlobalStats, useGetRecentActivity, useGetTopPlayers, useListAnnouncements } from "@workspace/api-client-react";
import { GamemodeIcon } from "@/components/ui/gamemode-icon";
import { TierBadge } from "@/components/ui/tier-badge";
import { Swords, Trophy, Users, ShieldAlert, ArrowRight, Skull, Globe, Zap, Flame, Leaf, Wind, Axe, History } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useSiteSettings } from "@/lib/site-settings";

export default function Home() {
  const { data: stats, isLoading: statsLoading } = useGetGlobalStats();
  const { data: recent, isLoading: recentLoading } = useGetRecentActivity();
  const { data: topPlayers, isLoading: topLoading } = useGetTopPlayers();
  const { data: announcements, isLoading: announcementsLoading } = useListAnnouncements({ page: 1 });
  const siteSettings = useSiteSettings();

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?q=80&w=2070')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/80 to-background"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {siteSettings.homepage_season_badge && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6">
                <Trophy className="w-4 h-4" />
                <span className="text-sm font-medium">{siteSettings.homepage_season_badge}</span>
              </div>
            )}
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 font-display neon-text-primary">
              {siteSettings.homepage_hero_title?.split("\n").map((line, i, arr) => (
                <span key={i}>
                  {i === arr.length - 1
                    ? <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">{line}</span>
                    : <>{line} <br /></>
                  }
                </span>
              )) || <>DOMINATE THE <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">COMPETITION</span></>}
            </h1>
            
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              {siteSettings.homepage_hero_subtitle || "The most prestigious Minecraft PvP ranking platform. Battle top players, climb the tiers, and prove your worth in the ultimate arena."}
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="w-full sm:w-auto text-lg h-14 px-8 font-bold" asChild>
                <Link href="/leaderboard">View Leaderboards</Link>
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg h-14 px-8 border-primary/30 hover:border-primary/60 hover:bg-primary/10 font-bold" asChild>
                <Link href="/register">Join the Arena</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="glass-card p-6 rounded-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Total Players</p>
              <h3 className="text-3xl font-bold font-display">{statsLoading ? <Skeleton className="h-8 w-24 mt-1" /> : stats?.totalPlayers.toLocaleString()}</h3>
            </div>
          </div>
          
          <div className="glass-card p-6 rounded-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center text-accent">
              <Swords className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Matches Played</p>
              <h3 className="text-3xl font-bold font-display">{statsLoading ? <Skeleton className="h-8 w-24 mt-1" /> : stats?.totalMatches.toLocaleString()}</h3>
            </div>
          </div>
          
          <div className="glass-card p-6 rounded-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center text-yellow-500">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Top Player</p>
              <h3 className="text-xl font-bold font-display truncate max-w-[150px]">
                {statsLoading ? <Skeleton className="h-8 w-32 mt-1" /> : stats?.topPlayer}
              </h3>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Top Players by Gamemode */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold font-display flex items-center gap-2">
                <Trophy className="text-primary w-6 h-6" />
                Kings of the Arena
              </h2>
              <Button variant="ghost" className="text-sm" asChild>
                <Link href="/leaderboard">See all <ArrowRight className="w-4 h-4 ml-1" /></Link>
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))
              ) : topPlayers?.byGamemode && (
                Object.entries(topPlayers.byGamemode).filter(([, player]) => player !== null).slice(0, 6).map(([gamemode, player]) => (
                  <Link key={gamemode} href={`/player/${player!.id}`}>
                    <div className="glass-card p-4 rounded-xl hover:border-primary/50 transition-colors cursor-pointer group flex items-center gap-4">
                      <div className="relative">
                        <Avatar className="h-12 w-12 border-2 border-primary/50 group-hover:border-primary transition-colors">
                          <AvatarImage src={`https://mc-heads.net/avatar/${player.minecraftUsername}/64`} />
                          <AvatarFallback>{player.minecraftUsername.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                          <GamemodeIcon gamemode={gamemode} size={14} />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-bold truncate text-foreground group-hover:text-primary transition-colors">{player.minecraftUsername}</h4>
                          <TierBadge tier={player.tier} size="sm" />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="capitalize font-medium text-foreground">{gamemode}</span>
                          <span>{player.elo} ELO</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Announcements */}
            <div className="glass-card rounded-xl border-border overflow-hidden">
              <div className="bg-muted/30 p-4 border-b border-border flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-primary" />
                <h3 className="font-bold font-display">Announcements</h3>
              </div>
              <div className="p-0">
                {announcementsLoading ? (
                  <div className="p-4 space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : announcements?.announcements.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">No recent announcements</div>
                ) : (
                  <div className="divide-y divide-border">
                    {announcements?.announcements.slice(0, 3).map((announcement) => (
                      <div key={announcement.id} className="p-4 hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            "text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded",
                            announcement.type === 'info' ? 'bg-blue-500/20 text-blue-400' :
                            announcement.type === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                            announcement.type === 'update' ? 'bg-primary/20 text-primary' :
                            'bg-accent/20 text-accent'
                          )}>
                            {announcement.type}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(announcement.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="font-medium text-sm leading-snug">{announcement.title}</h4>
                      </div>
                    ))}
                  </div>
                )}
                <div className="p-3 border-t border-border bg-muted/10 text-center">
                  <Link href="/announcements" className="text-xs text-primary hover:underline font-medium">
                    View All Announcements
                  </Link>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="glass-card rounded-xl border-border overflow-hidden">
              <div className="bg-muted/30 p-4 border-b border-border flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                <h3 className="font-bold font-display">Recent Matches</h3>
              </div>
              <div className="p-0">
                {recentLoading ? (
                  <div className="p-4 space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : recent?.recentMatches.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">No recent matches</div>
                ) : (
                  <div className="divide-y divide-border">
                    {recent?.recentMatches.slice(0, 5).map((match) => (
                      <div key={match.id} className="p-3 flex items-center justify-between hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-2">
                          <GamemodeIcon gamemode={match.gamemode} size={14} />
                          <div className="text-sm">
                            <span className="text-green-400 font-medium">{match.winnerUsername}</span>
                            <span className="text-muted-foreground mx-1">def.</span>
                            <span className="text-red-400 font-medium">{match.loserUsername}</span>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(match.playedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
