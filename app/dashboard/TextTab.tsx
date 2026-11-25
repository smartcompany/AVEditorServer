"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type {
  TextComposition,
  TextEntranceAnimation,
  TextPackLayout,
  TextStyleTemplate,
  TextTemplatePackCatalog,
  TextTemplatePackItem,
} from "@/lib/catalog";
import {
  CRAWL_ANIMATION_DEFAULTS,
  DEFAULT_EFFECT_SAMPLE_TEXT,
  DEFAULT_TEMPLATE_SAMPLE_TEXT,
  ENTRANCE_ANIMATION_IDS,
  FOCUS_ANIMATION_DEFAULTS,
  GLITCH_ANIMATION_DEFAULTS,
  IMPACT_ANIMATION_DEFAULTS,
  KINETIC_ANIMATION_DEFAULTS,
  NEON_ANIMATION_DEFAULTS,
  POP_ANIMATION_DEFAULTS,
  STAGED_ANIMATION_DEFAULTS,
  TYPEWRITER_ANIMATION_DEFAULTS,
  compositionEntriesFor,
  compositionPaintedSlotCount,
  compositionSampleText,
  type TextEntranceAnimationId,
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
function staggeredOpacities(
  count: number,
  progress: number,
  hardCut = true,
  overlap = TYPEWRITER_ANIMATION_DEFAULTS.staggerOverlap,
): number[] {
  if (count <= 0) return [];
  const o = Math.min(0.95, Math.max(0, overlap));
  const slot = 1 / (count + (count - 1) * o);
  const step = slot * (1 + o);
  const window = slot * (1 + o * 0.5);
  return Array.from({ length: count }, (_, i) => {
    const start = i * step;
    if (progress < start) return 0;
    if (progress >= start + window) return 1;
    const local = Math.min(1, Math.max(0, (progress - start) / window));
    if (hardCut) return local > 0.15 ? 1 : 0;
    return easeOutCubic(local);
  });
}

function staggerByLine(text: string, staggerBy?: string): boolean {
  if (staggerBy === "line") return true;
  if (staggerBy === "glyph") return false;
  return text.includes("\n");
}

/** Finish each line before the next — mirrors Flutter `_staggeredByLine`. */
function staggeredOpacitiesByLine(
  glyphs: string[],
  progress: number,
  hardCut = true,
  overlap = TYPEWRITER_ANIMATION_DEFAULTS.staggerOverlap,
): number[] {
  const out = glyphs.map(() => 0);
  if (glyphs.length === 0) return out;
  const lines: number[][] = [];
  let current: number[] = [];
  for (let i = 0; i < glyphs.length; i++) {
    current.push(i);
    if (glyphs[i] === "\n") {
      lines.push(current);
      current = [];
    }
  }
  if (current.length) lines.push(current);
  if (!lines.length) return out;

  const scaled = Math.min(1, Math.max(0, progress)) * lines.length;
  const active = Math.min(lines.length - 1, Math.floor(scaled));
  const localT = Math.min(1, Math.max(0, scaled - active));

  for (let li = 0; li < lines.length; li++) {
    const idxs = lines[li];
    if (li < active) {
      for (const i of idxs) out[i] = 1;
      continue;
    }
    if (li > active) continue;
    const content = idxs.filter((i) => glyphs[i] !== "\n");
    if (!content.length) {
      for (const i of idxs) out[i] = 1;
      continue;
    }
    const inner = staggeredOpacities(content.length, localT, hardCut, overlap);
    content.forEach((glyphIndex, k) => {
      out[glyphIndex] = inner[k] ?? 0;
    });
    for (const i of idxs) {
      if (glyphs[i] === "\n") out[i] = 1;
    }
  }
  return out;
}

type EntranceFrame = {
  glyphOpacity: number[] | null;
  layerOpacity: number;
  layerDy: number;
  layerDx?: number;
  layerScale?: number;
  layerBlur?: number;
  rgbOffset?: number;
  glowPulse?: number;
  cursorVisible?: boolean;
  slotOpacity?: number[];
  slotDy?: number[];
  crawlTiltDeg?: number;
  crawlScrollY?: number;
};

function easeOutBack(t: number, overshoot: number): number {
  const c1 = 1.70158 * (1 + overshoot * 2);
  const c3 = c1 + 1;
  const u = t - 1;
  return 1 + c3 * u * u * u + c1 * u * u;
}

function entranceFrame(
  animationId: string | undefined,
  glyphs: string[],
  progress: number,
  fontPx: number,
  animation?: TextEntranceAnimation,
  slotCount?: number,
): EntranceFrame {
  const t = Math.min(1, Math.max(0, progress));
  const glyphCount = glyphs.length;
  const inferredSlots = glyphs
    .join("")
    .split("\n")
    .filter((l) => l.trim()).length;
  const slots = Math.max(1, slotCount ?? (inferredSlots || 1));
  if (animationId === "crawl") {
    const tiltDeg = animation?.tiltDeg ?? CRAWL_ANIMATION_DEFAULTS.tiltDeg;
    const startF =
      animation?.scrollStartFactor ?? CRAWL_ANIMATION_DEFAULTS.scrollStartFactor;
    const endF =
      animation?.scrollEndFactor ?? CRAWL_ANIMATION_DEFAULTS.scrollEndFactor;
    const startY = fontPx * startF;
    const endY = fontPx * endF;
    return {
      glyphOpacity: null,
      layerOpacity: 1,
      layerDy: 0,
      crawlTiltDeg: tiltDeg,
      crawlScrollY: startY + (endY - startY) * t,
    };
  }
  if (!animationId || t >= 1) {
    return {
      glyphOpacity: null,
      layerOpacity: 1,
      layerDy: 0,
      layerScale: 1,
      glowPulse: animationId === "neon" ? 1 : undefined,
      slotOpacity: animationId === "staged" ? Array(slots).fill(1) : undefined,
      slotDy: animationId === "staged" ? Array(slots).fill(0) : undefined,
      cursorVisible: !!(animation?.cursor),
    };
  }
  if (t <= 0) {
    return {
      glyphOpacity: null,
      layerOpacity: 0,
      layerDy: fontPx * 0.35,
      layerScale: animation?.scaleFrom ?? 0.25,
      layerBlur: fontPx * (animation?.blurFrom ?? 0.35),
      slotOpacity: Array(slots).fill(0),
    };
  }
  switch (animationId) {
    case "slide_up": {
      const eased = easeOutCubic(t);
      return { glyphOpacity: null, layerOpacity: eased, layerDy: (1 - eased) * fontPx * 0.45 };
    }
    case "typewriter": {
      const overlap =
        animation?.staggerOverlap ?? TYPEWRITER_ANIMATION_DEFAULTS.staggerOverlap;
      const text = glyphs.join("");
      const byLine = staggerByLine(
        text,
        animation?.staggerBy ?? TYPEWRITER_ANIMATION_DEFAULTS.staggerBy,
      );
      const glyphOpacity = byLine
        ? staggeredOpacitiesByLine(glyphs, t, true, overlap)
        : staggeredOpacities(glyphCount, t, true, overlap);
      const visible = glyphOpacity.filter((o) => o > 0).length;
      const blinkHz = animation?.cursorBlinkHz ?? 2;
      const cursorVisible = !!(
        animation?.cursor &&
        (visible < glyphCount || Math.sin(t * Math.PI * 2 * blinkHz) > 0)
      );
      return { glyphOpacity, layerOpacity: 1, layerDy: 0, cursorVisible };
    }
    case "fade": {
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      return { glyphOpacity: null, layerOpacity: eased, layerDy: 0 };
    }
    case "pop": {
      const bounce = animation?.bounce ?? POP_ANIMATION_DEFAULTS.bounce;
      const from = animation?.scaleFrom ?? POP_ANIMATION_DEFAULTS.scaleFrom;
      const raw = easeOutBack(t, bounce);
      let scale = from + (1 - from) * Math.min(1 + bounce, Math.max(0, raw));
      if (t > 0.85) scale = scale + (1 - scale) * ((t - 0.85) / 0.15);
      const shakeAmp = (animation?.shake ?? 0) * fontPx;
      const shake = t < 0.55 ? Math.sin(t * Math.PI * 10) * shakeAmp * (1 - t) : 0;
      return {
        glyphOpacity: null,
        layerOpacity: easeOutCubic(Math.min(1, t / 0.35)),
        layerDy: 0,
        layerDx: shake,
        layerScale: scale,
      };
    }
    case "kinetic": {
      const overlap =
        animation?.staggerOverlap ?? KINETIC_ANIMATION_DEFAULTS.staggerOverlap;
      return {
        glyphOpacity: staggeredOpacities(glyphCount, t, false, overlap),
        layerOpacity: 1,
        layerDy: 0,
      };
    }
    case "focus": {
      const eased = easeOutCubic(t);
      const from = animation?.scaleFrom ?? FOCUS_ANIMATION_DEFAULTS.scaleFrom;
      const blurFrom = animation?.blurFrom ?? FOCUS_ANIMATION_DEFAULTS.blurFrom;
      return {
        glyphOpacity: null,
        layerOpacity: eased,
        layerDy: 0,
        layerScale: from + (1 - from) * eased,
        layerBlur: fontPx * blurFrom * (1 - eased),
      };
    }
    case "staged": {
      const stagger = animation?.slotStagger ?? STAGED_ANIMATION_DEFAULTS.slotStagger;
      const window = 0.32;
      const span = (1 - window) * Math.min(1, Math.max(0.05, stagger));
      const slotOpacity: number[] = [];
      const slotDy: number[] = [];
      for (let i = 0; i < slots; i++) {
        const start = slots === 1 ? 0 : (i / (slots - 1)) * span;
        const local = Math.min(1, Math.max(0, (t - start) / window));
        const eased = easeOutCubic(local);
        slotOpacity.push(eased);
        slotDy.push((1 - eased) * fontPx * 0.4);
      }
      return { glyphOpacity: null, layerOpacity: 1, layerDy: 0, slotOpacity, slotDy };
    }
    case "impact": {
      const punch = animation?.punch ?? IMPACT_ANIMATION_DEFAULTS.punch;
      const from = animation?.scaleFrom ?? IMPACT_ANIMATION_DEFAULTS.scaleFrom;
      const eased = easeOutCubic(Math.min(1, t / 0.45));
      let scale = 1;
      if (t < 0.35) scale = from + (1 + punch - from) * eased;
      else if (t < 0.55) scale = 1 + punch * (1 - (t - 0.35) / 0.2);
      const shakeAmp = (animation?.shake ?? IMPACT_ANIMATION_DEFAULTS.shake) * fontPx;
      const shake = t < 0.5 ? Math.sin(t * Math.PI * 16) * shakeAmp * (1 - t * 2) : 0;
      return {
        glyphOpacity: null,
        layerOpacity: eased,
        layerDy: (1 - eased) * fontPx * -0.15,
        layerDx: shake,
        layerScale: scale,
      };
    }
    case "glitch": {
      const amp = (animation?.glitchAmp ?? GLITCH_ANIMATION_DEFAULTS.glitchAmp) * fontPx;
      const burst = t < 0.75;
      const wave = Math.sin(t * Math.PI * 18) * (burst ? 1 : (1 - t) * 4);
      return {
        glyphOpacity: null,
        layerOpacity: t < 0.1 ? t / 0.1 : 1,
        layerDy: 0,
        layerDx: wave * amp * 0.4,
        rgbOffset: burst ? amp * (0.6 + 0.4 * Math.abs(wave)) : amp * (1 - t) * 0.5,
      };
    }
    case "neon": {
      const flicker = animation?.neonFlicker ?? NEON_ANIMATION_DEFAULTS.neonFlicker;
      const ramp = easeOutCubic(t);
      const noise = 0.5 + 0.5 * Math.sin(t * Math.PI * 14);
      const pulse = ramp * (1 - flicker * 0.5 + flicker * 0.5 * noise);
      return {
        glyphOpacity: null,
        layerOpacity: Math.max(0.15, ramp),
        layerDy: 0,
        glowPulse: Math.min(1.35, Math.max(0.2, pulse)),
      };
    }
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
  // Same defaults as the app's paintOverlayLineBackgrounds.
  const bg = style.lineBackground;
  let brush: BrushPaint | null = null;
  if (bg) {
    const color = pick(bg.useAccent, bg.color, "#000", bg.opacity ?? 1);
    box.padding = `${(bg.padVFactor ?? 0.14) * fontPx}px ${(bg.padHFactor ?? 0.22) * fontPx}px`;
    const shadowOpacity = bg.shadowOpacity ?? 0;
    const shadowBlur = Math.min(28, Math.max(2, (bg.shadowBlurFactor ?? 0.12) * fontPx));
    if (bg.shape === "brush") {
      // Prefer pack underlay PNG (nine-slice); SVG path is legacy fallback.
      box.position = "relative";
      const underlay =
        bg.underlayVariants?.[0] || bg.underlayUrl || bg.underlayAsset || null;
      brush = {
        color,
        shadowOpacity,
        shadowBlur,
        fontPx,
        underlaySrc: underlay
          ? underlay.startsWith("http")
            ? underlay
            : `/${underlay.replace(/^\//, "")}`
          : null,
        nineSlice: bg.nineSlice ?? { l: 0.2, t: 0.26, r: 0.2, b: 0.26 },
      };
    } else {
      // App: rounded rect, radius = fontSize × radiusFactor clamped to 4…12.
      box.background = color;
      box.borderRadius = Math.min(12, Math.max(4, fontPx * (bg.radiusFactor ?? 0.18)));
      if (shadowOpacity > 0) {
        box.boxShadow = `0 ${fontPx * 0.04}px ${shadowBlur}px rgba(0,0,0,${shadowOpacity})`;
      }
    }
  }
  return { text, box, brush };
}

type BrushPaint = {
  color: string;
  shadowOpacity: number;
  shadowBlur: number;
  fontPx: number;
  underlaySrc?: string | null;
  nineSlice?: { l?: number; t?: number; r?: number; b?: number };
};

/**
 * Port of the app's _tornPaperPath: wavy torn top/bottom edges and jagged
 * end caps around a w×h strip (deterministic, seed from the rect origin).
 */
function tornPaperPath(left: number, top: number, w: number, h: number): string {
  const right = left + w;
  const bottom = top + h;
  const seed = Math.abs(left * 0.13 + top * 0.07);
  const n = (t: number, a: number, f: number, p: number) =>
    Math.sin((t + seed) * f * Math.PI * 2 + p) * a;
  const leftInset = h * 0.08;
  const rightInset = h * 0.1;
  const topAmp = h * 0.16;
  const botAmp = h * 0.14;
  const steps = 10;
  const parts: string[] = [];
  parts.push(`M ${left + leftInset} ${top + h * 0.42}`);
  parts.push(
    `Q ${left - h * 0.04} ${top + h * 0.18 + n(0.1, topAmp * 0.4, 1.7, 0.4)} ${left + leftInset * 0.6} ${top + n(0.15, topAmp, 2.1, 0.2)}`,
  );
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = left + leftInset + (w - leftInset - rightInset) * t;
    const y = top + n(t, topAmp, 2.4, 0.6) + n(t, topAmp * 0.35, 5.1, 1.3);
    parts.push(`L ${x} ${y}`);
  }
  parts.push(
    `Q ${right + h * 0.05} ${top + h * 0.35 + n(0.9, botAmp * 0.5, 1.9, 2.1)} ${right - rightInset * 0.35} ${bottom - h * 0.28 + n(1.0, botAmp * 0.3, 2.2, 0.8)}`,
  );
  parts.push(
    `Q ${right + h * 0.02} ${bottom - h * 0.08} ${right - rightInset} ${bottom + n(1.05, botAmp, 2.0, 1.7)}`,
  );
  for (let i = steps - 1; i >= 0; i--) {
    const t = i / steps;
    const x = left + leftInset + (w - leftInset - rightInset) * t;
    const y = bottom + n(t, botAmp, 2.2, 2.4) + n(t, botAmp * 0.4, 4.6, 0.9);
    parts.push(`L ${x} ${y}`);
  }
  parts.push(`Q ${left - h * 0.03} ${bottom - h * 0.25} ${left + leftInset} ${top + h * 0.42}`);
  parts.push("Z");
  return parts.join(" ");
}

/** Torn-paper strip: pack underlay nine-slice when present, else SVG path. */
function TornPaper({ paint }: { paint: BrushPaint }) {
  const ref = useRef<HTMLDivElement | SVGSVGElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const filterId = useMemo(() => `torn${Math.random().toString(36).slice(2, 8)}`, []);
  useEffect(() => {
    if (paint.underlaySrc) return;
    const parent = ref.current?.parentElement;
    if (!parent) return;
    const measure = () => setSize({ w: parent.offsetWidth, h: parent.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [paint.underlaySrc]);

  if (paint.underlaySrc) {
    const ns = paint.nineSlice ?? { l: 0.2, t: 0.26, r: 0.2, b: 0.26 };
    // Approximate nine-slice with border-image (640×160 source).
    const sw = 640;
    const sh = 160;
    const slice = `${Math.round(sh * (ns.t ?? 0.26))} ${Math.round(sw * (ns.r ?? 0.2))} ${Math.round(sh * (ns.b ?? 0.26))} ${Math.round(sw * (ns.l ?? 0.2))}`;
    return (
      <div
        ref={ref as React.RefObject<HTMLDivElement>}
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          borderStyle: "solid",
          borderColor: "transparent",
          borderWidth: `${Math.max(8, paint.fontPx * 0.35)}px ${Math.max(12, paint.fontPx * 0.55)}px`,
          borderImageSource: `url(${paint.underlaySrc})`,
          borderImageSlice: `${slice} fill`,
          borderImageRepeat: "stretch",
          filter:
            paint.shadowOpacity > 0
              ? `drop-shadow(0 ${paint.fontPx * 0.045}px ${paint.shadowBlur}px rgba(0,0,0,${paint.shadowOpacity}))`
              : undefined,
        }}
      />
    );
  }

  const d = size ? tornPaperPath(0, 0, size.w, size.h) : "";
  const fringeBlur = Math.min(10, Math.max(1.2, paint.fontPx * 0.08));
  return (
    <svg
      ref={ref as React.RefObject<SVGSVGElement>}
      aria-hidden
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", zIndex: 0 }}
    >
      <defs>
        <filter id={`${filterId}s`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={paint.shadowBlur / 2} />
        </filter>
        <filter id={`${filterId}f`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={fringeBlur / 2} />
        </filter>
      </defs>
      {size && (
        <>
          {paint.shadowOpacity > 0 && (
            <path
              d={d}
              transform={`translate(0 ${paint.fontPx * 0.045})`}
              fill={`rgba(0,0,0,${paint.shadowOpacity})`}
              filter={`url(#${filterId}s)`}
            />
          )}
          <path d={d} fill={paint.color} opacity={0.55} filter={`url(#${filterId}f)`} />
          <path d={d} fill={paint.color} />
        </>
      )}
    </svg>
  );
}

const ANIMATIONS = ENTRANCE_ANIMATION_IDS;

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
          accessTier: "free",
          premium: false,
          downloadSizeBytes: 0,
          sampleText:
            kind === "template"
              ? DEFAULT_TEMPLATE_SAMPLE_TEXT
              : DEFAULT_EFFECT_SAMPLE_TEXT,
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
                    {(() => {
                      const tier =
                        item.accessTier ?? (item.premium ? "pro" : "free");
                      if (tier === "plus") {
                        return (
                          <span style={{ ...ui.proBadge, background: "#2563EB" }}>
                            PLUS
                          </span>
                        );
                      }
                      if (tier === "pro") {
                        return <span style={ui.proBadge}>PRO</span>;
                      }
                      return null;
                    })()}
                  </span>
                  <span style={ui.listId}>{item.id}</span>
                </button>
              ))}
            </div>
          ))}
        </aside>

        {selected && preview ? (
          <section style={ui.panel}>
            {selected.composition?.slots?.length ? (
              <CompositionPreview
                item={selected}
                accent={accent}
                progress={view === "templates" ? playProgress : 1}
              />
            ) : (
              <TextPreview
                item={selected}
                accent={accent}
                progress={view === "templates" ? playProgress : 1}
              />
            )}
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
            <label style={ui.fieldLabel}>
              구독 레벨 (효과는 크레딧 소모 없음 · Plus는 Plus만, Pro/Studio는 Plus+Pro)
              <select
                value={
                  selected.accessTier === "plus" || selected.accessTier === "pro"
                    ? selected.accessTier
                    : selected.premium
                      ? "pro"
                      : "free"
                }
                onChange={(e) => {
                  const accessTier = e.target.value as "free" | "plus" | "pro";
                  patchSelected({
                    accessTier,
                    premium: accessTier !== "free",
                  });
                }}
                style={ui.input}
              >
                <option value="free">Free</option>
                <option value="plus">Plus</option>
                <option value="pro">Pro</option>
              </select>
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
                애니메이션
                <select
                  value={selected.animation?.id ?? "fade"}
                  onChange={(e) => {
                    const id = e.target.value as TextEntranceAnimationId;
                    const base: TextEntranceAnimation = {
                      id,
                      durationMs:
                        id === "crawl"
                          ? selected.animation?.durationMs ?? 18000
                          : selected.animation?.durationMs ?? DEFAULT_ENTRANCE_MS,
                    };
                    if (id === "crawl") Object.assign(base, CRAWL_ANIMATION_DEFAULTS);
                    if (id === "typewriter")
                      Object.assign(base, TYPEWRITER_ANIMATION_DEFAULTS);
                    if (id === "pop") Object.assign(base, POP_ANIMATION_DEFAULTS);
                    if (id === "kinetic")
                      Object.assign(base, KINETIC_ANIMATION_DEFAULTS);
                    if (id === "focus")
                      Object.assign(base, FOCUS_ANIMATION_DEFAULTS);
                    if (id === "staged")
                      Object.assign(base, STAGED_ANIMATION_DEFAULTS);
                    if (id === "impact")
                      Object.assign(base, IMPACT_ANIMATION_DEFAULTS);
                    if (id === "glitch")
                      Object.assign(base, GLITCH_ANIMATION_DEFAULTS);
                    if (id === "neon") Object.assign(base, NEON_ANIMATION_DEFAULTS);
                    patchSelected({ animation: base });
                  }}
                  style={ui.input}
                >
                  {ANIMATIONS.map((a) => (
                    <option key={a} value={a}>
                      {a === "crawl" ? "crawl (크롤)" : a}
                    </option>
                  ))}
                </select>
              </label>
              <label style={ui.fieldLabel}>
                {selected.animation?.id === "crawl"
                  ? "크롤 길이(ms)"
                  : "애니메이션 길이(ms)"}
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
              {selected.animation?.id === "typewriter" && (
                <>
                  <label style={ui.fieldLabel}>
                    글자 오버랩 (staggerOverlap)
                    <input
                      type="number"
                      step={0.05}
                      min={0}
                      max={0.95}
                      value={
                        selected.animation?.staggerOverlap ??
                        TYPEWRITER_ANIMATION_DEFAULTS.staggerOverlap
                      }
                      onChange={(e) =>
                        selected.animation &&
                        patchSelected({
                          animation: {
                            ...selected.animation,
                            staggerOverlap: Number(e.target.value),
                          },
                        })
                      }
                      style={ui.input}
                    />
                  </label>
                  <label style={ui.fieldLabel}>
                    진행 단위 (staggerBy)
                    <select
                      value={
                        selected.animation?.staggerBy ??
                        TYPEWRITER_ANIMATION_DEFAULTS.staggerBy
                      }
                      onChange={(e) =>
                        selected.animation &&
                        patchSelected({
                          animation: {
                            ...selected.animation,
                            staggerBy: e.target.value as
                              | "glyph"
                              | "line"
                              | "auto",
                          },
                        })
                      }
                      style={ui.input}
                    >
                      <option value="auto">auto (줄바꿈 있으면 줄 단위)</option>
                      <option value="line">line (줄 끝난 뒤 다음 줄)</option>
                      <option value="glyph">glyph (글자 연속)</option>
                    </select>
                  </label>
                  <label style={ui.fieldLabel}>
                    커서 (cursor)
                    <select
                      value={selected.animation?.cursor ? "true" : "false"}
                      onChange={(e) =>
                        selected.animation &&
                        patchSelected({
                          animation: {
                            ...selected.animation,
                            cursor: e.target.value === "true",
                          },
                        })
                      }
                      style={ui.input}
                    >
                      <option value="false">off</option>
                      <option value="true">on</option>
                    </select>
                  </label>
                </>
              )}
              {(selected.animation?.id === "pop" ||
                selected.animation?.id === "impact") && (
                <>
                  <label style={ui.fieldLabel}>
                    bounce
                    <input
                      type="number"
                      step={0.02}
                      value={
                        selected.animation?.bounce ??
                        POP_ANIMATION_DEFAULTS.bounce
                      }
                      onChange={(e) =>
                        selected.animation &&
                        patchSelected({
                          animation: {
                            ...selected.animation,
                            bounce: Number(e.target.value),
                          },
                        })
                      }
                      style={ui.input}
                    />
                  </label>
                  <label style={ui.fieldLabel}>
                    shake
                    <input
                      type="number"
                      step={0.01}
                      value={selected.animation?.shake ?? 0}
                      onChange={(e) =>
                        selected.animation &&
                        patchSelected({
                          animation: {
                            ...selected.animation,
                            shake: Number(e.target.value),
                          },
                        })
                      }
                      style={ui.input}
                    />
                  </label>
                  <label style={ui.fieldLabel}>
                    scaleFrom
                    <input
                      type="number"
                      step={0.05}
                      value={
                        selected.animation?.scaleFrom ??
                        POP_ANIMATION_DEFAULTS.scaleFrom
                      }
                      onChange={(e) =>
                        selected.animation &&
                        patchSelected({
                          animation: {
                            ...selected.animation,
                            scaleFrom: Number(e.target.value),
                          },
                        })
                      }
                      style={ui.input}
                    />
                  </label>
                </>
              )}
              {selected.animation?.id === "focus" && (
                <>
                  <label style={ui.fieldLabel}>
                    scaleFrom
                    <input
                      type="number"
                      step={0.05}
                      value={
                        selected.animation?.scaleFrom ??
                        FOCUS_ANIMATION_DEFAULTS.scaleFrom
                      }
                      onChange={(e) =>
                        selected.animation &&
                        patchSelected({
                          animation: {
                            ...selected.animation,
                            scaleFrom: Number(e.target.value),
                          },
                        })
                      }
                      style={ui.input}
                    />
                  </label>
                  <label style={ui.fieldLabel}>
                    blurFrom
                    <input
                      type="number"
                      step={0.05}
                      value={
                        selected.animation?.blurFrom ??
                        FOCUS_ANIMATION_DEFAULTS.blurFrom
                      }
                      onChange={(e) =>
                        selected.animation &&
                        patchSelected({
                          animation: {
                            ...selected.animation,
                            blurFrom: Number(e.target.value),
                          },
                        })
                      }
                      style={ui.input}
                    />
                  </label>
                </>
              )}
              {selected.animation?.id === "kinetic" && (
                <>
                  <label style={ui.fieldLabel}>
                    kineticAmp
                    <input
                      type="number"
                      step={0.05}
                      value={
                        selected.animation?.kineticAmp ??
                        KINETIC_ANIMATION_DEFAULTS.kineticAmp
                      }
                      onChange={(e) =>
                        selected.animation &&
                        patchSelected({
                          animation: {
                            ...selected.animation,
                            kineticAmp: Number(e.target.value),
                          },
                        })
                      }
                      style={ui.input}
                    />
                  </label>
                  <label style={ui.fieldLabel}>
                    kineticRotDeg
                    <input
                      type="number"
                      step={1}
                      value={
                        selected.animation?.kineticRotDeg ??
                        KINETIC_ANIMATION_DEFAULTS.kineticRotDeg
                      }
                      onChange={(e) =>
                        selected.animation &&
                        patchSelected({
                          animation: {
                            ...selected.animation,
                            kineticRotDeg: Number(e.target.value),
                          },
                        })
                      }
                      style={ui.input}
                    />
                  </label>
                </>
              )}
              {selected.animation?.id === "staged" && (
                <label style={ui.fieldLabel}>
                  slotStagger
                  <input
                    type="number"
                    step={0.05}
                    min={0.05}
                    max={1}
                    value={
                      selected.animation?.slotStagger ??
                      STAGED_ANIMATION_DEFAULTS.slotStagger
                    }
                    onChange={(e) =>
                      selected.animation &&
                      patchSelected({
                        animation: {
                          ...selected.animation,
                          slotStagger: Number(e.target.value),
                        },
                      })
                    }
                    style={ui.input}
                  />
                </label>
              )}
              {selected.animation?.id === "glitch" && (
                <label style={ui.fieldLabel}>
                  glitchAmp
                  <input
                    type="number"
                    step={0.01}
                    value={
                      selected.animation?.glitchAmp ??
                      GLITCH_ANIMATION_DEFAULTS.glitchAmp
                    }
                    onChange={(e) =>
                      selected.animation &&
                      patchSelected({
                        animation: {
                          ...selected.animation,
                          glitchAmp: Number(e.target.value),
                        },
                      })
                    }
                    style={ui.input}
                  />
                </label>
              )}
              {selected.animation?.id === "neon" && (
                <label style={ui.fieldLabel}>
                  neonFlicker
                  <input
                    type="number"
                    step={0.05}
                    value={
                      selected.animation?.neonFlicker ??
                      NEON_ANIMATION_DEFAULTS.neonFlicker
                    }
                    onChange={(e) =>
                      selected.animation &&
                      patchSelected({
                        animation: {
                          ...selected.animation,
                          neonFlicker: Number(e.target.value),
                        },
                      })
                    }
                    style={ui.input}
                  />
                </label>
              )}
              <label style={ui.fieldLabel}>
                줄 레이아웃 (layout.perLine)
                <select
                  value={
                    selected.layout?.perLine === true
                      ? "true"
                      : selected.layout?.perLine === false
                        ? "false"
                        : "auto"
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "auto") {
                      const rest = { ...selected };
                      delete rest.layout;
                      updateItem(selected.id, rest);
                      return;
                    }
                    patchSelected({
                      layout: {
                        ...selected.layout,
                        perLine: v === "true",
                        lineGapFactor: selected.layout?.lineGapFactor ?? 0.12,
                        align: selected.layout?.align ?? "center",
                      },
                    });
                  }}
                  style={ui.input}
                >
                  <option value="auto">auto (lineBackground 있으면 줄별)</option>
                  <option value="true">true (줄마다 종이/배경)</option>
                  <option value="false">false (블록 하나)</option>
                </select>
              </label>
              {(selected.layout?.perLine ||
                selected.style.lineBackground) && (
                <label style={ui.fieldLabel}>
                  줄 간격 (layout.lineGapFactor)
                  <input
                    type="number"
                    step={0.02}
                    min={0}
                    max={1}
                    value={selected.layout?.lineGapFactor ?? 0.12}
                    onChange={(e) =>
                      patchSelected({
                        layout: {
                          ...selected.layout,
                          perLine: selected.layout?.perLine ?? true,
                          lineGapFactor: Number(e.target.value),
                          align: selected.layout?.align ?? "center",
                        },
                      })
                    }
                    style={ui.input}
                  />
                </label>
              )}
              {selected.animation?.id === "crawl" && (
                <>
                  <label style={ui.fieldLabel}>
                    틸트(°)
                    <input
                      type="number"
                      step={1}
                      value={
                        selected.animation?.tiltDeg ??
                        CRAWL_ANIMATION_DEFAULTS.tiltDeg
                      }
                      onChange={(e) =>
                        selected.animation &&
                        patchSelected({
                          animation: {
                            ...selected.animation,
                            tiltDeg: Number(e.target.value),
                          },
                        })
                      }
                      style={ui.input}
                    />
                  </label>
                  <label style={ui.fieldLabel}>
                    원근 (perspective)
                    <input
                      type="number"
                      step={0.0001}
                      value={
                        selected.animation?.perspective ??
                        CRAWL_ANIMATION_DEFAULTS.perspective
                      }
                      onChange={(e) =>
                        selected.animation &&
                        patchSelected({
                          animation: {
                            ...selected.animation,
                            perspective: Number(e.target.value),
                          },
                        })
                      }
                      style={ui.input}
                    />
                  </label>
                  <label style={ui.fieldLabel}>
                    시작 Y (×font)
                    <input
                      type="number"
                      step={0.5}
                      value={
                        selected.animation?.scrollStartFactor ??
                        CRAWL_ANIMATION_DEFAULTS.scrollStartFactor
                      }
                      onChange={(e) =>
                        selected.animation &&
                        patchSelected({
                          animation: {
                            ...selected.animation,
                            scrollStartFactor: Number(e.target.value),
                          },
                        })
                      }
                      style={ui.input}
                    />
                  </label>
                  <label style={ui.fieldLabel}>
                    끝 Y (×font)
                    <input
                      type="number"
                      step={0.5}
                      value={
                        selected.animation?.scrollEndFactor ??
                        CRAWL_ANIMATION_DEFAULTS.scrollEndFactor
                      }
                      onChange={(e) =>
                        selected.animation &&
                        patchSelected({
                          animation: {
                            ...selected.animation,
                            scrollEndFactor: Number(e.target.value),
                          },
                        })
                      }
                      style={ui.input}
                    />
                  </label>
                </>
              )}
                </>
              )}
              {selected.composition?.slots?.length ? (
                <div style={{ gridColumn: "1 / -1" }}>
                  <h3 style={ui.h3}>Composition 슬롯</h3>
                  <p style={ui.muted}>
                    {selected.composition.repeatSlots
                      ? "repeatSlots: 엔터(줄바꿈)마다 새 버블이 생기고, 아래 슬롯 스타일을 순서대로 순환합니다. (예: Chat Message = 파란 ↔ 회색)"
                      : "줄바꿈이 슬롯에 1:1로 매핑되고, 남는 줄은 마지막 슬롯에 합쳐집니다. 대시보드·앱이 같은 composition JSON을 그립니다."}
                  </p>
                  <label
                    style={{
                      ...ui.fieldLabel,
                      marginBottom: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexDirection: "row",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!selected.composition.repeatSlots}
                      onChange={(e) => {
                        const composition: TextComposition = {
                          ...selected.composition!,
                          repeatSlots: e.target.checked || undefined,
                        };
                        patchSelected({ composition });
                      }}
                    />
                    repeatSlots (줄마다 슬롯 스타일 순환)
                  </label>
                  {selected.composition.slots.map((slot, idx) => (
                    <label key={slot.id} style={{ ...ui.fieldLabel, marginBottom: 8 }}>
                      슬롯 {slot.id} ({slot.role ?? "body"})
                      {selected.composition!.repeatSlots
                        ? ` · ${idx + 1}/${selected.composition!.slots.length}번째 순환`
                        : ""}
                      <input
                        value={slot.defaultText}
                        onChange={(e) => {
                          const slots = selected.composition!.slots.map((s, i) =>
                            i === idx ? { ...s, defaultText: e.target.value } : s,
                          );
                          const composition: TextComposition = {
                            ...selected.composition!,
                            slots,
                          };
                          patchSelected({
                            composition,
                            sampleText: compositionSampleText(composition),
                          });
                        }}
                        style={ui.input}
                      />
                    </label>
                  ))}
                  <label style={{ ...ui.fieldLabel, marginTop: 8 }}>
                    composition JSON
                    <textarea
                      value={JSON.stringify(selected.composition, null, 2)}
                      onChange={(e) => {
                        try {
                          const composition = JSON.parse(e.target.value) as TextComposition;
                          if (!Array.isArray(composition.slots)) return;
                          patchSelected({
                            composition,
                            sampleText: compositionSampleText(composition),
                          });
                        } catch {
                          /* live typing */
                        }
                      }}
                      rows={14}
                      spellCheck={false}
                      style={{ ...ui.jsonArea, minHeight: 220, fontFamily: "ui-monospace, monospace" }}
                    />
                  </label>
                </div>
              ) : (
                <>
              <label style={{ ...ui.fieldLabel, gridColumn: "1 / -1" }}>
                샘플 본문 (sampleText)
                <textarea
                  value={
                    selected.sampleText ??
                    (view === "templates"
                      ? DEFAULT_TEMPLATE_SAMPLE_TEXT
                      : DEFAULT_EFFECT_SAMPLE_TEXT)
                  }
                  onChange={(e) =>
                    patchSelected({
                      sampleText: e.target.value || undefined,
                    })
                  }
                  rows={selected.animation?.id === "crawl" ? 8 : 3}
                  spellCheck={false}
                  style={{
                    ...ui.jsonArea,
                    minHeight: selected.animation?.id === "crawl" ? 140 : 72,
                  }}
                />
              </label>
              <p style={{ ...ui.sub, margin: 0, gridColumn: "1 / -1" }}>
                앱 텍스트/템플릿 패널 타일에 그대로 표시됩니다.
              </p>
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
    overflow: "hidden",
  },
  crawlStage: {
    height: 280,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    background: "#000",
    overflow: "hidden",
    perspective: "480px",
  },
};

/** Split sample into visual lines (keep empty trailing line if text ends with \\n). */
function sampleLines(text: string): string[] {
  return text.split("\n");
}

function argbHex(n: number | undefined, fallback = "#ffffff"): string {
  if (n == null) return fallback;
  const a = (n >>> 24) & 0xff;
  const r = (n >>> 16) & 0xff;
  const g = (n >>> 8) & 0xff;
  const b = n & 0xff;
  if (a < 255) {
    return `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`;
  }
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

/** CapCut-like composition preview (slots + decorations). */
function CompositionPreview({
  item,
  accent,
  progress,
}: {
  item: TextTemplatePackItem;
  accent: string;
  progress: number;
}) {
  const composition = item.composition!;
  const fontPx = 28;
  const gap = fontPx * (composition.gapFactor ?? 0.16);
  const align = composition.align ?? "center";
  const body =
    item.sampleText?.trim() || compositionSampleText(composition);
  const entries = compositionEntriesFor(composition, body);
  const frame = entranceFrame(
    item.animation?.id,
    Array.from(body),
    progress,
    fontPx,
    item.animation,
    compositionPaintedSlotCount(composition, body),
  );

  const leftBar = composition.decorations?.find((d) => d.kind === "bar_v" && d.attach === "left");
  const rightBar = composition.decorations?.find((d) => d.kind === "bar_v" && d.attach === "right");
  const chevron = composition.decorations?.find((d) => d.kind === "chevron_down");

  return (
    <div style={styles.previewStage}>
      <div
        style={{
          display: "inline-flex",
          flexDirection: "row",
          alignItems: "stretch",
          gap: fontPx * (leftBar?.gapFactor ?? 0.28),
          opacity: frame.layerOpacity,
          transform: `translateY(${frame.layerDy}px)`,
        }}
      >
        {leftBar && (
          <div
            style={{
              width: fontPx * (leftBar.thicknessFactor ?? 0.22),
              background: argbHex(leftBar.color, "#2dd4bf"),
              borderRadius: 2,
              alignSelf: "stretch",
              minHeight: 40,
            }}
          />
        )}
        <div
          style={{
            display: "inline-flex",
            flexDirection: "column",
            alignItems:
              align === "start" ? "flex-start" : align === "end" ? "flex-end" : "center",
            gap,
            position: "relative",
          }}
        >
          {chevron && (
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: `${fontPx * 0.35}px solid transparent`,
                borderRight: `${fontPx * 0.35}px solid transparent`,
                borderTop: `${fontPx * 0.4}px solid ${argbHex(chevron.color, "#b0b0b0")}`,
                marginBottom: fontPx * 0.05,
              }}
            />
          )}
          {entries.map(({ slot, text: slotText }, si) => {
            const fs = fontPx * (slot.fontSizeFactor ?? 1);
            const below = composition.decorations?.find(
              (d) =>
                d.slotId === slot.id &&
                (d.attach === "below" || !d.attach) &&
                (d.kind === "rule" || d.kind === "slash"),
            );
            const color = slot.fillColor != null ? argbHex(slot.fillColor) : accent;
            const slotOp = frame.slotOpacity?.[si] ?? 1;
            const slotDy = frame.slotDy?.[si] ?? 0;
            return (
              <div
                key={`${slot.id}-${si}`}
                style={{
                  marginLeft: (slot.dxFactor ?? 0) * fontPx,
                  textAlign: slot.align ?? align,
                  opacity: slotOp,
                  transform: `translateY(${slotDy}px)`,
                  // Keep layout height for staged slots that are still invisible.
                  visibility: "visible",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    fontSize: fs,
                    fontWeight: slot.fontWeight ?? 700,
                    fontStyle: slot.italic ? "italic" : "normal",
                    letterSpacing: `${(slot.letterSpacingEm ?? 0) * fs}px`,
                    color: slot.boxFillColor != null ? argbHex(slot.fillColor, "#111") : color,
                    lineHeight: 1.1,
                    whiteSpace: "pre",
                    padding:
                      slot.boxFillColor != null
                        ? `${fs * (slot.boxPadVFactor ?? 0.28)}px ${fs * (slot.boxPadHFactor ?? 0.35)}px`
                        : undefined,
                    background: slot.boxFillColor != null ? argbHex(slot.boxFillColor) : undefined,
                  }}
                >
                  {slotText || slot.defaultText}
                </span>
                {below && (
                  <div
                    style={{
                      marginTop: fs * (below.gapFactor ?? 0.15),
                      height: below.kind === "slash" ? 0 : Math.max(1, fs * (below.thicknessFactor ?? 0.04)),
                      width: `${(below.lengthFactor ?? 1) * 100}%`,
                      background: below.kind === "slash" ? "transparent" : argbHex(below.color),
                      borderTop:
                        below.kind === "slash"
                          ? `${Math.max(1, fs * (below.thicknessFactor ?? 0.04))}px solid ${argbHex(below.color)}`
                          : undefined,
                      transform: below.kind === "slash" ? "rotate(-8deg)" : undefined,
                      marginLeft: "auto",
                      marginRight: "auto",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
        {rightBar && (
          <div
            style={{
              width: fontPx * (rightBar.thicknessFactor ?? 0.2),
              background: argbHex(rightBar.color, "#ff8a00"),
              borderRadius: 2,
              alignSelf: "stretch",
              minHeight: 40,
              marginLeft: fontPx * (rightBar.gapFactor ?? 0.3),
            }}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Resolve catalog layout. Prefer explicit JSON; fall back so older items with
 * a lineBackground still get per-line strips (app legacy behaviour).
 */
function resolvePackLayout(
  item: TextTemplatePackItem,
  multiline: boolean,
): TextPackLayout {
  if (item.layout) return item.layout;
  if (multiline && item.style.lineBackground) {
    return { perLine: true, lineGapFactor: 0.12, align: "center" };
  }
  return { perLine: false, align: "center" };
}

/**
 * Text preview. For templates [progress] < 1 plays the app's entrance.
 *
 * Layout geometry comes from catalog `layout` (not animation.staggerBy).
 * Timing (Hello then World) comes from animation.staggerBy.
 * All line slots stay mounted from t=0 so the block never jumps — same as the
 * app's TextPainter which always shapes the full string.
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
  const isCrawl = item.animation?.id === "crawl";
  const fontPx = isCrawl ? 18 : 34;
  const text =
    item.sampleText?.trim() ||
    (item.kind === "template"
      ? DEFAULT_TEMPLATE_SAMPLE_TEXT
      : DEFAULT_EFFECT_SAMPLE_TEXT);
  const glyphs = Array.from(text);
  const css = previewCss(item.style, accent, fontPx);
  const frame = entranceFrame(
    item.animation?.id,
    glyphs,
    progress,
    fontPx,
    item.animation,
  );
  const crawlPerspectivePx = Math.round(
    1 / (item.animation?.perspective ?? CRAWL_ANIMATION_DEFAULTS.perspective),
  );
  const layerTransform = [
    `translate(${frame.layerDx ?? 0}px, ${frame.layerDy}px)`,
    `scale(${frame.layerScale ?? 1})`,
  ].join(" ");
  const layerFilter = [
    frame.layerBlur && frame.layerBlur > 0.5
      ? `blur(${frame.layerBlur}px)`
      : null,
    frame.rgbOffset && Math.abs(frame.rgbOffset) > 0.5
      ? `drop-shadow(${-frame.rgbOffset}px 0 0 rgba(255,0,80,0.55)) drop-shadow(${frame.rgbOffset}px 0 0 rgba(0,255,255,0.55))`
      : null,
    frame.glowPulse && frame.glowPulse !== 1
      ? `brightness(${frame.glowPulse})`
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  const multiline = text.includes("\n");
  const isTypewriter = item.animation?.id === "typewriter";
  const layout = resolvePackLayout(item, multiline);
  const alignItems =
    layout.align === "start"
      ? "flex-start"
      : layout.align === "end"
        ? "flex-end"
        : "center";
  const lineGap = fontPx * (layout.lineGapFactor ?? 0.12);

  if (isCrawl) {
    return (
      <div style={{ ...styles.crawlStage, perspective: `${crawlPerspectivePx}px` }}>
        <div
          style={{
            width: "72%",
            transformOrigin: "center top",
            transform: `rotateX(${frame.crawlTiltDeg ?? 54}deg) translateY(${frame.crawlScrollY ?? 0}px)`,
            textAlign: "center",
            whiteSpace: "pre-wrap",
          }}
        >
          <span style={{ ...css.text, fontSize: fontPx, lineHeight: 1.35 }}>{text}</span>
        </div>
      </div>
    );
  }

  // Catalog layout.perLine → one paper/glyph strip per line (Journal / Memo).
  // Always mount every line so height matches the finished frame from t=0.
  if (layout.perLine && multiline) {
    const lines = sampleLines(text);
    let glyphOffset = 0;
    // entranceFrame drops glyphOpacity at t=0 / t>=1; synthesize so layout
    // path stays stable for the whole preview loop.
    const allOpacity =
      frame.glyphOpacity ??
      glyphs.map(() => (progress >= 1 ? 1 : progress <= 0 ? 0 : 1));
    return (
      <div style={styles.previewStage}>
        <div
          style={{
            display: "inline-flex",
            flexDirection: "column",
            alignItems,
            gap: lineGap,
            opacity: frame.layerOpacity,
            transform: layerTransform,
            filter: layerFilter || undefined,
          }}
        >
          {lines.map((line, li) => {
            const lineGlyphs = Array.from(line);
            const start = glyphOffset;
            glyphOffset += lineGlyphs.length + (li < lines.length - 1 ? 1 : 0);
            const opacities = allOpacity.slice(start, start + lineGlyphs.length);
            const visibleCount = opacities.filter((o) => o > 0).length;
            const revealTypewriter = isTypewriter && progress < 1 && progress > 0;
            const hidden =
              !revealTypewriter || lineGlyphs.length === 0
                ? progress <= 0
                  ? 100
                  : 0
                : 100 - (visibleCount / lineGlyphs.length) * 100;
            const lineBox: CSSProperties = {
              ...css.box,
              display: "inline-block",
              whiteSpace: "pre",
              textAlign: layout.align ?? "center",
              ...(item.style.lineBackground && lineGlyphs.length > 0
                ? { clipPath: `inset(-20% ${hidden}% -20% -20%)` }
                : {}),
            };
            return (
              <span key={li} style={lineBox}>
                {css.brush && <TornPaper paint={css.brush} />}
                <span
                  style={{
                    ...css.text,
                    position: "relative",
                    zIndex: 1,
                    whiteSpace: "pre",
                  }}
                >
                  {lineGlyphs.map((g, i) => (
                    <span
                      key={i}
                      style={{
                        opacity: opacities[i] ?? (progress >= 1 ? 1 : 0),
                        visibility: "visible",
                      }}
                    >
                      {g === " " ? "\u00a0" : g}
                    </span>
                  ))}
                </span>
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  let box: CSSProperties = css.box;
  if (
    frame.glyphOpacity &&
    isTypewriter &&
    item.style.lineBackground
  ) {
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
          transform: layerTransform,
          filter: layerFilter || undefined,
          whiteSpace: "pre-wrap",
          textAlign: layout.align ?? "center",
        }}
      >
        {css.brush && <TornPaper paint={css.brush} />}
        <span
          style={{
            ...css.text,
            position: "relative",
            zIndex: 1,
            whiteSpace: "pre-wrap",
            textShadow:
              frame.glowPulse && frame.glowPulse > 1
                ? `0 0 ${fontPx * 0.35 * frame.glowPulse}px currentColor`
                : undefined,
          }}
        >
          {frame.glyphOpacity
            ? glyphs.map((g, i) =>
                g === "\n" ? (
                  <br key={i} />
                ) : (
                  <span key={i} style={{ opacity: frame.glyphOpacity![i] }}>
                    {g}
                  </span>
                ),
              )
            : text}
          {frame.cursorVisible ? (
            <span style={{ opacity: 1, marginLeft: 2 }}>|</span>
          ) : null}
        </span>
      </span>
    </div>
  );
}
