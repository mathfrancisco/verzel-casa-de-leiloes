export type Theme = 'light' | 'dark';

/** Chave de localStorage; o mesmo valor está em public/theme-init.js. */
export const THEME_KEY = 'theme';

const isTheme = (value: unknown): value is Theme => value === 'light' || value === 'dark';

/** Escolha salva (se válida) vence; sem ela vale o tema do sistema. */
export function resolveTheme(stored: string | null, systemPrefersDark: boolean): Theme {
  if (isTheme(stored)) return stored;
  return systemPrefersDark ? 'dark' : 'light';
}

function readStored(): string | null {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
}

export function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* storage indisponível: o tema vale só nesta sessão */
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function currentTheme(): Theme {
  const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  return resolveTheme(readStored(), systemDark);
}
