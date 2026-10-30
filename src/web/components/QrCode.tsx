import qrcode from "qrcode-generator";
import { useMemo } from "react";

/** Blank modules around the code so scanners can find it. */
const QUIET_ZONE = 2;

/**
 * Square QR code drawn as one SVG path, so it stays sharp at any size. Black on white scans most reliably, whatever
 * the theme; it fits the narrowest of the popup width, the max size, and half the screen height (landscape phones).
 */
export function QrCode({ value, label }: { value: string; label: string }) {
  const { size, path } = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(value);
    qr.make();
    const count = qr.getModuleCount();
    let d = "";
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (qr.isDark(row, col)) d += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`;
      }
    }
    return { size: count + QUIET_ZONE * 2, path: d };
  }, [value]);

  return (
    <svg
      className="block aspect-square h-auto w-[min(100%,var(--layout-qr),100dvh-var(--layout-qr-reserve))] shrink-0 rounded-control border-thin border-ink bg-white text-black"
      viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} shapeRendering="crispEdges">
      <path d={path} fill="currentColor" />
    </svg>
  );
}
