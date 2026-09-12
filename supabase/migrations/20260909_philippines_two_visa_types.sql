-- Migration: Configure 2 Philippines Visa Types
-- 2026-09-09

delete from visa_types where country_slug = 'philippines' or slug in (
  'philippines-tourist-visa',
  'philippines-30-days-tourist-visa',
  'philippines-60-days-multiple-entry',
  'philippines-single-entry-visa',
  'philippines-multiple-entry-business-visa'
);

insert into visa_types
(slug, name, country_slug, category, sub, price_aed, prices, days, processing_time_value, processing_time_unit, popular, active, sort_order, features, blurb)
values
(
  'philippines-single-entry-visa',
  'Philippines Single Entry Visa',
  'philippines',
  'Tourist / Business',
  'Single Entry',
  8499,
  jsonb_build_object('INR', 8499),
  59,
  10,
  'days',
  true,
  true,
  10,
  array['Stay Period: Upto 59 Days', 'Validity: 3 Months', 'Single Entry', 'Processing: 8 - 10 Days']::text[],
  'Philippines Single Entry Visa (Tourist/Business). Stay period upto 59 days, validity 3 months, single entry with 8 - 10 days processing.'
),
(
  'philippines-multiple-entry-business-visa',
  'Philippines Multiple Entry Business Visa',
  'philippines',
  'Business',
  'Multiple Entry',
  9999,
  jsonb_build_object('INR', 9999),
  59,
  10,
  'days',
  false,
  true,
  20,
  array['Stay Period: Upto 59 Days', 'Validity: 6 Months / 1 Year', 'Multiple Entry', 'Processing: 8 - 10 Days']::text[],
  'Philippines Multiple Entry Business Visa. Stay period upto 59 days, validity 6 months / 1 year, multiple entry with 8 - 10 days processing.'
);
