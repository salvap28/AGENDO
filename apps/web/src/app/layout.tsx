import './globals.css'
import Script from 'next/script'
import type { Metadata } from 'next'
import ClientWrapper from './ClientWrapper'
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister'

export const metadata: Metadata = {
  title: 'Agendo',
  description: 'Planificá con calma, foco y descanso',
  manifest: '/manifest.json',
  themeColor: '#000000',
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <Script id="url-canparse-polyfill" strategy="beforeInteractive">
          {`
            (function(){
              if (typeof URL !== 'undefined' && typeof URL.canParse !== 'function') {
                URL.canParse = function(input, base) {
                  try { new URL(input, base); return true; } catch { return false; }
                };
              }
            })();
          `}
        </Script>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="app-bg" suppressHydrationWarning>
        <svg className="liquid-filter-defs" aria-hidden="true">
          <defs>
            <filter id="liquid-glass" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
              <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="1" seed="8" result="noise" />
              <feGaussianBlur in="noise" stdDeviation="3" result="softNoise" />
              <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="edgeBlur" />
              <feComponentTransfer in="edgeBlur" result="edgeMask">
                <feFuncA type="table" tableValues="1 0" />
              </feComponentTransfer>
              <feBlend in="softNoise" in2="edgeMask" mode="multiply" result="edgeNoise" />
              <feDisplacementMap in="SourceGraphic" in2="edgeNoise" scale="4" xChannelSelector="R" yChannelSelector="G" result="displaced" />
              <feComponentTransfer in="displaced" result="tinted">
                <feFuncR type="linear" slope="0.92" intercept="-0.02" />
                <feFuncG type="linear" slope="0.92" intercept="-0.02" />
                <feFuncB type="linear" slope="0.92" intercept="-0.02" />
                <feFuncA type="linear" slope="1" />
              </feComponentTransfer>
              <feGaussianBlur in="tinted" stdDeviation="0.6" result="softGlass" />
              <feBlend in="softGlass" in2="SourceGraphic" mode="normal" />
            </filter>
            <filter id="agendo-glass-filter" colorInterpolationFilters="sRGB">
              <feImage x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map" />

              <feDisplacementMap
                in="SourceGraphic"
                in2="map"
                scale="8"
                xChannelSelector="R"
                yChannelSelector="G"
                result="redDisp"
              />
              <feColorMatrix
                in="redDisp"
                type="matrix"
                values="1 0 0 0 0
                        0 0 0 0 0
                        0 0 0 0 0
                        0 0 0 1 0"
                result="red"
              />

              <feDisplacementMap
                in="SourceGraphic"
                in2="map"
                scale="6"
                xChannelSelector="R"
                yChannelSelector="G"
                result="greenDisp"
              />
              <feColorMatrix
                in="greenDisp"
                type="matrix"
                values="0 0 0 0 0
                        0 1 0 0 0
                        0 0 0 0 0
                        0 0 0 1 0"
                result="green"
              />

              <feDisplacementMap
                in="SourceGraphic"
                in2="map"
                scale="5"
                xChannelSelector="R"
                yChannelSelector="G"
                result="blueDisp"
              />
              <feColorMatrix
                in="blueDisp"
                type="matrix"
                values="0 0 0 0 0
                        0 0 0 0 0
                        0 0 1 0 0
                        0 0 0 1 0"
                result="blue"
              />

              <feBlend in="red" in2="green" mode="screen" result="rg" />
              <feBlend in="rg" in2="blue" mode="screen" result="rgb" />
              <feGaussianBlur in="rgb" stdDeviation="0.4" />
            </filter>
          </defs>
        </svg>
        <svg style={{ display: 'none' }}>
          <defs>
            <filter id="liquid-refraction" x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="12" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
        </svg>
        <ServiceWorkerRegister />
        <ClientWrapper>{children}</ClientWrapper>
      </body>
    </html>
  )
}
