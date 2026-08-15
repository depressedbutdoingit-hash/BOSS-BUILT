/**
 * Stripe helpers — monthly subscriptions only.
 * Keys from env; never hard-code secrets.
 */

const key = () => process.env.STRIPE_SECRET_KEY ?? "";

export function stripeConfigured(): boolean {
  return Boolean(key() && key().startsWith("sk_"));
}

async function stripe(
  path: string,
  init: RequestInit & { form?: Record<string, string> } = {}
) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key()}`,
    ...(init.headers as Record<string, string>),
  };
  let body = init.body;
  if (init.form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(init.form).toString();
  }
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    ...init,
    headers,
    body,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      `Stripe ${res.status}: ${JSON.stringify(data).slice(0, 400)}`
    );
  }
  return data as Record<string, unknown>;
}

export async function createCustomer(email: string, name: string, userId: string) {
  return stripe("/customers", {
    method: "POST",
    form: {
      email,
      name,
      "metadata[boss_user_id]": userId,
    },
  });
}

export async function createCheckoutSession(opts: {
  customerId: string;
  priceId: string;
  userId: string;
  planId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  return stripe("/checkout/sessions", {
    method: "POST",
    form: {
      mode: "subscription",
      customer: opts.customerId,
      "line_items[0][price]": opts.priceId,
      "line_items[0][quantity]": "1",
      success_url: opts.successUrl,
      cancel_url: opts.cancelUrl,
      "subscription_data[metadata][boss_user_id]": opts.userId,
      "subscription_data[metadata][plan_id]": opts.planId,
      "metadata[boss_user_id]": opts.userId,
      "metadata[plan_id]": opts.planId,
    },
  });
}

export async function createBillingPortal(customerId: string, returnUrl: string) {
  return stripe("/billing_portal/sessions", {
    method: "POST",
    form: {
      customer: customerId,
      return_url: returnUrl,
    },
  });
}

/** Verify webhook signature (minimal HMAC) */
export function verifyWebhookSignature(
  payload: string,
  header: string | undefined,
  secret: string
): boolean {
  if (!header || !secret) return false;
  // Stripe-Signature: t=...,v1=...
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k?.trim(), v?.trim()];
    })
  );
  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) return false;

  // Use crypto timing-safe compare via Web Crypto / node
  const crypto = require("node:crypto") as typeof import("node:crypto");
  const signed = crypto
    .createHmac("sha256", secret)
    .update(`${t}.${payload}`)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signed), Buffer.from(v1));
  } catch {
    return false;
  }
}
