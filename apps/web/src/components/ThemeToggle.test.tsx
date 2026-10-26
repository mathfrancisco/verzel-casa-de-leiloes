// @vitest-environment happy-dom

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ThemeToggle } from './ThemeToggle';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = '';
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false })),
  );
});
afterEach(() => vi.unstubAllGlobals());

it('CT-09-05: alterna, persiste e mantém o tema ao remontar (recarregar)', () => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(<ThemeToggle />));
  const button = host.querySelector('button')!;
  expect(button.getAttribute('aria-pressed')).toBe('false');

  act(() => button.click());
  expect(document.documentElement.classList.contains('dark')).toBe(true);
  expect(localStorage.getItem('theme')).toBe('dark');
  expect(button.getAttribute('aria-pressed')).toBe('true');

  act(() => root.unmount());
  document.documentElement.className = '';
  const root2 = createRoot(host);
  act(() => root2.render(<ThemeToggle />));
  expect(host.querySelector('button')!.getAttribute('aria-pressed')).toBe('true');
  act(() => root2.unmount());
});
