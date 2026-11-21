-- BRIOLLORA product analytics: total product-page views and order attribution.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS published_at timestamptz;
UPDATE public.products SET published_at = COALESCE(created_at, updated_at, now())
WHERE status = 'published' AND published_at IS NULL;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_id text;
UPDATE public.order_items oi SET product_id = p.id::text FROM public.products p
WHERE oi.product_id IS NULL AND (oi.product_name = p.name OR oi.product_name LIKE p.name || ' — %');
CREATE INDEX IF NOT EXISTS order_items_product_id_idx ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS order_items_product_order_idx ON public.order_items(product_id,order_id);
CREATE TABLE IF NOT EXISTS public.product_views (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 product_id text NOT NULL,
 viewed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS product_views_product_id_idx ON public.product_views(product_id);
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;
GRANT INSERT ON public.product_views TO anon, authenticated;
GRANT SELECT ON public.product_views TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.product_views_id_seq TO anon, authenticated;
DROP POLICY IF EXISTS product_views_public_insert_published ON public.product_views;
CREATE POLICY product_views_public_insert_published ON public.product_views FOR INSERT TO anon, authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id::text = product_views.product_id AND p.status = 'published'));
DROP POLICY IF EXISTS product_views_admin_read ON public.product_views;
CREATE POLICY product_views_admin_read ON public.product_views FOR SELECT TO authenticated USING (public.is_admin());
