/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Enable React strict mode for surfacing potential issues during development.
   * This is intentionally on — do not disable it.
   */
  reactStrictMode: true,

  /**
   * Experimental features
   */
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb'
    }
  },

  /**
   * Environment variables exposed to the browser.
   * Prefer using NEXT_PUBLIC_ prefix instead of listing them here,
   * so the .env.example stays as the single source of truth.
   */

  /**
   * Image optimisation domains — populate in Phase 1+ as needed.
   */
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
