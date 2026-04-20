import { AdminLayout } from "@/components/layout/AdminLayout";
import { useState } from "react";
import { apiUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X, ChevronLeft, ChevronRight, ExternalLink, Trophy } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

async function fetchApplications(page: number, status: string) {
  const token = localStorage.getItem("pvp_token");
  const params = new URLSearchParams({ page: String(page), status });
  const res = await fetch(apiUrl(`/api/tier-test?${params}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export default function AdminTierTests() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("pending");
  const [processing, setProcessing] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-tier-tests", page, status],
    queryFn: () => fetchApplications(page, status),
  });

  const handleApprove = async (id: string, applicantUsername: string, requestedTier: string) => {
    const reviewNote = prompt(`Approve ${applicantUsername}'s application for ${requestedTier}? Add a review note (optional):`);
    if (reviewNote === null) return;
    setProcessing(id);
    const token = localStorage.getItem("pvp_token");
    try {
      const res = await fetch(apiUrl(`/api/tier-test/${id}/approve`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reviewNote }),
      });
      const d = await res.json();
      if (d.success) {
        toast.success(`Approved! ${applicantUsername} is now ${requestedTier}`);
        refetch();
      } else {
        toast.error(d.message || "Failed to approve");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string, applicantUsername: string) => {
    const reviewNote = prompt(`Reason for rejecting ${applicantUsername}'s application (optional):`);
    if (reviewNote === null) return;
    setProcessing(id);
    const token = localStorage.getItem("pvp_token");
    try {
      const res = await fetch(apiUrl(`/api/tier-test/${id}/reject`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reviewNote }),
      });
      const d = await res.json();
      if (d.success) {
        toast.success(`Rejected ${applicantUsername}'s tier test application.`);
        refetch();
      } else {
        toast.error(d.message || "Failed to reject");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
              <Trophy className="w-7 h-7 text-primary" />
              Tier Test Applications
            </h1>
            <p className="text-muted-foreground">Review player tier test requests.</p>
          </div>

          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-[200px] bg-card">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="glass-card rounded-xl overflow-hidden border-border">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Applicant</TableHead>
                <TableHead>IGN</TableHead>
                <TableHead>Tier Change</TableHead>
                <TableHead>Evidence</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-6 w-20" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (data?.applications ?? []).length === 0 ? (
                <TableRow className="border-border">
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No {status !== "all" ? status : ""} applications found.
                  </TableCell>
                </TableRow>
              ) : (
                (data?.applications ?? []).map((app: any) => (
                  <TableRow key={app.id} className="border-border hover:bg-muted/20">
                    <TableCell>
                      <div className="font-bold text-sm">{app.applicantUsername}</div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{app.minecraftUsername}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className="text-muted-foreground">{app.currentTier}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-primary font-bold">{app.requestedTier}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {app.evidence ? (
                        <a href={app.evidence} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1 text-sm">
                          View <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-sm italic">None</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[150px]">
                      {app.notes ? (
                        <span className="text-xs text-muted-foreground truncate block">{app.notes}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm italic">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {app.status === "pending" ? (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleApprove(app.id, app.applicantUsername, app.requestedTier)}
                            disabled={processing === app.id}
                          >
                            <Check className="w-4 h-4 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(app.id, app.applicantUsername)}
                            disabled={processing === app.id}
                          >
                            <X className="w-4 h-4 mr-1" /> Reject
                          </Button>
                        </>
                      ) : (
                        <div>
                          <span className={`text-xs px-2 py-1 rounded font-bold uppercase border ${
                            app.status === "approved"
                              ? "bg-green-500/10 text-green-500 border-green-500/20"
                              : "bg-red-500/10 text-red-500 border-red-500/20"
                          }`}>
                            {app.status}
                          </span>
                          {app.reviewNote && (
                            <div className="text-xs text-muted-foreground mt-1">{app.reviewNote}</div>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {data && data.totalPages > 1 && (
            <div className="p-4 border-t border-border flex items-center justify-between bg-muted/10">
              <p className="text-sm text-muted-foreground">
                Showing page {data.page} of {data.totalPages}
              </p>
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
      </div>
    </AdminLayout>
  );
}
