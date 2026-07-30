# Product Specification: Minhas Finanças

## Register

product

## Target Audience

Pessoas que buscam controle financeiro pessoal simples, rápido e de alta precisão. Usuários que valorizam clareza de dados, acompanhamento de despesas/receitas, metas de poupança, lista de compras e relatórios claros sem distrações visuais ou gráficos poluídos.

## Product Purpose

Minhas Finanças é um gerenciador de finanças pessoais focado em clareza, velocidade e usabilidade imediata. Permite registrar transações, categorizar gastos, gerenciar múltiplas contas bancárias, visualizar calendários de vencimentos, organizar listas de mercado e acompanhar metas financeiras com suporte de assistente inteligente.

## Brand Personality

Sóbrio, preciso, confiável e sofisticado. O app fala com o usuário de maneira direta, transparente e profissional. Não utiliza excesso de enfeites, emojis apelativos ou linguagem infantilizada.

Personalidade em três palavras: **preciso, elegante, essencial**.

## Anti-references (O que evitar - Anti-AI Slop)

- **Gradientes roxos/ciano flutuantes em fundos escuros**: evite os fundos com orbes brilhantes genéricos de IA.
- **Cards dentro de cards aninhados**: estrutura rasa, limpa e com excelente separação de espaço negativo.
- **Rótulos eyebrow (kickers) desnecessários**: títulos limpos e diretos que carregam o próprio peso.
- **Ícones em caixas coloridas arredondadas sobre cada título**: elimine os ícones genéricos sobre cada cabeçalho de seção.
- **Texto cinza apagado sem contraste**: contraste tipográfico claro (WCAG AA) com numeração tabular (`tabular-nums`) para todos os dados monetários.
- **Monospace como fantasia**: a fonte mono (`JetBrains Mono`) deve ser usada estritamente para números monetários e datas, com alinhamento tabular perfeito.

## Core Design Principles

1. **Clareza de Dados Primeiro**: O saldo, as receitas e despesas devem ser lidos instantaneamente sem ruído visual.
2. **Tipografia Tabular**: Todos os valores monetários usam `tabular-nums` para alinhamento vertical impecável.
3. **Interatividade Tátil**: Botões e seletores respondem com feedback sutil e de alta resposta (`active:scale-[0.98]`).
4. **Superfícies Elegantes**: Fundo escuro em tom zinc profundo (`#070709`), superfícies elevadas sóbrias com micro-bordas de 1px (`border-white/[0.08]`).
5. **Legibilidade WCAG 2.1 AA**: Contraste suficiente em todas as telas e estados (hover, active, disabled, empty).
