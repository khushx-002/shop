/**
 * Line icons drawn to match the XStore theme icons used on the old site.
 * Usage: <Icon name="cart" size={20} />   (decorative by default; pass `label` to make it readable)
 */
import type { SVGProps } from "react";

export type IconName =
  | "cart"
  | "cart-plus"
  | "user"
  | "search"
  | "heart"
  | "heart-filled"
  | "compare"
  | "close"
  | "menu"
  | "chevron-down"
  | "chevron-up"
  | "chevron-left"
  | "chevron-right"
  | "plus"
  | "minus"
  | "star"
  | "truck"
  | "shield"
  | "support"
  | "leaf"
  | "family"
  | "phone"
  | "mail"
  | "map-pin"
  | "check"
  | "check-circle"
  | "trash"
  | "eye"
  | "arrow-up"
  | "arrow-left"
  | "grid"
  | "list"
  | "filter"
  | "home"
  | "play"
  | "lock"
  | "gift"
  | "tag"
  | "info"
  | "facebook"
  | "twitter"
  | "instagram"
  | "pinterest"
  | "linkedin"
  | "youtube";

const PATHS: Record<IconName, React.ReactNode> = {
  cart: (
    <>
      <path d="M3 4h2.2l2.1 10.2a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 1.9-1.5L21.4 7H6.2" />
      <circle cx="10" cy="19.5" r="1.4" />
      <circle cx="17.5" cy="19.5" r="1.4" />
    </>
  ),
  "cart-plus": (
    <>
      <path d="M3 4h2.2l2.1 10.2a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 1.9-1.5L21.4 7H6.2" />
      <circle cx="10" cy="19.5" r="1.4" />
      <circle cx="17.5" cy="19.5" r="1.4" />
      <path d="M13.5 8.5v4M11.5 10.5h4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c1.2-3.8 4.2-5.8 7.5-5.8s6.3 2 7.5 5.8" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </>
  ),
  heart: <path d="M12 20.3s-7.5-4.6-9.2-9.4C1.6 7.4 3.9 4.3 7.2 4.3c2 0 3.4 1.1 4.8 2.9 1.4-1.8 2.8-2.9 4.8-2.9 3.3 0 5.6 3.1 4.4 6.6-1.7 4.8-9.2 9.4-9.2 9.4Z" />,
  "heart-filled": <path fill="currentColor" d="M12 20.3s-7.5-4.6-9.2-9.4C1.6 7.4 3.9 4.3 7.2 4.3c2 0 3.4 1.1 4.8 2.9 1.4-1.8 2.8-2.9 4.8-2.9 3.3 0 5.6 3.1 4.4 6.6-1.7 4.8-9.2 9.4-9.2 9.4Z" />,
  compare: <path d="M7 4 3.5 7.5 7 11M3.5 7.5H17M17 13l3.5 3.5L17 20M20.5 16.5H7" />,
  close: <path d="M5 5l14 14M19 5 5 19" />,
  menu: <path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" />,
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  "chevron-up": <path d="m6 15 6-6 6 6" />,
  "chevron-left": <path d="m15 6-6 6 6 6" />,
  "chevron-right": <path d="m9 6 6 6-6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  star: <path fill="currentColor" stroke="none" d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.1l-5.7 3.2 1.2-6.4-4.7-4.4 6.4-.8Z" />,
  truck: (
    <>
      <path d="M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3.2v2.8h-7" />
      <circle cx="6.5" cy="17.5" r="1.8" />
      <circle cx="17" cy="17.5" r="1.8" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 4.5 6v5.5c0 4.6 3.2 8 7.5 9.5 4.3-1.5 7.5-4.9 7.5-9.5V6Z" />
      <path d="m8.8 12 2.2 2.2 4.4-4.4" />
    </>
  ),
  support: (
    <>
      <path d="M4.5 13.5v-2a7.5 7.5 0 0 1 15 0v2" />
      <path d="M4.5 13h2.5v5H5a1.5 1.5 0 0 1-1.5-1.5V14.5A1.5 1.5 0 0 1 4.5 13ZM19.5 13H17v5h2a1.5 1.5 0 0 0 1.5-1.5V14.5a1.5 1.5 0 0 0-1-1.5ZM17 18c0 1.7-1.6 2.5-4 2.5" />
    </>
  ),
  leaf: (
    <>
      <path d="M5 19c0-8 5.5-13.5 15-14-0.3 9.5-5.8 15-14 15" />
      <path d="M5 19c3-4.5 6-7.5 10-10" />
    </>
  ),
  family: (
    <>
      <circle cx="8" cy="7" r="2.5" />
      <circle cx="16" cy="7" r="2.5" />
      <circle cx="12" cy="13" r="2" />
      <path d="M3.5 19c.6-3.4 2.3-5.5 4.5-5.5M20.5 19c-.6-3.4-2.3-5.5-4.5-5.5M8.5 20.5c.5-2 1.8-3.3 3.5-3.3s3 1.3 3.5 3.3" />
    </>
  ),
  phone: <path d="M6.6 3.5h2.6l1.4 4.1-2 1.6a12 12 0 0 0 6.2 6.2l1.6-2 4.1 1.4v2.6a2 2 0 0 1-2.2 2C10.2 18.9 5.1 13.8 4.6 5.7a2 2 0 0 1 2-2.2Z" />,
  mail: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="1.5" />
      <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
    </>
  ),
  "map-pin": (
    <>
      <path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.8" r="2.3" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  "check-circle": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.3 2.8 2.8L16.3 9.6" />
    </>
  ),
  trash: <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 10.5v6M14 10.5v6" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  "arrow-up": <path d="M12 19V5M6 11l6-6 6 6" />,
  "arrow-left": <path d="M19 12H5M11 6l-6 6 6 6" />,
  grid: (
    <>
      <circle cx="6" cy="6" r="1.6" />
      <circle cx="12" cy="6" r="1.6" />
      <circle cx="18" cy="6" r="1.6" />
      <circle cx="6" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="18" cy="12" r="1.6" />
      <circle cx="6" cy="18" r="1.6" />
      <circle cx="12" cy="18" r="1.6" />
      <circle cx="18" cy="18" r="1.6" />
    </>
  ),
  list: (
    <>
      <path d="M9.5 6h11M9.5 12h11M9.5 18h11" />
      <rect x="3.5" y="4.5" width="3" height="3" />
      <rect x="3.5" y="10.5" width="3" height="3" />
      <rect x="3.5" y="16.5" width="3" height="3" />
    </>
  ),
  filter: <path d="M3.5 5h17l-6.5 7.5v6l-4 2v-8Z" />,
  home: <path d="M3.5 11 12 3.5l8.5 7.5M5.5 9.5V20h5v-5.5h3V20h5V9.5" />,
  play: <path fill="currentColor" stroke="none" d="M8 5.5v13l10.5-6.5Z" />,
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="1.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </>
  ),
  gift: (
    <>
      <rect x="3.5" y="8" width="17" height="4" />
      <path d="M5 12v8.5h14V12M12 8v12.5M12 8S10.5 3.5 8 4.5 9 8 12 8Zm0 0s1.5-4.5 4-3.5S15 8 12 8Z" />
    </>
  ),
  tag: (
    <>
      <path d="M3.5 12.5V4h8.5l8.5 8.5-8 8Z" />
      <circle cx="8" cy="8.5" r="1.4" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.5v.5" />
    </>
  ),
  facebook: <path fill="currentColor" stroke="none" d="M13.5 21v-7.5H16l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H8v3h2.5V21Z" />,
  twitter: <path fill="currentColor" stroke="none" d="M17.8 3.5h3l-6.6 7.6 7.8 10.4h-6.1l-4.8-6.3-5.5 6.3h-3l7.1-8.1L2.2 3.5h6.3l4.3 5.7Zm-1 16.2h1.7L7.4 5.2H5.6Z" />,
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" />
    </>
  ),
  pinterest: <path fill="currentColor" stroke="none" d="M12 2.5a9.5 9.5 0 0 0-3.5 18.3c-.1-.8-.2-2 0-2.8l1.2-5.2s-.3-.6-.3-1.5c0-1.4.8-2.5 1.9-2.5.9 0 1.3.7 1.3 1.5 0 .9-.6 2.2-.9 3.4-.2 1 .5 1.9 1.6 1.9 1.9 0 3.3-2 3.3-4.9 0-2.5-1.8-4.3-4.4-4.3-3 0-4.8 2.3-4.8 4.6 0 .9.4 1.9.8 2.4.1.1.1.2.1.3l-.3 1.2c0 .2-.2.2-.4.1-1.4-.6-2.2-2.6-2.2-4.2 0-3.4 2.5-6.6 7.2-6.6 3.8 0 6.7 2.7 6.7 6.3 0 3.7-2.4 6.8-5.6 6.8-1.1 0-2.2-.6-2.5-1.3l-.7 2.6c-.2 1-.9 2.2-1.4 2.9A9.5 9.5 0 1 0 12 2.5Z" />,
  linkedin: <path fill="currentColor" stroke="none" d="M4.5 9h3.2v11H4.5Zm1.6-5.3a1.8 1.8 0 1 1 0 3.7 1.8 1.8 0 0 1 0-3.7ZM9.7 9h3v1.5c.4-.8 1.5-1.8 3.2-1.8 3.4 0 4 2.2 4 5.1V20h-3.2v-5.5c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9V20H9.7Z" />,
  youtube: <path fill="currentColor" stroke="none" d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15V9l5.2 3Z" />,
};

type IconProps = Omit<SVGProps<SVGSVGElement>, "name"> & { name: IconName; size?: number; label?: string; strokeWidth?: number };

export function Icon({ name, size = 20, label, strokeWidth = 1.6, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
