# Design System & Visual Specification: Minhas Finanças

Este documento define as regras formais de design do aplicativo **Minhas Finanças**, construído sob as diretrizes do **Impeccable Design System**.

---

## 1. Color System (Paleta de Cores)

### Superfícies Escuras (Dark Mode Dominante)
- **Canvas / Body**: `#070709` (Zinc ultra profundo sem gradientes fluorescentes)
- **Surface Level 1 (Cards & Sidebars)**: `#0f0f13`
- **Surface Level 2 (Inputs, Modais, Hover)**: `#16161d`
- **Micro-borders**: `rgba(255, 255, 255, 0.08)` / `border-white/[0.08]`

### Cores Semânticas & Sinais
- **Receita / Positivo**: Esmeralda Profundo `#10b981` (Texto/Tag) | `rgba(16, 185, 129, 0.12)` (Fundo sutil)
- **Despesa / Negativo**: Crimson `#f43f5e` (Texto/Tag) | `rgba(244, 63, 94, 0.12)` (Fundo sutil)
- **Cartão de Crédito / Alerta**: Âmbar `#f59e0b` | `rgba(245, 158, 11, 0.12)`
- **Texto Primário**: `#f4f4f6` (Alto contraste)
- **Texto Secundário**: `#a1a1aa` (Zinc 400 - WCAG AA pass em fundo escuro)
- **Texto Terciário / Labels**: `#71717a` (Zinc 500)

---

## 2. Typography (Tipografia & Hierarquia)

### Font Families
- **Headings & Display**: `Space Grotesk`, sans-serif (Tracking `-0.02em`, peso `600`/`700`)
- **Body & Controls**: `Inter`, sans-serif (Peso `400`/`500`)
- **Data, Currency & Numbers**: `JetBrains Mono`, monospace (Sempre com `tabular-nums`)

### Regras Tipográficas
- **Valores Monetários**: Sempre formatados com `tabular-nums` (`font-mono tabular-nums`) para evitar desalinhar dígitos.
- **Hierarquia**: Títulos diretos, sem kickers ou eyebrows flutuantes por cima.
- **Tamanhos**:
  - Saldo Principal: `text-3xl` / `text-4xl` (`font-bold font-mono tracking-tight`)
  - Títulos de Seção: `text-lg` / `text-xl` (`font-semibold font-display`)
  - Subtítulos / Sub-elementos: `text-sm` (`font-medium`)
  - Labels & Metadados: `text-xs` / `text-[11px]` (`font-mono` ou `font-sans text-zinc-400`)

---

## 3. Spatial System & Layout

- **Grid Main**: Layout de 12 colunas em desktop, fluxo responsivo em coluna única no mobile.
- **Card Separation**: Sem aninhamento excessivo de cards dentro de cards. Usar espaçamento negativo e divisores discretos (`border-t border-white/[0.06]`).
- **Card Radii**: `rounded-2xl` (16px) para cards principais, `rounded-xl` (12px) para botões/inputs, `rounded-full` apenas para pílulas de status ativas.

---

## 4. Motion & Tactility

- **Micro-interações**:
  - Botões & Alvos de Toque: `transition-all duration-150 active:scale-[0.98]`
  - Inputs & Hover de Cards: `hover:border-white/20 transition-colors`
- **Modais & Overlays**: Aparecem com suave fade-in (`motion.div` com `opacity: 0 -> 1`, `y: 8 -> 0`, transição `easeOut`).

---

## 5. Anti-Slop Enforcement Checklist

- [x] Sem gradientes radiais em orbes azul/roxo/ciano no fundo.
- [x] Sem cards de ícones genéricos sobre cada título de seção.
- [x] Sem texto cinza lavado sem contraste mínimo 4.5:1.
- [x] Sem bordas esquerdas grossas coloridas em listas/cards.
- [x] Sem efeito de texto em gradiente (gradient text).
- [x] Sem botões sem estado ativo/hover.
