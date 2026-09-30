-- Product dev has two kinds of people: the PIC who decides (product_admin, plus
-- superadmin/admin) and everyone else, who may only view and suggest.
-- Own migration file since ALTER TYPE ... ADD VALUE must be committed before
-- the new value can be used (the policies in the next migration use it).
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'product_contributor';
