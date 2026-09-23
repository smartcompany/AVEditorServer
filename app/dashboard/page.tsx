import { getTransitionCatalog } from "@/lib/transition-catalog-store";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const catalog = await getTransitionCatalog();
  return <DashboardClient initialCatalog={catalog} />;
}
