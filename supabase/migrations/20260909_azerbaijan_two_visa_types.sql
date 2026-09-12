-- Migration: Configure 2 Azerbaijan Visa Types
-- 2026-09-09

delete from visa_types where country_slug in ('azerbaijan', 'azerbaijan-2') or slug in (
  'azerbaijan-tourist-visa',
  'azerbaijan-tourist-evisa',
  'azerbaijan-business-visa',
  'azerbaijan-business-evisa'
);

insert into visa_types
(slug, name, country_slug, category, sub, price_aed, prices, days, processing_time_value, processing_time_unit, popular, active, sort_order, features, blurb)
values
(
  'azerbaijan-tourist-evisa',
  'Azerbaijan Tourist E Visa',
  'azerbaijan',
  'Tourist',
  'Single Entry',
  2899,
  jsonb_build_object('INR', 2899),
  30,
  3,
  'days',
  true,
  true,
  10,
  array['Stay Period: 30 Days', 'Validity: 3 Months', 'Single Entry', 'Processing: Upto 3 Days']::text[],
  'Azerbaijan Tourist E Visa. Stay period 30 days, validity 3 months, single entry with upto 3 days processing.'
),
(
  'azerbaijan-business-evisa',
  'Azerbaijan Business E Visa',
  'azerbaijan',
  'Business',
  'Single Entry',
  2899,
  jsonb_build_object('INR', 2899),
  30,
  3,
  'days',
  false,
  true,
  20,
  array['Stay Period: 30 Days', 'Validity: 3 Months', 'Single Entry', 'Processing: Upto 3 Days']::text[],
  'Azerbaijan Business E Visa. Stay period 30 days, validity 3 months, single entry with upto 3 days processing.'
);
