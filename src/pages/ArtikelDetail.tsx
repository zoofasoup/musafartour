import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Clock, User, ArrowLeft, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import DOMPurify from "dompurify";

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featured_image?: string;
  category?: string;
  created_at: string;
  author_id?: string;
  author_name?: string;
  meta_description?: string;
}

const ArtikelDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState<Article | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchArticle();
    }
  }, [slug]);

  useEffect(() => {
    if (article) {
      fetchRelatedArticles();
    }
  }, [article]);

  const fetchArticle = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (error) {
      console.error("Error fetching article:", error);
      setArticle(null);
    } else {
      setArticle(data);
    }
    setLoading(false);
  };

  const fetchRelatedArticles = async () => {
    if (!article) return;
    
    const { data } = await supabase
      .from("articles")
      .select("id, title, slug, excerpt, featured_image, category, created_at")
      .eq("status", "published")
      .neq("id", article.id)
      .order("created_at", { ascending: false })
      .limit(3);

    if (data) {
      setRelatedArticles(data as Article[]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-6 md:px-8 py-12">
          <div className="max-w-3xl mx-auto">
            <Skeleton className="h-8 w-24 mb-6" />
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-12 w-full mb-2" />
            <Skeleton className="h-12 w-3/4 mb-6" />
            <div className="flex gap-4 mb-8 pb-8 border-b">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-80 w-full mb-12 rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-6 md:px-8 py-16">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl font-bold mb-4">Artikel tidak ditemukan</h1>
            <Button onClick={() => navigate("/artikel")} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali ke Artikel
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <article className="container mx-auto px-6 md:px-8 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/artikel")}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>

          {/* Category Badge */}
          {article.category && (
            <div className="mb-4">
              <span className="inline-block bg-accent/10 text-accent-foreground text-sm font-medium px-4 py-1.5 rounded-full">
                {article.category}
              </span>
            </div>
          )}

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            {article.title}
          </h1>

          {/* Meta Information */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8 pb-8 border-b">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{article.author_name || "Admin"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(article.created_at), "dd MMMM yyyy", { locale: localeId })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>5 menit baca</span>
            </div>
          </div>

          {/* Featured Image */}
          {article.featured_image && (
            <div className="mb-12">
              <img
                src={article.featured_image}
                alt={article.title}
                className="w-full h-auto rounded-lg"
              />
            </div>
          )}

          {/* Excerpt */}
          {article.excerpt && (
            <div className="text-xl text-muted-foreground mb-8 pb-8 border-b italic">
              {article.excerpt}
            </div>
          )}

          {/* Content - Using explicit styles for reliability */}
          <div 
            className="article-content"
            dangerouslySetInnerHTML={{ 
              __html: DOMPurify.sanitize(article.content, {
                ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'a', 'img'],
                ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'rel']
              })
            }}
          />
        </div>
      </article>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <section className="border-t bg-muted/30">
          <div className="container mx-auto px-6 md:px-8 py-16">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
                Artikel Lainnya
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedArticles.map((related) => (
                  <Link 
                    key={related.id} 
                    to={`/artikel/${related.slug}`}
                    className="group bg-card rounded-xl overflow-hidden border hover:shadow-lg transition-all duration-300"
                  >
                    {related.featured_image && (
                      <div className="aspect-video overflow-hidden">
                        <img
                          src={related.featured_image}
                          alt={related.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      {related.category && (
                        <span className="text-xs font-medium text-primary mb-2 block">
                          {related.category}
                        </span>
                      )}
                      <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                        {related.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {related.excerpt}
                      </p>
                      <span className="text-xs text-muted-foreground mt-3 block">
                        {format(new Date(related.created_at), "dd MMM yyyy", { locale: localeId })}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
};

export default ArtikelDetail;