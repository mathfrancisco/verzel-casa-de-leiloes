/** Aviso de lote cancelado (RN-14): sala, auditoria e comprovante seguem acessíveis por link. */
export function CancelledNotice({ children }: { children?: React.ReactNode }) {
  return (
    <p className="cancelled-notice" role="status">
      <strong>⚠ Lote cancelado.</strong>{' '}
      {children ??
        'O leiloeiro cancelou este lote. Valores envolvidos foram liberados ou estornados.'}
    </p>
  );
}
