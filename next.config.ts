import type { NextConfig } from "next";

const securityHeaders = [
  // iframe 삽입 차단 (클릭재킹 방어)
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // 브라우저의 MIME 타입 추측 차단 (이미지를 스크립트로 실행하는 공격 방어)
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // 외부 링크 클릭 시 URL 정보 최소화
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // 불필요한 브라우저 기능 차단 (마이크·카메라 등)
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
  // DNS 프리페치 활성화 (성능 + 보안 균형)
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
]

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
};

export default nextConfig;
