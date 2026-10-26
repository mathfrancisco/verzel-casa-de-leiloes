// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { notifyOutbid, OutbidToast } from './OutbidToast';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('OutbidToast', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = undefined;
    container = undefined;
  });

  it('anuncia a superação recebida fora da sala do lote', () => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root!.render(<OutbidToast sessionKey="user-a" />));

    act(() => notifyOutbid({ lotId: 'lot-1', lotTitle: 'Obra teste', newPriceCents: 12_000 }));

    expect(container.textContent).toContain('Você foi superado em Obra teste.');

    act(() => root!.render(<OutbidToast sessionKey={null} />));

    expect(container.textContent).toBe('');
  });
});
