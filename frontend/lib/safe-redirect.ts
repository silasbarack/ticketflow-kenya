/**
 * Where to go after signing in. Only same-site paths are allowed, so a
 * crafted `?next=` link can never bounce someone to another website.
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return null;
  if (raw.startsWith('/login')) return null;
  return raw;
}

export function loginUrlFor(path: string) {
  return `/login?next=${encodeURIComponent(path)}`;
}
