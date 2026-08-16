import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

interface RouteDef {
  path?: string;
  element?: React.ReactElement;
  children: RouteDef[];
}

const OutletContext = createContext<React.ReactNode>(null);
const LocationContext = createContext<{ pathname: string; state?: unknown }>({ pathname: window.location.pathname });

export function BrowserRouter({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState({ pathname: window.location.pathname, state: history.state });
  useEffect(() => {
    const update = () => setLocation({ pathname: window.location.pathname, state: history.state });
    window.addEventListener("popstate", update);
    window.addEventListener("gymind:navigate", update);
    return () => {
      window.removeEventListener("popstate", update);
      window.removeEventListener("gymind:navigate", update);
    };
  }, []);
  return <LocationContext.Provider value={location}>{children}</LocationContext.Provider>;
}

export function Route(_: { path?: string; element?: React.ReactElement; children?: React.ReactNode }) {
  return null;
}

function toDefs(children: React.ReactNode): RouteDef[] {
  return React.Children.toArray(children)
    .filter(React.isValidElement)
    .map((child) => {
      const props = child.props as { path?: string; element?: React.ReactElement; children?: React.ReactNode };
      return { path: props.path, element: props.element, children: toDefs(props.children) };
    });
}

function flatten(defs: RouteDef[], wrappers: React.ReactElement[] = []): Array<{ path: string; elements: React.ReactElement[] }> {
  const out: Array<{ path: string; elements: React.ReactElement[] }> = [];
  for (const def of defs) {
    const next = def.element ? [...wrappers, def.element] : wrappers;
    if (def.path) out.push({ path: def.path, elements: next });
    out.push(...flatten(def.children, next));
  }
  return out;
}

function renderChain(elements: React.ReactElement[], index = 0): React.ReactNode {
  const element = elements[index];
  if (!element) return null;
  return <OutletContext.Provider value={renderChain(elements, index + 1)}>{element}</OutletContext.Provider>;
}

export function Routes({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const routes = useMemo(() => flatten(toDefs(children)), [children]);
  const exact = routes.find((route) => route.path === location.pathname);
  const dynamic = routes.find((route) => pathMatches(route.path, location.pathname));
  const wildcard = routes.find((route) => route.path === "*");
  const match = exact ?? dynamic ?? wildcard;
  return <>{match ? renderChain(match.elements) : null}</>;
}

function pathMatches(pattern: string, pathname: string) {
  if (pattern === "*" || !pattern.includes(":")) return false;
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = pathname.split("/").filter(Boolean);
  if (patternParts.length !== pathParts.length) return false;
  return patternParts.every((part, index) => part.startsWith(":") || part === pathParts[index]);
}

export function Outlet() {
  return <>{useContext(OutletContext)}</>;
}

export function useLocation() {
  return useContext(LocationContext);
}

export function useNavigate() {
  return (to: string, options?: { replace?: boolean; state?: unknown }) => {
    if (options?.replace) history.replaceState(options.state, "", to);
    else history.pushState(options?.state, "", to);
    window.dispatchEvent(new Event("gymind:navigate"));
  };
}

export function Navigate({ to, replace = false, state }: { to: string; replace?: boolean; state?: unknown }) {
  const navigate = useNavigate();
  useEffect(() => navigate(to, { replace, state }), [to, replace, state, navigate]);
  return null;
}

export function Link({ to, children, className }: { to: string; children: React.ReactNode; className?: string }) {
  const navigate = useNavigate();
  return <a href={to} className={className} onClick={(event) => { event.preventDefault(); navigate(to); }}>{children}</a>;
}

export function NavLink({ to, children, className }: { to: string; children: React.ReactNode | ((args: { isActive: boolean }) => React.ReactNode); className?: string | ((args: { isActive: boolean }) => string) }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = location.pathname === to;
  const cls = typeof className === "function" ? className({ isActive }) : className;
  return <a href={to} className={cls} onClick={(event) => { event.preventDefault(); navigate(to); }}>{typeof children === "function" ? children({ isActive }) : children}</a>;
}
