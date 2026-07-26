/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
  // Never expose secret env vars to the client. Only NEXT_PUBLIC_* vars
  // are shipped to the browser by Next.js — everything else (API keys,
  // Supabase service role key, Discord webhook) stays server-side only.
};

module.exports = nextConfig;
