import type { SVGProps } from "react";

/**
 * PHONE MODE用の線画アイコン。絵文字は環境によって赤や青が混ざるため使わず、
 * すべてcurrentColor（セージグリーン／チャコール）の線だけで統一する。
 */

function base({ className = "", ...props }: SVGProps<SVGSVGElement>) {
  return {
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
    className: `pointer-events-none ${className}`,
  };
}

export function IconOffline(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="4.5" y="1.5" width="7" height="13" rx="1.6" />
      <path d="M6.7 12h2.6" />
      <path d="M2.3 2.3l11.4 11.4" />
    </svg>
  );
}

export function IconConnect(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="2" y="3" width="12" height="7.4" rx="1.6" />
      <path d="M5.2 10.4v2.6l3-2.6" />
    </svg>
  );
}

export function IconCamera(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="1.8" y="5" width="12.4" height="8" rx="1.6" />
      <path d="M6 5l0.9-1.7h2.2L10 5" />
      <circle cx="8" cy="9" r="2.3" />
    </svg>
  );
}

export function IconMap(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M8 14.2s4.6-4.6 4.6-8A4.6 4.6 0 1 0 3.4 6.2c0 3.4 4.6 8 4.6 8z" />
      <circle cx="8" cy="6.1" r="1.5" />
    </svg>
  );
}

export function IconPerson(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="8" cy="5.3" r="2.6" />
      <path d="M2.8 14c0-3 2.3-5 5.2-5s5.2 2 5.2 5" />
    </svg>
  );
}
