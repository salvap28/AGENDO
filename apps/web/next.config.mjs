import withPWA from 'next-pwa'

const API_PORT = process.env.AGENDO_API_PORT || process.env.PORT_API || '4000';
const API_DEST = process.env.AGENDO_API_DEST || `http://localhost:${API_PORT}`;

const pwa = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // Always enable the service worker in development for easier testing
  disable: false,
  fallbacks: {
    document: '/offline.html',
  },
});

export default pwa({
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/__agendo_api/:path*',
        destination: `${API_DEST}/:path*`,
      },
    ];
  },
});
