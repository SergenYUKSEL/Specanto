import type { ReactNode } from 'react';

const paths = {
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="1" /><path d="M15 8V4H4v11h4" /></>,
  arrow: <path d="M4 12h15M13 6l6 6-6 6" />,
  arrowUpRight: <path d="M6 18 18 6M6 6h12v12" />,
  arrowLeft: <path d="M20 12H5m6-6-6 6 6 6" />,
  enter: <path d="M20 4v10H4m6-6-6 6 6 6" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" /></>,
  moon: <path d="M20.5 13.5A8.5 8.5 0 0 1 10.5 3 8.5 8.5 0 1 0 20.5 13.5Z" />,
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  upload: <path d="M12 16V3M7 8l5-5 5 5M4 16v5h16v-5" />,
  close: <path d="m5 5 14 14M19 5 5 19" />,
  asterisk: <path d="M12 2v20M2 12h20M5 5l14 14M5 19 19 5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  braces: <path d="M9 3H7a2 2 0 0 0-2 2v4a3 3 0 0 1-2 3 3 3 0 0 1 2 3v4a2 2 0 0 0 2 2h2M15 3h2a2 2 0 0 1 2 2v4a3 3 0 0 0 2 3 3 3 0 0 0-2 3v4a2 2 0 0 1-2 2h-2" />,
  ellipsis: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  command: <path d="M9 9V5a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v13a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V9Z" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]}</svg>;
}
