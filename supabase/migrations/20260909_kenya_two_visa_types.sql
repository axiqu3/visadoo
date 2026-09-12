-- Migration: Configure 2 Kenya Visa Types
-- 2026-09-09

delete from visa_types where country_slug = 'kenya' or slug in (
  'kenya-tourist-visa',
  'kenya-tourist-evisa',
  'kenya-single-entry-tourist-visa',
  'kenya-single-entry-business-visa'
);

insert into visa_types
(slug, name, country_slug, category, sub, price_aed, prices, days, processing_time_value, processing_time_unit, popular, active, sort_order, features, blurb)
values
(
  'kenya-single-entry-tourist-visa',
  'Single Entry Tourist Visa',
  'kenya',
  'Tourist',
  'Single Entry',
  5999,
  jsonb_build_object('INR', 5999),
  null,
  2,
  'days',
  true,
  true,
  10,
  array['Stay Period: As per Embassy', 'Validity: 3 Months', 'Single Entry', 'Processing: Upto 2 Days']::text[],
  'Single Entry Tourist Visa for Kenya. Stay period as per embassy, single entry valid for 3 months with processing upto 2 days.'
),
(
  'kenya-single-entry-business-visa',
  'Single Entry Business Visa',
  'kenya',
  'Business',
  'Single Entry',
  5999,
  jsonb_build_object('INR', 5999),
  3,
  2,
  'days',
  false,
  true,
  20,
  array['Stay Period: 72 Hours', 'Validity: 3 Months', 'Single Entry', 'Processing: Upto 2 Days']::text[],
  'Single Entry Business Visa for Kenya. Stay period 72 hours, single entry valid for 3 months with processing upto 2 days.'
);
