import { useEffect, useState } from 'react';

// Contagens regressivas usam a hora do servidor, não a do navegador (que pode estar errada).

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function clockOffsetMs(serverTime: string, browserNowMs: number): number {
  return Date.parse(serverTime) - browserNowMs;
}

export function remainingMs(targetIso: string, offsetMs: number, browserNowMs: number): number {
  return Math.max(0, Date.parse(targetIso) - (browserNowMs + offsetMs));
}

const pad = (n: number) => String(n).padStart(2, '0');

export function formatCountdown(ms: number): string {
  if (ms >= DAY) return `${Math.floor(ms / DAY)}d ${pad(Math.floor((ms % DAY) / HOUR))}h`;
  const h = Math.floor(ms / HOUR);
  const m = Math.floor((ms % HOUR) / MINUTE);
  const s = Math.floor((ms % MINUTE) / SECOND);
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

let offsetMs = 0;

/** Atualiza o offset a cada resposta da API que traz `serverTime`. */
export function syncServerTime(serverTime: string): void {
  offsetMs = clockOffsetMs(serverTime, Date.now());
}

/** Tempo restante até `targetIso`, atualizado a cada segundo. */
export function useRemainingMs(targetIso: string): number {
  const [remaining, setRemaining] = useState(() => remainingMs(targetIso, offsetMs, Date.now()));
  useEffect(() => {
    const tick = () => setRemaining(remainingMs(targetIso, offsetMs, Date.now()));
    tick();
    const id = setInterval(tick, SECOND);
    return () => clearInterval(id);
  }, [targetIso]);
  return remaining;
}
