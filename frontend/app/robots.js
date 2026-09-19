export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://apilive.vercel.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/dashboard/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
