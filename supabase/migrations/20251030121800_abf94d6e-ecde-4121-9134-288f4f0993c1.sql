-- Add available_tiers column to packages table
ALTER TABLE packages 
ADD COLUMN available_tiers TEXT[] DEFAULT ARRAY['nyaman']::TEXT[];

-- Add comment explaining the column
COMMENT ON COLUMN packages.available_tiers IS 'Array of available tiers for this package: hemat, nyaman (best-seller), five-star';

-- Create index for better query performance
CREATE INDEX idx_packages_available_tiers ON packages USING GIN(available_tiers);