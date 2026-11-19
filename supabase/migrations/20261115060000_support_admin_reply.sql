-- Admin'in destek talebine yazdığı yanıt (müşteriye e-postayla gider, hesabında da görünür)
alter table public.support_requests
  add column admin_reply text check (char_length(admin_reply) <= 3000),
  add column replied_at timestamptz;

create index if not exists support_requests_status_idx on public.support_requests (status, created_at desc);
