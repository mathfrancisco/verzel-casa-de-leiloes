# Prompt — revisar card implementado

```text
Revise a implementação do card {{CARD}} (diff da branch atual contra main).

Verifique, citando arquivo:linha:
1. Cada critério de aceite do card tem teste que realmente o exercita (não só o caminho feliz).
2. Cada regra RN citada é aplicada no servidor, dentro de transação quando envolve saldo ou lote,
   com travas na ordem lote → carteira.
3. Contrato igual à spec: rotas, payloads, status HTTP, códigos de erro, eventos realtime.
4. Nenhuma resposta pública expõe nome, e-mail ou id de usuário.
5. Nenhum segredo em código, log ou front; nenhuma chamada à API externa real nos testes.
6. Camadas respeitadas (domain sem I/O; rotas finas); nada fora do escopo do card.
7. Condições de corrida, valores de borda (0, negativo, enorme, exatamente no mínimo,
   exatamente a 2:00 do fim) e mensagens de erro.
8. Docs atualizados (card, quadro, checklist, spec se o comportamento mudou).

Classifique cada achado como BLOQUEANTE, IMPORTANTE ou SUGESTÃO, com o cenário concreto que
falha. Rode os testes e informe a saída real. Não faça alterações — só relate.
```
