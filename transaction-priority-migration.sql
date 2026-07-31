-- Execute no SQL Editor para sincronizar a prioridade manual das despesas.
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal';
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_priority_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_priority_check CHECK (priority IN ('high', 'normal'));
CREATE INDEX IF NOT EXISTS transactions_priority_idx ON public.transactions (priority, date);
