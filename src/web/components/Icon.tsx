import { ArrowLeft, Check, Copy, Crown, Frown, Pencil, QrCode, Settings, Share2, Trophy, X, type LucideIcon } from "lucide-react";

/** App icon names mapped to Lucide icons, so screens never import the library directly. */
const ICONS = {
  back: ArrowLeft,
  close: X,
  copy: Copy,
  share: Share2,
  crown: Crown,
  check: Check,
  trophy: Trophy,
  edit: Pencil,
  settings: Settings,
  qr: QrCode,
  sad: Frown,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

/** Matches the 2px outlines used across the UI (DESIGN.md §4). */
const STROKE_WIDTH = 2;

export function Icon({ name, className }: { name: IconName; className?: string }) {
  const Glyph = ICONS[name];
  return <Glyph className={className} strokeWidth={STROKE_WIDTH} aria-hidden="true" />;
}
