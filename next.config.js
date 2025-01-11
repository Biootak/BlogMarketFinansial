// biome-ignore lint/style/useNodejsImportProtocol: <explanation>
const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // بهینه‌سازی برای محیط تولید
  compress: true, // فشرده‌سازی خودکار برای افزایش سرعت
  poweredByHeader: false, // حذف هدر اضافی برای امنیت بیشتر
  productionBrowserSourceMaps: false, // غیرفعال کردن source maps در تولید
  swcMinify: true, // فعال کردن مینیفای SWC
  generateEtags: true, // فعال کردن ETag برای کش بهتر
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000, // زمان نگهداری صفحات در حافظه
    pagesBufferLength: 5, // تعداد صفحات در بافر
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'biotak.storage.c2.liara.space',
      },
      {
        protocol: 'https',
        hostname: 'avatar.vercel.sh',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.jsdelivr.net',
      },
    ],
  },

  experimental: {
    serverActions: {
      bodySizeLimit: '3mb',
    },
    optimizeCss: true, // بهینه‌سازی CSS
    optimizeServerReact: true, // بهینه‌سازی رندر سمت سرور
    turbotrace: {
      logLevel: "error",
      memoryLimit: 6000
    },
    optimisticClientCache: true, // بهبود کش سمت کلاینت
  },

  sassOptions: {
    includePaths: [path.join(__dirname, 'styles')],
  },

  httpAgentOptions: {
    keepAlive: true, // بهبود عملکرد اتصالات HTTP
  },

  transpilePackages: ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner', 'framer-motion'],
};

module.exports = nextConfig;
