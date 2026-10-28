import type { SyncState } from '../../lib/syncState';

const TEXT: Record<SyncState, string> = {
  synced: 'Conectado e sincronizado',
  syncing: 'Conectado — sincronizando dados…',
  reconnecting: 'Sem conexão em tempo real — reconectando. Os dados podem estar desatualizados.',
};

const ICON: Record<SyncState, string> = { synced: '●', syncing: '◐', reconnecting: '○' };

/**
 * Indicador de conexão. Só muda de texto quando o estado muda (não a cada lance), então a região
 * `status` anuncia poucas vezes.
 */
export function SyncStatus({ state }: { state: SyncState }) {
  return (
    <p className={`sync-status sync-status-${state}`} role="status" aria-live="polite">
      <span aria-hidden="true">{ICON[state]}</span> {TEXT[state]}
    </p>
  );
}
