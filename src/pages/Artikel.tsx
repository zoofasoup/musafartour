import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { LazyImage } from "@/components/LazyImage";
import { BookOpen, Clock } from "lucide-react";
import { PkgPanel } from "@/components/package-detail/PkgPanel";
import { Skel } from "@/components/package-list/PkgSkeletons";
import { usePkgNav } from "@/hooks/usePkgNav";
import "@/styles/pkg-v2.css";
import { redirectToWhatsApp } from "@/lib/chatRedirect";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

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
  const rootRef = useRef<HTMLDivElement>(null);
  usePkgNav(rootRef);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [category, setCategory] = useState<string | null>(null);
  
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

  const categories = Array.from(new Set(articles.map((a) => a.category).filter((c): c is string => !!c)));
  const shown = category ? articles.filter((a) => a.category === category) : articles;

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchArticles(nextPage);
  };


  return (
    <div ref={rootRef} className="pkg-v2 min-h-screen">
      <SEO
        title="Artikel & Tips Umroh - Musafar Tour"
        description="Baca artikel dan tips lengkap seputar umroh, persiapan ibadah, dan wisata religi. Panduan praktis untuk jamaah pemula hingga berpengalaman."
        keywords="artikel umroh, tips umroh, panduan umroh, persiapan umroh, tips ibadah"
        canonicalUrl="https://musafartour.com/artikel"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Blog",
          "name": "Artikel & Tips Umroh - Musafar Tour",
          "description": "Panduan, tips, dan informasi bermanfaat seputar perjalanan Umroh",
          "publisher": { "@type": "Organization", "name": "Musafar Tour" }
        }}
      />
      <Navbar />
      <main id="main">
        <PkgPanel tone="ink" top>
          <div className="mx-auto max-w-[1200px]">
            <h1 className="pkg-title">Artikel &amp; tips umroh</h1>
            <p className="pkg-label mt-4 text-pkg-fg-2">Panduan singkat sebelum berangkat.</p>
          </div>
        </PkgPanel>

        <PkgPanel tone="cream" last>
          <div className="mx-auto max-w-[1200px]">
            {loading && page === 1 ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-3 md:gap-x-8">
                {[...Array(6)].map((_, i) => (
                  <div key={i}>
                    <Skel className="aspect-[4/3] w-full rounded-2xl" />
                    <Skel className="mt-4 h-3 w-1/3" />
                    <Skel className="mt-2 h-5 w-4/5" />
                  </div>
                ))}
              </div>
            ) : articles.length === 0 ? (
              <div className="py-12">
                <BookOpen className="h-8 w-8 text-pkg-fg-3" aria-hidden />
                <p className="pkg-sub mt-4">Belum ada artikel.</p>
              </div>
            ) : (
              <>
                {categories.length > 1 && (
                  <div className="-mx-6 -mt-4 mb-4 flex gap-2 overflow-x-auto px-6 py-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" role="group" aria-label="Tipe artikel">
                    {[null, ...categories].map((c) => {
                      const on = c === category;
                      return (
                        <button
                          key={c ?? "all"}
                          type="button"
                          onClick={() => setCategory(c)}
                          aria-pressed={on}
                          className={`pkg-press pkg-label h-11 shrink-0 rounded-full px-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2 ${on ? "pkg-glass-red" : "pkg-glass"}`}
                        >
                          {c ?? "Semua"}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-3 md:gap-x-8">
                  {shown.map((article) => (
                    <Link
                      key={article.id}
                      to={`/artikel/${article.slug}`}
                      className="pkg-press group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2"
                    >
                      <article>
                        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-pkg-cream-2">
                          <LazyImage
                            src={article.featured_image || "/og-default.jpg"}
                            alt={article.title}
                            className="h-full w-full object-cover"
                          />
                          {article.category && (
                            <span className="pkg-label absolute bottom-2.5 left-2.5 inline-flex h-8 items-center rounded-full bg-[#fffdf8] px-3 text-[13px] text-[#1a1512] shadow-[0_4px_12px_-4px_rgb(0_0_0/0.4)]">
                              {article.category}
                            </span>
                          )}
                        </div>
                        <h2 className="mt-4 line-clamp-3 text-[18px] font-normal leading-[1.2] tracking-[-0.02em] text-pkg-fg md:text-[22px]">
                          {article.title}
                        </h2>
                        <p className="pkg-caption mt-2 flex flex-wrap items-center gap-x-1.5 text-pkg-fg-3">
                          <span>{format(new Date(article.created_at), "d MMM yyyy", { locale: localeId })}</span>
                          <span aria-hidden>·</span>
                          <Clock className="h-3 w-3" aria-hidden />
                          <span>{readMinutes(article.content)} menit</span>
                        </p>
                      </article>
                    </Link>
                  ))}
                </div>

                {hasMore && (
                  <div className="mt-12 flex justify-center">
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="pkg-press pkg-glass pkg-label inline-flex h-12 items-center rounded-full px-6 disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2"
                    >
                      {loadingMore ? "Memuat..." : "Muat lebih banyak"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </PkgPanel>
      </main>

      <PkgPanel tone="red" className="!pb-24">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="pkg-h2 text-pkg-on-red">Info &amp; promo terbaru</h2>
          <p className="pkg-label mt-4 text-pkg-on-red">Dikirim langsung ke WhatsApp kamu.</p>
          <button
            type="button"
            onClick={() =>
              redirectToWhatsApp(
                "Assalamu'alaikum Musafar Tour, saya ingin menerima info artikel, tips, dan promo umroh terbaru via WhatsApp.",
                "artikel_subscribe"
              )
            }
            className="pkg-press pkg-glass-deep pkg-label mt-6 inline-flex h-14 items-center gap-2 rounded-full px-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-on-red focus-visible:ring-offset-2"
          >
            <WhatsAppIcon className="h-5 w-5" /> Kabari saya
          </button>
        </div>
      </PkgPanel>

      <Footer variant="pkg" />
    </div>
  );
};

export default Artikel;
