-- Migration: Configure 2 Indonesia Visa Types
-- 2026-09-09

delete from visa_types where country_slug = 'indonesia' or slug in (
  'indonesia-tourist-visa',
  'indonesia-tourist-evisa',
  'indonesia-business-visa'
);

insert into visa_types
(slug, name, country_slug, category, sub, price_aed, prices, days, processing_time_value, processing_time_unit, popular, active, sort_order, features, blurb)
values
(
  'indonesia-tourist-visa',
  'Indonesia Tourist Visa',
  'indonesia',
  'Tourist',
  'Single Entry',
  8999,
  jsonb_build_object('INR', 8999),
  30,
  7,
  'working days',
  true,
  true,
  10,
  array['Stay Period: 30 Days', 'Single Entry', 'Extension: Not Permitted', 'Processing: 5-7 Working Days']::text[],
  'Indonesia Tourist Visa. Stay period 30 days, single entry, extension not permitted with 5-7 working days processing.'
),
(
  'indonesia-business-visa',
  'Indonesia Business Visa',
  'indonesia',
  'Business',
  'Single Entry',
  8999,
  jsonb_build_object('INR', 8999),
  30,
  7,
  'working days',
  false,
  true,
  20,
  array['Stay Period: 30 Days', 'Single Entry', 'Extension: Not Permitted', 'Processing: 5-7 Working Days']::text[],
  'Indonesia Business Visa. Stay period 30 days, single entry, extension not permitted with 5-7 working days processing.'
);
