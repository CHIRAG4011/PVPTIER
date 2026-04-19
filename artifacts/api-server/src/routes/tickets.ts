import { Router, type IRouter, type Request, type Response } from "express";
import { Ticket, TicketReply } from "@workspace/db";
import { CreateTicketBody, ListTicketsQueryParams, ReplyToTicketBody } from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../lib/auth";
import type { JwtPayload } from "../lib/auth";
import mongoose from "mongoose";

const router: IRouter = Router();

router.get("/tickets", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user?: JwtPayload }).user!;
  const parsed = ListTicketsQueryParams.safeParse(req.query);
  const page = parsed.success ? (parsed.data.page ?? 1) : 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  const status = parsed.success ? parsed.data.status : undefined;

  const isAdmin = ["admin", "superadmin", "moderator"].includes(user.role);

  const filter: any = {};
  if (!isAdmin) filter.userId = user.userId;
  if (status) filter.status = status;

  const [tickets, total] = await Promise.all([
    Ticket.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit),
    Ticket.countDocuments(filter),
  ]);

  res.json({
    tickets: tickets.map((t: any) => ({ ...t.toJSON(), id: t._id.toString() })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
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
  const ticket = await Ticket.create({
    userId: user.userId,
    username: user.username,
    category,
    subject,
    status: "open",
    priority: priority ?? "medium",
  });

  if (message) {
    await TicketReply.create({
      ticketId: ticket._id.toString(),
      userId: user.userId,
      username: user.username,
      message,
      isAdmin: false,
    });
  }

  res.status(201).json({ ...ticket.toJSON(), id: ticket._id.toString() });
});

router.get("/tickets/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user?: JwtPayload }).user!;
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid ticket ID" });
    return;
  }

  const ticket = await Ticket.findById(id);
  if (!ticket) {
    res.status(404).json({ error: "not_found", message: "Ticket not found" });
    return;
  }

  const isAdmin = ["admin", "superadmin", "moderator"].includes(user.role);
  if (!isAdmin && ticket.userId !== user.userId) {
    res.status(403).json({ error: "forbidden", message: "Access denied" });
    return;
  }

  const replies = await TicketReply.find({ ticketId: id }).sort({ createdAt: 1 });

  res.json({
    ...ticket.toJSON(),
    id: ticket._id.toString(),
    replies: replies.map((r: any) => ({ ...r.toJSON(), id: r._id.toString() })),
  });
});

router.post("/tickets/:id/reply", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user?: JwtPayload }).user!;
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid ticket ID" });
    return;
  }

  const parsed = ReplyToTicketBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const ticket = await Ticket.findById(id);
  if (!ticket) {
    res.status(404).json({ error: "not_found", message: "Ticket not found" });
    return;
  }

  const isAdmin = ["admin", "superadmin", "moderator"].includes(user.role);
  if (!isAdmin && ticket.userId !== user.userId) {
    res.status(403).json({ error: "forbidden", message: "Access denied" });
    return;
  }

  const reply = await TicketReply.create({
    ticketId: id,
    userId: user.userId,
    username: user.username,
    message: parsed.data.message,
    isAdmin,
  });

  if (isAdmin) {
    await Ticket.findByIdAndUpdate(id, { status: "pending" });
  }

  res.status(201).json({ ...reply.toJSON(), id: reply._id.toString() });
});

router.post("/tickets/:id/close", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user?: JwtPayload }).user!;
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid ticket ID" });
    return;
  }

  const ticket = await Ticket.findById(id);
  if (!ticket) {
    res.status(404).json({ error: "not_found", message: "Ticket not found" });
    return;
  }

  const isAdmin = ["admin", "superadmin", "moderator"].includes(user.role);
  if (!isAdmin && ticket.userId !== user.userId) {
    res.status(403).json({ error: "forbidden", message: "Access denied" });
    return;
  }

  await Ticket.findByIdAndUpdate(id, { status: "closed" });
  res.json({ success: true, message: "Ticket closed" });
});

export default router;
