import './globals.css';
import { AuthProvider } from './lib/auth-context';
import Navbar from './components/Navbar';
import DevToolsBlocker from './components/DevToolsBlocker';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://apilive.vercel.app';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Matka Results — Live Satta Matka Result Today | Fastest Kalyan & All Markets',
    template: '%s | Matka Results',
  },
  description:
    'Get fastest live Matka results today. Real-time Kalyan Matka result, Milan Day, Milan Night, Rajdhani, Sridevi, Time Bazar, and Main Bazar open-close results with automated API updates.',
  keywords: [
    'matka results',
    'satta matka results',
    'kalyan matka result',
    'live matka result today',
    'fastest matka results',
    'kalyan open close',
    'milan day matka result',
    'milan night matka result',
    'rajdhani night result',
    'main bazar matka result',
    'sridevi matka result',
    'matka result api',
    'online matka result',
    'matka live chart',
  ],
  authors: [{ name: 'Matka Results Platform' }],
  creator: 'Matka Results',
  publisher: 'Matka Results',
  applicationName: 'Matka Results API Platform',
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: SITE_URL,
    siteName: 'Matka Results',
    title: 'Matka Results — Live Satta Matka Result Today | Fastest Kalyan & All Markets',
    description:
      'Get fastest live Matka results today. Real-time Kalyan Matka result, Milan Day & Night, Rajdhani, Sridevi, and Main Bazar.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Matka Results — Live Satta Matka Result Today',
    description:
      'Get fastest live Matka results today. Real-time Kalyan Matka result, Milan Day, Milan Night, Rajdhani, Sridevi, and Main Bazar.',
  },
};

export default function RootLayout({ children }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: 'Matka Results',
        description:
          'Live Matka Results, Kalyan Matka Result, Milan Day & Night, Rajdhani, and Main Bazar results.',
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE_URL}/?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'Matka Results Platform',
        url: SITE_URL,
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Where can I get the fastest live Matka results today?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'You can get the fastest, real-time live Matka results for Kalyan, Milan Day, Milan Night, Rajdhani, Sridevi, and Main Bazar directly on this platform with automated open and close updates.',
            },
          },
          {
            '@type': 'Question',
            name: 'What time are Kalyan Matka results declared?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Kalyan Matka Open result is declared between 04:00 PM and 04:40 PM IST, and Kalyan Close result is declared between 06:00 PM and 06:40 PM IST.',
            },
          },
          {
            '@type': 'Question',
            name: 'How does the Matka Results Webhook API work?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Our webhook engine broadcasts live open and close panel and ank results directly to your server endpoint via HTTP POST requests as soon as official results are declared.',
            },
          },
        ],
      },
    ],
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <AuthProvider>
          <DevToolsBlocker />
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
