-- Migration: Configure 4 Qatar Visa Types
-- 2026-09-09

delete from visa_types where country_slug = 'qatar' or slug in (
  'qatar-tourist-evisa',
  'qatar-tourist-visa',
  'qatar-30-days-tourist-visa-age-1-55',
  'qatar-30-days-tourist-visa-age-55-plus',
  'qatar-30-days-business-visa',
  'qatar-90-days-business-visa'
);

insert into visa_types
(slug, name, country_slug, category, sub, price_aed, prices, days, processing_time_value, processing_time_unit, popular, active, sort_order, features, blurb)
values
(
  'qatar-30-days-tourist-visa-age-1-55',
  'Qatar Tourist Visa 30 Days (Age 1–55 Years)',
  'qatar',
  'Tourist',
  'Single Entry',
  8999,
  jsonb_build_object('INR', 8999),
  30,
  6,
  'working days',
  true,
  true,
  10,
  array['Stay 30 Days', 'Validity: 3 Months', 'Single Entry', 'Processing: 5 – 6 Days']::text[],
  'Qatar Tourist Visa 30 Days (Age 1–55 Years). Single entry valid for 3 months with 5–6 days processing.'
),
(
  'qatar-30-days-tourist-visa-age-55-plus',
  'Qatar Tourist Visa 30 Days (Age 55 Years & Above)',
  'qatar',
  'Tourist',
  'Single Entry',
  13999,
  jsonb_build_object('INR', 13999),
  30,
  6,
  'working days',
  false,
  true,
  20,
  array['Stay 30 Days', 'Validity: 3 Months', 'Single Entry', 'Processing: 5 – 6 Days']::text[],
  'Qatar Tourist Visa 30 Days (Age 55 Years & Above). Single entry valid for 3 months with 5–6 days processing.'
),
(
  'qatar-30-days-business-visa',
  'Qatar Business Visa 30 Days',
  'qatar',
  'Business',
  'Single Entry',
  9999,
  jsonb_build_object('INR', 9999),
  30,
  6,
  'working days',
  false,
  true,
  30,
  array['Stay 30 Days', 'Validity: 3 Months', 'Single Entry', 'Processing: 5 – 6 Days']::text[],
  'Qatar Business Visa 30 Days. Single entry valid for 3 months with 5–6 days processing.'
),
(
  'qatar-90-days-business-visa',
  'Qatar Business Visa 90 Days',
  'qatar',
  'Business',
  'Single Entry',
  20999,
  jsonb_build_object('INR', 20999),
  90,
  6,
  'working days',
  false,
  true,
  40,
  array['Stay 90 Days', 'Validity: 3 Months', 'Single Entry', 'Processing: 5 – 6 Days']::text[],
  'Qatar Business Visa 90 Days. Single entry valid for 3 months with 5–6 days processing.'
);
