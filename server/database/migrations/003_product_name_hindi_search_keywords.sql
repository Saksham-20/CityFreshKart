-- Bilingual search: Hindi display name + optional synonym keywords
ALTER TABLE products ADD COLUMN IF NOT EXISTS name_hindi TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_keywords TEXT;

COMMENT ON COLUMN products.name_hindi IS 'Hindi display/search name (Devanagari)';
COMMENT ON COLUMN products.search_keywords IS 'Optional comma/pipe-separated synonyms (English/Hindi)';
