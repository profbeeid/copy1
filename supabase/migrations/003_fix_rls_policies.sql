create policy "insert_exemplars"
  on exemplars for insert to anon, authenticated with check (true);

create policy "insert_anti_exemplars"
  on anti_exemplars for insert to anon, authenticated with check (true);

create policy "insert_rules"
  on rules for insert to anon, authenticated with check (true);

create policy "update_rules"
  on rules for update to anon, authenticated using (true);
