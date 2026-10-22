# Checklist de requisitos (PDF → plano → evidência)

Cada linha só é marcada quando houver evidência real (teste rodando, tela no deploy ou trecho do
README). Referências `§` apontam para [`PLANO.md`](PLANO.md).

## Obrigatórios gerais

- [ ] Deploy público da aplicação (§11)
- [ ] Repositório público no GitHub
- [ ] Front-End em React (§2)
- [ ] Back-End em Node.js ou Python (§2 — Node + Fastify)
- [ ] Banco PostgreSQL/MySQL/NoSQL com instruções no README (§2, §3)
- [ ] Itens vindos de uma API pública (§7 — Art Institute of Chicago)
- [ ] Dois papéis: leiloeiro (cria/gerencia lotes, **não** dá lance) e licitante (deposita, dá lance, arremata) (§1)
- [ ] Seed: 1 leiloeiro, 2 clientes, ≥ 1 lote publicado com lances abertos (§10)
- [ ] README detalhado: setup passo a passo, comportamentos inesperados, técnica anti-adulteração explicada
- [ ] Entrega em até 7 dias corridos (29/10/2026)
- [ ] Formulário enviado, incluindo onde e como a IA foi usada ([`USO-DE-IA.md`](USO-DE-IA.md))

## Front-End

- [ ] **Vitrine:** ao vivo / agendados / encerrados; cancelados não aparecem (§9)
- [ ] **Painel do leiloeiro:** buscar na API e criar lote (imagem, título, atributos, início/fim, valor mínimo) (§9)
- [ ] **Painel do leiloeiro:** cancelar lote sem lances (§4.4)
- [ ] **Painel do leiloeiro:** resultado de cada lote encerrado (arrematado? por quanto?) e total recebido (§9)
- [ ] **Sala ao vivo:** lance atual, histórico, posição do usuário, contagem regressiva (§9)
- [ ] **Sala ao vivo:** indicador "você está ganhando" / "você foi superado", sem recarregar a página (§8)
- [ ] **Carteira:** saldo total, comprometido, disponível, depósito simulado (§9)
- [ ] **Meus arremates:** itens com lance + lotes vencidos com comprovante e link de compartilhamento (§9)
- [ ] **Auditoria:** pública, sem login, histórico completo, íntegro ou adulterado (§5)
- [ ] **Feedback:** abaixo do mínimo, saldo insuficiente, já está ganhando, não iniciado, encerrado (§4.5)

## Back-End

- [ ] Vitrine, salas, auditoria e comprovante funcionam com a API externa fora do ar (§7)
- [ ] Lance só em lote ao vivo (entre início e fim) (§4.1)
- [ ] 1º lance ≥ lance inicial; seguintes ≥ atual + incremento mínimo (§4.1)
- [ ] Líder não cobre o próprio lance (§4.1)
- [ ] Disponível = total − comprometido; liderando compromete; superado libera imediatamente; lance só se couber no disponível (§4.1)
- [ ] Anti-sniping: lance nos últimos 2 min estende o fim em +2 min (§4.2)
- [ ] Liquidação: debita vencedor, credita leiloeiro, gera comprovante; sem lances fecha sem vencedor (§4.3)
- [ ] Histórico à prova de adulteração: alteração, remoção e inserção detectadas mesmo direto no banco; técnica explicada (§5)
- [ ] Privacidade: auditoria e comprovante sem dados pessoais (§6)

## Opcionais

- [ ] Busca e filtro de lotes (§9)
- [ ] Cancelamento de lote com estorno automático (§4.4)
- [ ] Docker Compose (§2)
- [ ] Testes automatizados (§12)
- [ ] Dark mode (§9)
