import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListSubmissions, useApproveSubmission, useRejectSubmission } from "@workspace/api-client-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Check, X, ChevronLeft, ChevronRight, Video, Image, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { GamemodeIcon } from "@/components/ui/gamemode-icon";

function EvidenceLink({ url }: { url?: string | null }) {
  if (!url) {
    return (
      <div className="flex items-center gap-1.5 text-red-400 text-sm">
        <AlertCircle className="w-4 h-4" />
        <span className="font-medium">No evidence</span>
      </div>
    );
  }

  const isVideo = /youtube|youtu\.be|medal\.tv|streamable|twitch|clips\.twitch/i.test(url);
  const Icon = isVideo ? Video : Image;
  const label = isVideo ? "Video" : "Screenshot";

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-colors text-sm font-medium"
    >
      <Icon className="w-3.5 h-3.5" />
      View {label}
      <ExternalLink className="w-3 h-3 opacity-70" />
    </a>
  );
}

export default function AdminSubmissions() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("pending");

  const { data, isLoading, refetch } = useListSubmissions({ page, status: status !== "all" ? status : undefined });
  const approveMutation = useApproveSubmission();
  const rejectMutation = useRejectSubmission();

  const handleApprove = (id: number) => {
    approveMutation.mutate({ id }, {
      onSuccess: () => { toast.success("Match approved — ELO updated."); refetch(); },
      onError: (e) => toast.error(e.message)
    });
  };

  const handleReject = (id: number) => {
    rejectMutation.mutate({ id }, {
      onSuccess: () => { toast.success("Submission rejected."); refetch(); },
      onError: (e) => toast.error(e.message)
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Match Submissions</h1>
            <p className="text-muted-foreground">
              Review player-reported matches. Check the evidence before approving — approving updates ELO.
            </p>
          </div>

          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-[200px] bg-card">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All Submissions</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-card rounded-xl p-5 border-border">
                <Skeleton className="h-6 w-64 mb-3" />
                <Skeleton className="h-5 w-48" />
              </div>
            ))
          ) : (data?.submissions ?? []).length === 0 ? (
            <div className="glass-card rounded-xl p-12 text-center text-muted-foreground border-border">
              No {status !== "all" ? status : ""} submissions found.
            </div>
          ) : (
            (data?.submissions ?? []).map((s) => (
              <div key={s.id} className="glass-card rounded-xl border-border hover:border-primary/20 transition-colors">
                <div className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Match Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <div className="flex items-center gap-2 text-base">
                          <img
                            src={`https://mc-heads.net/avatar/${s.submitterUsername}/24`}
                            className="w-6 h-6 rounded"
                            alt=""
                          />
                          <span className="font-bold text-primary">{s.submitterUsername}</span>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                          s.result === "win"
                            ? "bg-green-500/10 text-green-400 border-green-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}>
                          {s.result === "win" ? "WON" : "LOST"}
                        </span>
                        <span className="text-muted-foreground text-sm">vs</span>
                        <div className="flex items-center gap-2 text-base">
                          <img
                            src={`https://mc-heads.net/avatar/${s.opponentUsername}/24`}
                            className="w-6 h-6 rounded"
                            alt=""
                          />
                          <span className="font-bold">{s.opponentUsername}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <GamemodeIcon gamemode={s.gamemode} size={14} />
                          <span className="capitalize">{s.gamemode}</span>
                        </div>
                        <span>{new Date(s.createdAt).toLocaleString()}</span>
                        {s.status !== "pending" && (
                          <span className={`text-xs px-2 py-0.5 rounded border font-bold uppercase ${
                            s.status === "approved"
                              ? "bg-green-500/10 text-green-500 border-green-500/20"
                              : "bg-red-500/10 text-red-500 border-red-500/20"
                          }`}>
                            {s.status}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Evidence + Actions */}
                    <div className="flex flex-col md:items-end gap-3">
                      <EvidenceLink url={s.evidence} />

                      {s.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white gap-1"
                            onClick={() => handleApprove(s.id)}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="gap-1"
                            onClick={() => handleReject(s.id)}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                          >
                            <X className="w-3.5 h-3.5" /> Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Page {data.page} of {data.totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4" /> Prev
              </Button>
              <Button variant="outline" size="sm" disabled={page === data.totalPages} onClick={() => setPage(p => p + 1)}>
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
