import type { CSSProperties } from "react";
import type { TransitionLayerDto } from "@/lib/transitions";

export type LayerPose = {
  opacity: number;
  scale: number;
  translateX: number;
  translateY: number;
  rotation: number;
  blur: number;
  brightness: number;
  blurMode: string;
  /** 0 = full, 1 = fully wiped away. */
  wipe: number;
  /** Edge erased first: left | right | top | bottom. */
  wipeEdge: string;
};

export type LayerEvaluation = {
  a: LayerPose;
  b: LayerPose;
};

const identityPose = (): LayerPose => ({
  opacity: 1,
  scale: 1,
  translateX: 0,
  translateY: 0,
  rotation: 0,
  blur: 0,
  brightness: 0,
  blurMode: "",
  wipe: 0,
  wipeEdge: "left",
});

function ease(easing: string | undefined, t: number): number {
  const u = Math.min(1, Math.max(0, t));
  switch ((easing ?? "linear").toLowerCase()) {
    case "easein":
      return u * u;
    case "easeout":
      return 1 - (1 - u) * (1 - u);
    case "easeinout":
      return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    default:
      return u;
  }
}

function propertyIdentity(property: string): number {
  if (property === "opacity" || property === "scale") return 1;
  return 0;
}

function resolveEndpoint(
  authored: number,
  layer: TransitionLayerDto,
  parameters: Record<string, number>,
): number {
  const key = layer.param;
  if (!key) return authored;
  const amount = Math.min(1, Math.max(0, parameters[key] ?? 1));
  const id = propertyIdentity(layer.property);
  return id + (authored - id) * amount;
}

function applyProperty(
  pose: LayerPose,
  layer: TransitionLayerDto,
  value: number,
): LayerPose {
  switch (layer.property) {
    case "opacity":
      return { ...pose, opacity: Math.min(1, Math.max(0, value)) };
    case "scale":
      return { ...pose, scale: value };
    case "translateX":
      return { ...pose, translateX: value };
    case "translateY":
      return { ...pose, translateY: value };
    case "rotation":
      return { ...pose, rotation: value };
    case "blur":
      return {
        ...pose,
        blur: value,
        blurMode: (layer.mode ?? pose.blurMode).toLowerCase(),
      };
    case "brightness":
      return { ...pose, brightness: value };
    case "wipe":
      return {
        ...pose,
        wipe: Math.min(1, Math.max(0, value)),
        wipeEdge: (layer.mode ?? pose.wipeEdge || "left").toLowerCase(),
      };
    default:
      return pose;
  }
}

/** Mirrors Flutter `evaluateTransitionLayers` for dashboard preview. */
export function evaluateTransitionLayers(
  layers: TransitionLayerDto[],
  t: number,
  parameters: Record<string, number> = {},
): LayerEvaluation {
  const progress = Math.min(1, Math.max(0, t));
  let a = identityPose();
  let b = { ...identityPose(), opacity: 0 };

  const hasOpacity = layers.some((l) => l.property === "opacity");
  let aOpacitySet = false;
  let bOpacitySet = false;

  for (const layer of layers) {
    const windowStart = Math.min(1, Math.max(0, layer.start ?? 0));
    if (progress < windowStart) continue;

    const start = windowStart;
    const endRaw = layer.end ?? 1;
    const end = endRaw < start ? start : Math.min(1, Math.max(0, endRaw));
    const from = resolveEndpoint(layer.from, layer, parameters);
    const to = resolveEndpoint(layer.to, layer, parameters);
    let value: number;
    if (progress <= start) value = from;
    else if (progress >= end || end <= start) value = to;
    else {
      const local = (progress - start) / (end - start);
      value = from + (to - from) * ease(layer.easing, local);
    }

    const target = layer.target ?? "A";
    if (target === "A" || target === "both") {
      a = applyProperty(a, layer, value);
      if (layer.property === "opacity") aOpacitySet = true;
    }
    if (target === "B" || target === "both") {
      b = applyProperty(b, layer, value);
      if (layer.property === "opacity") bOpacitySet = true;
    }
  }

  if (!hasOpacity) {
    const solid = layers.some(
      (l) =>
        l.property === "translateX" ||
        l.property === "translateY" ||
        l.property === "rotation" ||
        l.property === "wipe",
    );
    if (solid) {
      a = { ...a, opacity: 1 };
      b = { ...b, opacity: 1 };
    } else {
      a = { ...a, opacity: 1 - progress };
      b = { ...b, opacity: progress };
    }
  } else if (aOpacitySet && !bOpacitySet) {
    b = {
      ...b,
      opacity: Math.min(1, Math.max(0, 1 - a.opacity)),
    };
  } else if (bOpacitySet && !aOpacitySet) {
    a = {
      ...a,
      opacity: Math.min(1, Math.max(0, 1 - b.opacity)),
    };
  }

  return { a, b };
}

function isActivelyTransformed(pose: LayerPose): boolean {
  return (
    Math.abs(pose.rotation) > 0.001 ||
    Math.abs(pose.scale - 1) > 0.01 ||
    Math.abs(pose.translateX) > 0.01 ||
    Math.abs(pose.translateY) > 0.01 ||
    pose.wipe > 0.001
  );
}

/**
 * Paint order from catalog: last layer with `target` `A` or `B` is on top
 * (`both` does not change order). Put the mover last. Identity layers on the
 * other clip document the backdrop without needing client inference.
 */
export function aShouldPaintOnTop(
  evalResult: LayerEvaluation,
  layers: TransitionLayerDto[] = [],
): boolean {
  if (layers.length > 0) {
    let top: "A" | "B" | null = null;
    for (const layer of layers) {
      const t = layer.target ?? "A";
      if (t === "A" || t === "B") top = t;
    }
    if (top == null) return false;
    return top === "A";
  }
  return (
    isActivelyTransformed(evalResult.a) && !isActivelyTransformed(evalResult.b)
  );
}

/** CSS inset for wipe: amount 0 = full, 1 = gone. Edge = side erased first. */
export function wipeClipPath(wipe: number, edge: string): string | undefined {
  const w = Math.min(1, Math.max(0, wipe));
  if (w <= 0.001) return undefined;
  const pct = `${(w * 100).toFixed(2)}%`;
  switch ((edge || "left").toLowerCase()) {
    case "right":
      return `inset(0 ${pct} 0 0)`;
    case "top":
      return `inset(${pct} 0 0 0)`;
    case "bottom":
      return `inset(0 0 ${pct} 0)`;
    case "left":
    default:
      return `inset(0 0 0 ${pct})`;
  }
}

export function poseToCss(pose: LayerPose): CSSProperties {
  const blur =
    pose.blurMode === "zoom"
      ? Math.abs(pose.blur) * 0.35
      : Math.abs(pose.blur);
  const zoomExtra =
    pose.blurMode === "zoom" ? 1 + Math.min(1, Math.abs(pose.blur) / 18) * 0.08 : 1;
  return {
    opacity: pose.opacity,
    transform: [
      `translate(${pose.translateX * 100}%, ${pose.translateY * 100}%)`,
      `rotate(${pose.rotation * 360}deg)`,
      `scale(${pose.scale * zoomExtra})`,
    ].join(" "),
    filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
    clipPath: wipeClipPath(pose.wipe, pose.wipeEdge),
  };
}
