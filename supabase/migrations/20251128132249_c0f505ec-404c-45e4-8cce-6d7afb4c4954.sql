-- Fix #6: Allow users to view their own role
CREATE POLICY "Users can view their own role" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Fix #7: Split articles policy for defense in depth
DROP POLICY IF EXISTS "Published articles are viewable by everyone" ON public.articles;

CREATE POLICY "Published articles viewable by everyone" 
ON public.articles 
FOR SELECT 
USING (status = 'published');

CREATE POLICY "Admins can view all articles" 
ON public.articles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix #7: Split packages policy for defense in depth  
DROP POLICY IF EXISTS "Packages are viewable by everyone" ON public.packages;

CREATE POLICY "Published packages viewable by everyone" 
ON public.packages 
FOR SELECT 
USING (status = 'published');

CREATE POLICY "Admins can view all packages" 
ON public.packages 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));