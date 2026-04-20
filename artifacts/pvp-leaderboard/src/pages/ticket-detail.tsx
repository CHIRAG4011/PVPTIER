import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/lib/auth";
import { useParams, useLocation, Link } from "wouter";
import { useGetTicket, useReplyToTicket, useCloseTicket } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Send, Shield, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

const replySchema = z.object({
  message: z.string().min(2, { message: "Message is too short" }),
});

export default function TicketDetail() {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams();
  const id = params.id || "";

  const { data: ticket, isLoading, refetch } = useGetTicket(id as any, {
    query: { queryKey: ["ticket", id], enabled: !!id && isAuthenticated }
  });

  const replyMutation = useReplyToTicket();
  const closeMutation = useCloseTicket();

  const form = useForm<z.infer<typeof replySchema>>({
    resolver: zodResolver(replySchema),
    defaultValues: {
      message: "",
    },
  });

  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

  const onSubmit = (values: z.infer<typeof replySchema>) => {
    replyMutation.mutate({ id, data: values }, {
      onSuccess: () => {
        form.reset();
        refetch();
        toast.success("Reply sent");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to send reply");
      }
    });
  };

  const handleClose = () => {
    if (confirm("Are you sure you want to close this ticket? You won't be able to reply anymore.")) {
      closeMutation.mutate({ id }, {
        onSuccess: () => {
          refetch();
          toast.success("Ticket closed");
        },
        onError: (error) => {
          toast.error(error.message || "Failed to close ticket");
        }
      });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 max-w-4xl space-y-6">
          <Skeleton className="h-8 w-32 mb-8" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (!ticket) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-32 text-center">
          <h1 className="text-2xl font-bold mb-4">Ticket Not Found</h1>
          <Button asChild><Link href="/tickets">Back to Tickets</Link></Button>
        </div>
      </Layout>
    );
  }

  const isClosed = ticket.status === "closed";
  const isAdmin = user?.role === "admin" || user?.role === "superadmin" || user?.role === "moderator";

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Button variant="ghost" size="sm" asChild className="mb-6 text-muted-foreground hover:text-foreground">
          <Link href={isAdmin ? "/admin/tickets" : "/tickets"}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Tickets
          </Link>
        </Button>

        <div className="glass-card rounded-t-xl border-border p-6 border-b-0">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground mb-1">{ticket.subject}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="font-mono">#{ticket.id}</span>
                <span>•</span>
                <span>Created by {ticket.username}</span>
                <span>•</span>
                <span className="capitalize">{ticket.category}</span>
                <span>•</span>
                <span>{new Date(ticket.createdAt).toLocaleString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className={cn(
                "text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border",
                ticket.status === 'open' ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                ticket.status === 'pending' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                "bg-green-500/10 text-green-400 border-green-500/20"
              )}>
                {ticket.status}
              </span>
              
              {!isClosed && (
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleClose} disabled={closeMutation.isPending}>
                  <Lock className="w-4 h-4 mr-2" /> Close
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-card border-x border-border flex flex-col">
          {ticket.replies && ticket.replies.length > 0 ? (
            <div className="p-6 space-y-6">
              {ticket.replies.map((reply, idx) => {
                const isStaff = reply.isAdmin;
                const isMe = reply.userId === user?.id;
                
                return (
                  <div key={reply.id || idx} className={cn(
                    "flex gap-4",
                    isMe && !isStaff ? "flex-row-reverse" : ""
                  )}>
                    <Avatar className={cn(
                      "w-10 h-10 shrink-0 border",
                      isStaff ? "border-primary shadow-[0_0_10px_rgba(0,212,255,0.3)]" : "border-border"
                    )}>
                      <AvatarImage src={`https://mc-heads.net/avatar/${reply.username}/64`} />
                      <AvatarFallback>{reply.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    
                    <div className={cn(
                      "flex flex-col max-w-[80%]",
                      isMe && !isStaff ? "items-end" : "items-start"
                    )}>
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-sm font-bold">{reply.username}</span>
                        {isStaff && (
                          <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded uppercase tracking-wider font-bold flex items-center gap-1">
                            <Shield className="w-3 h-3" /> Staff
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground ml-2">
                          {new Date(reply.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                      
                      <div className={cn(
                        "px-4 py-3 rounded-2xl whitespace-pre-wrap text-sm",
                        isStaff ? "bg-primary/10 border border-primary/20 text-foreground rounded-tl-sm" : 
                        isMe ? "bg-muted text-foreground rounded-tr-sm" : 
                        "bg-card border border-border text-foreground rounded-tl-sm"
                      )}>
                        {reply.message}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center text-muted-foreground">
              No replies yet.
            </div>
          )}
        </div>

        <div className="glass-card rounded-b-xl border-border p-6 border-t-0 bg-muted/5">
          {isClosed ? (
            <div className="text-center p-4 bg-muted/30 rounded-lg text-muted-foreground flex items-center justify-center gap-2">
              <Lock className="w-5 h-5" />
              This ticket has been closed. You cannot reply to it.
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea 
                          placeholder="Type your reply here..." 
                          className="min-h-[100px] resize-none bg-background/50 border-border/50 focus:border-primary" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end">
                  <Button type="submit" disabled={replyMutation.isPending} className="gap-2">
                    <Send className="w-4 h-4" /> 
                    {replyMutation.isPending ? "Sending..." : "Send Reply"}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </div>
      </div>
    </Layout>
  );
}
