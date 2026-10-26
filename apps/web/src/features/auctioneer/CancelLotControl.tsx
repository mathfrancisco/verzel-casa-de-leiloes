import { formatBRL, type AuctioneerLot } from '@leilao/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiFetch } from '../../lib/api';
import { messageFor } from '../../lib/errorMessages';

/** Explica o efeito do cancelamento conforme a situação do lote (RN-12, RN-13). */
export function cancelEffect(lot: AuctioneerLot): string {
  if (lot.result === 'SOLD') {
    return `Este lote já foi arrematado por ${formatBRL(lot.finalPriceCents ?? 0)}. Ao cancelar, o valor é estornado: devolvido ao vencedor e descontado do seu total recebido, e o comprovante será revogado.`;
  }
  if (lot.bidCount > 0) {
    return `Este lote tem ${lot.bidCount} lance(s). Ao cancelar, o valor comprometido do líder (${formatBRL(lot.currentPriceCents ?? 0)}) é liberado na hora e os licitantes são notificados.`;
  }
  return 'Este lote não tem lances. Ao cancelar, ele sai da vitrine e continua visível na auditoria.';
}

export function CancelLotControl({ lot }: { lot: AuctioneerLot }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const cancel = useMutation({
    mutationFn: () =>
      apiFetch(`/api/lots/${lot.id}/cancel`, {
        method: 'POST',
        body: reason.trim() ? { reason: reason.trim() } : {},
      }),
    onSuccess: () => {
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['auctioneer-lots'] });
      void queryClient.invalidateQueries({ queryKey: ['lots'] });
      void queryClient.invalidateQueries({ queryKey: ['lot', lot.id] });
      void queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });

  if (!lot.cancellable) return null;
  if (!open) {
    return (
      <button type="button" className="danger-button" onClick={() => setOpen(true)}>
        Cancelar lote
      </button>
    );
  }
  const descriptionId = `cancel-effect-${lot.id}`;
  const reasonId = `cancel-reason-${lot.id}`;
  return (
    <div className="cancel-confirm" role="group" aria-label={`Cancelar ${lot.title}`}>
      <p id={descriptionId}>{cancelEffect(lot)} Esta ação não pode ser desfeita.</p>
      <label htmlFor={reasonId}>Motivo (opcional, aparece na auditoria)</label>
      <input
        id={reasonId}
        maxLength={200}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        disabled={cancel.isPending}
      />
      {cancel.isError && (
        <p className="form-error" role="alert">
          {messageFor(cancel.error)}
        </p>
      )}
      <button
        type="button"
        className="danger-button"
        aria-describedby={descriptionId}
        disabled={cancel.isPending}
        onClick={() => cancel.mutate()}
      >
        {cancel.isPending ? 'Cancelando…' : 'Confirmar cancelamento'}
      </button>
      <button type="button" disabled={cancel.isPending} onClick={() => setOpen(false)}>
        Manter lote
      </button>
    </div>
  );
}
