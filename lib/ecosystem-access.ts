/**
 * Gate de acceso del "Ecosistema digital Algoritmo T".
 *
 * Verifica, por CORREO, si un usuario tiene acceso a esta plataforma consultando
 * el endpoint central de Algoritmo T (/api/access/check). El acceso se administra
 * desde https://www.algoritmot.com/admin/users.
 *
 * Diseño seguro (opt-in):
 * - Si no está configurada ACCESS_API_KEY, el gate NO se aplica (allowed=true).
 *   Así nada cambia hasta que se configure explícitamente.
 * - Ante error de red / servicio caído: fail-open (se permite el acceso), salvo
 *   que ECOSYSTEM_ACCESS_STRICT='1', en cuyo caso se deniega.
 */
const PLATFORM = 'misproyectos'

export async function ecosystemAccessAllowed(
  email: string | null | undefined
): Promise<{ enforced: boolean; allowed: boolean; reason?: string }> {
  const key = process.env.ACCESS_API_KEY
  if (!key) return { enforced: false, allowed: true } // gate desactivado

  const normalized = String(email || '').trim().toLowerCase()
  if (!normalized) return { enforced: true, allowed: false, reason: 'no-email' }

  const base = (process.env.ECOSYSTEM_ACCESS_URL || 'https://www.algoritmot.com').replace(/\/+$/, '')
  const strict = process.env.ECOSYSTEM_ACCESS_STRICT === '1'

  try {
    const url = `${base}/api/access/check?platform=${PLATFORM}&email=${encodeURIComponent(normalized)}`
    const res = await fetch(url, {
      headers: { 'x-access-key': key, Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return { enforced: true, allowed: !strict, reason: `status-${res.status}` }
    const data = await res.json().catch(() => null)
    return { enforced: true, allowed: !!data?.granted, reason: data?.reason }
  } catch {
    return { enforced: true, allowed: !strict, reason: 'network-error' }
  }
}
