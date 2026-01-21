-- Add weight column to whatsapp_cs table for weighted rotation
ALTER TABLE public.whatsapp_cs 
ADD COLUMN weight INTEGER NOT NULL DEFAULT 1;

-- Add comment for documentation
COMMENT ON COLUMN public.whatsapp_cs.weight IS 'Weight for weighted rotation distribution. Higher weight = more chats received.';