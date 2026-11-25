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
  /**
   * When true (Chat Message etc.), each newline is its own bubble and styles
   * cycle through `slots`. When false, extra lines fold into the last slot.
   */
  repeatSlots?: boolean;
};

export type TextCompEntry = { slot: TextCompSlot; text: string };

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

/** Style + text rows actually painted (expands when `repeatSlots`). */
export function compositionEntriesFor(
  composition: TextComposition,
  text: string,
): TextCompEntry[] {
  const slots = composition.slots;
  if (!slots.length) return [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  if (composition.repeatSlots) {
    const rows = lines.length ? lines : [""];
    return rows.map((line, i) => ({
      slot: slots[i % slots.length]!,
      text: line,
    }));
  }
  const texts = splitTextToSlots(text, slots.length);
  return slots.map((slot, i) => ({ slot, text: texts[i] ?? "" }));
}

export function compositionPaintedSlotCount(
  composition: TextComposition,
  text: string,
): number {
  if (!composition.slots.length) return 0;
  if (!composition.repeatSlots) return composition.slots.length;
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  return Math.max(1, lines.length);
}
