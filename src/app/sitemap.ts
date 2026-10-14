import type { MetadataRoute } from 'next';
import { isPreview, siteUrl } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  // Only public, indexable pages belong here, never login or patient URLs.
  return isPreview ? [] : [{ url: `${siteUrl}/` }];
}
