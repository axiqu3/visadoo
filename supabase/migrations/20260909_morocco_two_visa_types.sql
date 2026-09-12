-- Migration: Configure Morocco Tourist and Business Visa Types
-- 2026-09-09

delete from visa_types where country_slug = 'morocco' or slug in (
  'morocco-tourist-visa',
  'morocco-tourist-evisa',
  'morocco-business-visa',
  'morocco-business-evisa'
);

insert into visa_types
(slug, name, country_slug, category, sub, price_aed, prices, days, processing_time_value, processing_time_unit, popular, active, sort_order, features, blurb)
values
(
  'morocco-tourist-visa',
  'Morocco Tourist eVisa',
  'morocco',
  'Tourist',
  'Single Entry',
  4149,
  jsonb_build_object('INR', 4149),
  90,
  5,
  'working days',
  true,
  true,
  10,
  array['Stay up to 90 Days', 'Validity: Up to 90 Days', 'Single Entry', 'Processing: 3 – 5 Days']::text[],
  'Official Morocco Tourist eVisa. Single entry valid for up to 90 days with 3–5 days processing.'
),
(
  'morocco-business-visa',
  'Morocco Business eVisa',
  'morocco',
  'Business',
  'Single Entry',
  4149,
  jsonb_build_object('INR', 4149),
  90,
  7,
  'working days',
  false,
  true,
  20,
  array['Stay up to 90 Days', 'Validity: Up to 90 Days', 'Single Entry', 'Processing: 5 – 7 Days']::text[],
  'Official Morocco Business eVisa. Single entry valid for up to 90 days with 5–7 days processing.'
);
