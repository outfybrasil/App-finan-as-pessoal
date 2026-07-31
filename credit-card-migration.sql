-- Fase 3: separa a identidade de compras, faturas e pagamentos de cartão.
-- Compatível com registros antigos: as novas colunas aceitam NULL.

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS payment_account_id text;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS minimum_payment_rate numeric;

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_date text;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS kind text;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS credit_card_id text;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS invoice_id text;

CREATE INDEX IF NOT EXISTS transactions_credit_card_id_idx ON transactions (credit_card_id);
CREATE INDEX IF NOT EXISTS transactions_invoice_id_idx ON transactions (invoice_id);
CREATE INDEX IF NOT EXISTS transactions_card_invoice_idx ON transactions (credit_card_id, invoice_id);

ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_minimum_payment_rate_check;
ALTER TABLE accounts ADD CONSTRAINT accounts_minimum_payment_rate_check
  CHECK (minimum_payment_rate IS NULL OR (minimum_payment_rate >= 0 AND minimum_payment_rate <= 1));

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_kind_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_kind_check
  CHECK (kind IS NULL OR kind IN ('transaction', 'card_purchase', 'invoice_payment'));
