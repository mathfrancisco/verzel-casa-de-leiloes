// JSON canônico (ai/specs/SP-08-auditoria.md): mesma entrada → mesmos bytes, no servidor e no
// navegador. Chaves ordenadas, sem espaços, só inteiros seguros, `null` explícito.

export type CanonicalValue =
  | string
  | number
  | boolean
  | null
  | CanonicalValue[]
  | { [key: string]: CanonicalValue };

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new TypeError(`Só números inteiros seguros: ${value}`);
    return String(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value instanceof Date)
    throw new TypeError('Converta Date para string ISO antes de serializar');
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, item]) => {
        if (item === undefined) throw new TypeError(`Valor undefined em "${key}"; use null`);
        return `${JSON.stringify(key)}:${canonicalJson(item)}`;
      });
    return `{${entries.join(',')}}`;
  }
  throw new TypeError(`Tipo não suportado: ${typeof value}`);
}
