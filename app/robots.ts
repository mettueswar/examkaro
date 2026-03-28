import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/attempt/', '/dashboard/', '/profile/'],
      },
    ],
    sitemap: 'https://examkaro.com/sitemap.xml',
  };
}
