/**
 * CapCut-like multi-slot text composition (server-driven).
 * App + dashboard render the same declarative graph — no per-id branches.
 */

export type TextCompAlign = "start" | "center" | "end";

export type TextCompSlot = {
  id: string;
  /** Placeholder / sample for this editable field. */
  defaultText: string;
  role?: "title" | "subtitle" | "caption" | "eyebrow" | "body";
  /** Relative to overlay fontSize. Default 1. */
  fontSizeFactor?: number;
  fontWeight?: number;
  italic?: boolean;
  letterSpacingEm?: number;
  fillColor?: number;
  preferredFontId?: string;
  align?: TextCompAlign;
  /** Horizontal nudge as × base fontSize (e.g. staggered lines). */
  dxFactor?: number;
  boxFillColor?: number;
  boxPadHFactor?: number;
  boxPadVFactor?: number;
  boxStrokeColor?: number;
  boxStrokeWidthFactor?: number;
};

export type TextCompDecorationKind =
  | "bar_v"
  | "bar_h"
  | "rule"
  | "slash"
  | "chevron_down";

export type TextCompDecoration = {
  id: string;
  kind: TextCompDecorationKind;
  color?: number;
  opacity?: number;
  /** Anchor to a slot, or the whole stack when omitted. */
  slotId?: string;
  attach?: "before" | "after" | "left" | "right" | "below" | "above";
  thicknessFactor?: number;
  lengthFactor?: number;
  gapFactor?: number;
  widthFactor?: number;
  heightFactor?: number;
};

export type TextComposition = {
  align?: TextCompAlign;
  gapFactor?: number;
  slots: TextCompSlot[];
  decorations?: TextCompDecoration[];
};

/** Join slot defaults for overlay.text / sampleText (newline-separated). */
export function compositionSampleText(composition: TextComposition): string {
  return composition.slots.map((s) => s.defaultText).join("\n");
}

/** Split overlay body back into slot strings (extra lines fold into last slot). */
export function splitTextToSlots(
  text: string,
  slotCount: number,
): string[] {
  if (slotCount <= 0) return [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  if (slotCount === 1) return [lines.join("\n")];
  const out: string[] = [];
  for (let i = 0; i < slotCount; i++) {
    if (i < slotCount - 1) {
      out.push(lines[i] ?? "");
    } else {
      out.push(lines.slice(i).join("\n"));
    }
  }
  return out;
}
