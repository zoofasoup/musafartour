-- Add author_name column to articles table
ALTER TABLE public.articles 
ADD COLUMN author_name TEXT;