"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type {
  TextStyleTemplate,
  TextTemplatePackCatalog,
  TextTemplatePackItem,
} from "@/lib/catalog";
import { ui } from "./ui";

type Props = {
  initialCatalog: TextTemplatePackCatalog;
  /** Static text effects, or templates with an entrance animation. */
  view: "effects" | "templates";
};

const TEMPLATE_CATEGORY = "templates";

function isTemplateCategory(id: string): boolean {
  return id === TEMPLATE_CATEGORY;
}

// --- Entrance animation (port of the app's evaluateTextEntrance) -----------

const DEFAULT_ENTRANCE_MS = 800;

function easeOutCubic(t: number): number {
  const u = 1 - t;
  return 1 - u * u * u;
}

/** Per-glyph opacity with overlapping windows, as in the app. */
function staggeredOpacities(count: number, progress: number, hardCut: boolean): number[] {
  if (count <= 0) return [];
  const overlap = 0.55;
  const slot = 1 / (count + (count - 1) * overlap);
  const step = slot * (1 + overlap);
  const window = slot * (1 + overlap * 0.5);
  return Array.from({ length: count }, (_, i) => {
    const start = i * step;
    if (progress < start) return 0;
    if (progress >= start + window) return 1;
    const local = Math.min(1, Math.max(0, (progress - start) / window));
    if (hardCut) return local > 0.15 ? 1 : 0;
    return easeOutCubic(local);
  });
}

type EntranceFrame = {
  glyphOpacity: number[] | null;
  layerOpacity: number;
  layerDy: number;
};

function entranceFrame(
  animationId: string | undefined,
  glyphCount: number,
  progress: number,
  fontPx: number,
): EntranceFrame {
  const t = Math.min(1, Math.max(0, progress));
  if (!animationId || t >= 1) return { glyphOpacity: null, layerOpacity: 1, layerDy: 0 };
  if (t <= 0) return { glyphOpacity: null, layerOpacity: 0, layerDy: fontPx * 0.35 };
  switch (animationId) {
    case "slide_up": {
      const eased = easeOutCubic(t);
      return { glyphOpacity: null, layerOpacity: eased, layerDy: (1 - eased) * fontPx * 0.45 };
    }
    case "typewriter":
      return { glyphOpacity: staggeredOpacities(glyphCount, t, true), layerOpacity: 1, layerDy: 0 };
    case "fade":
      return { glyphOpacity: staggeredOpacities(glyphCount, t, false), layerOpacity: 1, layerDy: 0 };
    default:
      return { glyphOpacity: null, layerOpacity: 1, layerDy: 0 };
  }
}

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

const ANIMATIONS = ["typewriter", "fade", "slide_up"] as const;

export default function TextTab({ initialCatalog, view }: Props) {
  const [catalog, setCatalog] = useState(initialCatalog);
  const allItems = useMemo(
    () => catalog.categories.flatMap((c) => c.items.map((item) => ({ item, categoryId: c.id }))),
    [catalog],
  );
  const viewCategories = catalog.categories.filter((c) =>
    view === "templates" ? isTemplateCategory(c.id) : !isTemplateCategory(c.id),
  );
  const viewItems = allItems.filter((e) =>
    view === "templates" ? isTemplateCategory(e.categoryId) : !isTemplateCategory(e.categoryId),
  );
  const [selectedId, setSelectedId] = useState(viewItems[0]?.item.id ?? "");
  const [accent, setAccent] = useState("#ffffff");
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const selectedEntry = viewItems.find((e) => e.item.id === selectedId) ?? viewItems[0];
  const selected = selectedEntry?.item;

  // Template entrance playback (templates view only).
  const [playProgress, setPlayProgress] = useState(1);
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef<number | null>(null);
  const animationMs = selected?.animation?.durationMs ?? DEFAULT_ENTRANCE_MS;

  useEffect(() => {
    setPlaying(false);
    setPlayProgress(1);
  }, [selected?.id]);

  useEffect(() => {
    if (!playing) return;
    let last: number | null = null;
    const tick = (ts: number) => {
      if (last == null) last = ts;
      const dt = ts - last;
      last = ts;
      let done = false;
      setPlayProgress((p) => {
        const next = p + dt / Math.max(100, animationMs);
        if (next >= 1) {
          done = true;
          return 1;
        }
        return next;
      });
      if (done) {
        setPlaying(false);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, animationMs]);

  const play = () => {
    setPlayProgress(0);
    setPlaying(true);
  };

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
    setSelectedId(viewItems.find((e) => e.item.id !== selected.id)?.item.id ?? "");
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
          <h1 style={ui.h1}>{view === "templates" ? "텍스트 템플릿" : "텍스트 효과"}</h1>
          <p style={ui.sub}>
            {view === "templates"
              ? "스타일 + 등장 애니메이션 (재생해서 확인)"
              : "고정 스타일 (움직임 없음)"}{" "}
            · Catalog v{catalog.version} · {viewItems.length}개 · Pro{" "}
            {viewItems.filter((e) => e.item.premium).length}개 ·{" "}
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
          {viewCategories.map((cat) => (
            <div key={cat.id} style={{ marginBottom: 12 }}>
              <div style={ui.sideHead}>
                <span>
                  {isTemplateCategory(cat.id) ? "텍스트 템플릿" : "텍스트 효과"} ({cat.items.length})
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
            <TextPreview
              item={selected}
              accent={accent}
              progress={view === "templates" ? playProgress : 1}
            />
            {view === "templates" && (
              <div style={styles.transport}>
                <button type="button" onClick={play} style={ui.btnPrimary}>
                  {playing ? "재생 중…" : "▶ 재생"}
                </button>
                <label style={{ ...ui.fieldLabel, flex: 1 }}>
                  {selected.animation?.id ?? "애니메이션 없음"} · {animationMs}ms · t ={" "}
                  {playProgress.toFixed(2)}
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={playProgress}
                    onChange={(e) => {
                      setPlaying(false);
                      setPlayProgress(Number(e.target.value));
                    }}
                  />
                </label>
              </div>
            )}
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
              {view === "templates" && (
                <>
              <label style={ui.fieldLabel}>
                등장 애니메이션
                <select
                  value={selected.animation?.id ?? "fade"}
                  onChange={(e) => {
                    const id = e.target.value as (typeof ANIMATIONS)[number];
                    patchSelected({ animation: { ...(selected.animation ?? {}), id } });
                  }}
                  style={ui.input}
                >
                  {ANIMATIONS.map((a) => (
                    <option key={a} value={a}>
                      {a}
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
                </>
              )}
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
  transport: { display: "flex", gap: 12, alignItems: "center", marginTop: 10 },
  previewStage: {
    height: 180,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    background:
      "linear-gradient(135deg, #3b4a6b 0%, #6b4a7a 50%, #9a5a5a 100%)",
  },
};

/**
 * Text preview. For templates [progress] < 1 plays the app's entrance:
 * typewriter shows glyphs one by one (and reveals the background with them,
 * like the torn-paper fix in the app), fade eases glyphs in, slide_up lifts
 * the whole line while fading in.
 */
function TextPreview({
  item,
  accent,
  progress,
}: {
  item: TextTemplatePackItem;
  accent: string;
  progress: number;
}) {
  const fontPx = 34;
  const text = item.title || "Hello";
  const glyphs = Array.from(text);
  const css = previewCss(item.style, accent, fontPx);
  const frame = entranceFrame(item.animation?.id, glyphs.length, progress, fontPx);

  let box: CSSProperties = css.box;
  if (frame.glyphOpacity && item.animation?.id === "typewriter" && item.style.lineBackground) {
    const visible = frame.glyphOpacity.filter((o) => o > 0).length;
    const hidden = 100 - (visible / Math.max(1, glyphs.length)) * 100;
    box = { ...box, clipPath: `inset(-20% ${hidden}% -20% -20%)` };
  }

  return (
    <div style={styles.previewStage}>
      <span
        style={{
          ...box,
          opacity: frame.layerOpacity,
          transform: `translateY(${frame.layerDy}px)`,
        }}
      >
        <span style={css.text}>
          {frame.glyphOpacity
            ? glyphs.map((g, i) => (
                <span key={i} style={{ opacity: frame.glyphOpacity![i] }}>
                  {g}
                </span>
              ))
            : text}
        </span>
      </span>
    </div>
  );
}
