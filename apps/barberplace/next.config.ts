import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@platform/ui', '@platform/core', '@platform/supabase'],
}

export default nextConfig
