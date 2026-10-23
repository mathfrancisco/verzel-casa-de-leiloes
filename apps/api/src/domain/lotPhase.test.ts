import { describe, expect, it } from 'vitest';
import { lotPhase } from './lotPhase';

const startsAt = new Date('2026-10-24T18:00:00.000Z');
const endsAt = new Date('2026-10-24T19:00:00.000Z');
const at = (iso: string) => new Date(iso);

describe('lotPhase (RN-03, CT-03-05)', () => {
  it.each([
    ['2026-10-24T17:59:59.999Z', 'SCHEDULED'],
    ['2026-10-24T18:00:00.000Z', 'LIVE'],
    ['2026-10-24T18:59:59.999Z', 'LIVE'],
    ['2026-10-24T19:00:00.000Z', 'CLOSING'],
  ] as const)('lote ativo em %s → %s', (now, phase) => {
    expect(lotPhase({ state: 'ACTIVE', startsAt, endsAt }, at(now))).toBe(phase);
  });

  it.each([
    ['SETTLED', 'SETTLED'],
    ['CLOSED_NO_WINNER', 'UNSOLD'],
    ['CANCELLED', 'CANCELLED'],
  ] as const)('estado %s → fase %s independente do horário', (state, phase) => {
    expect(lotPhase({ state, startsAt, endsAt }, at('2026-10-24T18:30:00.000Z'))).toBe(phase);
  });
});
