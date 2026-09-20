import type { SVGProps } from "react";
const paths = {
  home: "M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z",
  calendar: "M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM8 14h2m4 0h2m-8 4h2",
  orders: "M8 3h8v4H8zM8 5H5v16h14V5h-3M8 11h8m-8 4h8",
  box: "m3 7 9-4 9 4v10l-9 4-9-4Zm0 0 9 4 9-4M12 11v10M7 5l10 5",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8m6 10v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  truck: "M1 4h13v13H1zM14 9h4l4 4v4h-8M7 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm13 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z",
  chart: "M3 3v18h18M7 16v-5m5 5V7m5 9v-8",
  globe: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3a18 18 0 0 1 0 18 18 18 0 0 1 0-18Z",
  settings: "M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2",
  search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  plus: "M12 5v14M5 12h14", arrow: "M5 12h14m-5-5 5 5-5 5", down: "m6 9 6 6 6-6",
  menu: "M4 6h16M4 12h16M4 18h16", close: "m6 6 12 12M6 18 18 6",
  mail: "M3 5h18v14H3zM3 5l9 7 9-7", check: "m5 12 4 4L19 6",
  wallet: "M20 8V5H4a2 2 0 0 1 0-4h14v4M4 5a2 2 0 0 0-2 2v13h20V8H4m18 5h-6v4h6",
  exit: "M9 3H3v18h6m-1-9h13m-5-5 5 5-5 5",
  shield: "m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Zm-4 10 3 3 5-6",
  clock: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v5l3 2",
  sparkle: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z",
} as const;
export type IconName = keyof typeof paths;
export default function Icon({name,className="h-5 w-5",...props}:{name:IconName}&SVGProps<SVGSVGElement>){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" {...props}><path d={paths[name]}/></svg>}
