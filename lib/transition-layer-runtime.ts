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
};

export type LayerEvaluation = {
  outgoing: LayerPose;
  incoming: LayerPose;
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
  let outgoing = identityPose();
  let incoming = { ...identityPose(), opacity: 0 };

  const hasOpacity = layers.some((l) => l.property === "opacity");
  let outgoingOpacitySet = false;
  let incomingOpacitySet = false;

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

    const target = layer.target ?? "outgoing";
    if (target === "outgoing" || target === "both") {
      outgoing = applyProperty(outgoing, layer, value);
      if (layer.property === "opacity") outgoingOpacitySet = true;
    }
    if (target === "incoming" || target === "both") {
      incoming = applyProperty(incoming, layer, value);
      if (layer.property === "opacity") incomingOpacitySet = true;
    }
  }

  if (!hasOpacity) {
    const spatial = layers.some(
      (l) =>
        l.property === "translateX" ||
        l.property === "translateY" ||
        l.property === "rotation",
    );
    if (spatial) {
      outgoing = { ...outgoing, opacity: 1 };
      incoming = { ...incoming, opacity: 1 };
    } else {
      outgoing = { ...outgoing, opacity: 1 - progress };
      incoming = { ...incoming, opacity: progress };
    }
  } else if (outgoingOpacitySet && !incomingOpacitySet) {
    incoming = {
      ...incoming,
      opacity: Math.min(1, Math.max(0, 1 - outgoing.opacity)),
    };
  } else if (incomingOpacitySet && !outgoingOpacitySet) {
    outgoing = {
      ...outgoing,
      opacity: Math.min(1, Math.max(0, 1 - incoming.opacity)),
    };
  }

  return { outgoing, incoming };
}

function isActivelyTransformed(pose: LayerPose): boolean {
  return (
    Math.abs(pose.rotation) > 0.001 ||
    Math.abs(pose.scale - 1) > 0.01 ||
    Math.abs(pose.translateX) > 0.01 ||
    Math.abs(pose.translateY) > 0.01
  );
}

function layerIsSpatial(layer: TransitionLayerDto): boolean {
  return (
    layer.property === "rotation" ||
    layer.property === "scale" ||
    layer.property === "translateX" ||
    layer.property === "translateY"
  );
}

function targetHasSpatialLayers(
  layers: TransitionLayerDto[],
  target: "outgoing" | "incoming",
): boolean {
  return layers.some((layer) => {
    if (!layerIsSpatial(layer)) return false;
    const t = layer.target ?? "outgoing";
    return t === target || t === "both";
  });
}

/**
 * Spin-out style: A transforms over a static full-frame B → paint A on top.
 * Mirrors Flutter `outgoingShouldPaintOnTop`.
 */
export function outgoingShouldPaintOnTop(
  evalResult: LayerEvaluation,
  layers: TransitionLayerDto[] = [],
): boolean {
  if (layers.length > 0) {
    return (
      targetHasSpatialLayers(layers, "outgoing") &&
      !targetHasSpatialLayers(layers, "incoming")
    );
  }
  return (
    isActivelyTransformed(evalResult.outgoing) &&
    !isActivelyTransformed(evalResult.incoming)
  );
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
  };
}
