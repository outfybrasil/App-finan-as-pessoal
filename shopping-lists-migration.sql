-- Execute no SQL Editor antes de sincronizar listas avançadas em uma base existente.
ALTER TABLE public.market_items ADD COLUMN IF NOT EXISTS list_id text DEFAULT 'default';
ALTER TABLE public.market_items ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.market_items ADD COLUMN IF NOT EXISTS store text;
ALTER TABLE public.market_items ADD COLUMN IF NOT EXISTS item_order integer;
ALTER TABLE public.market_items ADD COLUMN IF NOT EXISTS last_purchased_price numeric;
CREATE INDEX IF NOT EXISTS market_items_list_id_idx ON public.market_items (list_id);
