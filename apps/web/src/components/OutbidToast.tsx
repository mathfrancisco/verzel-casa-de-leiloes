import { useEffect, useState } from 'react';

interface OutbidNotice {
  lotId: string;
  lotTitle: string;
  newPriceCents: number;
}

const EVENT = 'leilao:bid-outbid';

export function notifyOutbid(notice: OutbidNotice) {
  window.dispatchEvent(new CustomEvent<OutbidNotice>(EVENT, { detail: notice }));
}

/** Aviso persistente por tempo suficiente para quem estiver fora da sala do lote. */
export function OutbidToast({ sessionKey }: { sessionKey: string | null | undefined }) {
  const [notice, setNotice] = useState<OutbidNotice | null>(null);

  useEffect(() => setNotice(null), [sessionKey]);

  useEffect(() => {
    const receive = (event: Event) => setNotice((event as CustomEvent<OutbidNotice>).detail);
    window.addEventListener(EVENT, receive);
    return () => window.removeEventListener(EVENT, receive);
  }, []);

  if (!notice) return null;
  return (
    <div className="outbid-toast" role="status" aria-live="polite">
      <p>Você foi superado em {notice.lotTitle}.</p>
      <button type="button" onClick={() => setNotice(null)} aria-label="Fechar aviso de superação">
        Fechar
      </button>
    </div>
  );
}
