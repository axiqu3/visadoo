-- Migration: Configure 3 Vietnam Visa Types with verified fees, processing times, validity, stay periods
-- 2026-09-08

delete from visa_types where country_slug = 'vietnam' or slug in (
  'vietnam-tourist-visa',
  'vietnam-tourist-evisa',
  'vietnam-tourist-visa-express',
  'vietnam-tourist-visa-super-express'
);

insert into visa_types
(slug, name, country_slug, category, sub, price_aed, prices, days, processing_time_value, processing_time_unit, popular, active, sort_order, features, blurb)
values
(
  'vietnam-tourist-visa',
  'Tourist eVisa',
  'vietnam',
  'Tourist',
  'Single Entry',
  2999,
  jsonb_build_object('INR', 2999),
  30,
  5,
  'working days',
  true,
  true,
  10,
  array['Stay up to 30 Days', 'Validity: 30 Days', 'Single Entry', 'Processing: 3–5 Working Days']::text[],
  '30 Days Tourist eVisa for Vietnam. Single entry valid for 30 days with 3-5 working days processing.'
),
(
  'vietnam-tourist-visa-express',
  'Tourist eVisa (Express)',
  'vietnam',
  'Tourist',
  'Single Entry',
  9999,
  jsonb_build_object('INR', 9999),
  30,
  24,
  'hours',
  false,
  true,
  20,
  array['Express Processing: 24 Hours', 'Stay up to 30 Days', 'Validity: 30 Days', 'Single Entry']::text[],
  'Express Tourist eVisa for Vietnam. Fast expedited processing within 24 hours.'
),
(
  'vietnam-tourist-visa-super-express',
  'Tourist eVisa (Super Express)',
  'vietnam',
  'Tourist',
  'Single Entry',
  10999,
  jsonb_build_object('INR', 10999),
  30,
  12,
  'hours',
  false,
  true,
  30,
  array['Super Express: 12 Hours', 'Stay up to 30 Days', 'Validity: 30 Days', 'Single Entry']::text[],
  'Super Express Tourist eVisa for Vietnam. Urgent priority processing within 12 hours.'
);