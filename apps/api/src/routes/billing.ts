import { Router } from "express";
import { z } from "zod";
import { store } from "../lib/store.js";
import { requireAuth } from "../middleware/auth.js";
import { PLANS, getPlan, listPublicPlans, type PlanId } from "../lib/plans.js";
import {
  createBillingPortal,
  createCheckoutSession,
  createCustomer,
  stripeConfigured,
  verifyWebhookSignature,
} from "../lib/stripe.js";

export const billingRouter = Router();

/** Public plan catalog */
billingRouter.get("/plans", (_req, res) => {
  res.json({
    plans: listPublicPlans(),
    rule: {
      hosting: "Boss Built hosts all live apps by default.",
      export:
        "ZIP / GitHub export unlocks on Pro or Elite. Starter stays platform-hosted.",
    },
  });
});

billingRouter.get("/me", requireAuth, async (req, res) => {
  const user = await store.findUserById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const plan = getPlan(user.plan);
  res.json({
    plan: plan.id,
    planName: plan.name,
    priceMonthlyUsd: plan.priceMonthlyUsd,
    subscriptionStatus: user.subscriptionStatus,
    entitlements: {
      platformHost: plan.features.platformHost,
      fullExport: plan.features.fullExport,
      platformDeploy: plan.features.platformDeploy,
      maxProjects: plan.features.maxProjects,
      maxBuildsPerMonth: plan.features.maxBuildsPerMonth,
    },
    message: plan.features.fullExport
      ? "Export unlocked (Pro/Elite) — ZIP / GitHub available. Host on Boss Built or take it off."
      : "Platform-hosted plan. Upgrade to Pro or Elite to export off-platform.",
  });
});

const checkoutSchema = z.object({
  planId: z.enum(["starter", "pro", "elite"]),
});

/** Start monthly Stripe Checkout */
billingRouter.post("/checkout", requireAuth, async (req, res) => {
  if (!stripeConfigured()) {
    res.status(503).json({
      error:
        "Stripe not configured. Set STRIPE_SECRET_KEY and STRIPE_PRICE_* in .env",
    });
    return;
  }

  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "planId must be starter | pro | elite" });
    return;
  }

  const plan = PLANS[parsed.data.planId as PlanId];
  const priceId = process.env[plan.stripePriceEnv];
  if (!priceId) {
    res.status(503).json({
      error: `Missing ${plan.stripePriceEnv} in environment`,
    });
    return;
  }

  const user = await store.findUserById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  try {
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await createCustomer(user.email, user.name, user.id);
      customerId = String(customer.id);
      await store.updateUser(user.id, { stripeCustomerId: customerId });
    }

    const appUrl = process.env.BOSS_APP_URL ?? "http://localhost:5173";
    const session = await createCheckoutSession({
      customerId,
      priceId,
      userId: user.id,
      planId: plan.id,
      successUrl: `${appUrl}/?billing=success&plan=${plan.id}`,
      cancelUrl: `${appUrl}/?billing=cancel`,
    });

    res.json({
      url: session.url,
      sessionId: session.id,
      plan: plan.id,
      mode: "subscription",
      interval: "month",
    });
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : "Checkout failed",
    });
  }
});

/** Customer portal — cancel / update payment method */
billingRouter.post("/portal", requireAuth, async (req, res) => {
  if (!stripeConfigured()) {
    res.status(503).json({ error: "Stripe not configured" });
    return;
  }
  const user = await store.findUserById(req.user!.id);
  if (!user?.stripeCustomerId) {
    res.status(400).json({ error: "No Stripe customer yet — subscribe first" });
    return;
  }
  try {
    const appUrl = process.env.BOSS_APP_URL ?? "http://localhost:5173";
    const portal = await createBillingPortal(user.stripeCustomerId, appUrl);
    res.json({ url: portal.url });
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : "Portal failed",
    });
  }
});

/**
 * Stripe webhooks — subscription lifecycle.
 * Configure endpoint: POST /billing/webhook
 */
billingRouter.post("/webhook", async (req, res) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  const raw =
    typeof req.body === "string"
      ? req.body
      : JSON.stringify(req.body ?? {});

  // In production prefer express.raw for this route; here we accept JSON for dev.
  const sig = req.headers["stripe-signature"] as string | undefined;
  if (secret && sig && !verifyWebhookSignature(raw, sig, secret)) {
    res.status(400).json({ error: "Invalid signature" });
    return;
  }

  const event = (typeof req.body === "object" ? req.body : JSON.parse(raw)) as {
    type?: string;
    data?: { object?: Record<string, unknown> };
  };

  const obj = event.data?.object ?? {};
  const meta = (obj.metadata ?? {}) as Record<string, string>;
  const userId = meta.boss_user_id;
  const planId = meta.plan_id;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        if (userId && planId) {
          await store.updateUser(userId, {
            plan: planId,
            subscriptionStatus: "active",
            stripeSubscriptionId:
              typeof obj.subscription === "string" ? obj.subscription : null,
          });
        }
        break;
      }
      case "customer.subscription.updated": {
        const status = String(obj.status ?? "");
        const uid =
          userId ||
          (obj.metadata as Record<string, string> | undefined)?.boss_user_id;
        const pid =
          planId ||
          (obj.metadata as Record<string, string> | undefined)?.plan_id;
        if (uid) {
          await store.updateUser(uid, {
            subscriptionStatus: status,
            ...(status === "active" && pid ? { plan: pid } : {}),
            ...(status === "canceled" || status === "unpaid"
              ? { plan: "none" }
              : {}),
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const uid =
          userId ||
          (obj.metadata as Record<string, string> | undefined)?.boss_user_id;
        if (uid) {
          await store.updateUser(uid, {
            plan: "none",
            subscriptionStatus: "canceled",
            stripeSubscriptionId: null,
          });
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("[billing webhook]", err);
  }

  res.json({ received: true });
});

/**
 * Dev-only plan override when Stripe is not configured.
 * Still monthly-shaped: sets plan entitlement for testing export gates.
 */
billingRouter.post("/dev/activate", requireAuth, async (req, res) => {
  if (stripeConfigured() && process.env.NODE_ENV === "production") {
    res.status(403).json({ error: "Use Stripe Checkout in production" });
    return;
  }
  const planId = String(req.body?.planId ?? "starter");
  if (!["starter", "pro", "elite", "none"].includes(planId)) {
    res.status(400).json({ error: "Invalid plan" });
    return;
  }
  const user = await store.updateUser(req.user!.id, {
    plan: planId,
    subscriptionStatus: planId === "none" ? null : "active",
  });
  res.json({
    ok: true,
    plan: user?.plan,
    note: "Dev activate only — production uses monthly Stripe Checkout",
  });
});
