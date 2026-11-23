"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { BackgroundCatalog } from "@/lib/backgrounds";
import type { TextTemplatePackCatalog } from "@/lib/catalog";
import type { PlansConfig } from "@/lib/plans-config";
import type { TransitionCatalogDto } from "@/lib/transitions";
import AnalyticsTab from "./AnalyticsTab";
import BackgroundsTab from "./BackgroundsTab";
import PlansTab from "./PlansTab";
import SubscriptionsTab from "./SubscriptionsTab";
import TextTab from "./TextTab";
import TransitionsTab from "./TransitionsTab";

const TAB_KEY = "aveditor_dashboard_tab";

const TABS = [
  { id: "transitions", label: "전환 효과" },
  { id: "textEffects", label: "텍스트 효과" },
  { id: "textTemplates", label: "텍스트 템플릿" },
  { id: "backgrounds", label: "배경" },
  { id: "plans", label: "구독 플랜" },
  { id: "subscriptions", label: "구독" },
  { id: "revenue", label: "수익 (구독·광고)" },
  { id: "funnel", label: "사용자 흐름" },
] as const;

type TabId = (typeof TABS)[number]["id"];

type Props = {
  initialTransitions: TransitionCatalogDto;
  initialText: TextTemplatePackCatalog;
  initialBackgrounds: BackgroundCatalog;
  initialPlans: PlansConfig;
};

export default function DashboardClient({
  initialTransitions,
  initialText,
  initialBackgrounds,
  initialPlans,
}: Props) {
  const [tab, setTab] = useState<TabId>("transitions");

  useEffect(() => {
    try {
      // Drop the secret older dashboard versions kept in the browser.
      localStorage.removeItem("aveditor_dashboard_secret");
      const storedTab = localStorage.getItem(TAB_KEY) as TabId | null;
      if (storedTab && TABS.some((t) => t.id === storedTab)) setTab(storedTab);
    } catch {
      /* ignore */
    }
  }, []);

  const selectTab = (id: TabId) => {
    setTab(id);
    try {
      localStorage.setItem(TAB_KEY, id);
    } catch {
      /* ignore */
    }
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>ClipGo · AVEditor server</p>
          <h1 style={styles.h1}>Dashboard</h1>
        </div>

      </header>

      <nav style={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => selectTab(t.id)}
            style={{ ...styles.tab, ...(tab === t.id ? styles.tabActive : {}) }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Keep catalog tabs mounted so unsaved edits survive tab switches. */}
      <div style={{ display: tab === "transitions" ? "block" : "none" }}>
        <TransitionsTab initialCatalog={initialTransitions} />
      </div>
      {/* One instance for both text tabs: they edit the same catalog, so a
          save from either tab never drops unsaved edits made in the other. */}
      <div
        style={{
          display: tab === "textEffects" || tab === "textTemplates" ? "block" : "none",
        }}
      >
        <TextTab
          initialCatalog={initialText}
          view={tab === "textTemplates" ? "templates" : "effects"}
        />
      </div>
      <div style={{ display: tab === "backgrounds" ? "block" : "none" }}>
        <BackgroundsTab initialCatalog={initialBackgrounds} />
      </div>
      <div style={{ display: tab === "plans" ? "block" : "none" }}>
        <PlansTab initialConfig={initialPlans} />
      </div>
      {tab === "subscriptions" && <SubscriptionsTab />}
      {tab === "revenue" && <AnalyticsTab mode="revenue" />}
      {tab === "funnel" && <AnalyticsTab mode="funnel" />}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { maxWidth: 1240, margin: "0 auto", padding: "28px 20px 80px" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 16,
  },
  eyebrow: {
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#8b93a7",
    fontSize: 12,
    margin: 0,
  },
  h1: { fontSize: 26, margin: "4px 0 0" },
  tabs: {
    display: "flex",
    gap: 4,
    borderBottom: "1px solid #2a3142",
    marginBottom: 20,
    flexWrap: "wrap",
  },
  tab: {
    background: "transparent",
    border: "none",
    borderBottom: "2px solid transparent",
    color: "#8b93a7",
    padding: "10px 14px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  tabActive: { color: "#f4f6fb", borderBottom: "2px solid #ff6b6b" },
};
