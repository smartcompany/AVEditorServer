"use client";

import { useMemo, useState, type CSSProperties } from "react";
import type { BackgroundCatalog, BackgroundCatalogItem } from "@/lib/backgrounds";
import { ui } from "./ui";

type Props = {
  initialCatalog: BackgroundCatalog;
};

function resolveUrl(baseUrl: string, relative?: string): string {
  if (!relative) return "";
  if (/^https?:\/\//i.test(relative)) return relative;
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return `${base}${relative.replace(/^\//, "")}`;
}

export default function BackgroundsTab({ initialCatalog }: Props) {
  const [catalog, setCatalog] = useState(initialCatalog);
  const [selectedId, setSelectedId] = useState(catalog.items[0]?.id ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const selected = useMemo(
    () => catalog.items.find((i) => i.id === selectedId) ?? catalog.items[0],
    [catalog, selectedId],
  );

  const patchSelected = (patch: Partial<BackgroundCatalogItem>) => {
    if (!selected) return;
    setCatalog((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === selected.id ? { ...item, ...patch } : item,
      ),
    }));
    setDirty(true);
    setStatus(null);
  };

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/backgrounds/catalog", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(catalog),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? `HTTP ${res.status}`);
      }
      const saved = (await res.json()) as BackgroundCatalog;
      setCatalog(saved);
      setDirty(false);
      setStatus(`저장됨 · v${saved.version}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={styles.toolbar}>
        <p style={ui.muted}>
          타임라인 + → 배경 탭에 표시됩니다. 기본 길이 {selected?.defaultDurationMs ?? 5000}ms.
          이미지 파일은 <code>public/backgrounds/</code> 에 두고 URL만 카탈로그로 관리합니다.
        </p>
        <button
          type="button"
          onClick={() => void save()}
          disabled={!dirty || saving}
          style={ui.btnPrimary}
        >
          {saving ? "저장 중…" : dirty ? "저장" : "저장됨"}
        </button>
      </div>
      {status && <p style={{ ...ui.muted, marginBottom: 12 }}>{status}</p>}

      <div style={styles.layout}>
        <section style={ui.panel}>
          <div style={styles.grid}>
            {catalog.items.map((item) => {
              const src = resolveUrl(catalog.baseUrl || "/", item.previewUrl ?? item.imageUrl);
              const active = item.id === selected?.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  style={{
                    ...styles.tile,
                    ...(active ? styles.tileActive : {}),
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={item.title} style={styles.thumb} />
                  <span style={styles.tileTitle}>{item.title}</span>
                </button>
              );
            })}
          </div>
        </section>

        {selected && (
          <section style={ui.panel}>
            <h3 style={ui.h3}>설정</h3>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveUrl(catalog.baseUrl || "/", selected.previewUrl ?? selected.imageUrl)}
              alt={selected.title}
              style={styles.preview}
            />
            <div style={ui.fieldGrid}>
              <label style={ui.fieldLabel}>
                id
                <input value={selected.id} readOnly style={{ ...ui.input, opacity: 0.6 }} />
              </label>
              <label style={ui.fieldLabel}>
                이름
                <input
                  value={selected.title}
                  onChange={(e) => patchSelected({ title: e.target.value })}
                  style={ui.input}
                />
              </label>
              <label style={ui.fieldLabel}>
                imageUrl
                <input
                  value={selected.imageUrl}
                  onChange={(e) => patchSelected({ imageUrl: e.target.value })}
                  style={ui.input}
                />
              </label>
              <label style={ui.fieldLabel}>
                기본 길이(ms)
                <input
                  type="number"
                  value={selected.defaultDurationMs}
                  onChange={(e) =>
                    patchSelected({
                      defaultDurationMs: Math.max(500, Number(e.target.value) || 5000),
                    })
                  }
                  style={ui.input}
                />
              </label>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
    marginBottom: 12,
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.4fr) minmax(280px, 0.8fr)",
    gap: 16,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(112px, 1fr))",
    gap: 10,
  },
  tile: {
    appearance: "none",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "#12141A",
    borderRadius: 10,
    padding: 6,
    cursor: "pointer",
    color: "#fff",
    textAlign: "center",
  },
  tileActive: {
    borderColor: "#5B9DFF",
    boxShadow: "0 0 0 1px #5B9DFF",
  },
  thumb: {
    width: "100%",
    aspectRatio: "9 / 16",
    objectFit: "cover",
    borderRadius: 6,
    display: "block",
    background: "#000",
  },
  tileTitle: {
    display: "block",
    marginTop: 6,
    fontSize: 12,
    opacity: 0.9,
  },
  preview: {
    width: "100%",
    maxHeight: 360,
    objectFit: "contain",
    borderRadius: 12,
    background: "#000",
    marginBottom: 12,
  },
};
