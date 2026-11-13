"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type {
  TextStyleTemplate,
  TextTemplatePackCatalog,
  TextTemplatePackItem,
} from "@/lib/catalog";
import { ui } from "./ui";

type Props = {
  initialCatalog: TextTemplatePackCatalog;
  secret: string;
};

/** ARGB int (0xAARRGGBB) → CSS rgba(). */
function argb(value: number | undefined, fallback: string, opacity = 1): string {
  if (value == null) return fallback;
  const v = value >>> 0;
  const a = ((v >>> 24) & 0xff) / 255;
  const r = (v >>> 16) & 0xff;
  const g = (v >>> 8) & 0xff;
  const b = v & 0xff;
  return `rgba(${r},${g},${b},${(a * opacity).toFixed(3)})`;
}

/**
 * Approximate CSS look of a Flutter text style template. Good enough to
 * judge colours / outline / box at a glance; the app renders the real thing.
 */
function previewCss(style: TextStyleTemplate, accent: string, fontPx: number) {
  const pick = (useAccent: boolean | undefined, color: number | undefined, fb: string, op = 1) =>
    useAccent ? accent : argb(color, fb, op);

  const text: CSSProperties = {
    fontSize: fontPx,
    fontWeight: 800,
    lineHeight: 1.15,
    color: style.fillUseAccent ? accent : argb(style.fillColor, "#ffffff"),
  };
  if (style.fillGradient?.colors?.length) {
    text.backgroundImage = `linear-gradient(90deg, ${style.fillGradient.colors
      .map((c) => argb(c, "#fff"))
      .join(", ")})`;
    text.WebkitBackgroundClip = "text";
    text.color = "transparent";
  }
  const stroke = style.strokes?.[style.strokes.length - 1];
  if (stroke) {
    text.WebkitTextStroke = `${Math.max(1, stroke.widthFactor * fontPx)}px ${pick(stroke.useAccent, stroke.color, "#000")}`;
    text.paintOrder = "stroke fill";
  }
  const shadows: string[] = [];
  if (style.glow) {
    shadows.push(
      `0 0 ${style.glow.blurFactor * fontPx}px ${pick(style.glow.useAccent, style.glow.color, "#fff", style.glow.opacity ?? 1)}`,
    );
  }
  if (style.shadow) {
    shadows.push(
      `${style.shadow.dxFactor * fontPx}px ${style.shadow.dyFactor * fontPx}px ${(style.shadow.blurFactor ?? 0) * fontPx}px ${pick(style.shadow.useAccent, style.shadow.color, "#000", style.shadow.opacity ?? 1)}`,
    );
  }
  if (shadows.length) text.textShadow = shadows.join(", ");

  const box: CSSProperties = { display: "inline-block" };
  const bg = style.lineBackground;
  if (bg) {
    box.background = pick(bg.useAccent, bg.color, "#000", bg.opacity ?? 1);
    box.padding = `${(bg.padVFactor ?? 0.12) * fontPx}px ${(bg.padHFactor ?? 0.3) * fontPx}px`;
    box.borderRadius = bg.shape === "capsule" ? 999 : (bg.radiusFactor ?? 0.15) * fontPx;
  }
  return { text, box };
}

const ANIMATIONS = ["", "typewriter", "fade", "slide_up"] as const;

export default function TextTab({ initialCatalog, secret }: Props) {
  const [catalog, setCatalog] = useState(initialCatalog);
  const allItems = useMemo(
    () => catalog.categories.flatMap((c) => c.items.map((item) => ({ item, categoryId: c.id }))),
    [catalog],
  );
  const [selectedId, setSelectedId] = useState(allItems[0]?.item.id ?? "");
  const [accent, setAccent] = useState("#ffffff");
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const selectedEntry = allItems.find((e) => e.item.id === selectedId) ?? allItems[0];
  const selected = selectedEntry?.item;

  const [styleDraft, setStyleDraft] = useState("");
  const [styleError, setStyleError] = useState<string | null>(null);
  useEffect(() => {
    if (!selected) return;
    setStyleDraft(JSON.stringify(selected.style, null, 2));
    setStyleError(null);
  }, [selected]);

  const updateItem = (id: string, next: TextTemplatePackItem) => {
    setCatalog((prev) => ({
      ...prev,
      categories: prev.categories.map((cat) => ({
        ...cat,
        items: cat.items.map((item) => (item.id === id ? next : item)),
      })),
    }));
    setDirty(true);
  };

  const patchSelected = (patch: Partial<TextTemplatePackItem>) => {
    if (!selected) return;
    updateItem(selected.id, { ...selected, ...patch });
  };

  const addItem = (categoryId: string, from?: TextTemplatePackItem) => {
    const kind = categoryId === "templates" ? "template" : "effect";
    const base = from ? `${from.id}_copy` : kind === "template" ? "pack_new" : "effect_new";
    let id = base;
    let n = 2;
    while (allItems.some((e) => e.item.id === id)) id = `${base}${n++}`;
    const item: TextTemplatePackItem = from
      ? { ...structuredClone(from), id, title: `${from.title} copy`, style: { ...structuredClone(from.style), id, label: `${from.title} copy` } }
      : {
          id,
          title: "New",
          kind,
          premium: false,
          downloadSizeBytes: 0,
          ...(kind === "template" ? { animation: { id: "fade" as const } } : {}),
          style: { id, label: "New", fillUseAccent: true },
        };
    setCatalog((prev) => ({
      ...prev,
      categories: prev.categories.map((cat) =>
        cat.id === categoryId ? { ...cat, items: [...cat.items, item] } : cat,
      ),
    }));
    setSelectedId(id);
    setDirty(true);
  };

  const deleteSelected = () => {
    if (!selected) return;
    if (!window.confirm(`Delete "${selected.title}" (${selected.id})?`)) return;
    setCatalog((prev) => ({
      ...prev,
      categories: prev.categories.map((cat) => ({
        ...cat,
        items: cat.items.filter((item) => item.id !== selected.id),
      })),
    }));
    setSelectedId(allItems.find((e) => e.item.id !== selected.id)?.item.id ?? "");
    setDirty(true);
  };

  const applyStyleJson = () => {
    if (!selected) return;
    try {
      const parsed = JSON.parse(styleDraft) as TextStyleTemplate;
      if (typeof parsed !== "object" || parsed == null) throw new Error("style must be an object");
      patchSelected({ style: { ...parsed, id: selected.id, label: selected.title } });
      setStyleError(null);
    } catch (error) {
      setStyleError(error instanceof Error ? error.message : String(error));
    }
  };

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/text-packs/catalog", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(secret ? { "x-dashboard-secret": secret } : {}),
        },
        body: JSON.stringify(catalog),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatus(`저장 실패: ${json.message || json.error || res.status}`);
        return;
      }
      setCatalog(json);
      setDirty(false);
      setStatus(`v${json.version} 저장 완료 (Supabase Storage) — 앱에는 다음 실행부터 반영`);
    } catch (error) {
      setStatus(`저장 실패: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  const reload = async () => {
    const res = await fetch("/api/text-packs/catalog", { cache: "no-store" });
    setCatalog((await res.json()) as TextTemplatePackCatalog);
    setDirty(false);
    setStatus("다시 불러옴");
  };

  const preview = selected ? previewCss(selected.style, accent, 34) : null;

  return (
    <div>
      <div style={ui.tabHeader}>
        <div>
          <h1 style={ui.h1}>텍스트 효과 · 템플릿</h1>
          <p style={ui.sub}>
            Catalog v{catalog.version} · {allItems.length}개 · Pro{" "}
            {allItems.filter((e) => e.item.premium).length}개 ·{" "}
            {dirty ? "저장 안 된 변경 있음" : "저장됨"}
          </p>
        </div>
        <div style={ui.actions}>
          <button type="button" onClick={reload} style={ui.btnGhost}>
            다시 불러오기
          </button>
          <button type="button" onClick={save} disabled={saving} style={ui.btnPrimary}>
            {saving ? "저장 중…" : "Storage에 저장"}
          </button>
        </div>
      </div>
      {status && <p style={ui.status}>{status}</p>}

      <div style={ui.split}>
        <aside style={ui.sidebar}>
          {catalog.categories.map((cat) => (
            <div key={cat.id} style={{ marginBottom: 12 }}>
              <div style={ui.sideHead}>
                <span>
                  {cat.id === "templates" ? "텍스트 템플릿" : "텍스트 효과"} ({cat.items.length})
                </span>
                <button type="button" onClick={() => addItem(cat.id)} style={ui.btnTiny}>
                  + 추가
                </button>
              </div>
              {cat.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  style={{ ...ui.listBtn, ...(item.id === selected?.id ? ui.listBtnActive : {}) }}
                >
                  <span style={ui.listTitle}>
                    {item.title}
                    {item.premium ? <span style={ui.proBadge}>PRO</span> : null}
                  </span>
                  <span style={ui.listId}>{item.id}</span>
                </button>
              ))}
            </div>
          ))}
        </aside>

        {selected && preview ? (
          <section style={ui.panel}>
            <div style={styles.previewStage}>
              <span style={preview.box}>
                <span style={preview.text}>{selected.title || "Hello"}</span>
              </span>
            </div>
            <label style={{ ...ui.fieldLabel, maxWidth: 200, marginTop: 8 }}>
              미리보기 글자색(앱의 텍스트 색 = accent)
              <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} />
            </label>

            <h3 style={ui.h3}>설정</h3>
            <label style={ui.checkRow}>
              <input
                type="checkbox"
                checked={Boolean(selected.premium)}
                onChange={(e) => patchSelected({ premium: e.target.checked })}
              />
              Pro 전용 (무료 사용자는 내보낼 때 구독·광고·효과 빼기 중 선택)
            </label>
            <div style={ui.fieldGrid}>
              <label style={ui.fieldLabel}>
                id
                <input value={selected.id} readOnly style={{ ...ui.input, opacity: 0.6 }} />
              </label>
              <label style={ui.fieldLabel}>
                이름(title)
                <input
                  value={selected.title}
                  onChange={(e) =>
                    patchSelected({
                      title: e.target.value,
                      style: { ...selected.style, label: e.target.value },
                    })
                  }
                  style={ui.input}
                />
              </label>
              <label style={ui.fieldLabel}>
                종류
                <select
                  value={selected.kind ?? "effect"}
                  onChange={(e) =>
                    patchSelected({ kind: e.target.value as TextTemplatePackItem["kind"] })
                  }
                  style={ui.input}
                >
                  <option value="effect">effect (정적 스타일)</option>
                  <option value="template">template (스타일+등장 애니메이션)</option>
                </select>
              </label>
              <label style={ui.fieldLabel}>
                등장 애니메이션
                <select
                  value={selected.animation?.id ?? ""}
                  onChange={(e) => {
                    const id = e.target.value as (typeof ANIMATIONS)[number];
                    patchSelected({
                      animation: id ? { ...(selected.animation ?? {}), id } : undefined,
                    });
                  }}
                  style={ui.input}
                >
                  {ANIMATIONS.map((a) => (
                    <option key={a} value={a}>
                      {a || "없음"}
                    </option>
                  ))}
                </select>
              </label>
              <label style={ui.fieldLabel}>
                애니메이션 길이(ms)
                <input
                  type="number"
                  value={selected.animation?.durationMs ?? ""}
                  disabled={!selected.animation}
                  onChange={(e) =>
                    selected.animation &&
                    patchSelected({
                      animation: {
                        ...selected.animation,
                        durationMs: e.target.value ? Number(e.target.value) : undefined,
                      },
                    })
                  }
                  style={ui.input}
                />
              </label>
              <label style={ui.fieldLabel}>
                기본 글꼴 id (preferredFontId)
                <input
                  value={selected.style.preferredFontId ?? ""}
                  onChange={(e) =>
                    patchSelected({
                      style: {
                        ...selected.style,
                        preferredFontId: e.target.value || undefined,
                      },
                    })
                  }
                  style={ui.input}
                />
              </label>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                type="button"
                onClick={() => addItem(selectedEntry.categoryId, selected)}
                style={ui.btnGhost}
              >
                복제해서 새로 만들기
              </button>
              <button type="button" onClick={deleteSelected} style={ui.btnDanger}>
                삭제
              </button>
            </div>

            <h3 style={ui.h3}>스타일 JSON</h3>
            <p style={ui.muted}>
              색은 ARGB 정수(예: 4294967295 = 흰색). fill / fillGradient / strokes / glow / shadow /
              lineBackground 를 조합합니다.
            </p>
            <textarea
              value={styleDraft}
              onChange={(e) => setStyleDraft(e.target.value)}
              spellCheck={false}
              style={ui.jsonArea}
            />
            {styleError && <p style={{ ...ui.muted, color: "#ff8a8a" }}>{styleError}</p>}
            <button type="button" onClick={applyStyleJson} style={{ ...ui.btnGhost, marginTop: 8 }}>
              스타일 적용
            </button>
          </section>
        ) : (
          <section style={ui.panel}>
            <p style={ui.muted}>항목이 없습니다.</p>
          </section>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  previewStage: {
    height: 180,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    background:
      "linear-gradient(135deg, #3b4a6b 0%, #6b4a7a 50%, #9a5a5a 100%)",
  },
};
