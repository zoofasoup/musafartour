import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Clock, ArrowLeft } from "lucide-react";
import { redirectToWhatsApp } from "@/lib/chatRedirect";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { PkgPanel } from "@/components/package-detail/PkgPanel";
import { Skel } from "@/components/package-list/PkgSkeletons";
import { usePkgNav } from "@/hooks/usePkgNav";
import "@/styles/pkg-v2.css";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import DOMPurify from "dompurify";
import { LazyImage } from "@/components/ui/lazy-image";

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
  const rootRef = useRef<HTMLDivElement>(null);
  usePkgNav(rootRef);

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
      .or(`publish_at.is.null,publish_at.lte.${new Date().toISOString()}`)
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
      .or(`publish_at.is.null,publish_at.lte.${new Date().toISOString()}`)
      .neq("id", article.id)
      .order("created_at", { ascending: false })
      .limit(3);

    if (data) {
      setRelatedArticles(data as Article[]);
    }
  };

  if (loading) {
    return (
      <div ref={rootRef} className="pkg-v2 min-h-screen">
        <Navbar />
        <main id="main">
          <PkgPanel tone="ink" top>
            <div className="mx-auto max-w-3xl">
              <Skel className="h-8 w-24 rounded-full" />
              <Skel className="mt-6 h-12 w-full" />
              <Skel className="mt-3 h-12 w-3/4" />
              <Skel className="mt-6 h-4 w-48" />
            </div>
          </PkgPanel>
          <PkgPanel tone="cream" last>
            <div className="mx-auto max-w-3xl">
              <Skel className="aspect-[4/3] w-full rounded-[24px]" />
              <div className="mt-8 space-y-3">
                {["w-full", "w-full", "w-5/6", "w-full", "w-4/5", "w-3/4"].map((w, k) => (
                  <Skel key={k} className={`h-4 ${w}`} />
                ))}
              </div>
            </div>
          </PkgPanel>
        </main>
        <Footer variant="pkg" />
      </div>
    );
  }

  if (!article) {
    return (
      <div ref={rootRef} className="pkg-v2 min-h-screen">
        <Navbar />
        <main id="main">
          <PkgPanel tone="ink" top last>
            <div className="mx-auto max-w-3xl">
              <h1 className="pkg-title">Artikel tidak ada</h1>
              <button
                type="button"
                onClick={() => navigate("/artikel")}
                className="pkg-press pkg-glass pkg-label mt-6 inline-flex h-12 items-center gap-2 rounded-full px-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-cream focus-visible:ring-offset-2 focus-visible:ring-offset-pkg-ink"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden /> Semua artikel
              </button>
            </div>
          </PkgPanel>
        </main>
        <Footer variant="pkg" />
      </div>
    );
  }

  const canonical = `https://musafartour.com/artikel/${article.slug}`;
  const rawDescription = (article.meta_description || article.excerpt || article.title).replace(/\s+/g, " ").trim();
  const description = rawDescription.length > 155 ? `${rawDescription.slice(0, 154)}…` : rawDescription;

  return (
    <div ref={rootRef} className="pkg-v2 min-h-screen">
      {/* Matches the server-rendered version (functions/artikel/[slug].ts) for client-side navigation. */}
      <SEO
        title={`${article.title} - Musafar Tour`}
        description={description}
        canonicalUrl={canonical}
        ogImage={article.featured_image || undefined}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.title,
          description,
          image: article.featured_image || undefined,
          datePublished: article.created_at,
          author: { "@type": "Organization", name: article.author_name || "Tim Musafar Tour" },
          publisher: {
            "@type": "Organization",
            "@id": "https://musafartour.com/#organization",
            name: "Musafar Tour",
            logo: { "@type": "ImageObject", url: "https://musafartour.com/logo.webp" },
          },
          mainEntityOfPage: canonical,
        }}
      />
      <Navbar />
      <main id="main">
        <PkgPanel tone="ink" top>
          <div className="mx-auto max-w-3xl">
            <button
              type="button"
              onClick={() => navigate("/artikel")}
              className="pkg-press pkg-glass pkg-label inline-flex h-11 items-center gap-2 rounded-full px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-cream focus-visible:ring-offset-2 focus-visible:ring-offset-pkg-ink"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden /> Kembali
            </button>
            {article.category && (
              <div className="mt-6">
              <p className="pkg-glass pkg-label inline-flex h-8 items-center rounded-full px-3 text-[13px]">{article.category}</p>
              </div>
            )}
            <h1 className="pkg-title mt-5 text-balance !text-[40px] md:!text-[56px]">{article.title}</h1>
            <p className="pkg-caption mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-pkg-fg-2">
              <span>{article.author_name || "Tim Musafar"}</span>
              <span aria-hidden>·</span>
              <span>{format(new Date(article.created_at), "d MMM yyyy", { locale: localeId })}</span>
              <span aria-hidden>·</span>
              <Clock className="h-3.5 w-3.5" aria-hidden />
              <span>{Math.max(1, Math.round((article.content || "").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length / 200))} menit</span>
            </p>
          </div>
        </PkgPanel>

        <PkgPanel tone="cream" last={relatedArticles.length === 0}>
          <article className="mx-auto max-w-3xl">
            {article.featured_image && (
              <div className="mb-8 overflow-hidden rounded-[24px]">
                <LazyImage src={article.featured_image} alt={article.title} className="h-auto w-full" />
              </div>
            )}
            {article.excerpt && (
              <p className="mb-8 text-[20px] font-light leading-[1.4] tracking-[-0.01em] text-pkg-fg-2">{article.excerpt}</p>
            )}
            <div
              className="article-content"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(article.content, {
                  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'a', 'img'],
                  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'rel']
                })
              }}
            />
            <div className="mt-12 border-t border-pkg-hair pt-8">
              <p className="text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-pkg-fg">Siap merencanakan umrohmu?</p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => redirectToWhatsApp(`Halo Musafar Tour, saya baru membaca artikel "${article.title}" dan ingin bertanya soal paket umroh.`, "artikel_detail_cta")}
                  className="pkg-press pkg-glass-red pkg-label inline-flex h-14 items-center justify-center gap-2.5 rounded-full px-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2"
                >
                  <WhatsAppIcon className="h-5 w-5" /> Tanya UC
                </button>
                <Link to="/paket-umroh" className="pkg-press pkg-glass pkg-label inline-flex h-14 items-center justify-center rounded-full px-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2">
                  Lihat paket
                </Link>
              </div>
            </div>
          </article>
        </PkgPanel>

        {relatedArticles.length > 0 && (
          <PkgPanel tone="cream-2" last>
            <div className="mx-auto max-w-5xl">
              <h2 className="pkg-h2">Artikel lainnya</h2>
              <div className="mt-8 grid grid-cols-1 gap-10 md:grid-cols-3">
                {relatedArticles.map((related) => (
                  <Link
                    key={related.id}
                    to={`/artikel/${related.slug}`}
                    className="pkg-press block rounded-[24px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2"
                  >
                    {related.featured_image && (
                      <div className="aspect-[4/3] overflow-hidden rounded-[24px] bg-pkg-cream">
                        <LazyImage src={related.featured_image} alt={related.title} className="h-full w-full object-cover" />
                      </div>
                    )}
                    <h3 className="mt-4 line-clamp-2 text-[22px] font-normal leading-[1.15] tracking-[-0.025em] text-pkg-fg">{related.title}</h3>
                    <p className="pkg-caption mt-2 text-pkg-fg-3">
                      {format(new Date(related.created_at), "d MMM yyyy", { locale: localeId })}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </PkgPanel>
        )}
      </main>

      <Footer variant="pkg" />
    </div>
  );
};

export default ArtikelDetail;
