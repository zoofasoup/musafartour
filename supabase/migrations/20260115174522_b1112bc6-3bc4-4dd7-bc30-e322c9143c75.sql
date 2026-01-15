
-- Create agent_levels table
CREATE TABLE public.agent_levels (
  level_name text PRIMARY KEY,
  min_sales integer NOT NULL DEFAULT 0,
  max_sales integer,
  commission_rate_min numeric NOT NULL DEFAULT 4.5,
  commission_rate_max numeric NOT NULL DEFAULT 5.0,
  benefits text[] DEFAULT '{}'::text[],
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert default levels
INSERT INTO public.agent_levels (level_name, min_sales, max_sales, commission_rate_min, commission_rate_max, benefits) VALUES
  ('bronze', 0, 2, 4.5, 4.5, ARRAY['Komisi standar 4.5%', 'Akses marketing kit dasar', 'Support via WhatsApp']),
  ('silver', 3, 9, 4.75, 5.0, ARRAY['Komisi 4.75-5%', 'Akses semua marketing kit', 'Priority support', 'Bonus referral Rp 100.000']),
  ('gold', 10, 24, 5.0, 5.5, ARRAY['Komisi 5-5.5%', 'Exclusive training', 'Dedicated account manager', 'Bonus quarterly', 'Free merchandise']),
  ('platinum', 25, NULL, 5.5, 6.0, ARRAY['Komisi 5.5-6%', 'VIP support 24/7', 'Annual reward trip', 'Custom marketing materials', 'Leadership bonuses']);

-- Enable RLS
ALTER TABLE public.agent_levels ENABLE ROW LEVEL SECURITY;

-- Levels viewable by everyone
CREATE POLICY "Levels viewable by everyone" ON public.agent_levels FOR SELECT USING (true);

-- Admins can manage levels
CREATE POLICY "Admins can manage levels" ON public.agent_levels FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create agent_badges table
CREATE TABLE public.agent_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT 'award',
  requirement_type text NOT NULL,
  requirement_value integer NOT NULL DEFAULT 1,
  points_reward integer NOT NULL DEFAULT 100,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert default badges
INSERT INTO public.agent_badges (name, description, icon, requirement_type, requirement_value, points_reward) VALUES
  ('Welcome Agent', 'Selamat bergabung sebagai Musafar Agent!', 'user-plus', 'registration', 1, 50),
  ('First Sale', 'Closing pertama kamu!', 'trophy', 'sales_count', 1, 200),
  ('Rising Star', 'Mencapai 5 penjualan', 'star', 'sales_count', 5, 500),
  ('10 Sales Club', 'Elite club dengan 10+ penjualan', 'award', 'sales_count', 10, 1000),
  ('Sales Master', 'Legenda dengan 25+ penjualan', 'crown', 'sales_count', 25, 2500),
  ('Referral Champion', 'Mengajak 3 agent baru', 'users', 'referrals', 3, 300),
  ('Network Builder', 'Mengajak 10 agent baru', 'network', 'referrals', 10, 1000),
  ('Streak 3', '3 bulan berturut-turut ada penjualan', 'flame', 'streak', 3, 500),
  ('Streak 6', '6 bulan berturut-turut ada penjualan', 'zap', 'streak', 6, 1000),
  ('Quick Closer', 'Closing dalam 24 jam setelah inquiry', 'clock', 'quick_close', 1, 300),
  ('Top 10', 'Masuk leaderboard Top 10', 'medal', 'leaderboard', 10, 500),
  ('Monthly Champion', 'Juara 1 bulan ini', 'trophy', 'monthly_champion', 1, 1500);

-- Enable RLS
ALTER TABLE public.agent_badges ENABLE ROW LEVEL SECURITY;

-- Badges viewable by everyone
CREATE POLICY "Badges viewable by everyone" ON public.agent_badges FOR SELECT USING (true);

-- Admins can manage badges
CREATE POLICY "Admins can manage badges" ON public.agent_badges FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create agent_earned_badges table
CREATE TABLE public.agent_earned_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.agent_badges(id) ON DELETE CASCADE,
  earned_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(agent_id, badge_id)
);

-- Enable RLS
ALTER TABLE public.agent_earned_badges ENABLE ROW LEVEL SECURITY;

-- Agents can view their own badges
CREATE POLICY "Agents can view their own badges" ON public.agent_earned_badges FOR SELECT
  USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

-- Admins can manage all badges
CREATE POLICY "Admins can manage earned badges" ON public.agent_earned_badges FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create agent_challenges table
CREATE TABLE public.agent_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  reward_type text NOT NULL DEFAULT 'cash',
  reward_value text NOT NULL,
  target_type text NOT NULL DEFAULT 'sales',
  target_value integer NOT NULL DEFAULT 1,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert sample challenges
INSERT INTO public.agent_challenges (title, description, reward_type, reward_value, target_type, target_value, start_date, end_date) VALUES
  ('First Blood', 'Closing pertama kamu di bulan ini!', 'cash', '500000', 'sales', 1, '2025-01-01', '2025-01-31'),
  ('Triple Crown', 'Raih 3 penjualan dalam satu bulan', 'cash', '2000000', 'sales', 3, '2025-01-01', '2025-01-31'),
  ('Referral Master', 'Ajak 2 agent baru bergabung', 'points', '1000', 'referrals', 2, '2025-01-01', '2025-01-31'),
  ('Super Seller', 'Jual 5 paket dalam satu bulan', 'badge', 'Sales Master', 'sales', 5, '2025-01-01', '2025-01-31');

-- Enable RLS
ALTER TABLE public.agent_challenges ENABLE ROW LEVEL SECURITY;

-- Challenges viewable by authenticated
CREATE POLICY "Challenges viewable by authenticated" ON public.agent_challenges FOR SELECT
  USING (is_active = true);

-- Admins can manage challenges
CREATE POLICY "Admins can manage challenges" ON public.agent_challenges FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create agent_challenge_progress table
CREATE TABLE public.agent_challenge_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES public.agent_challenges(id) ON DELETE CASCADE,
  current_progress integer NOT NULL DEFAULT 0,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(agent_id, challenge_id)
);

-- Enable RLS
ALTER TABLE public.agent_challenge_progress ENABLE ROW LEVEL SECURITY;

-- Agents can view their own progress
CREATE POLICY "Agents can view their own progress" ON public.agent_challenge_progress FOR SELECT
  USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

-- Agents can update their own progress
CREATE POLICY "Agents can update their own progress" ON public.agent_challenge_progress FOR UPDATE
  USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

-- Agents can insert their own progress
CREATE POLICY "Agents can insert their own progress" ON public.agent_challenge_progress FOR INSERT
  WITH CHECK (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

-- Admins can manage all progress
CREATE POLICY "Admins can manage challenge progress" ON public.agent_challenge_progress FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create agent_points table for rewards store
CREATE TABLE public.agent_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE UNIQUE,
  total_points integer NOT NULL DEFAULT 0,
  redeemed_points integer NOT NULL DEFAULT 0,
  available_points integer GENERATED ALWAYS AS (total_points - redeemed_points) STORED,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_points ENABLE ROW LEVEL SECURITY;

-- Agents can view their own points
CREATE POLICY "Agents can view their own points" ON public.agent_points FOR SELECT
  USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

-- Admins can manage all points
CREATE POLICY "Admins can manage points" ON public.agent_points FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create rewards table
CREATE TABLE public.agent_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  points_cost integer NOT NULL,
  category text NOT NULL DEFAULT 'merchandise',
  image_url text,
  stock integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert sample rewards
INSERT INTO public.agent_rewards (name, description, points_cost, category, stock) VALUES
  ('Kaos Musafar', 'Kaos eksklusif Musafar Agent', 500, 'merchandise', 50),
  ('Tumbler Premium', 'Tumbler stainless steel 500ml', 750, 'merchandise', 30),
  ('Tas Travel', 'Tas travel premium branded', 1500, 'merchandise', 20),
  ('Voucher Rp 100.000', 'Potongan biaya admin', 1000, 'voucher', NULL),
  ('Free Training', 'Akses training closing techniques', 2000, 'training', 10),
  ('Bonus Cash Rp 500.000', 'Transfer langsung ke rekening', 5000, 'cash', NULL);

-- Enable RLS
ALTER TABLE public.agent_rewards ENABLE ROW LEVEL SECURITY;

-- Rewards viewable by authenticated
CREATE POLICY "Rewards viewable by authenticated" ON public.agent_rewards FOR SELECT
  USING (is_active = true);

-- Admins can manage rewards
CREATE POLICY "Admins can manage rewards" ON public.agent_rewards FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));
