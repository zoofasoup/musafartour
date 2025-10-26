import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Clock, User, ArrowLeft, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Button } from "@/components/ui/button";
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchArticle();
    }
  }, [slug]);

  const fetchArticle = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .single();

    if (error) {
      console.error("Error fetching article:", error);
      setArticle(null);
    } else {
      setArticle(data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/4"></div>
              <div className="h-64 bg-muted rounded"></div>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded w-5/6"></div>
              </div>
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
        <div className="container mx-auto px-4 py-16">
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
      
      <article className="container mx-auto px-4 py-12">
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

          {/* Content */}
          <div 
            className="prose prose-lg max-w-none
              prose-headings:font-bold prose-headings:text-foreground
              prose-p:text-foreground prose-p:leading-relaxed prose-p:mb-6
              prose-strong:text-foreground prose-strong:font-semibold
              prose-em:text-foreground
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic
              prose-ul:list-disc prose-ul:pl-6 prose-ul:mb-6
              prose-ol:list-decimal prose-ol:pl-6 prose-ol:mb-6
              prose-li:text-foreground prose-li:mb-2
              prose-img:rounded-lg prose-img:my-8"
            dangerouslySetInnerHTML={{ 
              __html: DOMPurify.sanitize(article.content.replace(/\n/g, '<br />'), {
                ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'a', 'img'],
                ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'rel']
              })
            }}
          />
        </div>
      </article>

      <Footer />
    </div>
  );
};

export default ArtikelDetail;
