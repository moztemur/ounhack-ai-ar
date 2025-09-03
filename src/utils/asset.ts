export function resolvePublicUrl(path: string): string {
  if (!path) return path
  const base = (import.meta as any).env?.BASE_URL || '/'
  const trimmed = path.startsWith('/') ? path.slice(1) : path
  return `${base}${trimmed}`
}


