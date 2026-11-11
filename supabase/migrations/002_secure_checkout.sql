alter table public.orders add column if not exists country text, add column if not exists order_type text, add column if not exists notes text;
do $$ declare p record; begin
for p in select schemaname,tablename,policyname from pg_policies where schemaname='public' and tablename in ('orders','order_items')
loop execute format('drop policy if exists %I on %I.%I',p.policyname,p.schemaname,p.tablename); end loop; end $$;
create policy "Customers and admins can read orders" on public.orders for select to authenticated using(customer_id=auth.uid() or public.is_admin());
create policy "Admins can update orders" on public.orders for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Customers and admins can read order items" on public.order_items for select to authenticated using(exists(select 1 from public.orders o where o.id=order_items.order_id and (o.customer_id=auth.uid() or public.is_admin())));
revoke insert,update,delete on public.orders from anon,authenticated;
revoke insert,update,delete on public.order_items from anon,authenticated;
grant select on public.orders,public.order_items to authenticated;
grant update on public.orders to authenticated;
