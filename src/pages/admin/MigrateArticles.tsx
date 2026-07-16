import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import articlesData from "@/data/articles_migration.json";

export default function MigrateArticles() {
  const [isMigrating, setIsMigrating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: articlesData.length });
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

  const handleMigration = async () => {
    setIsMigrating(true);
    addLog("Memulai migrasi artikel dan gambar...");

    for (let i = 0; i < articlesData.length; i++) {
      const article = articlesData[i];
      setProgress({ current: i + 1, total: articlesData.length });
      
      try {
        addLog(`Memproses artikel: ${article.title}`);
        let newImageUrl = "";

        // 1. Download and Upload Image
        if (article.featured_image) {
          addLog(`  -> Mendownload gambar lama...`);
          const response = await fetch(article.featured_image);
          if (!response.ok) throw new Error("Gagal mendownload gambar");
          
          const blob = await response.blob();
          const fileName = `migrated-${Date.now()}-${article.slug}.webp`;
          
          addLog(`  -> Mengupload gambar ke Supabase baru...`);
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("article-images")
            .upload(fileName, blob, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from("article-images")
            .getPublicUrl(fileName);
            
          newImageUrl = publicUrl;
          addLog(`  -> Gambar berhasil diupload!`);
        }

        // 2. Insert Article
        addLog(`  -> Menyimpan artikel ke database...`);
        const { error: insertError } = await supabase
          .from("articles")
          .insert({
            title: article.title,
            slug: article.slug,
            content: article.content,
            excerpt: article.excerpt,
            category: article.category,
            featured_image: newImageUrl || null,
            status: article.status || 'published',
            meta_title: article.meta_title,
            meta_description: article.meta_description,
            tags: article.tags ? article.tags.replace(/^{|}$/g, '').split(',').map((t: string) => t.replace(/^"|"$/g, '')) : null,
            published_at: article.published_at || new Date().toISOString(),
          });

        if (insertError) throw insertError;
        addLog(`  ✅ Berhasil memigrasi: ${article.title}`);

      } catch (error: any) {
        addLog(`  ❌ Gagal memigrasi ${article.title}: ${error.message}`);
        console.error(error);
      }
    }

    addLog("Migrasi Selesai!");
    setIsMigrating(false);
    toast.success("Migrasi selesai!");
  };

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Migrasi Artikel Lovable Lama</CardTitle>
          <CardDescription>Pindahkan artikel dan duplikasi gambar dari database lama ke database baru secara otomatis.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button onClick={handleMigration} disabled={isMigrating || progress.current === progress.total}>
              {isMigrating ? 'Sedang Memproses...' : 'Mulai Migrasi Data'}
            </Button>
            <span className="font-semibold text-sm">
              Progress: {progress.current} / {progress.total}
            </span>
          </div>

          <div className="bg-slate-900 text-green-400 font-mono text-sm p-4 rounded-lg h-64 overflow-y-auto space-y-1">
            {logs.length === 0 ? (
              <span className="text-slate-500">Menunggu aksi...</span>
            ) : (
              logs.map((log, i) => <div key={i}>{log}</div>)
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
