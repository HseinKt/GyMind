interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "react-router-dom" {
  import type React from "react";
  export function BrowserRouter(props: { children: React.ReactNode }): JSX.Element;
  export function Routes(props: { children: React.ReactNode }): JSX.Element;
  export function Route(props: { path?: string; element?: React.ReactElement; children?: React.ReactNode }): JSX.Element | null;
  export function Outlet(): JSX.Element;
  export function Navigate(props: { to: string; replace?: boolean; state?: unknown }): JSX.Element | null;
  export function Link(props: { to: string; children: React.ReactNode; className?: string }): JSX.Element;
  export function NavLink(props: { to: string; children: React.ReactNode | ((args: { isActive: boolean }) => React.ReactNode); className?: string | ((args: { isActive: boolean }) => string) }): JSX.Element;
  export function useNavigate(): (to: string, options?: { replace?: boolean; state?: unknown }) => void;
  export function useLocation(): { pathname: string; state?: unknown };
}

declare module "lucide-react" {
  import type { SVGProps } from "react";
  export type IconProps = SVGProps<SVGSVGElement> & { size?: number };
  export const Activity: (props: IconProps) => JSX.Element;
  export const AlertTriangle: (props: IconProps) => JSX.Element;
  export const BarChart3: (props: IconProps) => JSX.Element;
  export const Bell: (props: IconProps) => JSX.Element;
  export const Building2: (props: IconProps) => JSX.Element;
  export const CalendarDays: (props: IconProps) => JSX.Element;
  export const CreditCard: (props: IconProps) => JSX.Element;
  export const Download: (props: IconProps) => JSX.Element;
  export const Dumbbell: (props: IconProps) => JSX.Element;
  export const Eye: (props: IconProps) => JSX.Element;
  export const EyeOff: (props: IconProps) => JSX.Element;
  export const FileText: (props: IconProps) => JSX.Element;
  export const Home: (props: IconProps) => JSX.Element;
  export const ListChecks: (props: IconProps) => JSX.Element;
  export const LogOut: (props: IconProps) => JSX.Element;
  export const Search: (props: IconProps) => JSX.Element;
  export const Settings: (props: IconProps) => JSX.Element;
  export const Shield: (props: IconProps) => JSX.Element;
  export const UserPlus: (props: IconProps) => JSX.Element;
  export const Users: (props: IconProps) => JSX.Element;
  export const X: (props: IconProps) => JSX.Element;
}

declare module "react-hook-form" {
  export function useForm<T>(options?: { defaultValues?: Partial<T> }): {
    register: (name: keyof T, config?: { valueAsNumber?: boolean; required?: boolean | string }) => Record<string, unknown>;
    handleSubmit: (handler: (values: T) => void | Promise<void>) => (event: React.FormEvent<HTMLFormElement>) => void;
    formState: { errors: Record<string, { message?: string }> };
  };
}

declare module "recharts" {
  export function ResponsiveContainer(props: { children: React.ReactNode; width?: string | number; height?: string | number }): JSX.Element;
  export function BarChart(props: { children: React.ReactNode; data?: unknown[] }): JSX.Element;
  export function Bar(props: Record<string, unknown>): JSX.Element | null;
  export function Cell(props: Record<string, unknown>): JSX.Element | null;
  export function CartesianGrid(props: Record<string, unknown>): JSX.Element | null;
  export function Line(props: Record<string, unknown>): JSX.Element | null;
  export function LineChart(props: { children: React.ReactNode; data?: unknown[] }): JSX.Element;
  export function Pie(props: Record<string, unknown>): JSX.Element | null;
  export function PieChart(props: { children: React.ReactNode; data?: unknown[] }): JSX.Element;
  export function Tooltip(props: Record<string, unknown>): JSX.Element | null;
  export function XAxis(props: Record<string, unknown>): JSX.Element | null;
  export function YAxis(props: Record<string, unknown>): JSX.Element | null;
}
