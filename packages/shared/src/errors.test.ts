import { describe, expect, it } from 'vitest';
import { ERROR_STATUS } from './errors';

describe('ERROR_STATUS', () => {
  it('cobre os códigos de regra de lance com os status da SP-00', () => {
    expect(ERROR_STATUS.BELOW_MINIMUM).toBe(422);
    expect(ERROR_STATUS.INSUFFICIENT_FUNDS).toBe(422);
    expect(ERROR_STATUS.ALREADY_WINNING).toBe(409);
    expect(ERROR_STATUS.LOT_NOT_STARTED).toBe(409);
    expect(ERROR_STATUS.LOT_CLOSED).toBe(409);
    expect(ERROR_STATUS.SELLER_CANNOT_BID).toBe(403);
  });

  it('só usa status HTTP de erro', () => {
    for (const status of Object.values(ERROR_STATUS)) {
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThan(600);
    }
  });
});
