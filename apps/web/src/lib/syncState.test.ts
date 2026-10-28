import { describe, expect, it } from 'vitest';
import { isFreshBidEvent, isOlderSnapshot, resolveSyncState } from './syncState';

describe('syncState', () => {
  it('só considera sincronizado com socket conectado e snapshot confirmado', () => {
    expect(resolveSyncState({ connected: true, snapshotConfirmed: true })).toBe('synced');
    expect(resolveSyncState({ connected: true, snapshotConfirmed: false })).toBe('syncing');
    expect(resolveSyncState({ connected: false, snapshotConfirmed: true })).toBe('reconnecting');
    expect(resolveSyncState({ connected: false, snapshotConfirmed: false })).toBe('reconnecting');
  });

  it('descarta evento de lance com sequência igual ou menor que a exibida', () => {
    expect(isFreshBidEvent(6, 7)).toBe(false);
    expect(isFreshBidEvent(7, 7)).toBe(false);
    expect(isFreshBidEvent(8, 7)).toBe(true);
  });

  it('descarta snapshot REST com menos lances que o já exibido', () => {
    expect(isOlderSnapshot({ bidCount: 3 }, { bidCount: 4 })).toBe(true);
    expect(isOlderSnapshot({ bidCount: 4 }, { bidCount: 4 })).toBe(false);
    expect(isOlderSnapshot({ bidCount: 1 }, undefined)).toBe(false);
  });
});
