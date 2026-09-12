-- VisaDoo configured rates for Egypt, Philippines, Saudi Arabia and Oman.
-- Safe to run after the existing visa price migration.

-- Remove old/dummy variants for these four destinations so Admin/Public show one configured 30-day tourist visa.
delete from visa_types where country_slug in ('egypt','egypt-2','philippines','oman','saudi-arabia','saudi');

insert into visa_types
(slug,name,country_slug,category,sub,price_aed,prices,days,processing_time_value,processing_time_unit,popular,active,sort_order,features)
values
('egypt-30-days-tourist-visa','Egypt Tourist Visa','egypt','Tourist','Single Entry',4000,jsonb_build_object('INR',4000),30,6,'working days',true,true,10,array['30 days visa','Single entry','5-6 working days']::text[]),
('philippines-30-days-tourist-visa','Philippines Tourist Visa','philippines','Tourist','Single Entry',7500,jsonb_build_object('INR',7500),30,7,'working days',true,true,10,array['30 days visa','Single entry','7 working days']::text[]),
('saudi-arabia-30-days-tourist-visa','Saudi Arabia Tourist Visa','saudi-arabia','Tourist','Single Entry',16000,jsonb_build_object('INR',16000),30,5,'working days',true,true,10,array['30 days visa','Single entry','5 working days']::text[]),
('oman-30-days-tourist-visa','Oman Tourist Visa','oman','Tourist','Single Entry',3000,jsonb_build_object('INR',3000),30,3,'working days',true,true,10,array['30 days visa','Single entry','3 working days']::text[]);
