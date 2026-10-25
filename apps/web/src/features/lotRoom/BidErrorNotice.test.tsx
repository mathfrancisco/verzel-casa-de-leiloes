// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { ApiError } from '../../lib/api';
import { bidMessageFor } from '../../lib/errorMessages';
import { BidErrorNotice } from './BidErrorNotice';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('BidErrorNotice (CT-09-01)', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = undefined;
    container = undefined;
  });

  it.each([
    ['BELOW_MINIMUM', { minimumCents: 10_000 }],
    ['INSUFFICIENT_FUNDS', { availableCents: 1_000 }],
    ['ALREADY_WINNING', undefined],
    ['LOT_NOT_STARTED', { startsAt: '2026-10-25T14:30:00.000Z' }],
    ['LOT_CLOSED', undefined],
    ['LOT_CANCELLED', undefined],
    ['SELLER_CANNOT_BID', undefined],
    ['RATE_LIMITED', undefined],
    ['CATALOG_UNAVAILABLE', undefined],
  ] as const)('anuncia %s', (code, details) => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    const error = new ApiError(422, code, 'erro', details);
    act(() =>
      root!.render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <BidErrorNotice
            error={{ message: bidMessageFor(error), deposit: code === 'INSUFFICIENT_FUNDS' }}
          />
        </MemoryRouter>,
      ),
    );

    const notice = container.querySelector('[role="alert"]');
    expect(notice?.getAttribute('aria-live')).toBe('assertive');
    expect(notice?.textContent).toContain(bidMessageFor(error));
    if (code === 'INSUFFICIENT_FUNDS')
      expect(notice?.querySelector('a')?.getAttribute('href')).toBe('/carteira');
  });

  it('anuncia a mensagem genérica para uma falha sem código da API', () => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    const error = new Error('unexpected');
    act(() =>
      root!.render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <BidErrorNotice error={{ message: bidMessageFor(error), deposit: false }} />
        </MemoryRouter>,
      ),
    );

    const notice = container.querySelector('[role="alert"]');
    expect(notice?.getAttribute('aria-live')).toBe('assertive');
    expect(notice?.textContent).toContain('Algo deu errado. Tente novamente.');
  });
});
