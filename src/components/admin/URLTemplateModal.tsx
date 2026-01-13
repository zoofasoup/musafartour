import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Copy, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import {
  type URLTemplate,
  type UTMParams,
  UTM_PRESETS,
  formatUTMParam,
  buildTemplateUrl,
} from '@/lib/urlTemplateManager';

interface URLTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: URLTemplate | null;
  onSave: (data: {
    name: string;
    base_url: string;
    custom_message?: string;
    utm_params: UTMParams;
  }) => void;
}

const URLTemplateModal = ({ open, onOpenChange, template, onSave }: URLTemplateModalProps) => {
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('musafartour.com/chat');
  const [customMessage, setCustomMessage] = useState('');
  const [utmSource, setUtmSource] = useState('');
  const [utmMedium, setUtmMedium] = useState('');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [utmContent, setUtmContent] = useState('');
  const [utmTerm, setUtmTerm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (template) {
      setName(template.name);
      setBaseUrl(template.base_url || 'musafartour.com/chat');
      setCustomMessage(template.custom_message || '');
      setUtmSource(template.utm_params.utm_source || '');
      setUtmMedium(template.utm_params.utm_medium || '');
      setUtmCampaign(template.utm_params.utm_campaign || '');
      setUtmContent(template.utm_params.utm_content || '');
      setUtmTerm(template.utm_params.utm_term || '');
    } else {
      resetForm();
    }
  }, [template, open]);

  const resetForm = () => {
    setName('');
    setBaseUrl('musafartour.com/chat');
    setCustomMessage('');
    setUtmSource('');
    setUtmMedium('');
    setUtmCampaign('');
    setUtmContent('');
    setUtmTerm('');
    setErrors({});
  };

  const applyPreset = (preset: typeof UTM_PRESETS[0]) => {
    setUtmSource(preset.utm_source);
    setUtmMedium(preset.utm_medium);
    toast.success(`Preset "${preset.name}" diterapkan`);
  };

  const handleUTMChange = (
    setter: (value: string) => void,
    value: string
  ) => {
    setter(formatUTMParam(value));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Nama template wajib diisi';
    } else if (name.length > 100) {
      newErrors.name = 'Nama maksimal 100 karakter';
    }

    // Only validate UTM if at least one is filled
    const hasAnyUtm = utmSource || utmMedium || utmCampaign;
    if (hasAnyUtm) {
      if (!utmSource) newErrors.utmSource = 'UTM source wajib diisi jika menggunakan UTM';
      if (!utmMedium) newErrors.utmMedium = 'UTM medium wajib diisi jika menggunakan UTM';
      if (!utmCampaign) newErrors.utmCampaign = 'UTM campaign wajib diisi jika menggunakan UTM';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    onSave({
      name: name.trim(),
      base_url: baseUrl.trim() || 'musafartour.com/chat',
      custom_message: customMessage.trim() || undefined,
      utm_params: {
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        utm_content: utmContent || undefined,
        utm_term: utmTerm || undefined,
      },
    });

    onOpenChange(false);
    resetForm();
  };

  // Build preview URL
  const previewTemplate: URLTemplate = {
    id: '',
    name: '',
    base_url: baseUrl || 'musafartour.com/chat',
    custom_message: customMessage,
    utm_params: {
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_content: utmContent,
      utm_term: utmTerm,
    },
    created_at: '',
    use_count: 0,
  };
  const previewUrl = buildTemplateUrl(previewTemplate);

  const copyPreview = () => {
    navigator.clipboard.writeText(`https://${previewUrl}`);
    toast.success('URL preview berhasil disalin!');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? '✏️ Edit URL Template' : '➕ Tambah URL Template'}
          </DialogTitle>
          <DialogDescription>
            Buat template URL dengan parameter UTM untuk tracking campaign
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Template Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Template Name</Label>
            <Input
              id="name"
              placeholder="Instagram Story - Promo Ramadhan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          {/* Base URL */}
          <div className="space-y-2">
            <Label htmlFor="baseUrl">Base URL</Label>
            <Input
              id="baseUrl"
              placeholder="musafartour.com/chat"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Lightbulb className="w-3 h-3" />
              Default: musafartour.com/chat
            </p>
          </div>

          {/* Custom Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Custom Message (optional)</Label>
            <Textarea
              id="message"
              placeholder="Saya mau tanya paket Ramadhan"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={2}
            />
          </div>

          <Separator />

          {/* UTM Presets */}
          <div className="space-y-3">
            <Label>Quick Presets</Label>
            <div className="flex flex-wrap gap-2">
              {UTM_PRESETS.map((preset) => (
                <Button
                  key={preset.name}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(preset)}
                  className="text-xs"
                >
                  {preset.icon} {preset.name}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* UTM Parameters */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">UTM Parameters</Label>

            {/* UTM Source */}
            <div className="space-y-2">
              <Label htmlFor="utmSource">
                UTM Source <Badge variant="secondary" className="ml-2 text-xs">required*</Badge>
              </Label>
              <Input
                id="utmSource"
                placeholder="instagram"
                value={utmSource}
                onChange={(e) => handleUTMChange(setUtmSource, e.target.value)}
                className={errors.utmSource ? 'border-destructive' : ''}
              />
              <p className="text-xs text-muted-foreground">
                💡 Contoh: instagram, facebook, google, tiktok
              </p>
              {errors.utmSource && <p className="text-sm text-destructive">{errors.utmSource}</p>}
            </div>

            {/* UTM Medium */}
            <div className="space-y-2">
              <Label htmlFor="utmMedium">
                UTM Medium <Badge variant="secondary" className="ml-2 text-xs">required*</Badge>
              </Label>
              <Input
                id="utmMedium"
                placeholder="story"
                value={utmMedium}
                onChange={(e) => handleUTMChange(setUtmMedium, e.target.value)}
                className={errors.utmMedium ? 'border-destructive' : ''}
              />
              <p className="text-xs text-muted-foreground">
                💡 Contoh: story, feed, ads, email, cpc
              </p>
              {errors.utmMedium && <p className="text-sm text-destructive">{errors.utmMedium}</p>}
            </div>

            {/* UTM Campaign */}
            <div className="space-y-2">
              <Label htmlFor="utmCampaign">
                UTM Campaign <Badge variant="secondary" className="ml-2 text-xs">required*</Badge>
              </Label>
              <Input
                id="utmCampaign"
                placeholder="promo_ramadhan"
                value={utmCampaign}
                onChange={(e) => handleUTMChange(setUtmCampaign, e.target.value)}
                className={errors.utmCampaign ? 'border-destructive' : ''}
              />
              <p className="text-xs text-muted-foreground">
                💡 Contoh: promo_ramadhan, flash_sale, umroh_2026
              </p>
              {errors.utmCampaign && <p className="text-sm text-destructive">{errors.utmCampaign}</p>}
            </div>

            {/* UTM Content (optional) */}
            <div className="space-y-2">
              <Label htmlFor="utmContent">UTM Content (optional)</Label>
              <Input
                id="utmContent"
                placeholder="video_1"
                value={utmContent}
                onChange={(e) => handleUTMChange(setUtmContent, e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                💡 Untuk A/B testing ads
              </p>
            </div>

            {/* UTM Term (optional) */}
            <div className="space-y-2">
              <Label htmlFor="utmTerm">UTM Term (optional)</Label>
              <Input
                id="utmTerm"
                placeholder="paket_umroh"
                value={utmTerm}
                onChange={(e) => handleUTMChange(setUtmTerm, e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                💡 Untuk paid search keywords
              </p>
            </div>
          </div>

          <Separator />

          {/* Preview */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Preview URL</Label>
            <div className="p-4 bg-muted rounded-lg">
              <code className="text-sm text-primary break-all">
                {previewUrl}
              </code>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyPreview}
              className="w-full"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Preview URL
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSave}>
            {template ? 'Simpan Perubahan' : 'Simpan Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default URLTemplateModal;
