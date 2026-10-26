import { Component, type ReactNode } from 'react';

interface State {
  failed: boolean;
}

/** Captura falha ao carregar o chunk de uma rota (ex.: 404 após novo deploy) e oferece recarregar. */
export class ChunkErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section role="alert">
        <h1>Nova versão disponível</h1>
        <p>Não foi possível carregar esta página. Recarregue para atualizar o aplicativo.</p>
        <button type="button" onClick={() => window.location.reload()}>
          Recarregar
        </button>
      </section>
    );
  }
}
