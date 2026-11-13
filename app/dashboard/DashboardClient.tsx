"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { TextTemplatePackCatalog } from "@/lib/catalog";
import type { TransitionCatalogDto } from "@/lib/transitions";
import AnalyticsTab from "./AnalyticsTab";
import TextTab from "./TextTab";
import TransitionsTab from "./TransitionsTab";

const SECRET_KEY = "aveditor_dashboard_secret";
const TAB_KEY = "aveditor_dashboard_tab";

const TABS = [
  { id: "transitions", label: "전환 효과" },
  { id: "text", label: "텍스트 효과·템플릿" },
  { id: "revenue", label: "수익 (구독·광고)" },
  { id: "funnel", label: "사용자 흐름" },
] as const;

type TabId = (typeof TABS)[number]["id"];

type Props = {
  initialTransitions: TransitionCatalogDto;
  initialText: TextTemplatePackCatalog;
};

export default function DashboardClient({ initialTransitions, initialText }: Props) {
  const [tab, setTab] = useState<TabId>("transitions");
  const [secret, setSecret] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SECRET_KEY);
      if (stored) setSecret(stored);
      const storedTab = localStorage.getItem(TAB_KEY) as TabId | null;
      if (storedTab && TABS.some((t) => t.id === storedTab)) setTab(storedTab);
    } catch {
      /* ignore */
    }
  }, []);

  const updateSecret = (value: string) => {
    setSecret(value);
    try {
      localStorage.setItem(SECRET_KEY, value);
    } catch {
      /* ignore */
    }
  };

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
        <input
          type="password"
          placeholder="DASHBOARD_SECRET"
          value={secret}
          onChange={(e) => updateSecret(e.target.value)}
          style={styles.secretInput}
        />
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
        <TransitionsTab initialCatalog={initialTransitions} secret={secret} />
      </div>
      <div style={{ display: tab === "text" ? "block" : "none" }}>
        <TextTab initialCatalog={initialText} secret={secret} />
      </div>
      {tab === "revenue" && <AnalyticsTab mode="revenue" secret={secret} />}
      {tab === "funnel" && <AnalyticsTab mode="funnel" secret={secret} />}
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
  secretInput: {
    background: "#151923",
    border: "1px solid #2a3142",
    borderRadius: 8,
    color: "#f4f6fb",
    padding: "8px 10px",
    minWidth: 200,
  },
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
