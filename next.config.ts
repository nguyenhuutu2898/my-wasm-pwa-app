// next.config.ts
import withPWA from 'next-pwa';

const isDev = process.env.NODE_ENV === 'development';

const nextConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: isDev,
})(
  {
    reactStrictMode: true,
    webpack: (config) => {
      // ép dùng Webpack thay vì Turbopack
      return config;
    },
  }
);

export default nextConfig;
