import { useState } from 'react';
import { applyTheme, currentTheme, storeTheme, type Theme } from '../lib/theme';

/** Alternador claro/escuro; o estado inicial reflete o que o script anti-flash já aplicou. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(currentTheme);
  const dark = theme === 'dark';

  const toggle = () => {
    const next: Theme = dark ? 'light' : 'dark';
    applyTheme(next);
    storeTheme(next);
    setTheme(next);
  };

  return (
    <button type="button" className="theme-toggle" aria-pressed={dark} onClick={toggle}>
      <span aria-hidden="true">{dark ? '☾' : '☀'}</span> Tema escuro
    </button>
  );
}
