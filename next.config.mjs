/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // 개발 모드에서 적극적인 새로고침 활성화
  experimental: {
    optimisticClientCache: false,
    serverMinification: false,
  },
  // 파일 시스템 캐싱 비활성화 (개발 모드에서 파일 접근 오류 방지)
  generateEtags: false,
  // 정적 파일 압축 비활성화
  compress: false,
  // 개발 서버가 파일을 감시하는 방식 변경
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
    
    // 개발 모드에서 캐싱 설정 조정
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        poll: 3000, // 폴링 간격을 3초로 늘림
        aggregateTimeout: 500,
        ignored: [
          '**/node_modules/**',
          '**/.next/**',
          '**/data.db',
          '**/.db_initialized',
          '**/lib/db/migrations/**'
        ],
      };
      
      // 캐시 비활성화
      config.cache = false;
    }
    
    return config;
  },
  // 서버 컴포넌트 관련 설정
  serverComponentsExternalPackages: ['better-sqlite3', 'drizzle-orm'],
}

export default nextConfig
