// The site's icon set.
//
// These replace the emoji the site used to draw with (🌴 as the logo, 🏨🍽🌊🛍💼
// for categories, 🎉✅📧 on confirmation screens). Emoji are rendered by the
// operating system, so the same page looked different on every device and the
// logo was, in effect, not ours. These are drawn here: one stroke weight, one
// visual family, identical everywhere.
//
// All of them inherit `currentColor` and size from the `className` you pass, so
// they sit in text like a glyph and follow the surrounding colour.

type IconProps = { className?: string; title?: string };

function base(className?: string) {
  return className ?? "h-5 w-5";
}

// ── Brand ──────────────────────────────────────────────────────────────
// A palm on a small mound of sand. Drawn on a 24-grid, filled rather than
// stroked so it stays legible at favicon size.
export function PalmLogo({ className, title }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={base(className)}
      fill="none"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title && <title>{title}</title>}
      {/* trunk */}
      <path
        d="M12.4 21c-.5-3.6-.7-6.6-.4-9 .2-1.6.6-2.9 1.1-4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      {/* fronds */}
      <path
        d="M13.2 7.6c1.5-1.7 3.6-2.3 5.6-1.4M13.2 7.6c2.1-.5 4 .3 5.1 2.1M13.2 7.6c-2.2-.6-4.3.1-5.6 1.9M13.2 7.6C11.4 6.2 9.2 6 7.2 7.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      {/* coconut */}
      <circle cx="13.2" cy="7.6" r="1.15" fill="currentColor" />
      {/* sand */}
      <path
        d="M5 21h14"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Categories ─────────────────────────────────────────────────────────
export function HotelIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" aria-hidden>
      <path
        d="M4 21V5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5V21M16 21V11h2.5A1.5 1.5 0 0 1 20 12.5V21M3 21h18"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 8h1.5M11.5 8H13M7.5 12h1.5M11.5 12H13M7.5 16h1.5M11.5 16H13"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function FoodIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" aria-hidden>
      {/* fork */}
      <path
        d="M7 3v6a2 2 0 0 0 2 2v10M7 3v4M9.8 3v4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* knife */}
      <path
        d="M16.5 21v-7c-1.6 0-2.4-1-2.2-2.7.3-2.6 1.2-6 2.9-8.3.4-.5 1.1-.2 1.1.4V21"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function WaterIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" aria-hidden>
      <path
        d="M2.5 8.5c1.9 0 1.9 1.6 3.8 1.6s1.9-1.6 3.8-1.6 1.9 1.6 3.8 1.6 1.9-1.6 3.8-1.6 1.9 1.6 3.8 1.6M2.5 14c1.9 0 1.9 1.6 3.8 1.6S8.2 14 10.1 14s1.9 1.6 3.8 1.6S15.8 14 17.7 14s1.9 1.6 3.8 1.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 20h16"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function RetailIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" aria-hidden>
      <path
        d="M5.2 8h13.6l1 12.5a.5.5 0 0 1-.5.5H4.7a.5.5 0 0 1-.5-.5L5.2 8Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M8.8 10.5V6.8a3.2 3.2 0 0 1 6.4 0v3.7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BriefcaseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" aria-hidden>
      <rect
        x="3"
        y="7.5"
        width="18"
        height="12.5"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M9 7.5V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8v1.7M3 12.5h18"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Job categories, in the order they appear on the board. Anything unmapped
// falls back to the briefcase — the same rule the emoji version used.
export const CATEGORY_ICONS: Record<
  string,
  (props: IconProps) => React.ReactElement
> = {
  "Hospitality & Hotels": HotelIcon,
  "Food & Beverage": FoodIcon,
  "Water Sports & Tours": WaterIcon,
  "Retail & Shopping": RetailIcon,
  "General & Other": BriefcaseIcon,
};

export function CategoryIcon({
  category,
  className,
}: {
  category: string;
  className?: string;
}) {
  const Icon = CATEGORY_ICONS[category] ?? BriefcaseIcon;
  return <Icon className={className} />;
}

// ── Status / confirmation ──────────────────────────────────────────────
export function CheckCircleIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="m8.2 12.3 2.6 2.6 5-5.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MailIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" aria-hidden>
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="m4 7.5 7.1 5a1.6 1.6 0 0 0 1.8 0l7.1-5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SendIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" aria-hidden>
      <path
        d="M20.5 3.5 10.8 13.2M20.5 3.5l-6.3 17-3.4-7.3-7.3-3.4 17-6.3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PinIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" aria-hidden>
      <path
        d="M12 21s6.5-5.6 6.5-10.5a6.5 6.5 0 1 0-13 0C5.5 15.4 12 21 12 21Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10.3" r="2.4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function StarIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="currentColor" aria-hidden>
      <path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.6 9.7l5.8-.8L12 3.6Z" />
    </svg>
  );
}

export function FlameIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" aria-hidden>
      <path
        d="M12 3s5 4.2 5 8.7a5 5 0 0 1-10 0C7 9.5 8.4 7.7 9.5 6.6c.3 1.3.9 2.2 1.7 2.6.4-2.6.8-4.6.8-6.2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" aria-hidden>
      <circle cx="10.8" cy="10.8" r="6.3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="m15.5 15.5 4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DocumentIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" aria-hidden>
      <path
        d="M6 3.5h7.5L19 9v11.5H6V3.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M13.2 3.6V9H19M8.8 13h6M8.8 16.4h4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HandshakeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" aria-hidden>
      <path
        d="M2.5 9.5 6 7l3.4 1.6L12 7l2.6 1.6L18 7l3.5 2.5M2.5 9.5v5L6 17l2.2-2.1M2.5 9.5 6 12M21.5 9.5v5L18 17l-2.4-2.3M21.5 9.5 18 12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.2 14.9 12 18l3.6-3.3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
