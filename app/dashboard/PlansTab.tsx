"use client";

import { useCallback, useMemo, useState, type CSSProperties } from "react";
import type {
  LocaleMap,
  PlanConfigItem,
  PlanTier,
  PlansConfig,
} from "@/lib/plans-config";
import { ui } from "./ui";

type Props = { initialConfig: PlansConfig };

const LOCALES: Array<keyof LocaleMap> = ["en", "ko", "ja", "zh"];
const TIER_ORDER: PlanTier[] = ["plus", "pro", "studio", "free"];

function emptyLocale(): LocaleMap {
  return { en: "", ko: "", ja: "", zh: "" };
}

export default function PlansTab({ initialConfig }: Props) {
  const [config, setConfig] = useState(initialConfig);
  const [selectedId, setSelectedId] = useState<PlanTier>("plus");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [locale, setLocale] = useState<keyof LocaleMap>("ko");

  const selected = useMemo(
    () => config.plans.find((p) => p.id === selectedId) ?? config.plans[0],
    [config.plans, selectedId],
  );

  const updatePlan = (id: PlanTier, patch: Partial<PlanConfigItem>) => {
    setConfig((prev) => ({
      ...prev,
      plans: prev.plans.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
    setDirty(true);
  };

  const updateEconomy = (patch: Partial<PlansConfig["economy"]>) => {
    setConfig((prev) => ({
      ...prev,
      economy: { ...prev.economy, ...patch },
    }));
    setDirty(true);
  };

  const save = useCallback(async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/plans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatus(`Save failed: ${json.message || json.error || res.status}`);
        return;
      }
      setConfig(json);
      setDirty(false);
      setStatus(`Saved plans v${json.version} to Supabase Storage`);
    } catch (error) {
      setStatus(`Save failed: ${error}`);
    } finally {
      setSaving(false);
    }
  }, [config]);

  const reload = async () => {
    setStatus(null);
    const res = await fetch("/api/plans", { cache: "no-store" });
    const json = (await res.json()) as PlansConfig;
    setConfig(json);
    setDirty(false);
    setStatus(`Reloaded v${json.version}`);
  };

  if (!selected) {
    return <p style={{ padding: 24 }}>No plans configured.</p>;
  }

  return (
    <div>
      <div style={ui.tabHeader}>
        <div>
          <h2 style={ui.h1}>구독 플랜 · 크레딧</h2>
          <p style={ui.sub}>
            앱 페이월 카피·월 크레딧·시작/광고 크레딧을 저장합니다. Storage
            키: <code>plans/config.json</code>
          </p>
        </div>
        <div style={ui.actions}>
          <button type="button" style={ui.btnGhost} onClick={reload}>
            Reload
          </button>
          <button
            type="button"
            style={ui.btnPrimary}
            disabled={!dirty || saving}
            onClick={() => void save()}
          >
            {saving ? "Saving…" : dirty ? "Save" : "Saved"}
          </button>
        </div>
      </div>

      {status && <div style={ui.status}>{status}</div>}

      <div style={styles.economy}>
        <h3 style={ui.h3}>Economy</h3>
        <div style={styles.row}>
          <label style={styles.label}>
            Starting credits
            <input
              type="number"
              min={0}
              style={styles.input}
              value={config.economy.startingCredits}
              onChange={(e) =>
                updateEconomy({
                  startingCredits: Number(e.target.value) || 0,
                })
              }
            />
          </label>
          <label style={styles.label}>
            Ad reward credits
            <input
              type="number"
              min={0}
              style={styles.input}
              value={config.economy.adRewardCredits}
              onChange={(e) =>
                updateEconomy({
                  adRewardCredits: Number(e.target.value) || 0,
                })
              }
            />
          </label>
          <div style={ui.muted}>Catalog v{config.version}</div>
        </div>
      </div>

      <div style={ui.split}>
        <aside style={ui.sidebar}>
          {TIER_ORDER.map((id) => {
            const plan = config.plans.find((p) => p.id === id);
            if (!plan) return null;
            const active = plan.id === selected.id;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedId(plan.id)}
                style={{
                  ...styles.sideItem,
                  ...(active ? styles.sideItemActive : {}),
                  ...(plan.enabled === false ? styles.sideItemOff : {}),
                }}
              >
                <strong>
                  {plan.title}
                  {plan.enabled === false ? (
                    <span style={styles.offBadge}> OFF</span>
                  ) : null}
                </strong>
                <span style={ui.muted}>
                  {plan.monthlyCredits.toLocaleString()} / mo
                  {plan.aiEnabled ? " · AI" : ""}
                </span>
              </button>
            );
          })}
        </aside>

        <section style={ui.panel}>
          <div style={styles.localeBar}>
            {LOCALES.map((l) => (
              <button
                key={l}
                type="button"
                style={{
                  ...ui.btnTiny,
                  ...(locale === l ? styles.localeActive : {}),
                }}
                onClick={() => setLocale(l)}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          <h3 style={ui.h3}>{selected.id.toUpperCase()}</h3>

          <div style={styles.row}>
            <label style={styles.check}>
              <input
                type="checkbox"
                checked={selected.enabled !== false}
                onChange={(e) =>
                  updatePlan(selected.id, { enabled: e.target.checked })
                }
              />
              활성화 (페이월에 표시 · Free는 미구독 기본 상태)
            </label>
          </div>

          <div style={styles.row}>
            <label style={styles.label}>
              Title ({locale})
              <input
                style={styles.input}
                value={selected.titles[locale]}
                onChange={(e) =>
                  updatePlan(selected.id, {
                    title: locale === "en" ? e.target.value : selected.title,
                    titles: { ...selected.titles, [locale]: e.target.value },
                  })
                }
              />
            </label>
            <label style={styles.label}>
              Monthly credits
              <input
                type="number"
                min={0}
                style={styles.input}
                value={selected.monthlyCredits}
                onChange={(e) =>
                  updatePlan(selected.id, {
                    monthlyCredits: Number(e.target.value) || 0,
                  })
                }
              />
            </label>
          </div>

          <div style={styles.row}>
            <label style={styles.check}>
              <input
                type="checkbox"
                checked={selected.editingUnlocked}
                onChange={(e) =>
                  updatePlan(selected.id, {
                    editingUnlocked: e.target.checked,
                  })
                }
              />
              Editing unlocked
            </label>
            <label style={styles.check}>
              <input
                type="checkbox"
                checked={selected.aiEnabled}
                onChange={(e) =>
                  updatePlan(selected.id, { aiEnabled: e.target.checked })
                }
              />
              AI enabled
            </label>
          </div>

          <label style={styles.label}>
            Subtitle ({locale}) — use {"{credits}"} for monthly amount
            <textarea
              style={styles.textarea}
              rows={2}
              value={selected.subtitle[locale]}
              onChange={(e) =>
                updatePlan(selected.id, {
                  subtitle: { ...selected.subtitle, [locale]: e.target.value },
                })
              }
            />
          </label>

          <h3 style={ui.h3}>Benefits ({locale})</h3>
          {selected.benefits.map((benefit, index) => (
            <div key={index} style={styles.benefitRow}>
              <textarea
                style={styles.textarea}
                rows={2}
                value={benefit[locale]}
                onChange={(e) => {
                  const next = selected.benefits.map((b, i) =>
                    i === index ? { ...b, [locale]: e.target.value } : b,
                  );
                  updatePlan(selected.id, { benefits: next });
                }}
              />
              <button
                type="button"
                style={ui.btnDanger}
                onClick={() => {
                  const next = selected.benefits.filter((_, i) => i !== index);
                  updatePlan(selected.id, { benefits: next });
                }}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            style={ui.btnGhost}
            onClick={() =>
              updatePlan(selected.id, {
                benefits: [...selected.benefits, emptyLocale()],
              })
            }
          >
            + Add benefit
          </button>
        </section>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  economy: {
    background: "#151923",
    border: "1px solid #2a3142",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  row: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: 12,
    color: "#b7bfcf",
    flex: "1 1 180px",
  },
  input: {
    background: "#0b0d12",
    border: "1px solid #2a3142",
    borderRadius: 8,
    color: "#f4f6fb",
    padding: "8px 10px",
    fontSize: 14,
  },
  textarea: {
    background: "#0b0d12",
    border: "1px solid #2a3142",
    borderRadius: 8,
    color: "#f4f6fb",
    padding: "8px 10px",
    fontSize: 14,
    width: "100%",
    resize: "vertical",
  },
  check: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    color: "#f4f6fb",
    fontSize: 13,
  },
  sideItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 2,
    width: "100%",
    textAlign: "left",
    background: "transparent",
    border: "1px solid transparent",
    borderRadius: 10,
    color: "#f4f6fb",
    padding: "10px 12px",
    cursor: "pointer",
    marginBottom: 6,
  },
  sideItemActive: {
    background: "#1b2130",
    border: "1px solid #ff6b6b",
  },
  sideItemOff: {
    opacity: 0.55,
  },
  offBadge: {
    color: "#ff8a8a",
    fontSize: 11,
    fontWeight: 700,
  },
  localeBar: { display: "flex", gap: 6, marginBottom: 12 },
  localeActive: {
    color: "#0b0d12",
    background: "#4cc9f0",
    borderColor: "#4cc9f0",
  },
  benefitRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 8,
    marginBottom: 10,
    alignItems: "start",
  },
};
