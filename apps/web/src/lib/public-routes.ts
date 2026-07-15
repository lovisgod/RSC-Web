const PUBLIC_WEB_ROUTES = new Set(["/outlets", "/menu", "/cart"]);

export function isPublicWebRoute(pathname: string): boolean {
  return PUBLIC_WEB_ROUTES.has(pathname);
}
