-- Populate Hindi names and keywords for common produce (safe to re-run)
UPDATE products SET name_hindi = 'टमाटर', search_keywords = COALESCE(NULLIF(TRIM(search_keywords), ''), 'tomato,tamatar,टमाटर')
WHERE LOWER(name) LIKE '%tomato%' AND (name_hindi IS NULL OR name_hindi = '');

UPDATE products SET name_hindi = 'आलू', search_keywords = COALESCE(NULLIF(TRIM(search_keywords), ''), 'potato,aloo,आलू')
WHERE LOWER(name) LIKE '%potato%' AND (name_hindi IS NULL OR name_hindi = '');

UPDATE products SET name_hindi = 'प्याज़', search_keywords = COALESCE(NULLIF(TRIM(search_keywords), ''), 'onion,pyaaz,प्याज')
WHERE LOWER(name) LIKE '%onion%' AND (name_hindi IS NULL OR name_hindi = '');

UPDATE products SET name_hindi = 'अदरक', search_keywords = COALESCE(NULLIF(TRIM(search_keywords), ''), 'ginger,adrak,अदरक')
WHERE LOWER(name) LIKE '%ginger%' AND (name_hindi IS NULL OR name_hindi = '');

UPDATE products SET name_hindi = 'लहसुन', search_keywords = COALESCE(NULLIF(TRIM(search_keywords), ''), 'garlic,lahsun,लहसुन')
WHERE LOWER(name) LIKE '%garlic%' AND (name_hindi IS NULL OR name_hindi = '');

UPDATE products SET name_hindi = 'हरी मिर्च', search_keywords = COALESCE(NULLIF(TRIM(search_keywords), ''), 'green chilli,mirch,मिर्च')
WHERE (LOWER(name) LIKE '%chilli%' OR LOWER(name) LIKE '%chili%') AND (name_hindi IS NULL OR name_hindi = '');

UPDATE products SET name_hindi = 'भिंडी', search_keywords = COALESCE(NULLIF(TRIM(search_keywords), ''), 'okra,bhindi,भिंडी')
WHERE (LOWER(name) LIKE '%okra%' OR LOWER(name) LIKE '%ladyfinger%') AND (name_hindi IS NULL OR name_hindi = '');

UPDATE products SET name_hindi = 'गाजर', search_keywords = COALESCE(NULLIF(TRIM(search_keywords), ''), 'carrot,gajar,गाजर')
WHERE LOWER(name) LIKE '%carrot%' AND (name_hindi IS NULL OR name_hindi = '');

UPDATE products SET name_hindi = 'पालक', search_keywords = COALESCE(NULLIF(TRIM(search_keywords), ''), 'spinach,palak,पालक')
WHERE LOWER(name) LIKE '%spinach%' AND (name_hindi IS NULL OR name_hindi = '');

UPDATE products SET name_hindi = 'केला', search_keywords = COALESCE(NULLIF(TRIM(search_keywords), ''), 'banana,kela,केला')
WHERE LOWER(name) LIKE '%banana%' AND (name_hindi IS NULL OR name_hindi = '');

UPDATE products SET name_hindi = 'संतरा', search_keywords = COALESCE(NULLIF(TRIM(search_keywords), ''), 'orange,santara,संतरा')
WHERE LOWER(name) LIKE '%orange%' AND LOWER(name) NOT LIKE '%carrot%' AND (name_hindi IS NULL OR name_hindi = '');

UPDATE products SET name_hindi = 'सेब', search_keywords = COALESCE(NULLIF(TRIM(search_keywords), ''), 'apple,seb,सेब')
WHERE LOWER(name) LIKE '%apple%' AND (name_hindi IS NULL OR name_hindi = '');
