import type { MetadataRoute } from 'next';
import { isPreview, siteUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    // Allow portal HTML to be crawled so its noindex metadata can be read.
    rules: {
      userAgent: '*',
      // The public directory needs these endpoints when Google renders the page.
      allow: ['/', '/api/doctors$', '/api/specialities$'],
      disallow: '/api/',
    },
    sitemap: isPreview ? undefined : `${siteUrl}/sitemap.xml`,
  };
}
