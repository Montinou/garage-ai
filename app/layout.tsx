import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { translations } from '@/lib/translations'
import { PageErrorBoundary } from '@/components/ErrorBoundary'

export const metadata: Metadata = {
  title: {
    default: translations.meta.titles.home,
    template: '%s | GarageAI'
  },
  description: translations.meta.descriptions.home,
  keywords: [
    'autos usados',
    'vehículos Argentina',
    'concesionarias',
    'comprar auto',
    'marketplace automotor',
    'oportunidades AI',
    'garage',
    'automóviles'
  ],
  authors: [{ name: 'GarageAI' }],
  creator: 'GarageAI',
  publisher: 'GarageAI',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://garage-ai.vercel.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    url: 'https://garage-ai.vercel.app',
    title: translations.meta.titles.home,
    description: translations.meta.descriptions.home,
    siteName: 'GarageAI',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'GarageAI - Marketplace de Vehículos Usados Argentina'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: translations.meta.titles.home,
    description: translations.meta.descriptions.home,
    images: ['/og-image.jpg'],
    creator: '@garageai'
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
  verification: {
    google: 'google-site-verification-token',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        
        {/* Theme Color */}
        <meta name="theme-color" content="#0066CC" />
        <meta name="msapplication-TileColor" content="#0066CC" />
        
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "GarageAI",
              "url": "https://garage-ai.vercel.app",
              "logo": "https://garage-ai.vercel.app/logo.png",
              "description": translations.meta.descriptions.home,
              "address": {
                "@type": "PostalAddress",
                "addressCountry": "AR",
                "addressLocality": "Buenos Aires"
              },
              "contactPoint": {
                "@type": "ContactPoint",
                "telephone": "+54-11-1234-5678",
                "contactType": "customer service",
                "availableLanguage": "Spanish"
              },
              "sameAs": [
                "https://facebook.com/garageai",
                "https://twitter.com/garageai",
                "https://instagram.com/garageai"
              ]
            })
          }}
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <div className="relative flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">
              <PageErrorBoundary>
                {children}
              </PageErrorBoundary>
            </main>
            <Footer />
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
