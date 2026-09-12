-- Migration: Configure 2 Russia Visa Types
-- 2026-09-09

delete from visa_types where country_slug = 'russia' or slug in (
  'russia-tourist-visa',
  'russia-tourist-evisa',
  'russia-business-visa'
);

insert into visa_types
(slug, name, country_slug, category, sub, price_aed, prices, days, processing_time_value, processing_time_unit, popular, active, sort_order, features, blurb)
values
(
  'russia-tourist-visa',
  'Russia Tourist Visa',
  'russia',
  'Tourist',
  'Single Entry',
  4999,
  jsonb_build_object('INR', 4999),
  30,
  12,
  'days',
  true,
  true,
  10,
  array['Stay Period: 30 Days', 'Validity: As per Embassy', 'Single Entry', 'Processing: 10 - 12 Days']::text[],
  'Russia Tourist Visa. Stay period 30 days, single entry, validity as per embassy with 10 - 12 days processing.'
),
(
  'russia-business-visa',
  'Russia Business Visa',
  'russia',
  'Business',
  'Single Entry',
  4999,
  jsonb_build_object('INR', 4999),
  90,
  12,
  'days',
  false,
  true,
  20,
  array['Stay Period: 3 Months', 'Validity: As per Embassy', 'Single Entry', 'Processing: 10 - 12 Days']::text[],
  'Russia Business Visa. Stay period 3 months, single entry, validity as per embassy with 10 - 12 days processing.'
);
