/**
 * Estado da sala em tempo real, do ponto de vista de quem olha a tela:
 * - `synced`: socket conectado E snapshot REST confirmado depois da (re)conexão;
 * - `syncing`: socket conectado, mas o snapshot REST ainda não foi confirmado;
 * - `reconnecting`: sem socket (offline ou reconectando); o que está na tela pode estar velho.
 * "Conectado" sozinho nunca significa dado atual.
 */
export type SyncState = 'synced' | 'syncing' | 'reconnecting';

export function resolveSyncState(input: {
  connected: boolean;
  snapshotConfirmed: boolean;
}): SyncState {
  if (!input.connected) return 'reconnecting';
  return input.snapshotConfirmed ? 'synced' : 'syncing';
}

/**
 * Evento de lance só vale se trouxer sequência maior que a já exibida (snapshot REST ou evento
 * anterior). Um evento atrasado ou repetido nunca reverte preço, contagem, prazo ou histórico.
 */
export function isFreshBidEvent(eventSeq: number, displayedSeq: number): boolean {
  return eventSeq > displayedSeq;
}

/** Um snapshot REST com menos lances que o já exibido é resposta atrasada e deve ser descartado. */
export function isOlderSnapshot(
  incoming: { bidCount: number },
  current: { bidCount: number } | undefined,
): boolean {
  return current !== undefined && incoming.bidCount < current.bidCount;
}
