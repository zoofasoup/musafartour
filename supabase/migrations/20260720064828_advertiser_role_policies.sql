-- advertiser: pixel/tracking config + link/UTM analytics. View-only on click
-- analytics (whatsapp_clicks/whatsapp_conversions) - CS rotation config
-- itself stays admin/superadmin only.
CREATE POLICY "advertiser can manage marketing_settings" ON public.marketing_settings FOR ALL
  USING (has_role(auth.uid(), 'advertiser'::app_role)) WITH CHECK (has_role(auth.uid(), 'advertiser'::app_role));

CREATE POLICY "advertiser can manage short_links" ON public.short_links FOR ALL
  USING (has_role(auth.uid(), 'advertiser'::app_role)) WITH CHECK (has_role(auth.uid(), 'advertiser'::app_role));

CREATE POLICY "advertiser can view short_link_clicks" ON public.short_link_clicks FOR SELECT
  USING (has_role(auth.uid(), 'advertiser'::app_role));

CREATE POLICY "advertiser can view whatsapp_clicks" ON public.whatsapp_clicks FOR SELECT
  USING (has_role(auth.uid(), 'advertiser'::app_role));

CREATE POLICY "advertiser can view whatsapp_conversions" ON public.whatsapp_conversions FOR SELECT
  USING (has_role(auth.uid(), 'advertiser'::app_role));
