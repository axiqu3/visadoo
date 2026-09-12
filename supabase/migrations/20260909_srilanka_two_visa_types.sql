-- Migration: Configure 2 Sri Lanka Visa Types
-- 2026-09-09

delete from visa_types where country_slug in ('srilanka', 'sri-lanka') or slug in (
  'srilanka-tourist-visa',
  'srilanka-tourist-eta',
  'srilanka-30-days-tourist-visa',
  'srilanka-30-days-business-visa'
);

insert into visa_types
(slug, name, country_slug, category, sub, price_aed, prices, days, processing_time_value, processing_time_unit, popular, active, sort_order, features, blurb)
values
(
  'srilanka-30-days-tourist-visa',
  '30 Days Sri Lanka Tourist Visa',
  'srilanka',
  'Tourist',
  'Double Entry',
  999,
  jsonb_build_object('INR', 999),
  30,
  48,
  'hours',
  true,
  true,
  10,
  array['Stay: Upto 30 Days', 'Validity: 6 Months', 'Double Entry', 'Processing: 24 to 48 Hours']::text[],
  '30 Days Sri Lanka Tourist Visa. Double entry valid for 6 months with 24 to 48 hours processing.'
),
(
  'srilanka-30-days-business-visa',
  '30 Days Sri Lanka Business Visa',
  'srilanka',
  'Business',
  'Multiple Entry',
  3499,
  jsonb_build_object('INR', 3499),
  30,
  48,
  'hours',
  false,
  true,
  20,
  array['Stay: Upto 30 Days', 'Validity: 6 Months', 'Multiple Entry', 'Processing: 24 to 48 Hours']::text[],
  '30 Days Sri Lanka Business Visa. Multiple entry valid for 6 months with 24 to 48 hours processing.'
);
