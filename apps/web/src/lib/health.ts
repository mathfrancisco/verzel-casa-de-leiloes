import type { HealthResponse } from '@leilao/shared';

type FetchFn = (url: string) => Promise<Response>;

export async function fetchHealth(fetchFn: FetchFn = (url) => fetch(url)): Promise<HealthResponse> {
  const res = await fetchFn('/api/health');
  if (!res.ok) throw new Error(`API respondeu ${res.status}`);

  const body = (await res.json()) as Partial<HealthResponse>;
  if (body.status !== 'ok' || typeof body.serverTime !== 'string') {
    throw new Error('Resposta inesperada da API');
  }
  return { status: body.status, serverTime: body.serverTime };
}
