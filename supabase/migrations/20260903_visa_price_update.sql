-- VisaDoo INR price update — 2026-09-03
-- Sets the owner-provided selling prices while keeping Visa Types editable in Admin.

-- UAE
update visa_types set price_aed=7600, prices=jsonb_build_object('INR',7600), days=30, sub='Single Entry'
where country_slug in ('united-arab-emirates','uae') and (days=30 or lower(name) like '%30%');
update visa_types set price_aed=10800, prices=jsonb_build_object('INR',10800), days=60, sub='Single Entry'
where country_slug in ('united-arab-emirates','uae') and (days=60 or lower(name) like '%60%');

-- Single 30-day products
update visa_types set price_aed=3000, prices=jsonb_build_object('INR',3000), days=30
where country_slug='vietnam';
update visa_types set price_aed=7000, prices=jsonb_build_object('INR',7000), days=30
where country_slug='morocco';
update visa_types set price_aed=1500, prices=jsonb_build_object('INR',1500), days=30
where country_slug='qatar';
update visa_types set price_aed=1500, prices=jsonb_build_object('INR',1500), days=30
where country_slug in ('srilanka','sri-lanka');
update visa_types set price_aed=3800, prices=jsonb_build_object('INR',3800), days=30
where country_slug='thailand';
update visa_types set price_aed=3800, prices=jsonb_build_object('INR',3800), days=30
where country_slug='kenya';
update visa_types set price_aed=7500, prices=jsonb_build_object('INR',7500), days=30
where country_slug='russia';
update visa_types set price_aed=3000, prices=jsonb_build_object('INR',3000), days=30
where country_slug='indonesia';
update visa_types set price_aed=3500, prices=jsonb_build_object('INR',3500), days=30
where country_slug='azerbaijan-2';

-- Bahrain products
update visa_types
set name='Bahrain 2 Weeks Single Entry', sub='Single Entry', price_aed=4500,
    prices=jsonb_build_object('INR',4500), days=14
where country_slug='bahrain' and (days=14 or lower(name) like '%14%' or lower(name) like '%2 week%');

update visa_types
set name='Bahrain One Month Multiple Entry', sub='Multiple Entry', price_aed=7000,
    prices=jsonb_build_object('INR',7000), days=30
where country_slug='bahrain' and (days=30 or lower(name) like '%30%' or lower(name) like '%one month%');

insert into visa_types
  (slug,name,country_slug,category,sub,price_aed,prices,days,processing_time_value,processing_time_unit,popular,active,sort_order,features)
select
  'bahrain-one-year-multiple-entry','Bahrain One Year Multiple Entry','bahrain','Tourist','Multiple Entry',
  14000,jsonb_build_object('INR',14000),365,1,'days',false,true,30,
  array['One year validity','Multiple entry','Online application']::text[]
where not exists (
  select 1 from visa_types where country_slug='bahrain' and (days=365 or slug='bahrain-one-year-multiple-entry' or lower(name) like '%one year%')
);

update visa_types
set name='Bahrain One Year Multiple Entry', sub='Multiple Entry', price_aed=14000,
    prices=jsonb_build_object('INR',14000), days=365
where country_slug='bahrain' and (days=365 or slug='bahrain-one-year-multiple-entry' or lower(name) like '%one year%');


-- Customer-facing processing time: show 1 day for every visa type.
update visa_types
set processing_time_value=1, processing_time_unit='days';
