# AGENTS.md — apps/web (React + Vite)

Complementa o `AGENTS.md` da raiz. Telas e rotas em `ai/specs/SP-09-front-end.md`.

## Padrões

- **Dados do servidor:** TanStack Query (`useQuery`/`useMutation`); nada de estado global para
  dado que vem da API. Eventos do Socket.IO atualizam o cache (`setQueryData`) ou invalidam queries.
- **Contrato:** tipos e schemas vêm de `packages/shared`; não redefinir tipos da API no front.
- **Erros de lance:** mapear `error.code` → mensagem em `src/lib/errorMessages.ts` (uma fonte só).
- **Dinheiro:** entrada e exibição via `formatBRL`/`parseBRL` de `packages/shared` (centavos ↔
  `R$ 1.234,56`); nunca `parseFloat` em valor monetário.
- **Tempo:** contagem regressiva usa `src/lib/serverClock.ts` (offset calculado de `serverTime`),
  não `Date.now()` cru.
- **Autorização:** esconder botões por papel é só UX; o servidor decide.
- **Estilo:** CSS simples em `src/styles.css` com tokens em variáveis CSS (`--bg`, `--text`,
  `--accent`…); o tema escuro (LC-021) redefine essas variáveis. Sem Tailwind: o CSS do projeto é
  pequeno e as variáveis já resolvem o dark mode.

## Acessibilidade (obrigatório)

- Todo controle é `button`/`a`/`input` nativo com rótulo visível ou `aria-label`.
- Avisos dinâmicos ("você foi superado", erro de lance) em região `aria-live="polite"`
  (`assertive` só para erro do próprio lance).
- Foco visível; ordem de tabulação lógica; contraste AA nos dois temas.
- Não depender só de cor para indicar "ganhando/superado" (texto + ícone).

## Testes

- Vitest + Testing Library para componentes com lógica (formulário de lance, carteira, auditoria).
- Playwright em `e2e/` para fluxos completos (ver `ai/cards/LC-022`).
