/** @type {import('next').NextConfig} */
const nextConfig = {
  // 개발 환경에서 React Strict Mode 비활성화 (중복 렌더링 방지)
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Enable aggressive refresh in development mode
  experimental: {
    optimisticClientCache: false,
    serverMinification: false,
  },
  // Handle external packages in server components
  serverExternalPackages: ['better-sqlite3', 'drizzle-orm'],
  // Disable file system caching (prevent file access errors in development mode)
  generateEtags: false,
  // Disable static file compression
  compress: false,
  // Change how the development server watches files
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      // Don't resolve 'fs', 'path', 'crypto' etc. on the client side
      config.resolve.fallback = {
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        url: false,
        net: false,
        tls: false,
        http: false,
        https: false,
        zlib: false,
      };
    }
    
    // Adjust caching settings in development mode
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        poll: 3000, // Increase polling interval to 3 seconds
        aggregateTimeout: 500,
        ignored: [
          '**/node_modules/**',
          '**/.next/**',
          '**/data.db',
          '**/.db_initialized',
          '**/lib/db/migrations/**'
        ],
      };
      
      // Disable cache
      config.cache = false;
    }
    
    return config;
  },
}

export default nextConfig
