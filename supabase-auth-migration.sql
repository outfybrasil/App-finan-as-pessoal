-- MIGRAÇÃO PREPARATÓRIA: NÃO EXECUTAR antes de trocar o login do frontend
-- para Supabase Auth. Faça backup e teste em um projeto de homologação.
--
-- Esta migração associa registros legados (IDs no formato email:id) aos
-- usuários de auth.users e substitui as políticas públicas por isolamento
-- baseado em auth.uid().

BEGIN;

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);
ALTER TABLE market_items ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);

UPDATE accounts AS record
SET owner_id = auth_user.id
FROM auth.users AS auth_user
WHERE record.owner_id IS NULL
  AND lower(split_part(record.id, ':', 1)) = lower(auth_user.email);

UPDATE categories AS record
SET owner_id = auth_user.id
FROM auth.users AS auth_user
WHERE record.owner_id IS NULL
  AND lower(split_part(record.id, ':', 1)) = lower(auth_user.email);

UPDATE transactions AS record
SET owner_id = auth_user.id
FROM auth.users AS auth_user
WHERE record.owner_id IS NULL
  AND lower(split_part(record.id, ':', 1)) = lower(auth_user.email);

UPDATE market_items AS record
SET owner_id = auth_user.id
FROM auth.users AS auth_user
WHERE record.owner_id IS NULL
  AND lower(split_part(record.id, ':', 1)) = lower(auth_user.email);

DO $$
DECLARE
  orphan_count bigint;
BEGIN
  SELECT
    (SELECT count(*) FROM accounts WHERE owner_id IS NULL) +
    (SELECT count(*) FROM categories WHERE owner_id IS NULL) +
    (SELECT count(*) FROM transactions WHERE owner_id IS NULL) +
    (SELECT count(*) FROM market_items WHERE owner_id IS NULL)
  INTO orphan_count;

  IF orphan_count > 0 THEN
    RAISE EXCEPTION
      'Migração interrompida: % registros não foram associados a auth.users.',
      orphan_count;
  END IF;
END $$;

ALTER TABLE accounts ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE categories ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE transactions ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE market_items ALTER COLUMN owner_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS accounts_owner_id_idx ON accounts(owner_id);
CREATE INDEX IF NOT EXISTS categories_owner_id_idx ON categories(owner_id);
CREATE INDEX IF NOT EXISTS transactions_owner_id_idx ON transactions(owner_id);
CREATE INDEX IF NOT EXISTS market_items_owner_id_idx ON market_items(owner_id);

DROP POLICY IF EXISTS "Enable all for anon accounts" ON accounts;
DROP POLICY IF EXISTS "Enable all for anon categories" ON categories;
DROP POLICY IF EXISTS "Enable all for anon transactions" ON transactions;
DROP POLICY IF EXISTS "Enable all for anon market_items" ON market_items;
DROP POLICY IF EXISTS "Enable all for anon app_users" ON app_users;

CREATE POLICY "Users manage own accounts"
  ON accounts FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users manage own categories"
  ON categories FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users manage own transactions"
  ON transactions FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users manage own market items"
  ON market_items FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- app_users deixa de ser a fonte de autenticação. Remova a tabela somente
-- depois de validar que todos os usuários e hashes legados foram migrados.
REVOKE ALL ON app_users FROM anon, authenticated;

COMMIT;
