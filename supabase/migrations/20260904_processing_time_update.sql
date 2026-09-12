-- VisaDoo destination processing times update — 2026-09-04
-- Sets official working days processing times across destinations.

-- 1. UAE: 3 - 5 working days
update visa_types
set processing_time_value=5, processing_time_unit='working days'
where country_slug in ('united-arab-emirates','uae');

-- 2. Vietnam: 5 - 7 working days
update visa_types
set processing_time_value=7, processing_time_unit='working days'
where country_slug='vietnam';

-- 3. Morocco: 5 - 7 working days
update visa_types
set processing_time_value=7, processing_time_unit='working days'
where country_slug='morocco';

-- 4. Qatar: 2 - 3 working days
update visa_types
set processing_time_value=3, processing_time_unit='working days'
where country_slug='qatar';

-- 5. Sri Lanka: 1 - 2 working days
update visa_types
set processing_time_value=2, processing_time_unit='working days'
where country_slug in ('srilanka','sri-lanka');

-- 6. Thailand: 3 - 5 working days
update visa_types
set processing_time_value=5, processing_time_unit='working days'
where country_slug='thailand';

-- 7. Kenya: 3 - 5 working days
update visa_types
set processing_time_value=5, processing_time_unit='working days'
where country_slug='kenya';

-- 8. Russia: 3 - 5 working days
update visa_types
set processing_time_value=5, processing_time_unit='working days'
where country_slug='russia';

-- 9. Indonesia: 5 - 7 working days
update visa_types
set processing_time_value=7, processing_time_unit='working days'
where country_slug='indonesia';

-- 10. Azerbaijan: 5 - 7 working days
update visa_types
set processing_time_value=7, processing_time_unit='working days'
where country_slug in ('azerbaijan','azerbaijan-2');

-- 11. Bahrain: 3 - 5 working days
update visa_types
set processing_time_value=5, processing_time_unit='working days'
where country_slug='bahrain';

-- 12. Egypt: 5 - 6 working days
update visa_types
set processing_time_value=6, processing_time_unit='working days'
where country_slug in ('egypt','egypt-2');

-- 13. Philippines: 7 working days
update visa_types
set processing_time_value=7, processing_time_unit='working days'
where country_slug='philippines';

-- 14. Saudi Arabia: 5 working days
update visa_types
set processing_time_value=5, processing_time_unit='working days'
where country_slug in ('saudi-arabia','saudi');

-- 15. Oman: 3 working days
update visa_types
set processing_time_value=3, processing_time_unit='working days'
where country_slug='oman';
