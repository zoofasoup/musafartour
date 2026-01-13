import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Copy, Download, ExternalLink, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { type URLTemplate, buildTemplateUrl } from '@/lib/urlTemplateManager';

interface URLTemplatePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: URLTemplate | null;
}

const URLTemplatePreview = ({ open, onOpenChange, template }: URLTemplatePreviewProps) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  const fullUrl = template ? `https://${buildTemplateUrl(template)}` : '';

  useEffect(() => {
    if (template && open) {
      // Generate QR code using Google Charts API
      const encodedUrl = encodeURIComponent(fullUrl);
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedUrl}`);
    }
  }, [template, open, fullUrl]);

  const copyUrl = () => {
    navigator.clipboard.writeText(fullUrl);
    toast.success('✓ URL copied to clipboard!');
  };

  const downloadQR = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `qr-${template?.name?.replace(/\s+/g, '-').toLowerCase() || 'template'}.png`;
    link.click();
    toast.success('QR code berhasil diunduh');
  };

  const openUrl = () => {
    window.open(fullUrl, '_blank');
  };

  if (!template) return null;

  const urlParts = buildTemplateUrl(template).split('?');
  const baseUrl = urlParts[0];
  const params = urlParts[1]?.split('&') || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Preview: {template.name}
          </DialogTitle>
          <DialogDescription>
            Lihat URL lengkap dan QR code untuk template ini
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Full URL Display */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Full URL</p>
            <div className="p-4 bg-muted rounded-lg space-y-1">
              <p className="text-sm text-primary font-medium">{baseUrl}</p>
              {params.length > 0 && (
                <>
                  <p className="text-sm text-muted-foreground">?</p>
                  {params.map((param, idx) => (
                    <p key={idx} className="text-sm text-muted-foreground pl-2">
                      {idx > 0 && '&'}{param}
                    </p>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Custom Message */}
          {template.custom_message && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Pesan WhatsApp</p>
              <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm">"{template.custom_message}"</p>
              </div>
            </div>
          )}

          {/* UTM Summary */}
          {(template.utm_params.utm_source || template.utm_params.utm_campaign) && (
            <div className="space-y-2">
              <p className="text-sm font-medium">UTM Parameters</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {template.utm_params.utm_source && (
                  <div className="p-2 bg-muted rounded">
                    <span className="text-muted-foreground">Source:</span>{' '}
                    <span className="font-medium">{template.utm_params.utm_source}</span>
                  </div>
                )}
                {template.utm_params.utm_medium && (
                  <div className="p-2 bg-muted rounded">
                    <span className="text-muted-foreground">Medium:</span>{' '}
                    <span className="font-medium">{template.utm_params.utm_medium}</span>
                  </div>
                )}
                {template.utm_params.utm_campaign && (
                  <div className="p-2 bg-muted rounded col-span-2">
                    <span className="text-muted-foreground">Campaign:</span>{' '}
                    <span className="font-medium">{template.utm_params.utm_campaign}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* QR Code */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-center">QR Code</p>
            <div className="flex justify-center">
              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt="QR Code"
                  className="w-48 h-48 border rounded-lg bg-white p-2"
                />
              ) : (
                <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-3 gap-2">
            <Button onClick={copyUrl} variant="outline" className="w-full">
              <Copy className="w-4 h-4 mr-2" />
              Copy URL
            </Button>
            <Button onClick={downloadQR} variant="outline" className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Download QR
            </Button>
            <Button onClick={openUrl} variant="outline" className="w-full">
              <ExternalLink className="w-4 h-4 mr-2" />
              Open
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default URLTemplatePreview;
