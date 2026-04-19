import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListSeasons, useCreateSeason, useResetSeason } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, RotateCcw, AlertTriangle } from "lucide-react";
import { useState } from "react";

const seasonSchema = z.object({
  name: z.string().min(3),
  startDate: z.string().min(10),
  endDate: z.string().optional(),
});

export default function AdminSeasons() {
  const { data, isLoading, refetch } = useListSeasons();
  const createMutation = useCreateSeason();
  const resetMutation = useResetSeason();
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof seasonSchema>>({
    resolver: zodResolver(seasonSchema),
    defaultValues: {
      name: "",
      startDate: new Date().toISOString().split('T')[0],
      endDate: "",
    }
  });

  const onSubmit = (values: z.infer<typeof seasonSchema>) => {
    createMutation.mutate({ data: values }, {
      onSuccess: () => {
        toast.success("Season created successfully");
        setOpen(false);
        form.reset();
        refetch();
      },
      onError: (e) => toast.error(e.message)
    });
  };

  const handleReset = (id: number, name: string) => {
    if (confirm(`CRITICAL: Are you sure you want to end season ${name} and reset ALL player stats to 1000 ELO? This cannot be undone.`)) {
      resetMutation.mutate({ id }, {
        onSuccess: () => {
          toast.success("Season reset complete. All stats have been wiped.");
          refetch();
        },
        onError: (e) => toast.error(e.message)
      });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Season Management</h1>
            <p className="text-muted-foreground">Manage competitive seasons and leaderboard resets.</p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" /> New Season</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Create New Season</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Season Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
                  )} />
                  <FormField control={form.control} name="startDate" render={({ field }) => (
                    <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage/></FormItem>
                  )} />
                  <FormField control={form.control} name="endDate" render={({ field }) => (
                    <FormItem><FormLabel>End Date (Optional)</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage/></FormItem>
                  )} />
                  <Button type="submit" className="w-full mt-4" disabled={createMutation.isPending}>Create Season</Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-red-500/10 border border-red-500/20 text-red-200 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
          <div>
            <p className="font-bold mb-1">Warning about Season Resets</p>
            <p className="text-sm opacity-90">Ending an active season will permanently reset all player global ELO and gamemode stats. Only perform this action at the agreed end of a competitive season.</p>
          </div>
        </div>

        <div className="glass-card rounded-xl overflow-hidden border-border">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Season Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow className="border-border"><TableCell colSpan={5}><Skeleton className="h-20 w-full" /></TableCell></TableRow>
              ) : data?.seasons.length === 0 ? (
                <TableRow className="border-border"><TableCell colSpan={5} className="h-24 text-center">No seasons found.</TableCell></TableRow>
              ) : (
                data?.seasons.map((s) => (
                  <TableRow key={s.id} className="border-border hover:bg-muted/20">
                    <TableCell className="font-bold text-foreground">{s.name}</TableCell>
                    <TableCell>
                      {s.isActive ? (
                        <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded font-bold uppercase tracking-wider">Active</span>
                      ) : (
                        <span className="text-xs bg-muted text-muted-foreground border border-border px-2 py-1 rounded font-bold uppercase tracking-wider">Ended</span>
                      )}
                    </TableCell>
                    <TableCell>{new Date(s.startDate).toLocaleDateString()}</TableCell>
                    <TableCell>{s.endDate ? new Date(s.endDate).toLocaleDateString() : '-'}</TableCell>
                    <TableCell className="text-right">
                      {s.isActive && (
                        <Button variant="destructive" size="sm" onClick={() => handleReset(s.id, s.name)} disabled={resetMutation.isPending}>
                          <RotateCcw className="w-4 h-4 mr-2" /> End & Reset Stats
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
