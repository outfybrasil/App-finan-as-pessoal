---
target: Calendário, Poupança, Lista, Relatórios, Ajustes e Planejador de Cenários
total_score: 18
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
timestamp: 2026-07-30T21-35-27Z
slug: src-components
---
Method: dual-agent (A: ux_review · B: implementation_evidence)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Alterações de status e preço têm pouco feedback; relatórios misturam realizado e previsto. |
| 2 | Match System / Real World | 2 | “Total guardado” e projeções de CDI podem representar conceitos financeiros incorretamente. |
| 3 | User Control and Freedom | 2 | Falta desfazer; ações pagas e cenários não têm comparação antes/depois. |
| 4 | Consistency and Standards | 2 | Confirmações nativas, modais próprios e controles iconográficos seguem padrões diferentes. |
| 5 | Error Prevention | 1 | Checkout ambíguo e exclusão de conta não esclarece impacto ou destino das movimentações. |
| 6 | Recognition Rather Than Recall | 3 | Hierarquias básicas são claras, mas ícones, pontos do calendário e filtros exigem inferência. |
| 7 | Flexibility and Efficiency | 1 | Faltam filtros profundos, ações em lote, atalhos e reaproveitamento de listas recorrentes. |
| 8 | Aesthetic and Minimalist Design | 2 | Há coerência visual, porém excesso de microtexto, caixas dentro de caixas e ornamentos genéricos. |
| 9 | Error Recovery | 1 | Pouco suporte para desfazer, reatribuir dados ou recuperar erros de ações destrutivas. |
| 10 | Help and Documentation | 2 | Configuração técnica e conceitos financeiros aparecem sem explicação contextual suficiente. |
| **Total** | | **18/40** | **Frágil: boa base visual, confiança operacional insuficiente** |

## Design Specificity Verdict

**Avaliação qualitativa:** a interface já é coerente em superfícies, cantos e cores, mas ainda parece um dashboard financeiro intercambiável. O excesso de texto mono em caixa alta, cartões aninhados e ícones dentro de quadrados dilui a personalidade. A maior oportunidade de autoria é transformar o produto em um assistente de decisão financeira: calendário, contas, cartões, metas e cenários devem contar a mesma história de caixa.

**Varredura determinística:** foram encontrados quatro avisos `gray-on-color` em `MarketList.tsx` (linhas 171, 209, 280 e 330). Todos são falsos positivos: `zinc-950` sobre `emerald-500` oferece contraste alto. A inspeção de código encontrou problemas reais não cobertos pelo detector: navegação do calendário sem nome acessível, formulários sem rótulo, alvos de toque pequenos, modal sem semântica/foco e gráficos sem alternativa textual.

**Sobreposições visuais:** não foram injetadas. O navegador conectado não estava disponível; a evidência de fallback foi a inspeção independente do código e a execução do detector.

## Overall Impression

A base é promissora e já permite registrar finanças, mas algumas telas exibem números com uma certeza maior do que os cálculos justificam. A maior oportunidade é construir confiança: separar realizado de previsto, explicar a origem de cada valor e permitir simular decisões antes de alterar dados reais.

## What's Working

- Calendário, lista de compras e relatórios têm uma sequência de leitura compreensível e estados vazios úteis.
- Os valores usam tipografia tabular e os gráficos se adaptam ao contêiner.
- A lista de compras dá retorno imediato no total e a tela de ajustes concentra os principais domínios do produto.

## Priority Issues

### [P1] Precisão financeira em Poupança e Relatórios

**Why it matters:** “Total guardado” pode somar todas as contas quando não existe uma conta chamada Poupança. O CDI está fixo e as projeções simplificam tributação. Relatórios misturam concluído, pendente e agendado, podendo induzir decisões erradas.

**Fix:** modelar explicitamente contas de reserva/investimento; identificar taxa, data e regra usada na projeção; separar “Realizado”, “Previsto” e “Todos”; calcular o ano selecionado dinamicamente e oferecer detalhamento da origem dos totais.

**Suggested command:** `$impeccable harden`

### [P1] Criar um Planejador de Cenários auditável

**Why it matters:** o usuário precisa responder “se eu pagar isto hoje, o que ainda consigo pagar?” sem alterar movimentações reais nem confiar em aritmética probabilística da IA.

**Fix:** criar uma simulação isolada com saldo inicial por conta, contas pendentes/agendadas ordenadas por vencimento, pagamentos totais/parciais, transferências e horizonte de tempo. Exibir antes/depois, saldo mínimo, contas descobertas, limite de cartão e valor livre. A IA deve explicar o resultado estruturado e sugerir alternativas; o motor do app deve fazer os cálculos. Nada é gravado até “Aplicar cenário”.

**Suggested command:** `$impeccable shape`

### [P1] Prevenir ações ambíguas ou destrutivas

**Why it matters:** o checkout pode agir sobre itens marcados ou sobre todos; a exclusão de conta não deixa claro o destino das movimentações; modais não controlam foco.

**Fix:** usar “Revisar N itens”, listar exatamente o que será lançado, desabilitar confirmação sem conta válida, oferecer desfazer e bloquear exclusão até reatribuir movimentações/cartões.

**Suggested command:** `$impeccable harden`

### [P1] Acessibilidade operacional

**Why it matters:** calendário, cores de categoria, steppers e gráficos podem ser impraticáveis por teclado, leitor de tela ou toque.

**Fix:** nomes acessíveis, `aria-current`/`aria-pressed`, foco visível, diálogo semântico com restauração de foco, alvos mínimos de 44px, legendas e tabelas alternativas aos gráficos.

**Suggested command:** `$impeccable audit`

### [P2] Reorganizar Ajustes e reduzir carga cognitiva

**Why it matters:** sessão, categorias, notificações, contas e detalhes do Supabase convivem em uma página extensa, especialmente cansativa no celular.

**Fix:** separar em Perfil, Categorias, Contas e cartões, Notificações, Dados e sincronização. Manter URL/chaves e detalhes de RLS numa área avançada; adicionar edição, fusão e estados vazios para categorias.

**Suggested command:** `$impeccable distill`

## Persona Red Flags

**Alex (usuário avançado):** não consegue filtrar relatórios por conta/cartão/status, comparar períodos, exportar ou executar ações em lote. No calendário, precisa abrir dias individualmente; na lista, não há listas recorrentes ou agrupamento.

**Sam (tecnologia assistiva):** botões de mês não têm nome acessível, dias não anunciam data/seleção, pontos dependem de cor, modais não expõem papel de diálogo e gráficos não oferecem tabela equivalente.

**Casey (uso móvel):** steppers, ações de editar/excluir e seletores de cor têm alvos menores que 44px. Ajustes vira um formulário longo e o gráfico de Poupança fica comprimido.

## Minor Observations

- “Lançar hoje” deve usar a data selecionada ou mudar para “Lançar em 12 de agosto”.
- O calendário filtra todas as transações para cada dia; criar um índice por data com `useMemo`.
- Relatórios repetem filtros por mês e tipo em cada render; agregar os dados uma vez.
- Cores hexadecimais diretas em Poupança e Relatórios devem virar tokens.
- Ocultar valores também deve ocultar magnitudes nos gráficos.
- Os círculos desfocados decorativos de Relatórios parecem genéricos e não ajudam na leitura.

## Questions to Consider

- O produto quer apenas registrar o passado ou ajudar o usuário a decidir o próximo pagamento?
- Qual é o “saldo seguro para gastar” depois das contas previstas, e em que data ele vale?
- Uma simulação deve poder comparar “pagar agora”, “pagar parcialmente” e “adiar” lado a lado?
- Ao usar a reserva, o app deve mostrar o impacto sobre a meta e a data estimada de recuperação?
- Quais informações técnicas realmente precisam aparecer fora de uma área avançada?
