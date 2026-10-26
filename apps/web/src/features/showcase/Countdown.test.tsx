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

import { Countdown } from './Countdown';

let root: Root;
let container: HTMLDivElement;

describe('Countdown', () => {
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    state.remaining = 0;
  });

  it('dispara novamente quando um novo target chega a zero', () => {
    const originalTargetElapsed = vi.fn();
    const sameTargetElapsed = vi.fn();
    const extendedTargetElapsed = vi.fn();
    const render = (target: string, onElapsed: () => void) =>
      act(() => {
        root.render(<Countdown label="Termina em" target={target} onElapsed={onElapsed} />);
      });

    render('2026-10-23T10:00:00Z', originalTargetElapsed);
    expect(originalTargetElapsed).toHaveBeenCalledTimes(1);

    render('2026-10-23T10:00:00Z', sameTargetElapsed);
    expect(sameTargetElapsed).not.toHaveBeenCalled();

    state.remaining = 1;
    render('2026-10-23T10:05:00Z', extendedTargetElapsed);
    state.remaining = 0;
    render('2026-10-23T10:05:00Z', extendedTargetElapsed);

    expect(extendedTargetElapsed).toHaveBeenCalledTimes(1);
  });
});
