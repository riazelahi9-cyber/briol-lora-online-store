-- Guest checkout and one-time WELCOME100 first-order coupon.
alter table public.orders alter column customer_id drop not null;
alter table public.orders
  add column if not exists product_subtotal numeric(12,2) not null default 0,
  add column if not exists discount_amount numeric(12,2) not null default 0,
  add column if not exists coupon_code text;
create unique index if not exists orders_welcome100_once_per_customer
  on public.orders (customer_id)
  where customer_id is not null and coupon_code = 'WELCOME100';
