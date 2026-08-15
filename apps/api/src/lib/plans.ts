/**
 * Boss Built plans (no free tier).
 *
 * - Platform HOSTS live apps by default.
 * - Pro + Elite unlock full export (ZIP / JSON / GitHub).
 * - Starter = hosted on Boss Built only (no off-platform export).
 */

export type PlanId = "none" | "starter" | "pro" | "elite";

export interface PlanDef {
  id: PlanId;
  name: string;
  priceMonthlyUsd: number;
  stripePriceEnv: string;
  features: {
    platformHost: boolean;
    fullExport: boolean;
    platformDeploy: boolean;
    maxProjects: number;
    maxBuildsPerMonth: number;
  };
  blurb: string;
}

export const PLANS: Record<PlanId, PlanDef> = {
  none: {
    id: "none",
    name: "Unsubscribed",
    priceMonthlyUsd: 0,
    stripePriceEnv: "",
    features: {
      platformHost: true,
      fullExport: false,
      platformDeploy: true,
      maxProjects: 2,
      maxBuildsPerMonth: 10,
    },
    blurb: "Subscribe to start building on Boss Built.",
  },
  starter: {
    id: "starter",
    name: "Starter",
    priceMonthlyUsd: 29,
    stripePriceEnv: "STRIPE_PRICE_STARTER",
    features: {
      platformHost: true,
      fullExport: false,
      platformDeploy: true,
      maxProjects: 10,
      maxBuildsPerMonth: 100,
    },
    blurb: "$29/mo — build and host on Boss Built. Export unlocks on Pro/Elite.",
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthlyUsd: 79,
    stripePriceEnv: "STRIPE_PRICE_PRO",
    features: {
      platformHost: true,
      fullExport: true,
      platformDeploy: true,
      maxProjects: 50,
      maxBuildsPerMonth: 500,
    },
    blurb: "$79/mo — higher limits + ZIP / GitHub export (take apps off the platform).",
  },
  elite: {
    id: "elite",
    name: "Elite",
    priceMonthlyUsd: 199,
    stripePriceEnv: "STRIPE_PRICE_ELITE",
    features: {
      platformHost: true,
      fullExport: true,
      platformDeploy: true,
      maxProjects: 200,
      maxBuildsPerMonth: 2000,
    },
    blurb: "$199/mo — max scale + full export ownership.",
  },
};

export function getPlan(id: string | undefined | null): PlanDef {
  if (id && id in PLANS) return PLANS[id as PlanId];
  return PLANS.none;
}

/** Pro and Elite unlock off-platform export. */
export function canFullExport(planId: string | undefined | null): boolean {
  const p = getPlan(planId);
  return p.id === "pro" || p.id === "elite";
}

export function listPublicPlans() {
  return [PLANS.starter, PLANS.pro, PLANS.elite].map((p) => ({
    id: p.id,
    name: p.name,
    priceMonthlyUsd: p.priceMonthlyUsd,
    blurb: p.blurb,
    fullExport: p.features.fullExport,
    platformHost: p.features.platformHost,
    maxProjects: p.features.maxProjects,
    maxBuildsPerMonth: p.features.maxBuildsPerMonth,
  }));
}
