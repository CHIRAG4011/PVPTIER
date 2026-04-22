import { AdminLayout } from "@/components/layout/AdminLayout";
import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { GamemodeIcon } from "@/components/ui/gamemode-icon";
import {
  ArrowLeft,
  Check,
  X,
  Gavel,
  ExternalLink,
  Clock,
  AlertCircle,
  Trophy,
  ShieldCheck,
  Video,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

type EmbedInfo =
  | { type: "iframe"; src: string }
  | { type: "video"; src: string }
  | { type: "image"; src: string }
  | { type: "external"; src: string };

function detectEmbed(url: string | null | undefined): EmbedInfo | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");

    // YouTube
    if (host === "youtube.com" || host === "m.youtube.com") {
      const v = u.searchParams.get("v");
      if (v) return { type: "iframe", src: `https://www.youtube.com/embed/${v}` };
      const m = u.pathname.match(/^\/(?:shorts|embed)\/([\w-]+)/);
      if (m) return { type: "iframe", src: `https://www.youtube.com/embed/${m[1]}` };
    }
    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      if (id) return { type: "iframe", src: `https://www.youtube.com/embed/${id}` };
    }

    // Medal.tv
    if (host.endsWith("medal.tv")) {
      const m = u.pathname.match(/\/(?:games\/[^/]+\/)?clips\/([\w-]+)/);
      if (m) return { type: "iframe", src: `https://medal.tv/clip/${m[1]}/embed` };
      return { type: "iframe", src: u.toString() };
    }

    // Streamable
    if (host.endsWith("streamable.com")) {
      const m = u.pathname.match(/^\/([\w-]+)/);
      if (m) return { type: "iframe", src: `https://streamable.com/e/${m[1]}` };
    }

    // Twitch clips
    if (host === "clips.twitch.tv") {
      const slug = u.pathname.slice(1);
      const parent = window.location.hostname || "localhost";
      if (slug) return { type: "iframe", src: `https://clips.twitch.tv/embed?clip=${slug}&parent=${parent}` };
    }
    if (host === "twitch.tv" || host === "www.twitch.tv") {
      const m = u.pathname.match(/\/[^/]+\/clip\/([\w-]+)/);
      if (m) {
        const parent = window.location.hostname || "localhost";
        return { type: "iframe", src: `https://clips.twitch.tv/embed?clip=${m[1]}&parent=${parent}` };
      }
    }

    // Direct media
    if (/\.(mp4|webm|mov)$/i.test(u.pathname))
      return { type: "video", src: u.toString() };
    if (/\.(png|jpe?g|gif|webp)$/i.test(u.pathname))
      return { type: "image", src: u.toString() };

    return { type: "external", src: u.toString() };
  } catch {
    return null;
  }
}

function PlayerCard({
  selected,
  onClick,
  username,
  player,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  username: string;
  player: any | null;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
        selected
          ? "border-green-400 bg-green-500/15 shadow-[0_0_22px_-4px_rgba(34,197,94,0.4)]"
          : "border-border bg-card/50 hover:border-green-400/50 hover:bg-card/70"
      }`}
    >
      <div className="flex items-center gap-3">
        <img
          src={`https://mc-heads.net/avatar/${username}/56`}
          className="w-14 h-14 rounded-md shrink-0"
          alt=""
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-bold text-base truncate">{username}</span>
            {selected && (
              <Badge className="bg-green-500 text-white text-[10px]">WINNER</Badge>
            )}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">
            {label}
          </div>
          {player ? (
            <div className="flex items-center gap-3 text-xs">
              <Badge variant="outline" className="font-mono">
                {player.tier}
              </Badge>
              <span className="text-muted-foreground">
                <span className="text-foreground font-semibold">{player.elo}</span> Score
              </span>
              <span className="text-muted-foreground">
                <span className="text-green-400 font-semibold">{player.wins}W</span>
                {" / "}
                <span className="text-red-400 font-semibold">{player.losses}L</span>
              </span>
            </div>
          ) : (
            <div className="text-xs text-yellow-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> No player record yet
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

export default function AdminSubmissionDetail() {
  const params = useParams();
  const id = params.id || "";
  const [, setLocation] = useLocation();

  const [chosenWinner, setChosenWinner] = useState<"submitter" | "opponent" | "">("");
  const [notes, setNotes] = useState("");
  const [working, setWorking] = useState(false);

  const { data: s, isLoading, refetch } = useQuery<any>({
    queryKey: ["admin-submission", id],
    queryFn: async () => {
      const token = localStorage.getItem("pvp_token");
      const res = await fetch(apiUrl(`/api/submissions/${id}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const embed = detectEmbed(s?.evidence);
  const isPending = s?.status === "pending";

  const handleApprove = async () => {
    if (!chosenWinner) return toast.error("Pick the winner first.");
    setWorking(true);
    const token = localStorage.getItem("pvp_token");
    try {
      const res = await fetch(apiUrl(`/api/submissions/${id}/approve`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ winner: chosenWinner, notes: notes.trim() || undefined }),
      });
      const body = await res.json();
      if (res.ok) {
        toast.success("Match approved — Score updated.");
        refetch();
        setTimeout(() => setLocation("/admin/submissions"), 600);
      } else {
        toast.error(body.message || "Failed to approve");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setWorking(false);
    }
  };

  const handleReject = async () => {
    if (!confirm("Reject this submission?")) return;
    setWorking(true);
    const token = localStorage.getItem("pvp_token");
    try {
      const res = await fetch(apiUrl(`/api/submissions/${id}/reject`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes: notes.trim() || undefined }),
      });
      if (res.ok) {
        toast.success("Submission rejected.");
        refetch();
        setTimeout(() => setLocation("/admin/submissions"), 600);
      } else {
        toast.error("Failed to reject");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setWorking(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="aspect-video w-full mb-6 rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </AdminLayout>
    );
  }

  if (!s) {
    return (
      <AdminLayout>
        <div className="glass-card rounded-xl p-12 text-center border-border">
          <h2 className="text-2xl font-bold mb-2">Submission not found</h2>
          <Button asChild variant="outline">
            <Link href="/admin/submissions">Back to submissions</Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
              <Link href="/admin/submissions">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to submissions
              </Link>
            </Button>
            <h1 className="text-3xl font-display font-bold">Review Submission</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5">
                <GamemodeIcon gamemode={s.gamemode} size={14} />
                <span className="capitalize">{s.gamemode}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {new Date(s.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
          <Badge
            className={`text-xs ${
              s.status === "pending"
                ? "bg-yellow-500/15 text-yellow-300 border border-yellow-500/30"
                : s.status === "approved"
                  ? "bg-green-500/15 text-green-300 border border-green-500/30"
                  : "bg-red-500/15 text-red-300 border border-red-500/30"
            }`}
          >
            {s.status.toUpperCase()}
            {s.result && s.status === "approved" && ` • Submitter ${s.result === "win" ? "WON" : "LOST"}`}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Video + evidence */}
          <div className="lg:col-span-2 space-y-4">
            <div className="glass-card rounded-2xl border-border overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center gap-2 bg-card/50">
                <Video className="w-4 h-4 text-primary" />
                <h2 className="font-display font-bold">Video Evidence</h2>
              </div>

              {!embed ? (
                <div className="aspect-video flex flex-col items-center justify-center bg-muted/10 text-center p-8 gap-3">
                  <AlertCircle className="w-10 h-10 text-red-400" />
                  <p className="text-muted-foreground">No evidence attached.</p>
                </div>
              ) : embed.type === "iframe" ? (
                <div className="aspect-video bg-black">
                  <iframe
                    src={embed.src}
                    className="w-full h-full"
                    allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                    allowFullScreen
                    title="Match evidence"
                  />
                </div>
              ) : embed.type === "video" ? (
                <div className="aspect-video bg-black flex items-center justify-center">
                  <video
                    src={embed.src}
                    controls
                    className="max-w-full max-h-full"
                  />
                </div>
              ) : embed.type === "image" ? (
                <div className="bg-black flex items-center justify-center max-h-[80vh] overflow-auto">
                  <img src={embed.src} alt="Evidence" className="max-w-full" />
                </div>
              ) : (
                <div className="aspect-video flex flex-col items-center justify-center bg-muted/10 gap-4 p-8 text-center">
                  <p className="text-muted-foreground text-sm">
                    This source can't be embedded directly. Open it in a new tab to review.
                  </p>
                  <Button asChild>
                    <a href={embed.src} target="_blank" rel="noopener noreferrer">
                      Open evidence <ExternalLink className="w-4 h-4 ml-1" />
                    </a>
                  </Button>
                </div>
              )}

              {s.evidence && (
                <div className="px-5 py-3 border-t border-border flex items-center justify-between gap-2 text-xs text-muted-foreground bg-card/30">
                  <span className="truncate font-mono">{s.evidence}</span>
                  <a
                    href={s.evidence}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline shrink-0"
                  >
                    Open <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Existing review notes (if any) */}
            {s.reviewNotes && (
              <div className="glass-card rounded-2xl p-5 border-border">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <h3 className="font-display font-bold">Previous Review Notes</h3>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {s.reviewNotes}
                </p>
                {s.reviewedAt && (
                  <p className="text-xs text-muted-foreground/70 mt-2">
                    Reviewed {new Date(s.reviewedAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right: Decision panel */}
          <div className="space-y-4">
            <div className="glass-card rounded-2xl p-5 border-primary/30">
              <div className="flex items-center gap-2 mb-1">
                <Gavel className="w-5 h-5 text-primary" />
                <h2 className="font-display font-bold text-lg">Choose the winner</h2>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Watch the video, then click the player who won.
              </p>

              <div className="space-y-3">
                <PlayerCard
                  selected={chosenWinner === "submitter"}
                  onClick={() => isPending && setChosenWinner("submitter")}
                  username={s.submitterUsername}
                  player={s.submitterPlayer}
                  label="Submitter"
                />
                <div className="flex items-center justify-center text-xs font-bold text-muted-foreground">
                  VS
                </div>
                <PlayerCard
                  selected={chosenWinner === "opponent"}
                  onClick={() => isPending && setChosenWinner("opponent")}
                  username={s.opponentUsername}
                  player={s.opponentPlayer}
                  label="Opponent"
                />
              </div>
            </div>

            <div className="glass-card rounded-2xl p-5 border-border">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-primary" />
                <h3 className="font-display font-bold">Admin Notes</h3>
                <span className="text-xs text-muted-foreground">(optional)</span>
              </div>
              <Textarea
                placeholder="Why this decision? Anything you noticed in the video, rule violations, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={!isPending}
                className="bg-background/50 border-border/50 min-h-[110px] text-sm"
              />
              <p className="text-[10px] text-muted-foreground mt-2">
                Saved with the submission for the audit trail.
              </p>
            </div>

            {isPending ? (
              <div className="space-y-2">
                <Button
                  onClick={handleApprove}
                  disabled={working || !chosenWinner}
                  className="w-full h-12 gap-2 font-bold"
                >
                  <Check className="w-4 h-4" />
                  {working ? "Approving..." : "Approve & Update Score"}
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={working}
                  variant="destructive"
                  className="w-full h-11 gap-2 font-bold"
                >
                  <X className="w-4 h-4" />
                  Reject Submission
                </Button>
              </div>
            ) : (
              <div className="glass-card rounded-xl p-4 border-border text-sm flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">
                  Already {s.status}. No further action available.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
