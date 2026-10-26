// @vitest-environment happy-dom

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyTheme, currentTheme, resolveTheme, storeTheme, THEME_KEY } from './theme';

const initScript = readFileSync(resolve(process.cwd(), 'public/theme-init.js'), 'utf8');

function mockSystem(dark: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: dark })),
  );
}

function blockStorage() {
  const fail = () => {
    throw new Error('bloqueado');
  };
  vi.stubGlobal('localStorage', { getItem: fail, setItem: fail });
}

function runInitScript() {
  new Function(initScript)();
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = '';
  mockSystem(false);
});
afterEach(() => vi.unstubAllGlobals());

describe('resolveTheme', () => {
  it('usa a escolha salva quando válida', () => {
    expect(resolveTheme('dark', false)).toBe('dark');
    expect(resolveTheme('light', true)).toBe('light');
  });
  it('cai no tema do sistema sem escolha ou com valor inválido', () => {
    expect(resolveTheme(null, true)).toBe('dark');
    expect(resolveTheme('azul', false)).toBe('light');
  });
});

describe('persistência', () => {
  it('applyTheme alterna a classe dark em <html>', () => {
    applyTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    applyTheme('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
  it('storeTheme grava e currentTheme lê de volta', () => {
    storeTheme('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
    expect(currentTheme()).toBe('dark');
  });
  it('não quebra quando localStorage lança (modo privado)', () => {
    blockStorage();
    mockSystem(true);
    expect(() => storeTheme('light')).not.toThrow();
    expect(currentTheme()).toBe('dark');
  });
});

describe('script anti-flash (public/theme-init.js)', () => {
  it('aplica dark antes da hidratação quando a escolha salva é dark', () => {
    localStorage.setItem(THEME_KEY, 'dark');
    runInitScript();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
  it('respeita light salvo mesmo com sistema escuro', () => {
    localStorage.setItem(THEME_KEY, 'light');
    mockSystem(true);
    runInitScript();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
  it('segue o sistema sem escolha salva', () => {
    mockSystem(true);
    runInitScript();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
  it('não lança com localStorage bloqueado', () => {
    blockStorage();
    mockSystem(true);
    expect(runInitScript).not.toThrow();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
