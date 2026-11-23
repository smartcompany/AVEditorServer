import { headers } from "next/headers";
import { getBackgroundCatalog } from "@/lib/background-catalog-store";
import { getPlansConfig } from "@/lib/plans-config-store";
import { getTextPackCatalog } from "@/lib/text-catalog-store";
import { getTransitionCatalog } from "@/lib/transition-catalog-store";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto")?.split(",")[0] ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;
  const [transitions, text, backgrounds, plans] = await Promise.all([
    getTransitionCatalog(),
    getTextPackCatalog(origin),
    getBackgroundCatalog(origin),
    getPlansConfig(),
  ]);
  return (
    <DashboardClient
      initialTransitions={transitions}
      initialText={text}
      initialBackgrounds={backgrounds}
      initialPlans={plans}
    />
  );
}
