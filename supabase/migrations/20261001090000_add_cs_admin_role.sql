-- CS Administrasi (Mba Laily): records offline registrations and payments.
-- Payments she records stay "pending" until the owner (admin/superadmin) verifies them.
-- Own migration file since ALTER TYPE ... ADD VALUE must be committed before use.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cs_admin';
