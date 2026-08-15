import { Router } from "express";
import { z } from "zod";
import { store } from "../lib/store.js";
import { signToken, requireAuth } from "../middleware/auth.js";
import { getPlan } from "../lib/plans.js";
import { verifyPassword } from "../lib/password.js";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(80),
  password: z.string().min(6).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const user = await store.createUser(parsed.data);
    const token = signToken({ id: user.id, email: user.email, role: user.role });
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, plan: user.plan },
    });
  } catch (e) {
    res.status(409).json({ error: e instanceof Error ? e.message : "Register failed" });
  }
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const user = await store.findUserByEmail(parsed.data.email);
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  const token = signToken({ id: user.id, email: user.email, role: user.role });
  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, plan: user.plan },
  });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await store.findUserById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const plan = getPlan(user.plan);
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    plan: user.plan,
    subscriptionStatus: user.subscriptionStatus,
    entitlements: {
      platformHost: plan.features.platformHost,
      fullExport: plan.features.fullExport,
      platformDeploy: plan.features.platformDeploy,
    },
  });
});
