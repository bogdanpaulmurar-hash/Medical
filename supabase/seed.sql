-- Date de început FICTIVE (fără pacienți). Rulați o singură dată, opțional.
insert into public.cabinets (name, sort_order) values ('Cabinet 1', 1), ('Cabinet 2', 2) on conflict do nothing;
insert into public.rooms (cabinet_id, name, sort_order)
select c.id, s.name, s.ord from public.cabinets c
cross join (values ('Salon A', 1), ('Salon B', 2)) as s(name, ord)
where c.name = 'Cabinet 1' on conflict do nothing;
insert into public.rooms (cabinet_id, name, sort_order)
select id, 'Salon C', 1 from public.cabinets where name = 'Cabinet 2' on conflict do nothing;
insert into public.procedures (name, default_duration, sort_order) values
  ('Consult', 30, 1), ('Ecografie', 20, 2), ('Procedură minoră', 60, 3) on conflict do nothing;
