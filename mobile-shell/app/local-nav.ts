// Capacitor's local static file server (serving mobile-shell/out from disk)
// needs the literal file path -- /agent.html, /login.html -- not the clean
// extensionless URLs Next.js's own server would normally resolve for you.
// "/" is the one exception most static servers do resolve to index.html
// automatically, so that one's left alone. Query strings are preserved.
export function toLocalPath(path: string): string {
  if (!path || path === "/") return path;
  if (/^https?:\/\//.test(path)) return path; // external, leave as-is
  const [base, query] = path.split("?");
  if (base.endsWith(".html")) return path;
  return query ? `${base}.html?${query}` : `${base}.html`;
}
