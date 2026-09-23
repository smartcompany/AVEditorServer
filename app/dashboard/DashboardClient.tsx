"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type {
  TransitionCatalogDto,
  TransitionItemDto,
  TransitionLayerDto,
} from "@/lib/transitions";
import {
  evaluateTransitionLayers,
  outgoingShouldPaintOnTop,
  poseToCss,
} from "@/lib/transition-layer-runtime";

const SECRET_KEY = "aveditor_dashboard_secret";

type Props = {
  initialCatalog: TransitionCatalogDto;
};

function defaultParams(item: TransitionItemDto): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, def] of Object.entries(item.parameters ?? {})) {
    out[key] = def.default;
  }
  return out;
}

function itemTitle(item: TransitionItemDto): string {
  return item.titles?.ko || item.titles?.en || item.title || item.id;
}

export default function DashboardClient({ initialCatalog }: Props) {
  const [catalog, setCatalog] = useState(initialCatalog);
  const [selectedId, setSelectedId] = useState(
    initialCatalog.items[0]?.id ?? "",
  );
  const [params, setParams] = useState<Record<string, number>>(() =>
    defaultParams(initialCatalog.items[0] ?? ({ parameters: {} } as TransitionItemDto)),
  );
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [secret, setSecret] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const raf = useRef<number | null>(null);
  const lastTs = useRef<number | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SECRET_KEY);
      if (stored) setSecret(stored);
    } catch {
      /* ignore */
    }
  }, []);

  const selected = useMemo(
    () => catalog.items.find((i) => i.id === selectedId) ?? catalog.items[0],
    [catalog.items, selectedId],
  );

  useEffect(() => {
    if (!selected) return;
    setParams(defaultParams(selected));
    setProgress(0);
    setPlaying(false);
  }, [selected?.id]);

  useEffect(() => {
    if (!playing || !selected) return;
    const durationMs = selected.defaultDurationMs || 700;
    const tick = (ts: number) => {
      if (lastTs.current == null) lastTs.current = ts;
      const dt = ts - lastTs.current;
      lastTs.current = ts;
      setProgress((p) => {
        const next = p + dt / durationMs;
        if (next >= 1) {
          setPlaying(false);
          return 1;
        }
        return next;
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current != null) cancelAnimationFrame(raf.current);
      lastTs.current = null;
    };
  }, [playing, selected]);

  const evaluation = useMemo(() => {
    if (!selected) {
      return evaluateTransitionLayers([], 0);
    }
    return evaluateTransitionLayers(selected.layers ?? [], progress, params);
  }, [selected, progress, params]);

  const selectItem = (id: string) => {
    setSelectedId(id);
    setStatus(null);
  };

  const updateLayer = (
    index: number,
    patch: Partial<TransitionLayerDto>,
  ) => {
    if (!selected) return;
    setCatalog((prev) => {
      const items = prev.items.map((item) => {
        if (item.id !== selected.id) return item;
        const layers = [...(item.layers ?? [])];
        layers[index] = { ...layers[index], ...patch };
        return { ...item, layers };
      });
      const categories = prev.categories.map((cat) => ({
        ...cat,
        items: cat.items.map(
          (item) => items.find((i) => i.id === item.id) ?? item,
        ),
      }));
      return { ...prev, items, categories };
    });
    setDirty(true);
  };

  const save = useCallback(async () => {
    if (!selected) return;
    setSaving(true);
    setStatus(null);
    try {
      if (secret) {
        try {
          localStorage.setItem(SECRET_KEY, secret);
        } catch {
          /* ignore */
        }
      }
      const res = await fetch("/api/transitions/catalog", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(secret ? { "x-dashboard-secret": secret } : {}),
        },
        body: JSON.stringify(catalog),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatus(`Save failed: ${json.message || json.error || res.status}`);
        return;
      }
      setCatalog(json);
      setDirty(false);
      setStatus(`Saved v${json.version} to Supabase Storage`);
    } catch (error) {
      setStatus(`Save failed: ${error}`);
    } finally {
      setSaving(false);
    }
  }, [catalog, secret, selected]);

  const reload = async () => {
    setStatus(null);
    const res = await fetch("/api/transitions/catalog", { cache: "no-store" });
    const json = (await res.json()) as TransitionCatalogDto;
    setCatalog(json);
    setDirty(false);
    setStatus(`Reloaded v${json.version}`);
  };

  if (!selected) {
    return <p style={{ padding: 24 }}>No transitions in catalog.</p>;
  }

  const outCss = poseToCss(evaluation.outgoing);
  const inCss = poseToCss(evaluation.incoming);
  const outBright = evaluation.outgoing.brightness;
  const inBright = evaluation.incoming.brightness;
  // Match Flutter: spin-out paints A over static B; spin-in paints B over A.
  const aOnTop = outgoingShouldPaintOnTop(
    evaluation,
    selected.layers ?? [],
  );

  const clipA = (
    <div
      style={{
        ...styles.clip,
        ...styles.clipA,
        ...outCss,
        zIndex: aOnTop ? 2 : 1,
      }}
    >
      <span>A · outgoing</span>
      {Math.abs(outBright) > 0.001 && (
        <div
          style={{
            ...styles.veil,
            background:
              outBright >= 0
                ? `rgba(255,255,255,${Math.min(1, Math.abs(outBright))})`
                : `rgba(0,0,0,${Math.min(1, Math.abs(outBright))})`,
          }}
        />
      )}
    </div>
  );
  const clipB = (
    <div
      style={{
        ...styles.clip,
        ...styles.clipB,
        ...inCss,
        zIndex: aOnTop ? 1 : 2,
      }}
    >
      <span>B · incoming</span>
      {Math.abs(inBright) > 0.001 && (
        <div
          style={{
            ...styles.veil,
            background:
              inBright >= 0
                ? `rgba(255,255,255,${Math.min(1, Math.abs(inBright))})`
                : `rgba(0,0,0,${Math.min(1, Math.abs(inBright))})`,
          }}
        />
      )}
    </div>
  );

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>AVEditor</p>
          <h1 style={styles.h1}>Transition dashboard</h1>
          <p style={styles.sub}>
            Catalog v{catalog.version} · Storage-backed ·{" "}
            {dirty ? "unsaved changes" : "in sync"}
          </p>
        </div>
        <div style={styles.headerActions}>
          <input
            type="password"
            placeholder="DASHBOARD_SECRET"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            style={styles.secretInput}
          />
          <button type="button" onClick={reload} style={styles.btnGhost}>
            Reload
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            style={styles.btnPrimary}
          >
            {saving ? "Saving…" : "Save to Storage"}
          </button>
        </div>
      </header>

      {status && <p style={styles.status}>{status}</p>}

      <div style={styles.grid}>
        <aside style={styles.sidebar}>
          <h2 style={styles.sectionTitle}>Effects</h2>
          <ul style={styles.list}>
            {catalog.items.map((item) => {
              const active = item.id === selected.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => selectItem(item.id)}
                    style={{
                      ...styles.listBtn,
                      ...(active ? styles.listBtnActive : {}),
                    }}
                  >
                    <span style={styles.listTitle}>{itemTitle(item)}</span>
                    <span style={styles.listId}>{item.id}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section style={styles.main}>
          <div style={styles.previewShell}>
            <div style={styles.previewStage}>
              {aOnTop ? (
                <>
                  {clipB}
                  {clipA}
                </>
              ) : (
                <>
                  {clipA}
                  {clipB}
                </>
              )}
            </div>

            <div style={styles.transport}>
              <button
                type="button"
                onClick={() => {
                  if (progress >= 1) setProgress(0);
                  setPlaying((p) => !p);
                }}
                style={styles.btnPrimary}
              >
                {playing ? "Pause" : "Play"}
              </button>
              <label style={styles.sliderLabel}>
                t = {progress.toFixed(2)}
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={progress}
                  onChange={(e) => {
                    setPlaying(false);
                    setProgress(Number(e.target.value));
                  }}
                  style={styles.range}
                />
              </label>
            </div>
          </div>

          <div style={styles.panel}>
            <h2 style={styles.sectionTitle}>
              {itemTitle(selected)}{" "}
              <span style={styles.muted}>({selected.id})</span>
            </h2>
            <p style={styles.muted}>
              duration {selected.defaultDurationMs}ms · renderer{" "}
              {selected.renderer} · layers {(selected.layers ?? []).length}
            </p>

            {(selected.controls ?? []).length > 0 && (
              <div style={styles.block}>
                <h3 style={styles.h3}>Parameters</h3>
                {(selected.controls ?? []).map((control) => {
                  const key = control.key;
                  const def = selected.parameters?.[key];
                  const min = control.min ?? def?.min ?? 0;
                  const max = control.max ?? def?.max ?? 1;
                  const value = params[key] ?? def?.default ?? 0;
                  return (
                    <label key={key} style={styles.sliderLabel}>
                      {control.label || key}: {value.toFixed(2)}
                      <input
                        type="range"
                        min={min}
                        max={max}
                        step={0.01}
                        value={value}
                        onChange={(e) =>
                          setParams((p) => ({
                            ...p,
                            [key]: Number(e.target.value),
                          }))
                        }
                        style={styles.range}
                      />
                    </label>
                  );
                })}
              </div>
            )}

            <div style={styles.block}>
              <h3 style={styles.h3}>Layers</h3>
              {(selected.layers ?? []).length === 0 && (
                <p style={styles.muted}>
                  No primitive layers (custom/xfade-only effect).
                </p>
              )}
              {(selected.layers ?? []).map((layer, index) => (
                <div key={`${layer.property}-${index}`} style={styles.layerCard}>
                  <div style={styles.layerHead}>
                    <strong>{layer.property}</strong>
                    <span style={styles.muted}>
                      → {layer.target ?? "outgoing"}
                      {layer.mode ? ` · mode ${layer.mode}` : ""}
                      {layer.param ? ` · param ${layer.param}` : ""}
                    </span>
                  </div>
                  <div style={styles.layerGrid}>
                    {(
                      [
                        ["from", layer.from],
                        ["to", layer.to],
                        ["start", layer.start ?? 0],
                        ["end", layer.end ?? 1],
                      ] as const
                    ).map(([field, value]) => (
                      <label key={field} style={styles.numLabel}>
                        {field}
                        <input
                          type="number"
                          step={0.01}
                          value={value}
                          onChange={(e) =>
                            updateLayer(index, {
                              [field]: Number(e.target.value),
                            })
                          }
                          style={styles.numInput}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "32px 20px 80px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
    alignItems: "flex-end",
    marginBottom: 20,
  },
  eyebrow: {
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#8b93a7",
    fontSize: 12,
    margin: 0,
  },
  h1: { fontSize: 28, margin: "4px 0 6px" },
  sub: { color: "#b7bfcf", margin: 0, fontSize: 14 },
  headerActions: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  secretInput: {
    background: "#151923",
    border: "1px solid #2a3142",
    borderRadius: 8,
    color: "#f4f6fb",
    padding: "8px 10px",
    minWidth: 180,
  },
  btnPrimary: {
    background: "#ff6b6b",
    color: "#0b0d12",
    border: "none",
    borderRadius: 8,
    padding: "8px 14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  btnGhost: {
    background: "transparent",
    color: "#f4f6fb",
    border: "1px solid #2a3142",
    borderRadius: 8,
    padding: "8px 14px",
    cursor: "pointer",
  },
  status: {
    background: "#151923",
    border: "1px solid #2a3142",
    borderRadius: 10,
    padding: "10px 14px",
    marginBottom: 16,
    color: "#b7bfcf",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "minmax(200px, 240px) minmax(0, 1fr)",
    gap: 16,
  },
  sidebar: {
    background: "#151923",
    border: "1px solid #2a3142",
    borderRadius: 14,
    padding: 12,
    maxHeight: "78vh",
    overflow: "auto",
  },
  sectionTitle: { fontSize: 14, margin: "4px 8px 12px" },
  list: { listStyle: "none", margin: 0, padding: 0 },
  listBtn: {
    width: "100%",
    textAlign: "left",
    background: "transparent",
    border: "none",
    color: "#f4f6fb",
    padding: "10px 8px",
    borderRadius: 8,
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  listBtnActive: { background: "#1e2433" },
  listTitle: { fontSize: 13, fontWeight: 600 },
  listId: { fontSize: 11, color: "#8b93a7" },
  main: { display: "flex", flexDirection: "column", gap: 16 },
  previewShell: {
    background: "#151923",
    border: "1px solid #2a3142",
    borderRadius: 14,
    padding: 16,
  },
  previewStage: {
    position: "relative",
    height: 280,
    borderRadius: 12,
    overflow: "hidden",
    background: "#0b0d12",
  },
  clip: {
    position: "absolute",
    inset: 0,
    display: "grid",
    placeItems: "center",
    fontWeight: 700,
    fontSize: 18,
    letterSpacing: "0.04em",
    transformOrigin: "center center",
  },
  clipA: {
    background:
      "linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 50%, #0369a1 100%)",
  },
  clipB: {
    background:
      "linear-gradient(135deg, #b45309 0%, #f59e0b 50%, #ea580c 100%)",
  },
  veil: { position: "absolute", inset: 0, pointerEvents: "none" },
  transport: {
    display: "flex",
    gap: 16,
    alignItems: "center",
    marginTop: 14,
  },
  sliderLabel: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    flex: 1,
    fontSize: 13,
    color: "#b7bfcf",
  },
  range: { width: "100%" },
  panel: {
    background: "#151923",
    border: "1px solid #2a3142",
    borderRadius: 14,
    padding: 16,
  },
  muted: { color: "#8b93a7", fontSize: 13 },
  block: { marginTop: 18 },
  h3: { fontSize: 13, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#8b93a7" },
  layerCard: {
    border: "1px solid #2a3142",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  layerHead: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 10,
    fontSize: 13,
  },
  layerGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 8,
  },
  numLabel: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    fontSize: 11,
    color: "#8b93a7",
  },
  numInput: {
    background: "#0b0d12",
    border: "1px solid #2a3142",
    borderRadius: 6,
    color: "#f4f6fb",
    padding: "6px 8px",
  },
};
