ALTER TABLE packages
ADD COLUMN cogs_data JSONB,
ADD COLUMN cogs_status TEXT DEFAULT 'Draft';
