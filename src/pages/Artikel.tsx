import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { BookOpen, Clock, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
}

const Artikel = () => {
  const [email, setEmail] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching articles:", error);
    } else {
      setArticles(data || []);
    }
    setLoading(false);
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && email.includes("@")) {
      toast({
        title: "Berhasil berlangganan!",
        description: "Terima kasih telah berlangganan newsletter kami.",
      });
      setEmail("");
    } else {
      toast({
        title: "Email tidak valid",
        description: "Mohon masukkan alamat email yang benar.",
        variant: "destructive",
      });
    }
  };


  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Header */}
      <section className="py-16 bg-gradient-to-r from-primary/10 to-accent/10">
        <div className="container mx-auto px-4 text-center">
          <BookOpen className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Artikel & Tips Umroh</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Panduan, tips, dan informasi bermanfaat seputar perjalanan Umroh dan Haji
          </p>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="py-16 container mx-auto px-4">
        {loading ? (
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article) => (
              <article 
                key={article.id} 
                className="bg-card rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => window.location.href = `/artikel/${article.slug}`}
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={article.featured_image || "https://images.unsplash.com/photo-1591604021695-0c69b7c05981?w=800&h=400&fit=crop"}
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
                        <span>5 menit</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {format(new Date(article.created_at), "dd MMMM yyyy", { locale: localeId })}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Newsletter CTA */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center bg-card p-8 rounded-lg shadow-md">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-bold mb-4">Dapatkan Tips Terbaru</h2>
            <p className="text-muted-foreground mb-6">
              Berlangganan newsletter kami untuk mendapatkan artikel, tips, dan informasi terbaru seputar Umroh dan Haji
            </p>
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
              <Input
                type="email"
                placeholder="Email Anda"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" className="bg-accent hover:bg-accent/90">
                Berlangganan
              </Button>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Artikel;
