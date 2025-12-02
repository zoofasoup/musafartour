interface SEOCheckResult {
  score: number;
  checks: {
    name: string;
    passed: boolean;
    message: string;
  }[];
}

export const checkSEO = (data: {
  title: string;
  description: string;
  content: string;
  focusKeyword?: string;
  imageAlts?: string[];
}): SEOCheckResult => {
  const checks = [];
  let score = 0;
  const maxScore = 10;

  // Title length check (50-60 chars)
  const titleLength = data.title.length;
  if (titleLength >= 50 && titleLength <= 60) {
    checks.push({
      name: 'Title Length',
      passed: true,
      message: `Perfect! Title is ${titleLength} characters.`,
    });
    score += 1;
  } else {
    checks.push({
      name: 'Title Length',
      passed: false,
      message: `Title should be 50-60 characters (currently ${titleLength}).`,
    });
  }

  // Description length check (150-160 chars)
  const descLength = data.description.length;
  if (descLength >= 150 && descLength <= 160) {
    checks.push({
      name: 'Description Length',
      passed: true,
      message: `Perfect! Description is ${descLength} characters.`,
    });
    score += 1;
  } else {
    checks.push({
      name: 'Description Length',
      passed: false,
      message: `Description should be 150-160 characters (currently ${descLength}).`,
    });
  }

  // Focus keyword checks
  if (data.focusKeyword) {
    const keyword = data.focusKeyword.toLowerCase();
    const titleLower = data.title.toLowerCase();
    const descLower = data.description.toLowerCase();
    const contentLower = data.content.toLowerCase();

    // Keyword in title
    if (titleLower.includes(keyword)) {
      checks.push({
        name: 'Keyword in Title',
        passed: true,
        message: 'Focus keyword found in title.',
      });
      score += 1;
    } else {
      checks.push({
        name: 'Keyword in Title',
        passed: false,
        message: 'Focus keyword not found in title.',
      });
    }

    // Keyword in description
    if (descLower.includes(keyword)) {
      checks.push({
        name: 'Keyword in Description',
        passed: true,
        message: 'Focus keyword found in description.',
      });
      score += 1;
    } else {
      checks.push({
        name: 'Keyword in Description',
        passed: false,
        message: 'Focus keyword not found in description.',
      });
    }

    // Keyword in first paragraph (first 200 chars)
    const firstParagraph = contentLower.substring(0, 200);
    if (firstParagraph.includes(keyword)) {
      checks.push({
        name: 'Keyword in First Paragraph',
        passed: true,
        message: 'Focus keyword found in first paragraph.',
      });
      score += 1;
    } else {
      checks.push({
        name: 'Keyword in First Paragraph',
        passed: false,
        message: 'Focus keyword not found in first paragraph.',
      });
    }
  } else {
    checks.push({
      name: 'Focus Keyword',
      passed: false,
      message: 'No focus keyword set.',
    });
  }

  // Headings structure (check for H1, H2, H3)
  const hasH1 = /<h1[^>]*>/.test(data.content);
  const hasH2 = /<h2[^>]*>/.test(data.content);
  if (hasH1 && hasH2) {
    checks.push({
      name: 'Heading Structure',
      passed: true,
      message: 'Content has proper heading hierarchy.',
    });
    score += 1;
  } else {
    checks.push({
      name: 'Heading Structure',
      passed: false,
      message: 'Content should have H1 and H2 headings.',
    });
  }

  // Image alt text
  if (data.imageAlts && data.imageAlts.length > 0) {
    const hasAltText = data.imageAlts.every((alt) => alt && alt.length > 0);
    if (hasAltText) {
      checks.push({
        name: 'Image Alt Text',
        passed: true,
        message: 'All images have alt text.',
      });
      score += 1;
    } else {
      checks.push({
        name: 'Image Alt Text',
        passed: false,
        message: 'Some images missing alt text.',
      });
    }
  } else {
    checks.push({
      name: 'Image Alt Text',
      passed: false,
      message: 'No images or alt text found.',
    });
  }

  // Internal links (at least 2-3)
  const internalLinks = (data.content.match(/href=["']\/[^"']*["']/g) || []).length;
  if (internalLinks >= 2) {
    checks.push({
      name: 'Internal Links',
      passed: true,
      message: `${internalLinks} internal links found.`,
    });
    score += 1;
  } else {
    checks.push({
      name: 'Internal Links',
      passed: false,
      message: 'Add at least 2-3 internal links.',
    });
  }

  // Content length (min 800 words for articles)
  const wordCount = data.content.split(/\s+/).length;
  if (wordCount >= 800) {
    checks.push({
      name: 'Content Length',
      passed: true,
      message: `${wordCount} words (excellent!).`,
    });
    score += 1;
  } else {
    checks.push({
      name: 'Content Length',
      passed: false,
      message: `${wordCount} words (aim for 800+).`,
    });
  }

  const finalScore = Math.round((score / maxScore) * 100);

  return {
    score: finalScore,
    checks,
  };
};
