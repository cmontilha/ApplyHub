-- Add industries multi-select support for companies watchlist
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS industries TEXT[];
