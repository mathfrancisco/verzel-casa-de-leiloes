// @vitest-environment happy-dom

import { Suspense, act, lazy } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChunkErrorBoundary } from './ChunkErrorBoundary';

describe('ChunkErrorBoundary', () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it('mostra aviso acessível com botão de recarregar quando o chunk da rota falha', async () => {
    const Broken = lazy(() =>
      Promise.reject(new Error('Failed to fetch dynamically imported module')),
    );
    await act(async () => {
      root.render(
        <ChunkErrorBoundary>
          <Suspense fallback={<p>carregando</p>}>
            <Broken />
          </Suspense>
        </ChunkErrorBoundary>,
      );
    });

    const alert = container.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Nova versão disponível');
    const button = container.querySelector('button');
    expect(button?.textContent).toBe('Recarregar');
  });

  it('renderiza os filhos quando não há erro', async () => {
    await act(async () => {
      root.render(
        <ChunkErrorBoundary>
          <p>ok</p>
        </ChunkErrorBoundary>,
      );
    });
    expect(container.textContent).toBe('ok');
  });
});
