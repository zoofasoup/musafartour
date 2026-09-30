import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { LazyImage } from "@/components/LazyImage";
import { BookOpen, Clock, User, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { redirectToWhatsApp } from "@/lib/chatRedirect";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  featured_image?: string;
  category?: string;
  created_at: string;
  author_id?: string;
  author_name?: string;
  meta_description?: string;
  content?: string;
}

// ~200 words/minute; the list used to show a hard-coded "5 menit" on every article.
const readMinutes = (html?: string) => {
  const words = (html || "").replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
};

const Artikel = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const ITEMS_PER_PAGE = 9;

  useEffect(() => {
    fetchArticles(1);
  }, []);

  const fetchArticles = async (pageNumber: number) => {
    if (pageNumber === 1) setLoading(true);
    else setLoadingMore(true);
    
    const from = (pageNumber - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    const { data, error } = await supabase
      .from("articles")
      .select("id, title, slug, excerpt, featured_image, category, created_at, author_name, meta_description, content")
      .eq("status", "published")
      .or(`publish_at.is.null,publish_at.lte.${new Date().toISOString()}`)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Error fetching articles:", error);
    } else {
      if (data) {
        if (pageNumber === 1) {
          setArticles(data);
        } else {
          setArticles(prev => [...prev, ...data]);
        }
        setHasMore(data.length === ITEMS_PER_PAGE);
      }
    }
    
    setLoading(false);
    setLoadingMore(false);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchArticles(nextPage);
  };


  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Artikel & Tips Umroh - Musafar Tour"
        description="Baca artikel dan tips lengkap seputar umroh, haji, persiapan ibadah, dan wisata religi. Panduan praktis untuk jamaah pemula hingga berpengalaman."
        keywords="artikel umroh, tips umroh, panduan haji, persiapan umroh, tips ibadah"
        canonicalUrl="https://musafartour.com/artikel"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Blog",
          "name": "Artikel & Tips Umroh - Musafar Tour",
          "description": "Panduan, tips, dan informasi bermanfaat seputar perjalanan Umroh dan Haji",
          "publisher": {
            "@type": "Organization",
            "name": "Musafar Tour"
          }
        }}
      />
      <Navbar />
      
      {/* Header */}
      <section className="py-16 bg-card border-b">
        <div className="container mx-auto px-6 md:px-8 text-center">
          <BookOpen className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">Artikel & Tips Umroh</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Panduan, tips, dan informasi bermanfaat seputar perjalanan Umroh dan Haji
          </p>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="py-16 container mx-auto px-6 md:px-8">
        {loading && page === 1 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-card rounded-lg overflow-hidden shadow-md">
                <Skeleton className="h-48 w-full" />
                <div className="p-6 space-y-4">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-xl text-muted-foreground">Belum ada artikel tersedia</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {articles.map((article) => (
                <Link
                  key={article.id}
                  to={`/artikel/${article.slug}`}
                  className="block bg-card rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow"
                >
                <article>
                  <div className="relative h-48 overflow-hidden">
                    <LazyImage
                      src={article.featured_image || "/og-default.jpg"}
                      alt={article.title}
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                    />
                    {article.category && (
                      <div className="absolute top-4 left-4">
                        <span className="bg-accent text-accent-foreground text-xs font-semibold px-3 py-1 rounded">
                          {article.category}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <h2 className="text-xl font-bold mb-3 line-clamp-2 hover:text-primary transition-colors">
                      {article.title}
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {article.excerpt || article.meta_description || ""}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{article.author_name || "Admin"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{readMinutes(article.content)} menit</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(article.created_at), "dd MMMM yyyy", { locale: localeId })}
                    </p>
                  </div>
                </article>
                </Link>
              ))}
            </div>
            
            {hasMore && (
              <div className="mt-12 flex justify-center">
                <Button 
                  onClick={handleLoadMore} 
                  disabled={loadingMore}
                  variant="outline"
                  size="lg"
                  className="px-8 rounded-full border-foreground/20 hover:bg-foreground/5 text-foreground"
                >
                  {loadingMore ? "Memuat..." : "Muat Lebih Banyak Artikel"}
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Updates CTA: the old email "newsletter" form showed success but stored nothing. */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-6 md:px-8">
          <div className="max-w-2xl mx-auto text-center bg-card p-8 rounded-lg shadow-md">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-bold mb-4">Dapatkan Tips & Info Promo Terbaru</h2>
            <p className="text-muted-foreground mb-6">
              Kami kirimkan artikel, tips persiapan, dan info jadwal umroh terbaru langsung ke WhatsApp Anda.
            </p>
            <Button
              size="lg"
              className="gap-2"
              onClick={() =>
                redirectToWhatsApp(
                  "Assalamu'alaikum Musafar Tour, saya ingin menerima info artikel, tips, dan promo umroh terbaru via WhatsApp.",
                  "artikel_subscribe"
                )
              }
            >
              <MessageCircle className="h-4 w-4" /> Kabari Saya via WhatsApp
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Artikel;
