// @vitest-environment happy-dom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SyncState } from '../../lib/syncState';
import { SyncStatus } from './SyncStatus';

describe('SyncStatus', () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const render = (state: SyncState) => act(() => root.render(<SyncStatus state={state} />));
  const region = () => container.querySelector('[role="status"]');

  it.each([
    ['synced', 'Conectado e sincronizado'],
    ['syncing', 'Conectado — sincronizando dados…'],
    [
      'reconnecting',
      'Sem conexão em tempo real — reconectando. Os dados podem estar desatualizados.',
    ],
  ] as const)('mostra o texto de %s em uma região de status educada', (state, text) => {
    render(state);
    expect(region()?.textContent?.replace(/^\S+\s/, '')).toBe(text);
    expect(region()?.getAttribute('aria-live')).toBe('polite');
  });

  it('conectado sem snapshot não é apresentado como sincronizado', () => {
    render('syncing');
    expect(region()?.textContent).not.toContain('Conectado e sincronizado');
  });

  it('mantém a mesma região de status entre estados (anuncia só a troca de texto)', () => {
    render('synced');
    const first = region();
    render('reconnecting');
    expect(region()).toBe(first);
    expect(container.querySelectorAll('[role="status"]')).toHaveLength(1);
  });
});
