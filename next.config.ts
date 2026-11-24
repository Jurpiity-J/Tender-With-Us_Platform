import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    // File uploads are limited to 10 MiB in the action itself. Allow room for
    // multipart form overhead in both Next's Action and Proxy body buffers.
    serverActions: { bodySizeLimit: '12mb' },
    proxyClientMaxBodySize: '12mb',
  },
}

export default nextConfig
