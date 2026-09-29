-- Replace the 5 original placeholder testimonials with the real Google reviews
-- added in 20260928140000. Deactivating (not deleting) so this is reversible.
UPDATE public.testimonials
  SET is_active = false
  WHERE name IN ('Abyan Dzaki', 'Rose Diana', 'Eka Widi', 'Mega Ilhami', 'Rizka Desita')
    AND display_order = 0;
