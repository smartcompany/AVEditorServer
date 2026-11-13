import { headers } from "next/headers";
import { getTextPackCatalog } from "@/lib/text-catalog-store";
import { getTransitionCatalog } from "@/lib/transition-catalog-store";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto")?.split(",")[0] ?? (host.startsWith("localhost") ? "http" : "https");
  const [transitions, text] = await Promise.all([
    getTransitionCatalog(),
    getTextPackCatalog(`${proto}://${host}`),
  ]);
  return <DashboardClient initialTransitions={transitions} initialText={text} />;
}
