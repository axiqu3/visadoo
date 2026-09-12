-- Migration: Configure 2 Oman Visa Types
-- 2026-09-09

delete from visa_types where country_slug = 'oman' or slug in (
  'oman-10-days-tourist-visa',
  'oman-30-days-tourist-visa',
  'oman-one-year-multiple-entry'
);

insert into visa_types
(slug, name, country_slug, category, sub, price_aed, prices, days, processing_time_value, processing_time_unit, popular, active, sort_order, features, blurb)
values
(
  'oman-10-days-tourist-visa',
  '10 Days Tourist Visa',
  'oman',
  'Tourist',
  'Single Entry',
  4499,
  jsonb_build_object('INR', 4499),
  10,
  6,
  'days',
  false,
  true,
  10,
  array['Stay Period: 10 Days', 'Validity: 3 Months', 'Single Entry', 'Processing: 5 - 6 Days']::text[],
  'Oman 10 Days Tourist Visa. Stay period 10 days, validity 3 months, single entry with 5 - 6 days processing.'
),
(
  'oman-30-days-tourist-visa',
  '30 Days Tourist Visa',
  'oman',
  'Tourist',
  'Single Entry',
  7999,
  jsonb_build_object('INR', 7999),
  30,
  6,
  'days',
  true,
  true,
  20,
  array['Stay Period: 30 Days', 'Validity: 3 Months', 'Single Entry', 'Processing: 5 - 6 Days']::text[],
  'Oman 30 Days Tourist Visa. Stay period 30 days, validity 3 months, single entry with 5 - 6 days processing.'
);
