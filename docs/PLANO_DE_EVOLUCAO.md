# Plano de evolução — Minhas Finanças

Atualizado em: 30 de julho de 2026

## 1. Objetivo

Evoluir o Minhas Finanças de um aplicativo de registro para um assistente de
decisão financeira confiável. O usuário deve conseguir entender o que já
aconteceu, o que ainda está previsto e qual será o impacto de uma decisão antes
de alterar os dados reais.

Os quatro princípios do trabalho são:

1. cálculos financeiros determinísticos e testáveis;
2. separação clara entre realizado, previsto e simulado;
3. organização por conta, cartão, competência e vencimento;
4. IA usada para explicar resultados, nunca como fonte dos cálculos.

## 2. Prioridade imediata de segurança

A chave `service_role` do Supabase compartilhada durante a configuração deve ser
considerada exposta.

Antes de publicar uma nova versão:

- revogar ou rotacionar a chave no painel do Supabase;
- manter no frontend somente `VITE_SUPABASE_URL` e
  `VITE_SUPABASE_ANON_KEY`;
- nunca adicionar `service_role` em arquivos `VITE_*`, no navegador ou no Git;
- executar operações administrativas apenas no servidor ou em Edge Functions;
- concluir a migração para Supabase Auth e RLS por usuário descrita em
  `supabase-auth-migration.sql`;
- revisar as políticas anônimas de `supabase-schema.sql` antes da exposição
  pública.

## 3. Sequência recomendada

### Fase 0 — Segurança e linha de base

Objetivo: garantir que as próximas mudanças sejam feitas sobre dados seguros e
resultados verificáveis.

Tarefas:

- [ ] Rotacionar a chave `service_role`.
- [ ] Confirmar que nenhum segredo está no histórico do Git.
- [ ] Aplicar Supabase Auth e RLS por usuário.
- [ ] Criar dados de teste com contas, cartões, parcelas e meses diferentes.
- [ ] Cobrir regras financeiras críticas com testes.
- [ ] Documentar a regra de competência, vencimento e pagamento.

Critérios de aceite:

- cada usuário acessa somente os próprios dados;
- reiniciar ou trocar de dispositivo não altera os totais;
- nenhuma chave administrativa chega ao bundle do navegador;
- os mesmos dados sempre geram os mesmos totais.

### Fase 1 — Confiabilidade dos totais

Objetivo: corrigir os conceitos usados no Dashboard, Poupança e Relatórios antes
de criar novas projeções.

Tarefas:

- [ ] Separar movimentações `pagas`, `pendentes`, `agendadas` e `atrasadas`.
- [ ] Separar indicadores `Realizado`, `Previsto` e `Todos`.
- [ ] Definir qual data determina o mês: competência, vencimento ou pagamento.
- [ ] Manter movimentações pagas visíveis e apenas alterar seu status.
- [ ] Calcular receitas, despesas e saldo usando o filtro de período ativo.
- [ ] Identificar explicitamente contas de reserva/investimento.
- [ ] Remover a regra que trata todas as contas como poupança.
- [ ] Informar taxa, data de referência e regra de tributação nas projeções.
- [ ] Remover ano fixo nos relatórios.
- [ ] Permitir abrir um total e consultar as movimentações que o compõem.

Critérios de aceite:

- marcar uma conta como paga não a remove da movimentação do mês;
- o total realizado inclui somente movimentações efetivadas;
- o total previsto inclui pendentes e agendadas conforme regra documentada;
- o relatório anual respeita o ano selecionado;
- `Total guardado` soma apenas contas classificadas como reserva ou
  investimento.

### Fase 2 — Planejador de Cenários

Objetivo: responder com segurança perguntas como:

> Se eu pagar esta conta agora, quanto sobrará e quais contas ainda conseguirei
> pagar até o próximo recebimento?

#### 2.1 Experiência principal

O usuário poderá:

1. iniciar uma simulação pelo Dashboard, Movimentações, Calendário, Cartão,
   Poupança ou Lista;
2. escolher uma ou mais contas a pagar;
3. escolher a conta de origem;
4. informar pagamento integral ou parcial;
5. incluir uma retirada da reserva ou transferência;
6. definir a data final da análise;
7. comparar o cenário com a situação atual;
8. salvar o cenário sem alterar os dados reais;
9. aplicar as ações somente após confirmação explícita.

#### 2.2 Resultados apresentados

Cada cenário deve apresentar:

- saldo inicial e final por conta;
- linha do tempo de entradas e saídas;
- menor saldo do período e a data em que ocorre;
- valor livre para gastar;
- reserva mínima configurada;
- contas cobertas, parcialmente cobertas e descobertas;
- próximas contas após o horizonte selecionado;
- impacto nas metas;
- limite utilizado e disponível por cartão;
- alertas de atraso, juros ou saldo negativo;
- comparação entre cenário base e cenário simulado.

#### 2.3 Arquitetura recomendada

Criar um núcleo independente da interface:

```text
src/lib/scenarios/
  engine.ts
  selectors.ts
  types.ts
  explain.ts
  engine.test.ts
```

Responsabilidades:

- `types.ts`: entradas, ações, eventos e resultado da simulação;
- `selectors.ts`: transforma contas, cartões e movimentações do store em uma
  fotografia financeira;
- `engine.ts`: ordena eventos, aplica ações e calcula saldos sem efeitos
  colaterais;
- `explain.ts`: cria um resumo estruturado para a IA;
- `engine.test.ts`: testa datas, empates, pagamentos parciais, saldo negativo,
  faturas e transferências.

O motor deve ser uma função pura:

```ts
simulateScenario(snapshot, actions, options): ScenarioResult
```

Ele não deve chamar Supabase, modificar o store ou depender da IA.

#### 2.4 Uso correto da IA

A IA receberá um resumo estruturado, sem credenciais e com o mínimo necessário:

```json
{
  "period": {
    "start": "2026-08-01",
    "end": "2026-08-15"
  },
  "startingBalance": 2300,
  "endingBalance": 130,
  "minimumBalance": 130,
  "uncoveredItems": [],
  "goalImpact": {
    "goal": "Reserva de emergência",
    "delayInMonths": 2
  }
}
```

Ela poderá:

- explicar riscos e pontos positivos;
- resumir o que muda;
- comparar alternativas já calculadas;
- sugerir uma nova simulação;
- transformar o resultado em linguagem simples.

Ela não poderá:

- inventar saldo, taxa, vencimento ou movimentação;
- executar operações no banco;
- marcar pagamentos sem confirmação;
- substituir os valores calculados pelo motor;
- afirmar certeza quando faltarem dados.

#### 2.5 Persistência

Primeira versão:

- manter o rascunho do cenário localmente;
- permitir duplicar e comparar cenários;
- não sincronizar ações simuladas com movimentações reais.

Versão posterior:

- criar tabelas `scenarios` e `scenario_actions`;
- associar cada cenário ao usuário;
- guardar somente IDs de origem e ações, recalculando o resultado;
- marcar o cenário como `draft`, `applied` ou `archived`;
- registrar quando e por quem foi aplicado.

#### 2.6 Critérios de aceite

- simular nunca altera contas, saldos ou movimentações reais;
- o resultado é idêntico com ou sem IA;
- cada valor mostra sua origem;
- cenários podem ser comparados lado a lado;
- aplicar exige revisão final das ações;
- se os dados mudarem, o app avisa que o cenário precisa ser recalculado;
- todos os casos críticos possuem testes automatizados.

### Fase 3 — Cartões de crédito

Objetivo: organizar compras, faturas e pagamentos por cartão.

Modelo sugerido:

- conta bancária e cartão são entidades diferentes;
- cada cartão possui instituição, nome, limite, fechamento, vencimento e conta
  padrão de pagamento;
- cada compra aponta para um cartão;
- a compra pertence a uma fatura calculada pela data de fechamento;
- pagar a fatura cria uma movimentação na conta de pagamento sem apagar as
  compras;
- parcelas futuras ficam ligadas à compra original e à fatura correspondente.

Interface:

- resumo horizontal dos cartões;
- tela de detalhe por cartão;
- fatura atual, próxima e anteriores;
- compras agrupadas por data e categoria;
- filtros `Todas`, `Em aberto`, `Pagas`, `Parceladas`;
- limite utilizado e disponível;
- ação `Simular pagamento da fatura`;
- comparação entre pagamento total, parcial e valor mínimo;
- aviso explícito sobre juros quando houver dados suficientes.

Critérios de aceite:

- compras do Nubank não aparecem agrupadas com compras do Itaú;
- pagar uma fatura não remove suas compras do histórico;
- cada compra aparece em exatamente uma fatura;
- fechamento e vencimento funcionam na virada do mês;
- o limite disponível é derivado de compras e pagamentos válidos.

### Fase 4 — Calendário e Movimentações

Tarefas:

- [ ] Adicionar filtros `Todos`, `Pagos`, `Pendentes`, `Agendados` e
  `Atrasados`.
- [ ] Criar legenda para os indicadores do calendário.
- [ ] Adicionar botão `Hoje`.
- [ ] Mostrar saldo previsto ao fim de cada dia.
- [ ] Permitir selecionar várias contas e criar um cenário.
- [ ] Trocar `Lançar hoje` por uma ação que use a data selecionada.
- [ ] Oferecer `Desfazer` após mudança de status.
- [ ] Agrupar movimentações por conta ou cartão.
- [ ] Indexar movimentações por data com `useMemo`.
- [ ] Adicionar nomes acessíveis, foco visível e alvos de toque de 44 px.

### Fase 5 — Reservas e metas

Transformar `Poupança` em `Reservas e metas`.

Cada meta deve mostrar:

- valor atual e valor desejado;
- progresso;
- aporte mensal planejado;
- data estimada;
- conta vinculada;
- histórico de aportes e retiradas;
- impacto de uma retirada;
- ação para simular o uso da reserva.

Evitar promessas como `100% do CDI` quando o produto financeiro e a taxa não
estiverem cadastrados. Diferenciar rendimento bruto, líquido, estimado e
realizado.

### Fase 6 — Lista de compras

Tarefas:

- [ ] Suportar várias listas.
- [ ] Criar listas recorrentes.
- [ ] Agrupar por mercado ou categoria.
- [ ] Reordenar itens.
- [ ] Duplicar uma lista anterior.
- [ ] Comparar o preço com a última compra.
- [ ] Limpar itens comprados.
- [ ] Revisar exatamente quais itens serão lançados.
- [ ] Escolher conta ou cartão antes da confirmação.
- [ ] Mostrar impacto no saldo seguro.
- [ ] Corrigir semântica, foco e fechamento do modal.

O botão deve informar quantidade e total:

```text
Revisar 4 itens — R$ 187,40
```

### Fase 7 — Relatórios

Adicionar:

- realizado versus previsto;
- fluxo de caixa futuro;
- gastos por cartão e conta;
- variação por categoria;
- comparação com mês e ano anteriores;
- parcelas futuras;
- evolução de reservas e metas;
- comprometimento da renda;
- filtros por período, conta, cartão, categoria e status;
- exportação em CSV e PDF;
- navegação do gráfico para as movimentações de origem;
- tabela ou resumo textual equivalente aos gráficos.

Quando o modo de privacidade estiver ativo, ocultar também proporções e
magnitudes que revelem valores nos gráficos.

### Fase 8 — Ajustes

Dividir a tela em:

1. Perfil;
2. Categorias;
3. Contas e cartões;
4. Notificações;
5. Privacidade;
6. Dados e sincronização;
7. Área avançada.

Melhorias:

- editar contas e cartões existentes;
- configurar fechamento, vencimento e conta de pagamento do cartão;
- editar, mesclar e reatribuir categorias;
- definir reserva mínima e regra do saldo seguro;
- exportar e importar backup;
- mostrar estado e horário da última sincronização;
- esconder URL, RLS e detalhes técnicos na área avançada;
- bloquear exclusões enquanto existirem dados vinculados.

## 4. Regras financeiras que precisam de uma única fonte

Centralizar as regras em módulos de domínio, evitando cálculos diferentes em
cada componente.

Regras mínimas:

- status efetivo da movimentação;
- mês de competência;
- vencimento e atraso;
- data de pagamento;
- saldo realizado;
- saldo previsto;
- saldo seguro;
- fatura do cartão;
- parcelas;
- reserva e meta;
- recorrência;
- projeção de cenário.

Componentes devem consumir seletores prontos. Eles não devem reconstruir essas
regras com filtros locais.

## 5. Modelo de status sugerido

```ts
type TransactionStatus =
  | 'scheduled'
  | 'pending'
  | 'paid'
  | 'overdue'
  | 'cancelled';
```

Campos importantes:

```ts
interface Transaction {
  id: string;
  type: 'income' | 'expense';
  status: TransactionStatus;
  amount: number;
  competenceDate: string;
  dueDate?: string;
  paidAt?: string;
  accountId?: string;
  creditCardId?: string;
  invoiceId?: string;
  categoryId?: string;
  parentTransactionId?: string;
}
```

`overdue` pode ser calculado a partir de `pending + dueDate`, em vez de ser
salvo, para evitar inconsistência.

## 6. Estratégia de testes

### Testes unitários

- competência diferente do vencimento;
- pagamento em outro mês;
- receita agendada;
- pagamento parcial;
- parcelamento na virada do ano;
- compra antes e depois do fechamento;
- exclusão ou reatribuição de conta;
- retirada de reserva;
- cenário com saldo negativo;
- duas movimentações na mesma data;
- alteração de dados depois de salvar um cenário.

### Testes de integração

- persistência e recuperação pelo Supabase;
- isolamento entre usuários;
- marcar como pago sem remover do histórico;
- aplicar cenário;
- pagamento de fatura;
- criação de movimentação pela lista de compras.

### Testes de interface

- teclado e leitor de tela;
- foco em modais;
- filtros em desktop e celular;
- alvos de toque;
- estados vazio, carregando, erro e offline;
- ocultação completa de valores.

## 7. Otimização técnica

- agregar relatórios uma vez com seletores memorizados;
- indexar transações por data, conta, cartão e status;
- não usar `transactions.slice(0, 50)` como contexto financeiro da IA;
- enviar à IA somente o resumo necessário;
- separar store, persistência, domínio e apresentação;
- evitar cálculos financeiros diretamente em componentes;
- usar tokens para cores dos gráficos;
- carregar telas pesadas sob demanda;
- adicionar paginação ou virtualização quando o histórico crescer;
- registrar erros de sincronização sem expor dados financeiros.

## 8. Backlog priorizado

### P0

- [ ] Rotacionar `service_role`.
- [ ] Garantir Auth + RLS antes da publicação pública.

### P1

- [ ] Corrigir totais mensais e manter itens pagos visíveis.
- [ ] Separar realizado, previsto e simulado.
- [ ] Corrigir definição de Poupança.
- [ ] Criar motor do Planejador de Cenários.
- [ ] Reestruturar cartões e faturas.
- [ ] Prevenir checkout e exclusões ambíguas.
- [ ] Corrigir acessibilidade dos fluxos principais.

### P2

- [ ] Reorganizar Ajustes.
- [ ] Expandir filtros e detalhamento dos Relatórios.
- [ ] Criar reservas e metas.
- [ ] Evoluir listas de compras.
- [ ] Otimizar agregações e índices de interface.

### P3

- [ ] Microinterações e animações.
- [ ] Personalização visual adicional.
- [ ] Comparações avançadas e exportações.

## 9. Definição de pronto

Uma entrega financeira só está pronta quando:

- possui regra documentada;
- possui teste para casos normais e limites;
- não altera dados simulados sem confirmação;
- funciona após recarregar e em outro dispositivo;
- respeita RLS e o usuário autenticado;
- possui estados de carregamento, erro e vazio;
- funciona por teclado e em tela pequena;
- informa de onde veio cada total;
- não envia segredos ou dados excessivos para serviços externos.

## 10. Próximo bloco de implementação

Ao retomar o trabalho:

1. rotacionar as credenciais;
2. criar uma suíte de dados financeiros de teste;
3. corrigir os seletores de totais e status;
4. definir os tipos do Planejador de Cenários;
5. implementar `simulateScenario` com testes;
6. criar a primeira interface de comparação;
7. integrar a ação `Simular pagamento` às Movimentações;
8. somente depois adicionar explicações por IA.

Esse bloco cria uma base segura para Calendário, Cartões, Poupança e Relatórios
compartilharem as mesmas regras.
