# Minhas Finanças

Aplicação web para controle financeiro pessoal, com transações, contas,
calendário, metas, lista de mercado, relatórios e assistente financeiro.

## Planejamento

O roteiro técnico das próximas etapas, incluindo segurança, correção dos
totais, cartões e o Planejador de Cenários, está em
[`docs/PLANO_DE_EVOLUCAO.md`](docs/PLANO_DE_EVOLUCAO.md).

## Desenvolvimento

Requisitos: Node.js 20+ e npm.

```bash
npm install
copy .env.example .env
npm run dev
```

A aplicação fica disponível em `http://localhost:3000`.

## Comandos

- `npm run dev`: servidor Express com Vite em modo de desenvolvimento.
- `npm run lint`: validação TypeScript sem emissão de arquivos.
- `npm run build`: build de produção do cliente e do servidor.
- `npm start`: executa o build de produção.
- `npm run clean`: remove os artefatos gerados em `dist`.

## Configuração

Copie `.env.example` para `.env` e preencha as integrações desejadas. Sem
Supabase, os dados ficam apenas no navegador. Sem `GEMINI_API_KEY`, somente o
assistente de IA fica indisponível.

As chaves VAPID e as inscrições push são dados privados de ambiente e não devem
ser versionadas. O esquema atual do Supabase mantém compatibilidade com a
aplicação, mas as políticas anônimas em `supabase-schema.sql` precisam ser
migradas para Supabase Auth + RLS por usuário antes de exposição pública.

O arquivo `supabase-auth-migration.sql` contém a migração preparatória. Ele não
deve ser executado antes de o frontend usar sessões reais do Supabase Auth.

## Qualidade

```bash
npm run lint
npm test
npm run build
```

Os testes unitários cobrem datas de parcelas, mudança de status e entrada de
valores monetários. Novas regras financeiras devem ser adicionadas em
`src/lib/finance.ts` com testes correspondentes.
