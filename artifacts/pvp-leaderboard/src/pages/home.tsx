import { Layout } from "@/components/layout/Layout";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useGetGlobalStats, useGetRecentActivity, useGetTopPlayers, useListAnnouncements } from "@workspace/api-client-react";
import { GamemodeIcon } from "@/components/ui/gamemode-icon";
import { TierBadge } from "@/components/ui/tier-badge";
import { Swords, Trophy, Users, ShieldAlert, ArrowRight, History, Edit, Trash2, Server, Clock, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useSiteSettings } from "@/lib/site-settings";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { TypingText } from "@/components/effects/TypingText";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease: [0.2, 0.8, 0.2, 1] },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

export default function Home() {
  const { data: stats, isLoading: statsLoading } = useGetGlobalStats();
  const { data: recent, isLoading: recentLoading, refetch: refetchRecent } = useGetRecentActivity();
  const { data: topPlayers, isLoading: topLoading } = useGetTopPlayers();
  const { data: announcements, isLoading: announcementsLoading } = useListAnnouncements({ page: 1 });
  const siteSettings = useSiteSettings();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const isAdmin = user && ['admin', 'superadmin', 'moderator'].includes(user.role);

  const { data: recentChallenges, isLoading: challengesLoading } = useQuery<{ challenges: any[] }>({
    queryKey: ["recent-challenges"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/challenges/recent"));
      return res.json();
    },
    refetchInterval: 60000,
  });

  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm("Delete this match? This cannot be undone.")) return;
    const token = localStorage.getItem("pvp_token");
    try {
      const res = await fetch(apiUrl(`/api/admin/matches/${matchId}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Match deleted.");
        refetchRecent();
      } else {
        toast.error(data.message || "Failed to delete match");
      }
    } catch {
      toast.error("Network error");
    }
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative py-20 lg:py-36 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?q=80&w=2070')] bg-cover bg-center opacity-8 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/75 to-background" />

        {/* Animated ambient orbs */}
        <div className="pointer-events-none absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/12 blur-[130px] rounded-full animate-float" />
        <div className="pointer-events-none absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-violet-600/10 blur-[120px] rounded-full animate-float" style={{ animationDelay: '2s' }} />
        <div className="pointer-events-none absolute top-1/3 right-1/6 w-[250px] h-[250px] bg-accent/8 blur-[100px] rounded-full animate-float" style={{ animationDelay: '1s' }} />
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            className="max-w-4xl mx-auto text-center"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            {siteSettings.homepage_season_badge && (
              <motion.div variants={fadeUp} custom={0}>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary mb-6 neon-border">
                  <Trophy className="w-4 h-4" />
                  <span className="text-sm font-medium font-mono uppercase tracking-widest">{siteSettings.homepage_season_badge}</span>
                </div>
              </motion.div>
            )}

            <motion.div variants={fadeUp} custom={1}>
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-4 font-display">
                <span className="neon-text-primary block">
                  {siteSettings.homepage_hero_title?.split("\n")[0] || "DOMINATE THE"}
                </span>
                <span className="shimmer-text block mt-1">
                  {siteSettings.homepage_hero_title?.split("\n")[1] || "COMPETITION"}
                </span>
              </h1>
            </motion.div>

            <motion.div variants={fadeUp} custom={2} className="mb-6">
              <div className="text-2xl font-bold font-display text-muted-foreground/80 h-9 flex items-center justify-center">
                <TypingText
                  texts={["Sword. Axe. UHC. All gamemodes.", "Climb the tiers. Prove your worth.", "The most elite Minecraft PvP platform.", "Battle the best. Rise to the top."]}
                  className="text-primary/90"
                  typingSpeed={55}
                />
              </div>
            </motion.div>

            <motion.p variants={fadeUp} custom={3} className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              {siteSettings.homepage_hero_subtitle || "The most prestigious Minecraft PvP ranking platform. Battle top players, climb the tiers, and prove your worth in the ultimate arena."}
            </motion.p>

            <motion.div variants={fadeUp} custom={4} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="w-full sm:w-auto text-lg h-14 px-8 font-bold neon-btn shadow-[0_0_24px_-4px_hsl(var(--primary)/0.6)]"
                asChild
              >
                <Link href="/leaderboard">
                  <span className="relative z-10 flex items-center gap-2">View Leaderboards <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" /></span>
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto text-lg h-14 px-8 border-primary/30 hover:border-primary/60 hover:bg-primary/10 font-bold transition-all neon-btn"
                asChild
              >
                <Link href="/register">Join the Arena</Link>
              </Button>
            </motion.div>

            {/* Scroll hint */}
            <motion.div variants={fadeUp} custom={5} className="mt-14 flex flex-col items-center gap-2 opacity-40">
              <div className="w-5 h-8 rounded-full border-2 border-primary/40 flex items-start justify-center p-1">
                <div className="w-1 h-2 rounded-full bg-primary animate-bounce" />
              </div>
              <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Scroll</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        {/* Stats Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={stagger}
        >
          {[
            { icon: Users, label: "Total Players", value: stats?.totalPlayers.toLocaleString(), color: "primary" },
            { icon: Swords, label: "Matches Played", value: stats?.totalMatches.toLocaleString(), color: "accent" },
            { icon: Trophy, label: "Top Player", value: stats?.topPlayer, color: "yellow", isText: true },
          ].map((card, idx) => {
            const colorMap: Record<string, string> = {
              primary: "from-primary/30 to-primary/5 text-primary border-primary/40",
              accent: "from-accent/30 to-accent/5 text-accent border-accent/40",
              yellow: "from-yellow-500/30 to-yellow-500/5 text-yellow-500 border-yellow-500/40",
            };
            return (
              <motion.div
                key={card.label}
                variants={fadeUp}
                custom={idx}
                className="relative glass-card p-6 rounded-xl flex items-center gap-4 group hover-glow-card scanline-overlay cursor-default"
              >
                <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-primary/40 rounded-tl-xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-primary/40 rounded-br-xl" />
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${colorMap[card.color]} border flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <card.icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mb-1">{card.label}</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <h3 className={`font-bold font-display truncate ${card.isText ? 'text-xl' : 'text-3xl'} ${card.color === 'primary' ? 'text-primary neon-text-primary' : card.color === 'yellow' ? 'text-yellow-500' : 'text-accent neon-text-accent'} animate-count-pop`}>
                      {card.value}
                    </h3>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Top Players by Gamemode */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              className="flex items-center justify-between"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl font-bold font-display flex items-center gap-2">
                <Trophy className="text-primary w-6 h-6" />
                Kings of the Arena
              </h2>
              <Button variant="ghost" className="text-sm" asChild>
                <Link href="/leaderboard">See all <ArrowRight className="w-4 h-4 ml-1" /></Link>
              </Button>
            </motion.div>

            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={stagger}
            >
              {topLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))
              ) : topPlayers?.byGamemode && (
                Object.entries(topPlayers.byGamemode).filter(([, player]) => player !== null).slice(0, 6).map(([gamemode, player], idx) => (
                  <motion.div key={gamemode} variants={fadeUp} custom={idx}>
                    <Link href={`/player/${player!.id}`}>
                      <div className="glass-card p-4 rounded-xl hover-glow-card cursor-pointer group flex items-center gap-4 hover:border-primary/50 transition-colors">
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
                            <span>{player.elo} Score</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))
              )}
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Announcements */}
            <motion.div
              className="glass-card rounded-xl border-border overflow-hidden"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
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
            </motion.div>

            {/* Recently Created Matches */}
            <motion.div
              className="glass-card rounded-xl border-border overflow-hidden"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="bg-muted/30 p-4 border-b border-border flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary" />
                  <h3 className="font-bold font-display">Recently Created Matches</h3>
                </div>
                {user && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary" asChild>
                    <Link href="/create-match">+ Create</Link>
                  </Button>
                )}
              </div>
              <div className="p-0">
                {challengesLoading ? (
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : (recentChallenges?.challenges?.length ?? 0) === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">No matches in the queue yet.</div>
                ) : (
                  <div className="divide-y divide-border">
                    {recentChallenges!.challenges.slice(0, 5).map((c: any) => {
                      const statusColor =
                        c.status === "pending" ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" :
                        c.status === "accepted" ? "bg-green-500/15 text-green-400 border-green-500/30" :
                        c.status === "rejected" ? "bg-red-500/15 text-red-400 border-red-500/30" :
                        c.status === "completed" ? "bg-primary/15 text-primary border-primary/30" :
                        "bg-muted text-muted-foreground border-border";
                      return (
                        <div key={c.id} className="p-3 hover:bg-muted/20 transition-colors">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 text-sm min-w-0">
                              <GamemodeIcon gamemode={c.gamemode} size={14} />
                              <span className="font-medium truncate">{c.challengerMcUsername}</span>
                              <span className="text-muted-foreground text-xs">vs</span>
                              <span className="font-medium truncate">{c.opponentUsername}</span>
                            </div>
                            <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border shrink-0 ${statusColor}`}>
                              {c.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1"><Server className="w-3 h-3" />{c.server}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(c.scheduledTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Recent Match Results */}
            <motion.div
              className="glass-card rounded-xl border-border overflow-hidden"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="bg-muted/30 p-4 border-b border-border flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  <h3 className="font-bold font-display">Recent Match Results</h3>
                </div>
                {isAdmin && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary" asChild>
                    <Link href="/admin/matches">
                      <Edit className="w-3 h-3" /> Manage
                    </Link>
                  </Button>
                )}
              </div>
              <div className="p-0">
                {recentLoading ? (
                  <div className="p-4 space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : recent?.recentMatches.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">No completed matches yet.</div>
                ) : (
                  <div className="divide-y divide-border">
                    {recent?.recentMatches.slice(0, 5).map((match) => (
                      <div key={match.id} className="p-3 flex items-center justify-between hover:bg-muted/20 transition-colors group">
                        <div className="flex items-center gap-2">
                          <GamemodeIcon gamemode={match.gamemode} size={14} />
                          <div className="text-sm">
                            <span className="text-green-400 font-medium">{match.winnerUsername}</span>
                            <span className="text-muted-foreground mx-1">def.</span>
                            <span className="text-red-400 font-medium">{match.loserUsername}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(match.playedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                          {isAdmin && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                className="text-primary hover:text-primary/80 transition-colors"
                                title="Edit match"
                                onClick={() => setLocation("/admin/matches")}
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                className="text-destructive hover:text-destructive/80 transition-colors"
                                title="Delete match"
                                onClick={() => handleDeleteMatch(match.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
