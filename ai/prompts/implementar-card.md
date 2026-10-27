# Prompt — implementar card

```text
Implemente o card {{CARD}} (arquivo em ai/cards/).

Antes de codar:
1. Leia AGENTS.md e o AGENTS.md da pasta onde vai trabalhar.
2. Leia o card inteiro e todos os documentos que ele cita (RN em docs/02-regras-de-negocio.md,
   specs em ai/specs/, modelagem em docs/04-modelagem-de-dados.md).
3. Confira no quadro ai/cards/README.md que as dependências estão DONE. Se não estiverem, pare e avise.
4. Inspecione o código existente. Não presuma que algo existe porque um documento o cita.
5. Se encontrar conflito entre documentos ou ambiguidade que muda comportamento, pare e
   pergunte, propondo a correção.

Execução:
6. Escreva primeiro os testes dos casos CT listados no card (positivos e negativos) e rode-os
   para vê-los falhar.
7. Implemente o mínimo para passarem, respeitando as camadas e os invariantes do AGENTS.md.
8. Rode: pnpm lint && pnpm typecheck && pnpm test (e pnpm test:e2e se o card pedir).

Ao terminar, entregue:
- arquivos alterados;
- comandos executados com a saída real (resumo das contagens de testes);
- cada critério de aceite do card com a evidência (teste ou print);
- riscos, limitações e decisões tomadas;
- cards que ficam desbloqueados.
Atualize o status do card e do quadro, docs/CHECKLIST.md (só com evidência).
Não marque DONE se algum critério falhar ou não tiver sido verificado.
```
