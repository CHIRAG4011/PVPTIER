import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db, ticketsTable, ticketRepliesTable } from "@workspace/db";
import { CreateTicketBody, ListTicketsQueryParams, ReplyToTicketBody } from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../lib/auth";
import type { JwtPayload } from "../lib/auth";

const router: IRouter = Router();

router.get("/tickets", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user?: JwtPayload }).user!;
  const parsed = ListTicketsQueryParams.safeParse(req.query);
  const page = parsed.success ? (parsed.data.page ?? 1) : 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  const isAdmin = ["admin", "superadmin", "moderator"].includes(user.role);

  const tickets = isAdmin
    ? await db.select().from(ticketsTable).orderBy(desc(ticketsTable.createdAt)).limit(limit).offset(offset)
    : await db.select().from(ticketsTable).where(eq(ticketsTable.userId, user.userId)).orderBy(desc(ticketsTable.createdAt)).limit(limit).offset(offset);

  const allTickets = isAdmin
    ? await db.select().from(ticketsTable)
    : await db.select().from(ticketsTable).where(eq(ticketsTable.userId, user.userId));

  res.json({
    tickets,
    total: allTickets.length,
    page,
    totalPages: Math.ceil(allTickets.length / limit),
  });
});

router.post("/tickets", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user?: JwtPayload }).user!;
  const parsed = CreateTicketBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const { category, subject, message, priority } = parsed.data;
  const [ticket] = await db.insert(ticketsTable).values({
    userId: user.userId,
    username: user.username,
    category,
    subject,
    status: "open",
    priority: priority ?? "medium",
  }).returning();

  if (message) {
    await db.insert(ticketRepliesTable).values({
      ticketId: ticket.id,
      userId: user.userId,
      username: user.username,
      message,
      isAdmin: false,
    });
  }

  res.status(201).json(ticket);
});

router.get("/tickets/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user?: JwtPayload }).user!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid ticket ID" });
    return;
  }

  const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, id));
  if (!ticket) {
    res.status(404).json({ error: "not_found", message: "Ticket not found" });
    return;
  }

  const isAdmin = ["admin", "superadmin", "moderator"].includes(user.role);
  if (!isAdmin && ticket.userId !== user.userId) {
    res.status(403).json({ error: "forbidden", message: "Access denied" });
    return;
  }

  const replies = await db.select().from(ticketRepliesTable).where(eq(ticketRepliesTable.ticketId, id)).orderBy(ticketRepliesTable.createdAt);

  res.json({ ...ticket, replies });
});

router.post("/tickets/:id/reply", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user?: JwtPayload }).user!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid ticket ID" });
    return;
  }

  const parsed = ReplyToTicketBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, id));
  if (!ticket) {
    res.status(404).json({ error: "not_found", message: "Ticket not found" });
    return;
  }

  const isAdmin = ["admin", "superadmin", "moderator"].includes(user.role);
  if (!isAdmin && ticket.userId !== user.userId) {
    res.status(403).json({ error: "forbidden", message: "Access denied" });
    return;
  }

  const [reply] = await db.insert(ticketRepliesTable).values({
    ticketId: id,
    userId: user.userId,
    username: user.username,
    message: parsed.data.message,
    isAdmin,
  }).returning();

  if (isAdmin) {
    await db.update(ticketsTable).set({ status: "pending", updatedAt: new Date() }).where(eq(ticketsTable.id, id));
  }

  res.status(201).json(reply);
});

router.post("/tickets/:id/close", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user?: JwtPayload }).user!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid ticket ID" });
    return;
  }

  const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, id));
  if (!ticket) {
    res.status(404).json({ error: "not_found", message: "Ticket not found" });
    return;
  }

  const isAdmin = ["admin", "superadmin", "moderator"].includes(user.role);
  if (!isAdmin && ticket.userId !== user.userId) {
    res.status(403).json({ error: "forbidden", message: "Access denied" });
    return;
  }

  await db.update(ticketsTable).set({ status: "closed", updatedAt: new Date() }).where(eq(ticketsTable.id, id));
  res.json({ success: true, message: "Ticket closed" });
});

export default router;
