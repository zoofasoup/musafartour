interface OrganizationData {
  name: string;
  url: string;
  logo: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  socialLinks?: string[];
}

interface ArticleData {
  title: string;
  description: string;
  author: string;
  publishedDate: string;
  modifiedDate?: string;
  image?: string;
  url: string;
}

interface ProductData {
  name: string;
  description: string;
  image?: string;
  price?: number;
  currency?: string;
  availability?: string;
  url: string;
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

export const generateOrganizationSchema = (data: OrganizationData) => {
  return {
    "@context": "https://schema.org",
    "@type": ["TravelAgency", "Organization"],
    name: data.name,
    url: data.url,
    logo: data.logo,
    description: data.description,
    address: data.address ? {
      "@type": "PostalAddress",
      addressCountry: "ID",
      streetAddress: data.address,
    } : undefined,
    contactPoint: data.phone ? {
      "@type": "ContactPoint",
      telephone: data.phone,
      contactType: "customer service",
      availableLanguage: ["id", "ar"],
    } : undefined,
    sameAs: data.socialLinks?.filter(Boolean),
  };
};

export const generateArticleSchema = (data: ArticleData) => {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: data.title,
    description: data.description,
    image: data.image,
    author: {
      "@type": "Person",
      name: data.author,
    },
    publisher: {
      "@type": "Organization",
      name: "Musafar Tour",
      logo: {
        "@type": "ImageObject",
        url: "https://musafartour.com/logo.png",
      },
    },
    datePublished: data.publishedDate,
    dateModified: data.modifiedDate || data.publishedDate,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": data.url,
    },
  };
};

export const generateProductSchema = (data: ProductData) => {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: data.name,
    description: data.description,
    image: data.image,
    offers: data.price ? {
      "@type": "Offer",
      price: data.price,
      priceCurrency: data.currency || "IDR",
      availability: data.availability || "https://schema.org/InStock",
      url: data.url,
    } : undefined,
  };
};

export const generateBreadcrumbSchema = (items: BreadcrumbItem[]) => {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
};

export const generateFAQSchema = (faqs: { question: string; answer: string }[]) => {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
};

export const generateReviewSchema = (reviews: {
  author: string;
  rating: number;
  reviewBody: string;
  datePublished: string;
}[]) => {
  return reviews.map((review) => ({
    "@context": "https://schema.org",
    "@type": "Review",
    author: {
      "@type": "Person",
      name: review.author,
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: review.rating,
      bestRating: 5,
      worstRating: 1,
    },
    reviewBody: review.reviewBody,
    datePublished: review.datePublished,
  }));
};
