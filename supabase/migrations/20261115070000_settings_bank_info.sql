-- Havale/EFT bilgileri (ödeme sayfası ve sipariş detayında gösterilir)
alter table public.settings
  add column bank_name  text not null default 'Garanti Bankası',
  add column bank_owner text not null default 'Özkan Şekerci',
  add column bank_iban  text not null default 'TR91 0006 2000 0300 0006 1823 92';
