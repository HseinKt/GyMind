import type { SVGProps } from "react";

function IconBase({ children, size = 24, className = "", ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>{children}</svg>;
}

export const Activity = (p: SVGProps<SVGSVGElement> & { size?: number }) => <IconBase {...p}><path d="M22 12h-4l-3 8-6-16-3 8H2" /></IconBase>;
export const AlertTriangle = (p: SVGProps<SVGSVGElement> & { size?: number }) => <IconBase {...p}><path d="M12 3 2 21h20L12 3Z" /><path d="M12 9v5" /><path d="M12 17h.01" /></IconBase>;
export const BarChart3 = (p: SVGProps<SVGSVGElement> & { size?: number }) => <IconBase {...p}><path d="M3 3v18h18" /><path d="M7 16V9" /><path d="M12 16V5" /><path d="M17 16v-3" /></IconBase>;
export const Bell = (p: SVGProps<SVGSVGElement> & { size?: number }) => <IconBase {...p}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></IconBase>;
export const Building2 = (p: SVGProps<SVGSVGElement> & { size?: number }) => <IconBase {...p}><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18" /><path d="M6 12H4a2 2 0 0 0-2 2v8" /><path d="M18 9h2a2 2 0 0 1 2 2v11" /><path d="M10 6h4M10 10h4M10 14h4" /></IconBase>;
export const CalendarDays = (p: SVGProps<SVGSVGElement> & { size?: number }) => <IconBase {...p}><path d="M8 2v4M16 2v4M3 10h18" /><rect x="3" y="4" width="18" height="18" rx="2" /></IconBase>;
export const CreditCard = (p: SVGProps<SVGSVGElement> & { size?: number }) => <IconBase {...p}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></IconBase>;
export const Download = (p: SVGProps<SVGSVGElement> & { size?: number }) => <IconBase {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></IconBase>;
export const Dumbbell = (p: SVGProps<SVGSVGElement> & { size?: number }) => <IconBase {...p}><path d="m6.5 6.5 11 11M21 21l-3.5-3.5M3 3l3.5 3.5M18 5l1 1M5 18l1 1M14 4l6 6M4 14l6 6" /></IconBase>;
export const Eye = (p: SVGProps<SVGSVGElement> & { size?: number }) => <IconBase {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></IconBase>;
export const EyeOff = (p: SVGProps<SVGSVGElement> & { size?: number }) => <IconBase {...p}><path d="M3 3l18 18" /><path d="M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-1.2" /><path d="M9.9 5.2A9.5 9.5 0 0 1 12 5c6.5 0 10 7 10 7a17.4 17.4 0 0 1-3 4.1" /><path d="M6.6 6.6C3.6 8.5 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 4.2-1" /></IconBase>;
export const FileText = (p: SVGProps<SVGSVGElement> & { size?: number }) => <IconBase {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h8M8 9h2" /></IconBase>;
export const Home = (p: SVGProps<SVGSVGElement> & { size?: number }) => <IconBase {...p}><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /></IconBase>;
export const ListChecks = (p: SVGProps<SVGSVGElement> & { size?: number }) => <IconBase {...p}><path d="m3 7 2 2 4-4M3 17l2 2 4-4M13 6h8M13 18h8" /></IconBase>;
export const LogOut = (p: SVGProps<SVGSVGElement> & { size?: number }) => <IconBase {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></IconBase>;
export const Search = (p: SVGProps<SVGSVGElement> & { size?: number }) => <IconBase {...p}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></IconBase>;
export const Settings = (p: SVGProps<SVGSVGElement> & { size?: number }) => <IconBase {...p}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" /></IconBase>;
export const Shield = (p: SVGProps<SVGSVGElement> & { size?: number }) => <IconBase {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></IconBase>;
export const UserPlus = (p: SVGProps<SVGSVGElement> & { size?: number }) => <IconBase {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></IconBase>;
export const Users = (p: SVGProps<SVGSVGElement> & { size?: number }) => <IconBase {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></IconBase>;
export const X = (p: SVGProps<SVGSVGElement> & { size?: number }) => <IconBase {...p}><path d="M18 6 6 18M6 6l12 12" /></IconBase>;
