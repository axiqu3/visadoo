-- Migration: Configure 2 Egypt Visa Types
-- 2026-09-09

delete from visa_types where country_slug in ('egypt', 'egypt-2') or slug in (
  'egypt-tourist-visa',
  'egypt-business-visa',
  'egypt-30-days-tourist-visa',
  'egypt-multiple-entry-visa'
);

insert into visa_types
(slug, name, country_slug, category, sub, price_aed, prices, days, processing_time_value, processing_time_unit, popular, active, sort_order, features, blurb)
values
(
  'egypt-tourist-visa',
  'Egypt Tourist Visa',
  'egypt',
  'Tourist',
  'Single Entry',
  5999,
  jsonb_build_object('INR', 5999),
  30,
  15,
  'days',
  true,
  true,
  10,
  array['Stay Period: 30 Days', 'Validity: 30 Days', 'Single Entry', 'Processing: 10 - 15 Days']::text[],
  'Egypt Tourist Visa. Stay period 30 days, validity 30 days, single entry with 10 - 15 days processing.'
),
(
  'egypt-business-visa',
  'Egypt Business Visa',
  'egypt',
  'Business',
  'Single Entry',
  6999,
  jsonb_build_object('INR', 6999),
  30,
  15,
  'days',
  false,
  true,
  20,
  array['Stay Period: 30 Days', 'Validity: 30 Days', 'Single Entry', 'Processing: 10 - 15 Days']::text[],
  'Egypt Business Visa. Stay period 30 days, validity 30 days, single entry with 10 - 15 days processing.'
);
