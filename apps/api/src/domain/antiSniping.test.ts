import { describe, expect, it } from 'vitest';
import { antiSniping } from './antiSniping';

describe('antiSniping (RN-09)', () => {
  const now = new Date('2026-10-23T18:00:00.000Z');

  it('não estende a mais de dois minutos do encerramento (CT-05-06)', () => {
    expect(antiSniping(new Date('2026-10-23T18:02:00.001Z'), now)).toBeNull();
  });

  it.each(['2026-10-23T18:02:00.000Z', '2026-10-23T18:00:01.000Z'])(
    'estende para agora mais dois minutos em %s',
    (endsAt) => {
      expect(antiSniping(new Date(endsAt), now)?.toISOString()).toBe('2026-10-23T18:02:00.000Z');
    },
  );
});
