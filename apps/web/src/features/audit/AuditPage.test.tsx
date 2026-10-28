// @vitest-environment happy-dom

import { hashGenesis, type AuditGenesis, type AuditReportResponse } from '@leilao/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { webcrypto } from 'node:crypto';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserAuditCrypto } from '@leilao/shared';
import { AuditPage } from './AuditPage';
import { apiFetch } from '../../lib/api';
import type * as ApiModule from '../../lib/api';

// Mantém ApiError real: messageFor (erro de rede) faz instanceof contra ele.
vi.mock('../../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof ApiModule>()),
  apiFetch: vi.fn(),
}));

const genesis = (lotId: string): AuditGenesis => ({
  lotId,
  externalId: '1001',
  imageSha256: 'a'.repeat(64),
  title: 'Lote de teste',
  description: 'Descrição',
  category: 'PAINTING',
  itemSnapshot: {
    externalId: '1001',
    title: 'Lote de teste',
    artist: null,
    date: null,
    medium: null,
    dimensions: null,
    origin: null,
    imageUrl: 'https://example.test/image',
    sourceUrl: 'https://example.test/item',
    suggestedCategory: 'PAINTING',
  },
  sellerPseudonym: 'VENDEDOR-01',
  startingPriceCents: 1_000,
  minIncrementCents: 100,
  startsAt: '2026-10-25T12:00:00.000Z',
  originalEndsAt: '2026-10-25T13:00:00.000Z',
});

async function reportFor(lotId: string, valid: boolean): Promise<AuditReportResponse> {
  const lotGenesis = genesis(lotId);
  const genesisHash = await hashGenesis(lotGenesis, new BrowserAuditCrypto(webcrypto.subtle));
  return {
    lot: {
      id: lotId,
      title: lotGenesis.title,
      state: 'SCHEDULED',
      genesis: lotGenesis,
      genesisHash: valid ? genesisHash : '0'.repeat(64),
      bidCount: 0,
      chainLength: 0,
      headHash: valid ? genesisHash : '0'.repeat(64),
    },
    entries: [],
    receipt: null,
    // The component must never use this server-side assessment as its result.
    verdict: { status: 'INTACT', checks: [] },
    publicKey: 'A'.repeat(43),
    serverTime: '2026-10-25T12:00:00.000Z',
  };
}

function MoveToLotB() {
  const navigate = useNavigate();
  return <button onClick={() => navigate('/auditoria/lot-b')}>Trocar lote</button>;
}

describe('AuditPage', () => {
  let root: Root;
  let container: HTMLDivElement;
  let queryClient: QueryClient;

  beforeEach(() => {
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: webcrypto });
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    queryClient.clear();
  });

  it('ignora o veredito da API e mostra o resultado da verificação BrowserAuditCrypto', async () => {
    vi.mocked(apiFetch).mockResolvedValue(await reportFor('lot-a', false));
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/auditoria/lot-a']}>
            <Routes>
              <Route path="/auditoria/:lotId" element={<AuditPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      );
    });

    await vi.waitFor(() => expect(container.textContent).toContain('Cadeia com inconsistências'));
    expect(container.textContent).not.toContain('Cadeia íntegra');
  });

  async function renderAudit() {
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/auditoria/lot-a']}>
            <Routes>
              <Route path="/auditoria/:lotId" element={<AuditPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      );
    });
  }

  const status = () => container.querySelector('[role="status"]')!;
  const copyButton = () =>
    [...container.querySelectorAll('button')].find((b) => b.textContent === 'Copiar hash')!;

  it('mostra resultado inconclusivo, sem quebrar a página, quando a chave pública é malformada', async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      ...(await reportFor('lot-a', true)),
      publicKey: '!!! chave inválida !!!',
    });
    await renderAudit();

    await vi.waitFor(() => expect(container.textContent).toContain('Verificação inconclusiva'));
    expect(container.textContent).not.toContain('Cadeia íntegra');
    expect(container.textContent).not.toContain('Cadeia com inconsistências');
    expect(container.textContent).toContain('Limites desta verificação');
  });

  it('mostra resultado inconclusivo, nunca íntegro, em erro de rede', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new TypeError('Failed to fetch'));
    await renderAudit();

    await vi.waitFor(() => expect(container.textContent).toContain('Verificação inconclusiva'));
    expect(container.textContent).not.toContain('Cadeia íntegra');
    expect(container.textContent).toContain('Limites desta verificação');
  });

  it('em cadeia íntegra mostra resumo, detalhes expansíveis e limites explícitos', async () => {
    vi.mocked(apiFetch).mockResolvedValue(await reportFor('lot-a', true));
    await renderAudit();

    await vi.waitFor(() => expect(container.textContent).toContain('✓ Cadeia íntegra'));
    expect(container.textContent).toContain('conferem com a chave pública enviada pelo servidor');
    expect(container.querySelector('details')).not.toBeNull();
    expect(container.textContent).toContain('não a identidade independente do servidor');
    expect(container.textContent).toContain('não é detectável');
    expect(container.textContent).toContain('controla o banco de dados e a chave privada');
    expect(container.querySelector('.audit-tampered')).toBeNull();
  });

  it('em cadeia inválida mostra a primeira verificação que falhou no resumo', async () => {
    vi.mocked(apiFetch).mockResolvedValue(await reportFor('lot-a', false));
    await renderAudit();

    await vi.waitFor(() => expect(container.textContent).toContain('Cadeia com inconsistências'));
    expect(container.textContent).toContain('Primeira verificação que falhou:');
    expect(container.textContent).not.toContain('Cadeia íntegra');
  });

  it('copia o hash final e anuncia o feedback em região role=status', async () => {
    const report = await reportFor('lot-a', true);
    vi.mocked(apiFetch).mockResolvedValue(report);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    await renderAudit();
    await vi.waitFor(() => expect(container.textContent).toContain('✓ Cadeia íntegra'));

    await act(async () => copyButton().click());

    expect(writeText).toHaveBeenCalledWith(report.lot.headHash);
    expect(status().textContent).toBe('Hash copiado.');
  });

  it('mantém o hash visível e mostra erro quando a cópia falha', async () => {
    const report = await reportFor('lot-a', true);
    vi.mocked(apiFetch).mockResolvedValue(report);
    const writeText = vi.fn().mockRejectedValue(new Error('negado'));
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    await renderAudit();
    await vi.waitFor(() => expect(container.textContent).toContain('✓ Cadeia íntegra'));

    await act(async () => copyButton().click());

    expect(status().textContent).toContain('Não foi possível copiar');
    expect(container.querySelector('.audit-key')!.textContent).toBe(report.lot.headHash);
  });

  it('não mostra o veredito local do lote anterior durante a troca de rota', async () => {
    const intact = await reportFor('lot-a', true);
    const altered = await reportFor('lot-b', false);
    vi.mocked(apiFetch).mockImplementation((url) =>
      Promise.resolve(url.endsWith('/lot-b/audit') ? altered : intact),
    );
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/auditoria/lot-a']}>
            <MoveToLotB />
            <Routes>
              <Route path="/auditoria/:lotId" element={<AuditPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      );
    });
    await vi.waitFor(() => expect(container.textContent).toContain('Cadeia íntegra'));

    queryClient.setQueryData(['audit', 'lot-b'], altered);
    act(() => container.querySelector('button')!.click());
    expect(container.textContent).toContain('Verificando a cadeia neste navegador');
    expect(container.textContent).not.toContain('Cadeia íntegra');
    await vi.waitFor(() => expect(container.textContent).toContain('Cadeia com inconsistências'));
  });
});
