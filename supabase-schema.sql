CREATE TABLE IF NOT EXISTS accounts (
  id text PRIMARY KEY,
  name text NOT NULL,
  balance numeric NOT NULL,
  type text NOT NULL,
  color text,
  credit_limit numeric,
  closing_day integer,
  due_day integer,
  payment_account_id text,
  minimum_payment_rate numeric,
  user_id text
);

CREATE TABLE IF NOT EXISTS app_users (
  email text PRIMARY KEY,
  name text,
  password_hash text,
  created_at timestamp with time zone default now()
);

CREATE TABLE IF NOT EXISTS categories (
  id text PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL,
  is_system boolean,
  icon_name text
);

CREATE TABLE IF NOT EXISTS transactions (
  id text PRIMARY KEY,
  description text NOT NULL,
  amount numeric NOT NULL,
  type text NOT NULL,
  category text NOT NULL,
  sub_category text,
  account_id text NOT NULL,
  date text NOT NULL,
  status text NOT NULL,
  is_fixed boolean,
  is_installment boolean,
  installment_info jsonb
  ,payment_date text
  ,kind text
  ,credit_card_id text
  ,invoice_id text
);

CREATE TABLE IF NOT EXISTS market_items (
  id text PRIMARY KEY,
  name text NOT NULL,
  estimated_price numeric,
  quantity numeric,
  in_cart boolean,
  list_id text DEFAULT 'default',
  category text,
  store text,
  item_order integer,
  last_purchased_price numeric
);

-- Set up Row Level Security (RLS) to allow public access (since the app currently uses anon keys without user login)
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for anon accounts" ON accounts;
CREATE POLICY "Enable all for anon accounts" ON accounts FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for anon app_users" ON app_users;
CREATE POLICY "Enable all for anon app_users" ON app_users FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for anon categories" ON categories;
CREATE POLICY "Enable all for anon categories" ON categories FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for anon transactions" ON transactions;
CREATE POLICY "Enable all for anon transactions" ON transactions FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE market_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for anon market_items" ON market_items;
CREATE POLICY "Enable all for anon market_items" ON market_items FOR ALL TO anon USING (true) WITH CHECK (true);
