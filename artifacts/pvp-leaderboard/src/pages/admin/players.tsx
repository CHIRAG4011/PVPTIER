import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListPlayers, useAdminUpdatePlayerStats, useResetPlayerStats } from "@workspace/api-client-react";
import { useState } from "react";
import { apiUrl } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Trophy, Edit, RotateCcw, Trash2, ChevronLeft, ChevronRight, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { TierBadge } from "@/components/ui/tier-badge";
import { GamemodeIcon } from "@/components/ui/gamemode-icon";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const TIERS = ["HT1", "HT2", "HT3", "HT4", "HT5", "LT1", "LT2", "LT3", "LT4", "LT5"] as const;
const REGIONS = ["NA", "EU", "AS", "SA", "AF", "OC"] as const;
const GAMEMODES = ["sword", "axe", "uhc", "vanilla", "smp", "diapot", "nethpot", "elytra"] as const;
const GAMEMODE_LABELS: Record<string, string> = {
  sword: "Sword", axe: "Axe", uhc: "UHC", vanilla: "Vanilla",
  smp: "SMP", diapot: "DiaPot", nethpot: "NethPot", elytra: "Elytra",
};
const GAMEMODE_TIER_OPTIONS = ["none", ...TIERS] as const;

const gamemodeTierSchema = z.record(z.string(), z.enum(GAMEMODE_TIER_OPTIONS)).optional();

const updateSchema = z.object({
  elo: z.coerce.number().int(),
  wins: z.coerce.number().int().min(0),
  losses: z.coerce.number().int().min(0),
  tier: z.enum(TIERS),
  gamemodeTiers: gamemodeTierSchema,
});

const addSchema = z.object({
  minecraftUsername: z.string().min(1, "IGN is required").max(16, "IGN must be 16 chars or less"),
  minecraftUuid: z.string().optional(),
  discordUsername: z.string().optional(),
  tier: z.enum(TIERS),
  elo: z.coerce.number().int().default(1000),
  wins: z.coerce.number().int().min(0).default(0),
  losses: z.coerce.number().int().min(0).default(0),
  region: z.enum(REGIONS).default("NA"),
  gamemodeTiers: gamemodeTierSchema,
});

const emptyGamemodeTiers = (): Record<string, "none" | typeof TIERS[number]> => {
  const o: any = {};
  GAMEMODES.forEach(g => { o[g] = "none"; });
  return o;
};

export default function AdminPlayers() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editingPlayer, setEditingPlayer] = useState<any>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  const { data, isLoading, refetch } = useListPlayers({ 
    page, 
    search: search || undefined,
  });

  const updateMutation = useAdminUpdatePlayerStats();
  const resetMutation = useResetPlayerStats();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const editForm = useForm<z.infer<typeof updateSchema>>({
    resolver: zodResolver(updateSchema),
    defaultValues: { elo: 1000, wins: 0, losses: 0, tier: "LT1", gamemodeTiers: emptyGamemodeTiers() },
  });

  const addForm = useForm<z.infer<typeof addSchema>>({
    resolver: zodResolver(addSchema),
    defaultValues: {
      minecraftUsername: "",
      minecraftUuid: "",
      discordUsername: "",
      tier: "LT1",
      elo: 1000,
      wins: 0,
      losses: 0,
      region: "NA",
      gamemodeTiers: emptyGamemodeTiers(),
    },
  });

  const handleEditClick = (player: any) => {
    setEditingPlayer(player);
    const tiers = emptyGamemodeTiers();
    (player.gamemodeStats ?? []).forEach((s: any) => {
      if (s?.gamemode && s.tier && tiers[s.gamemode] !== undefined) tiers[s.gamemode] = s.tier;
    });
    editForm.reset({
      elo: player.elo,
      wins: player.wins,
      losses: player.losses,
      tier: player.tier as any,
      gamemodeTiers: tiers,
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
      onError: (err) => toast.error(err.message || "Failed to update stats"),
    });
  };

  const onSubmitAdd = async (values: z.infer<typeof addSchema>) => {
    setAddLoading(true);
    try {
      const token = localStorage.getItem("pvp_token");
      const res = await fetch(apiUrl("/api/admin/players"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          minecraftUsername: values.minecraftUsername,
          minecraftUuid: values.minecraftUuid || undefined,
          discordUsername: values.discordUsername || undefined,
          tier: values.tier,
          elo: values.elo,
          wins: values.wins,
          losses: values.losses,
          region: values.region,
          gamemodeTiers: values.gamemodeTiers,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Player "${values.minecraftUsername}" added.`);
        addForm.reset();
        setAddOpen(false);
        refetch();
      } else {
        toast.error(data.message || "Failed to add player");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setAddLoading(false);
    }
  };

  const handleReset = (id: string, username: string) => {
    if (confirm(`Are you sure you want to completely reset ${username}'s stats? This action cannot be undone.`)) {
      resetMutation.mutate({ id: id as any }, {
        onSuccess: () => {
          toast.success(`${username}'s stats have been reset.`);
          refetch();
        },
      });
    }
  };

  const handleDelete = async (id: string, username: string) => {
    if (!confirm(`Permanently delete ${username}? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      const token = localStorage.getItem("pvp_token");
      const res = await fetch(apiUrl(`/api/admin/players/${id}`), {
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Player Management</h1>
            <p className="text-muted-foreground">Adjust Score, tiers, and manage player statistics.</p>
          </div>

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="w-4 h-4" />
                Add Player
              </Button>
            </DialogTrigger>
            <DialogContent className="border-border bg-card max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Player</DialogTitle>
              </DialogHeader>
              <Form {...addForm}>
                <form onSubmit={addForm.handleSubmit(onSubmitAdd)} className="space-y-4">
                  <FormField control={addForm.control} name="minecraftUsername" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minecraft IGN <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Notch" {...field} className="bg-background/50" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={addForm.control} name="minecraftUuid" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minecraft UUID <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                        <FormControl>
                          <Input placeholder="uuid..." {...field} className="bg-background/50" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={addForm.control} name="discordUsername" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discord Username <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                        <FormControl>
                          <Input placeholder="user#0001" {...field} className="bg-background/50" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={addForm.control} name="tier" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tier</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TIERS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={addForm.control} name="region" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Region</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField control={addForm.control} name="elo" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Score</FormLabel>
                        <FormControl><Input type="number" {...field} className="bg-background/50" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={addForm.control} name="wins" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Wins</FormLabel>
                        <FormControl><Input type="number" {...field} className="bg-background/50" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={addForm.control} name="losses" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Losses</FormLabel>
                        <FormControl><Input type="number" {...field} className="bg-background/50" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="pt-2 border-t border-border/50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-base font-medium">Gamemode Tiers</span>
                      <span className="text-xs text-muted-foreground">Set tier per gamemode (or leave as None)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {GAMEMODES.map(gm => (
                        <FormField
                          key={gm}
                          control={addForm.control}
                          name={`gamemodeTiers.${gm}` as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2 text-xs">
                                <GamemodeIcon gamemode={gm} className="w-3.5 h-3.5" />
                                {GAMEMODE_LABELS[gm]}
                              </FormLabel>
                              <Select onValueChange={field.onChange} value={(field.value as string) ?? "none"}>
                                <FormControl>
                                  <SelectTrigger className="h-9 bg-background/50">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="none"><span className="text-muted-foreground">None</span></SelectItem>
                                  {TIERS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={addLoading}>
                    {addLoading ? "Adding Player..." : "Add Player"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
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
                <TableHead>Global Score</TableHead>
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
                          <Form {...editForm}>
                            <form onSubmit={editForm.handleSubmit(onSubmitUpdate)} className="space-y-4">
                              <FormField control={editForm.control} name="tier" render={({ field }) => (
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
                                <FormField control={editForm.control} name="elo" render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Global Score</FormLabel>
                                    <FormControl><Input type="number" {...field} /></FormControl>
                                  </FormItem>
                                )} />
                                <FormField control={editForm.control} name="wins" render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Wins</FormLabel>
                                    <FormControl><Input type="number" {...field} /></FormControl>
                                  </FormItem>
                                )} />
                                <FormField control={editForm.control} name="losses" render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Losses</FormLabel>
                                    <FormControl><Input type="number" {...field} /></FormControl>
                                  </FormItem>
                                )} />
                              </div>
                              <div className="pt-2 border-t border-border/50">
                                <div className="flex items-center justify-between mb-3">
                                  <FormLabel className="text-sm">Gamemode Tiers</FormLabel>
                                  <span className="text-xs text-muted-foreground">Set or clear per gamemode</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  {GAMEMODES.map(gm => (
                                    <FormField
                                      key={gm}
                                      control={editForm.control}
                                      name={`gamemodeTiers.${gm}` as any}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="flex items-center gap-2 text-xs">
                                            <GamemodeIcon gamemode={gm} className="w-3.5 h-3.5" />
                                            {GAMEMODE_LABELS[gm]}
                                          </FormLabel>
                                          <Select onValueChange={field.onChange} value={(field.value as string) ?? "none"}>
                                            <FormControl>
                                              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                              <SelectItem value="none"><span className="text-muted-foreground">None</span></SelectItem>
                                              {TIERS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                            </SelectContent>
                                          </Select>
                                        </FormItem>
                                      )}
                                    />
                                  ))}
                                </div>
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
