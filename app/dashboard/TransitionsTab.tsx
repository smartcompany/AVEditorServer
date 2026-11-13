"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type {
  TransitionCatalogDto,
  TransitionItemDto,
  TransitionLayerDto,
} from "@/lib/transitions";
import {
  evaluateTransitionLayers,
  aShouldPaintOnTop,
  evaluateGridCell,
  gridLayout,
  layerUsesCellPaint,
  poseToCss,
  rotationYFace,
  resolveNamedPreview,
  circleClipRadiusPct,
  rippleField,
  applyNoDip,
  easeInOutCubic,
  easeOutCubic,
} from "@/lib/transition-layer-runtime";

type Props = {
  initialCatalog: TransitionCatalogDto;
  secret: string;
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

function GridStage({
  t,
  layers,
  parameters,
}: {
  t: number;
  layers: TransitionLayerDto[];
  parameters: Record<string, number>;
}) {
  const layout = gridLayout(layers);
  const { columns, rows, gap } = layout;
  const cellLayers = layers.some((layer) => layer.grid)
    ? layers.filter((layer) => layer.grid)
    : layers.filter((layer) => layer.property === "rotationY");
  let flipFront: "A" | "B" = "A";
  let hasFlip = false;
  for (const layer of cellLayers) {
    if (layer.property !== "rotationY") continue;
    hasFlip = true;
    const target = layer.target ?? "A";
    if (target === "A" || target === "B") flipFront = target;
  }
  const tiles = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const index = row * columns + col;
      const evaluation = evaluateGridCell(layers, t, index, parameters);
      const turns =
        flipFront === "B" ? evaluation.b.rotationY : evaluation.a.rotationY;
      const face = rotationYFace(turns);
      const showB = hasFlip
        ? flipFront === "B"
          ? !face.showBack
          : face.showBack
        : aShouldPaintOnTop(evaluation, layers)
          ? false
          : true;
      const pose = showB ? evaluation.b : evaluation.a;
      const label = showB ? "B" : "A";
      const faceDeg = hasFlip ? (face.faceRadians * 180) / Math.PI : 0;
      tiles.push(
        <div
          key={index}
          style={{
            position: "absolute",
            left: `calc(${(col / columns) * 100}% + ${gap * 8}%)`,
            top: `calc(${(row / rows) * 100}% + ${gap * 8}%)`,
            width: `calc(${100 / columns}% - ${gap * 16}%)`,
            height: `calc(${100 / rows}% - ${gap * 16}%)`,
            transform: `perspective(520px) rotateY(${faceDeg}deg) rotate(${pose.rotation * 360}deg) scale(${pose.scale})`,
            opacity: pose.opacity,
            background:
              label === "B"
                ? "linear-gradient(135deg, #b45309 0%, #f59e0b 50%, #ea580c 100%)"
                : "linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 50%, #0369a1 100%)",
            display: "grid",
            placeItems: "center",
            fontWeight: 700,
            fontSize: 13,
            color: "#fff",
          }}
        >
          {label}
        </div>,
      );
    }
  }
  return (
    <div style={{ position: "absolute", inset: 0, background: "#000" }}>
      {tiles}
    </div>
  );
}

/** Paints the A / B demo frames (same gradients + letters as the CSS clips). */
function paintDemoFrame(w: number, h: number, label: "A" | "B"): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, w, h);
  const stops =
    label === "A" ? ["#1d4ed8", "#0ea5e9", "#0369a1"] : ["#b45309", "#f59e0b", "#ea580c"];
  g.addColorStop(0, stops[0]);
  g.addColorStop(0.5, stops[1]);
  g.addColorStop(1, stops[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // A grid makes the bend visible, like texture in real footage.
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  const step = Math.max(12, Math.round(Math.min(w, h) / 10));
  for (let x = step; x < w; x += step) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
    ctx.stroke();
  }
  for (let y = step; y < h; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
    ctx.stroke();
  }
  ctx.fillStyle = "#fff";
  ctx.font = `700 ${Math.round(h * 0.28)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, w / 2, h / 2);
  return ctx.getImageData(0, 0, w, h);
}

/**
 * Ripple preview drawn per pixel with the app's exact ripple field
 * ([rippleField]): B is revealed inside the growing front while three crests
 * bend both frames outward.
 */
function RippleStage({ wave, intensity }: { wave: number; intensity: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const framesRef = useRef<{ w: number; h: number; a: ImageData; b: ImageData } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    // Half resolution keeps the per-pixel loop cheap during playback.
    const w = Math.max(64, Math.round(rect.width / 2));
    const h = Math.max(36, Math.round(rect.height / 2));
    if (!framesRef.current || framesRef.current.w !== w || framesRef.current.h !== h) {
      framesRef.current = { w, h, a: paintDemoFrame(w, h, "A"), b: paintDemoFrame(w, h, "B") };
      canvas.width = w;
      canvas.height = h;
    }
    const { a, b } = framesRef.current;
    const ctx = canvas.getContext("2d")!;
    const out = ctx.createImageData(w, h);
    const t = Math.min(1, Math.max(0, wave));
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const f = rippleField(x + 0.5, y + 0.5, w, h, t, intensity);
        const sx = Math.min(w - 1, Math.max(0, Math.round(x - f.dx)));
        const sy = Math.min(h - 1, Math.max(0, Math.round(y - f.dy)));
        const si = (sy * w + sx) * 4;
        const oi = (y * w + x) * 4;
        const m = f.mix;
        out.data[oi] = a.data[si] * (1 - m) + b.data[si] * m;
        out.data[oi + 1] = a.data[si + 1] * (1 - m) + b.data[si + 1] * m;
        out.data[oi + 2] = a.data[si + 2] * (1 - m) + b.data[si + 2] * m;
        out.data[oi + 3] = 255;
      }
    }
    ctx.putImageData(out, 0, 0);
  }, [wave, intensity]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
}

/** Circle open: B grows from center. Circle close: A shrinks away over B. */
function CircleStage({ t, open }: { t: number; open: boolean }) {
  const progress = Math.min(1, Math.max(0, t));
  const radius = circleClipRadiusPct(open ? progress : 1 - progress);
  const clipped = open ? (
    <div
      style={{
        ...stylesClipB,
        clipPath: `circle(${radius}% at 50% 50%)`,
      }}
    >
      B
    </div>
  ) : (
    <div
      style={{
        ...stylesClipA,
        clipPath: `circle(${radius}% at 50% 50%)`,
        zIndex: 2,
      }}
    >
      A
    </div>
  );
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {open ? (
        <>
          <div style={stylesClipA}>A</div>
          {clipped}
        </>
      ) : (
        <>
          <div style={stylesClipB}>B</div>
          {clipped}
        </>
      )}
    </div>
  );
}

/** A splits L/R from center; B scales up through the opening. */
function DoorwayStage({
  t,
  incomingScaleFrom,
  incomingScaleTo,
}: {
  t: number;
  incomingScaleFrom: number;
  incomingScaleTo: number;
}) {
  const u = easeInOutCubic(t);
  const doorPct = 50 * (1 - u);
  const bScale =
    incomingScaleFrom +
    (incomingScaleTo - incomingScaleFrom) * easeOutCubic(u);
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div
        style={{
          ...stylesClipB,
          transform: `scale(${bScale})`,
        }}
      >
        B
      </div>
      {doorPct > 0.05 && (
        <>
          <div
            style={{
              ...stylesClipA,
              clipPath: `inset(0 ${100 - doorPct}% 0 0)`,
              zIndex: 2,
            }}
          >
            A
          </div>
          <div
            style={{
              ...stylesClipA,
              clipPath: `inset(0 0 0 ${100 - doorPct}%)`,
              zIndex: 2,
            }}
          >
            A
          </div>
        </>
      )}
    </div>
  );
}

/** Three vertical B strips enter in sequence (puzzle left / right). */
function PuzzleStage({ t, reverse }: { t: number; reverse: boolean }) {
  const progress = Math.min(1, Math.max(0, t));
  const columns = reverse ? [0, 1, 2] : [2, 1, 0];
  const strips = columns.map((col, phase) => {
    const local = Math.min(1, Math.max(0, (progress - phase / 3) * 3));
    if (local <= 0) return null;
    const eased = easeOutCubic(local);
    const sign = reverse ? 1 : -1;
    const dx = col === 1 ? 0 : sign * (1 - eased) * 100;
    const dy = col === 1 ? sign * (1 - eased) * 100 : 0;
    return (
      <div
        key={col}
        style={{
          position: "absolute",
          left: `${(col / 3) * 100}%`,
          top: 0,
          width: `${100 / 3}%`,
          height: "100%",
          overflow: "hidden",
          zIndex: 2,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${-col * 100}%`,
            width: "300%",
            display: "grid",
            placeItems: "center",
            fontWeight: 700,
            color: "#fff",
            background:
              "linear-gradient(135deg, #b45309 0%, #f59e0b 50%, #ea580c 100%)",
            transform: `translate(${dx}%, ${dy}%)`,
          }}
        >
          B
        </div>
      </div>
    );
  });
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div style={stylesClipA}>A</div>
      {strips}
    </div>
  );
}

const stylesClipA: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "grid",
  placeItems: "center",
  fontWeight: 700,
  color: "#fff",
  background: "linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 50%, #0369a1 100%)",
};

const stylesClipB: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "grid",
  placeItems: "center",
  fontWeight: 700,
  color: "#fff",
  background: "linear-gradient(135deg, #b45309 0%, #f59e0b 50%, #ea580c 100%)",
};

export default function TransitionsTab({ initialCatalog, secret }: Props) {
  const [catalog, setCatalog] = useState(initialCatalog);
  const [selectedId, setSelectedId] = useState(
    initialCatalog.items[0]?.id ?? "",
  );
  const [params, setParams] = useState<Record<string, number>>(() =>
    defaultParams(initialCatalog.items[0] ?? ({ parameters: {} } as TransitionItemDto)),
  );
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const raf = useRef<number | null>(null);
  const lastTs = useRef<number | null>(null);

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
    // Match the app: overlapping cross-fades never dip toward black.
    return applyNoDip(
      evaluateTransitionLayers(selected.layers ?? [], progress, params),
      selected.layers ?? [],
    );
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

  const patchSelected = (patch: Partial<TransitionItemDto>) => {
    if (!selected) return;
    setCatalog((prev) => {
      const items = prev.items.map((item) =>
        item.id === selected.id ? { ...item, ...patch } : item,
      );
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

  const duplicateSelected = () => {
    if (!selected) return;
    const base = `${selected.id}_copy`;
    let id = base;
    let n = 2;
    while (catalog.items.some((i) => i.id === id)) id = `${base}${n++}`;
    const copy: TransitionItemDto = {
      ...structuredClone(selected),
      id,
      title: `${selected.title} copy`,
      titles: selected.titles
        ? (Object.fromEntries(
            Object.entries(selected.titles).map(([k, v]) => [k, `${v} copy`]),
          ) as TransitionItemDto["titles"])
        : selected.titles,
    };
    setCatalog((prev) => {
      const items = [...prev.items, copy];
      const categories = prev.categories.map((cat, index) =>
        cat.items.some((i) => i.id === selected.id) ||
        (index === 0 && !prev.categories.some((c) => c.items.some((i) => i.id === selected.id)))
          ? { ...cat, items: [...cat.items, copy] }
          : cat,
      );
      return { ...prev, items, categories };
    });
    setSelectedId(id);
    setDirty(true);
  };

  const deleteSelected = () => {
    if (!selected) return;
    if (!window.confirm(`Delete "${itemTitle(selected)}" (${selected.id})?`)) return;
    setCatalog((prev) => {
      const items = prev.items.filter((i) => i.id !== selected.id);
      const categories = prev.categories.map((cat) => ({
        ...cat,
        items: cat.items.filter((i) => i.id !== selected.id),
      }));
      return { ...prev, items, categories };
    });
    setSelectedId(catalog.items.find((i) => i.id !== selected.id)?.id ?? "");
    setDirty(true);
  };

  const [jsonDraft, setJsonDraft] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  useEffect(() => {
    if (!selected) return;
    setJsonDraft(JSON.stringify(selected, null, 2));
    setJsonError(null);
  }, [selected]);

  const applyJson = () => {
    try {
      const parsed = JSON.parse(jsonDraft) as TransitionItemDto;
      if (!parsed.id || typeof parsed.id !== "string") throw new Error("id is required");
      if (parsed.id !== selected?.id && catalog.items.some((i) => i.id === parsed.id)) {
        throw new Error(`id "${parsed.id}" already exists`);
      }
      const oldId = selected?.id;
      setCatalog((prev) => {
        const items = prev.items.map((i) => (i.id === oldId ? parsed : i));
        const categories = prev.categories.map((cat) => ({
          ...cat,
          items: cat.items.map((i) => (i.id === oldId ? parsed : i)),
        }));
        return { ...prev, items, categories };
      });
      setSelectedId(parsed.id);
      setJsonError(null);
      setDirty(true);
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : String(error));
    }
  };

  const save = useCallback(async () => {
    if (!selected) return;
    setSaving(true);
    setStatus(null);
    try {
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

  const outCss = poseToCss(evaluation.a);
  const inCss = poseToCss(evaluation.b);
  const outBright = evaluation.a.brightness;
  const inBright = evaluation.b.brightness;
  // Match Flutter: spin-out paints A over static B; spin-in paints B over A.
  const aOnTop = aShouldPaintOnTop(evaluation, selected.layers ?? []);
  const cellPaint = layerUsesCellPaint(selected.layers ?? []);
  const rippleWave = Math.max(evaluation.a.ripple, evaluation.b.ripple);
  const ripplePaint = (selected.layers ?? []).some(
    (layer) => layer.property === "ripple",
  );
  const namedPreview = resolveNamedPreview(selected);

  const clipA = (
    <div
      style={{
        ...styles.clip,
        ...styles.clipA,
        ...outCss,
        zIndex: aOnTop ? 2 : 1,
      }}
    >
      <span>A</span>
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
      <span>B</span>
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
          <h1 style={styles.h1}>전환 효과</h1>
          <p style={styles.sub}>
            Catalog v{catalog.version} · Storage-backed ·{" "}
            {dirty ? "unsaved changes" : "in sync"}
          </p>
        </div>
        <div style={styles.headerActions}>
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
                    <span style={styles.listTitle}>
                      {itemTitle(item)}
                      {item.premium ? <span style={styles.proBadge}>PRO</span> : null}
                    </span>
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
              {ripplePaint ? (
                <RippleStage wave={rippleWave} intensity={params.intensity ?? 0.7} />
              ) : cellPaint ? (
                <GridStage
                  t={progress}
                  layers={selected.layers ?? []}
                  parameters={params}
                />
              ) : namedPreview?.kind === "circleopen" ||
                namedPreview?.kind === "circleclose" ? (
                <CircleStage
                  t={progress}
                  open={namedPreview.kind === "circleopen"}
                />
              ) : namedPreview?.kind === "doorway" ? (
                <DoorwayStage
                  t={progress}
                  incomingScaleFrom={namedPreview.incomingScaleFrom}
                  incomingScaleTo={namedPreview.incomingScaleTo}
                />
              ) : namedPreview?.kind === "puzzle" ? (
                <PuzzleStage t={progress} reverse={namedPreview.reverse} />
              ) : aOnTop ? (
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

            <div style={styles.block}>
              <h3 style={styles.h3}>Settings</h3>
              <label style={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={Boolean(selected.premium)}
                  onChange={(e) => patchSelected({ premium: e.target.checked })}
                />
                Pro 전용 (무료 사용자는 내보낼 때 구독·광고·효과 빼기 중 선택)
              </label>
              <div style={styles.fieldGrid}>
                {(["ko", "en", "ja", "zh"] as const).map((lang) => (
                  <label key={lang} style={styles.numLabel}>
                    title ({lang})
                    <input
                      value={selected.titles?.[lang] ?? (lang === "en" ? selected.title : "")}
                      onChange={(e) =>
                        patchSelected({
                          titles: { ...selected.titles, [lang]: e.target.value },
                          ...(lang === "en" ? { title: e.target.value } : {}),
                        })
                      }
                      style={styles.numInput}
                    />
                  </label>
                ))}
                <label style={styles.numLabel}>
                  default duration (ms)
                  <input
                    type="number"
                    value={selected.defaultDurationMs}
                    onChange={(e) =>
                      patchSelected({ defaultDurationMs: Number(e.target.value) })
                    }
                    style={styles.numInput}
                  />
                </label>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button type="button" onClick={duplicateSelected} style={styles.btnGhost}>
                  복제해서 새 효과 만들기
                </button>
                <button type="button" onClick={deleteSelected} style={styles.btnDanger}>
                  삭제
                </button>
              </div>
            </div>

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
                      → {layer.target ?? "A"}
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

            <div style={styles.block}>
              <h3 style={styles.h3}>JSON (고급 편집)</h3>
              <textarea
                value={jsonDraft}
                onChange={(e) => setJsonDraft(e.target.value)}
                spellCheck={false}
                style={styles.jsonArea}
              />
              {jsonError && <p style={{ ...styles.muted, color: "#ff8a8a" }}>{jsonError}</p>}
              <button type="button" onClick={applyJson} style={{ ...styles.btnGhost, marginTop: 8 }}>
                JSON 적용
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {},
  proBadge: {
    marginLeft: 6,
    fontSize: 10,
    fontWeight: 700,
    color: "#0b0d12",
    background: "#4cc9f0",
    borderRadius: 4,
    padding: "1px 5px",
  },
  checkRow: { display: "flex", gap: 8, alignItems: "center", fontSize: 13, marginBottom: 12 },
  fieldGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: 8,
  },
  btnDanger: {
    background: "transparent",
    color: "#ff8a8a",
    border: "1px solid #5a2a2a",
    borderRadius: 8,
    padding: "8px 14px",
    cursor: "pointer",
  },
  jsonArea: {
    width: "100%",
    minHeight: 260,
    background: "#0b0d12",
    border: "1px solid #2a3142",
    borderRadius: 8,
    color: "#d7dceb",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 12,
    padding: 10,
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
