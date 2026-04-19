import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/lib/auth";
import { useLocation, Link } from "wouter";
import { useListTickets, useCreateTicket } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useState } from "react";
import { Ticket as TicketIcon, Plus, MessageSquare, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const ticketSchema = z.object({
  subject: z.string().min(5, { message: "Subject must be at least 5 characters" }),
  category: z.enum(["bug", "report", "appeal", "other"], { required_error: "Category is required" }),
  priority: z.enum(["low", "medium", "high"]).optional(),
  message: z.string().min(10, { message: "Message must be at least 10 characters" }),
});

export default function Tickets() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { data: ticketsData, isLoading, refetch } = useListTickets({ page: 1 }, {
    query: { queryKey: ["tickets"], enabled: isAuthenticated }
  });
  
  const createMutation = useCreateTicket();

  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

  const form = useForm<z.infer<typeof ticketSchema>>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      subject: "",
      category: "other",
      priority: "medium",
      message: "",
    },
  });

  const onSubmit = (values: z.infer<typeof ticketSchema>) => {
    createMutation.mutate({ data: values }, {
      onSuccess: () => {
        toast.success("Ticket created successfully");
        setIsDialogOpen(false);
        form.reset();
        refetch();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create ticket");
      }
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      case 'pending': return <Clock className="w-4 h-4 text-blue-400" />;
      case 'closed': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      default: return <MessageSquare className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-display font-bold neon-text-primary mb-2 flex items-center gap-3">
              <TicketIcon className="w-8 h-8 text-primary" />
              Support Tickets
            </h1>
            <p className="text-muted-foreground">Manage your support requests, player reports, and appeals.</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="shrink-0 gap-2">
                <Plus className="w-4 h-4" /> New Ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] border-border bg-card">
              <DialogHeader>
                <DialogTitle>Create Support Ticket</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <Input placeholder="Brief summary of your issue" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="report">Player Report</SelectItem>
                              <SelectItem value="appeal">Ban Appeal</SelectItem>
                              <SelectItem value="bug">Bug Report</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Provide as much detail as possible..." 
                            className="min-h-[150px] resize-none" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Creating..." : "Submit Ticket"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="glass-card rounded-xl overflow-hidden border-border">
          {isLoading ? (
            <div className="p-4 space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : ticketsData?.tickets.length === 0 ? (
            <div className="p-12 text-center">
              <TicketIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-bold mb-2">No Tickets Found</h3>
              <p className="text-muted-foreground mb-6">You haven't submitted any support tickets yet.</p>
              <Button variant="outline" onClick={() => setIsDialogOpen(true)}>Create your first ticket</Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {ticketsData?.tickets.map(ticket => (
                <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="block hover:bg-muted/20 transition-colors p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        {getStatusIcon(ticket.status)}
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground hover:text-primary transition-colors mb-1">
                          {ticket.subject}
                        </h4>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="font-mono">#{ticket.id}</span>
                          <span className="capitalize px-2 py-0.5 rounded bg-muted/50 border border-border">
                            {ticket.category}
                          </span>
                          <span className="capitalize">
                            Priority: <span className={cn(
                              "font-medium",
                              ticket.priority === 'high' ? "text-red-400" :
                              ticket.priority === 'medium' ? "text-yellow-400" : "text-blue-400"
                            )}>{ticket.priority}</span>
                          </span>
                          <span>Opened {new Date(ticket.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right pl-4">
                      <span className={cn(
                        "text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border",
                        ticket.status === 'open' ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                        ticket.status === 'pending' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                        "bg-green-500/10 text-green-400 border-green-500/20"
                      )}>
                        {ticket.status}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
