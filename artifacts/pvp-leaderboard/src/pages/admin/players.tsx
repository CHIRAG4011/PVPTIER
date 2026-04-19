import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListPlayers, useAdminUpdatePlayerStats, useResetPlayerStats } from "@workspace/api-client-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Trophy, Edit, RotateCcw, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { TierBadge } from "@/components/ui/tier-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const TIERS = ["HT1", "HT2", "HT3", "HT4", "HT5", "LT1", "LT2", "LT3", "LT4", "LT5"] as const;

const updateSchema = z.object({
  elo: z.coerce.number().int(),
  wins: z.coerce.number().int().min(0),
  losses: z.coerce.number().int().min(0),
  tier: z.enum(TIERS),
});

export default function AdminPlayers() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editingPlayer, setEditingPlayer] = useState<any>(null);

  const { data, isLoading, refetch } = useListPlayers({ 
    page, 
    search: search || undefined,
  });

  const updateMutation = useAdminUpdatePlayerStats();
  const resetMutation = useResetPlayerStats();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const form = useForm<z.infer<typeof updateSchema>>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      elo: 1000,
      wins: 0,
      losses: 0,
      tier: "LT1",
    }
  });

  const handleEditClick = (player: any) => {
    setEditingPlayer(player);
    form.reset({
      elo: player.elo,
      wins: player.wins,
      losses: player.losses,
      tier: player.tier as any,
    });
  };

  const onSubmitUpdate = (values: z.infer<typeof updateSchema>) => {
    if (!editingPlayer) return;
    
    updateMutation.mutate({ id: editingPlayer.id, data: values }, {
      onSuccess: () => {
        toast.success(`${editingPlayer.minecraftUsername}'s stats updated.`);
        setEditingPlayer(null);
        refetch();
      },
      onError: (err) => {
        toast.error(err.message || "Failed to update stats");
      }
    });
  };

  const handleReset = (id: number, username: string) => {
    if (confirm(`Are you sure you want to completely reset ${username}'s stats? This action cannot be undone.`)) {
      resetMutation.mutate({ id }, {
        onSuccess: () => {
          toast.success(`${username}'s stats have been reset.`);
          refetch();
        }
      });
    }
  };

  const handleDelete = async (id: number, username: string) => {
    if (!confirm(`Permanently delete ${username}? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      const token = localStorage.getItem("pvp_token");
      const res = await fetch(`/api/admin/players/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${username} has been deleted.`);
        refetch();
      } else {
        toast.error(data.message || "Failed to delete player");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Player Management</h1>
          <p className="text-muted-foreground">Adjust ELO, tiers, and manage player statistics.</p>
        </div>

        <div className="glass-card p-4 rounded-xl border-border flex items-center">
          <div className="flex-1 w-full max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search players by IGN..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 bg-background/50 border-border/50"
            />
          </div>
        </div>

        <div className="glass-card rounded-xl overflow-hidden border-border">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>IGN</TableHead>
                <TableHead>Global ELO</TableHead>
                <TableHead>W/L</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : data?.players.length === 0 ? (
                <TableRow className="border-border">
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No players found.
                  </TableCell>
                </TableRow>
              ) : (
                data?.players.map((p) => (
                  <TableRow key={p.id} className="border-border hover:bg-muted/20">
                    <TableCell className="font-bold text-foreground">
                      {p.minecraftUsername}
                    </TableCell>
                    <TableCell className="font-mono text-primary font-bold">
                      {p.elo}
                    </TableCell>
                    <TableCell>
                      <span className="text-green-400 font-bold">{p.wins}</span>
                      <span className="text-muted-foreground mx-1">-</span>
                      <span className="text-red-400 font-bold">{p.losses}</span>
                    </TableCell>
                    <TableCell>
                      <TierBadge tier={p.tier} size="sm" />
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Dialog open={editingPlayer?.id === p.id} onOpenChange={(o) => !o && setEditingPlayer(null)}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => handleEditClick(p)}>
                            <Edit className="w-4 h-4 mr-2" /> Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="border-border bg-card">
                          <DialogHeader>
                            <DialogTitle>Edit Stats: {p.minecraftUsername}</DialogTitle>
                          </DialogHeader>
                          <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmitUpdate)} className="space-y-4">
                              <FormField control={form.control} name="tier" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Tier</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger><SelectValue /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {TIERS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )} />
                              <div className="grid grid-cols-3 gap-4">
                                <FormField control={form.control} name="elo" render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Global ELO</FormLabel>
                                    <FormControl><Input type="number" {...field} /></FormControl>
                                  </FormItem>
                                )} />
                                <FormField control={form.control} name="wins" render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Wins</FormLabel>
                                    <FormControl><Input type="number" {...field} /></FormControl>
                                  </FormItem>
                                )} />
                                <FormField control={form.control} name="losses" render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Losses</FormLabel>
                                    <FormControl><Input type="number" {...field} /></FormControl>
                                  </FormItem>
                                )} />
                              </div>
                              <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
                                {updateMutation.isPending ? "Saving..." : "Save Changes"}
                              </Button>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>

                      <Button variant="outline" size="sm" className="text-yellow-500 hover:bg-yellow-500/10" onClick={() => handleReset(p.id, p.minecraftUsername)}>
                        <RotateCcw className="w-4 h-4" />
                      </Button>

                      <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(p.id, p.minecraftUsername)} disabled={deletingId === p.id}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
