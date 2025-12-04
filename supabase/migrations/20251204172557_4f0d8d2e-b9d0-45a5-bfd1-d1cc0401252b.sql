-- Add sold out functionality to packages
ALTER TABLE public.packages 
ADD COLUMN is_sold_out boolean NOT NULL DEFAULT false,
ADD COLUMN sold_out_date timestamp with time zone,
ADD COLUMN waitlist_count integer DEFAULT 0;