// @vitest-environment happy-dom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as ServerClock from '../../lib/serverClock';

const state = vi.hoisted(() => ({ remaining: 0 }));

vi.mock('../../lib/serverClock', async (importOriginal) => {
  const actual = await importOriginal<typeof ServerClock>();
  return { ...actual, useRemainingMs: () => state.remaining };
});

import { CountdownBoxes } from './CountdownBoxes';

let root: Root;
let container: HTMLDivElement;

describe('CountdownBoxes', () => {
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it('com tudo zerado renderiza sem chaves duplicadas e sem dígito ativo', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    state.remaining = 0;
    act(() =>
      root.render(<CountdownBoxes caption="para encerrar" target="2026-10-23T10:00:00Z" />),
    );
    expect(errors).not.toHaveBeenCalled();
    expect(container.querySelectorAll('.digit')).toHaveLength(6);
    expect(container.querySelectorAll('.digit.on')).toHaveLength(0);
  });

  it('zeros à esquerda ficam cinza e os dígitos a partir do primeiro não zero ficam ativos', () => {
    state.remaining = (47 * 60 + 11) * 1000; // 00:47:11
    act(() =>
      root.render(<CountdownBoxes caption="para encerrar" target="2026-10-23T10:00:00Z" />),
    );
    const digits = [...container.querySelectorAll('.digit')].map((d) => [
      d.textContent,
      d.classList.contains('on'),
    ]);
    expect(digits).toEqual([
      ['0', false],
      ['0', false],
      ['4', true],
      ['7', true],
      ['1', true],
      ['1', true],
    ]);
    expect(container.querySelector('[role="timer"]')?.getAttribute('aria-label')).toBe(
      '00:47:11 para encerrar',
    );
  });
});
