// Keep canonical links, structured data and the sitemap on the same public origin.
// Never use VERCEL_URL: preview deployments must not become canonical URLs.
export const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL || 'https://homedigo.vercel.app',
).origin;

export const siteName = 'HomeDigo';
export const homeTitle = 'HomeDigo | Doctor Visits & Home Healthcare in Bengaluru';
export const homeDescription =
  'Find doctors and book home healthcare in Bengaluru with HomeDigo. Explore doctor home visits, nursing care, physiotherapy and lab sample collection at home.';

export const isPreview = process.env.VERCEL_ENV === 'preview';

export const homeStructuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: `${siteUrl}/`,
      name: siteName,
      alternateName: 'Homedigo',
      description: homeDescription,
      inLanguage: 'en-IN',
      publisher: { '@id': `${siteUrl}/#organization` },
    },
    {
      '@type': 'Organization',
      '@id': `${siteUrl}/#organization`,
      name: siteName,
      url: `${siteUrl}/`,
      logo: `${siteUrl}/homedigo-logo.png`,
      description: homeDescription,
      telephone: '+91-76959-64741',
      areaServed: { '@type': 'City', name: 'Bengaluru' },
    },
  ],
};
