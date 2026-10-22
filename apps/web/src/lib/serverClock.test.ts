import { describe, expect, it } from 'vitest';
import { clockOffsetMs, formatCountdown, remainingMs } from './serverClock';

describe('relógio do servidor (CT-09-03)', () => {
  it('calcula o offset entre servidor e navegador', () => {
    const browserNow = Date.parse('2026-10-24T18:00:00.000Z');
    expect(clockOffsetMs('2026-10-24T18:05:00.000Z', browserNow)).toBe(5 * 60_000);
  });

  it('com o relógio do navegador 5 min atrasado, a contagem usa a hora do servidor', () => {
    const browserNow = Date.parse('2026-10-24T18:00:00.000Z');
    const offset = clockOffsetMs('2026-10-24T18:05:00.000Z', browserNow);
    // Lote termina às 18:10 (hora do servidor): faltam 5 min, não 10.
    expect(remainingMs('2026-10-24T18:10:00.000Z', offset, browserNow)).toBe(5 * 60_000);
  });

  it('não fica negativo depois do fim', () => {
    expect(remainingMs('2026-10-24T18:00:00.000Z', 0, Date.parse('2026-10-24T18:00:01.000Z'))).toBe(
      0,
    );
  });
});

describe('formatCountdown', () => {
  it.each([
    [0, '00:00:00'],
    [999, '00:00:00'],
    [1_000, '00:00:01'],
    [59 * 60_000 + 59_000, '00:59:59'],
    [23 * 3_600_000 + 59 * 60_000 + 59_000, '23:59:59'],
    [24 * 3_600_000, '1d 00h'],
    [3 * 86_400_000 + 5 * 3_600_000 + 10 * 60_000, '3d 05h'],
  ])('%i ms → %s', (ms, text) => {
    expect(formatCountdown(ms)).toBe(text);
  });
});
