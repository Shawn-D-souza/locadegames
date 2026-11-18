import type { NavLink } from "../types";

/** One group of the footer's links, under its small label. */
export function FooterLinks({ label, links }: { label: string; links: readonly NavLink[] }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-caption tracking-caption text-section-label uppercase">{label}</h2>
      <ul className="flex flex-wrap gap-x-4 gap-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <a href={link.href} className="text-caption font-medium tracking-caption underline">
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
