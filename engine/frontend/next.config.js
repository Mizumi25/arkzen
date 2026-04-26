/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.137.77'], // Add your IP here
  experimental: {
    forceSwcTransforms: false,
  },
  async rewrites() {
    return [
      {
        source: '/storage/:path*',
        destination: 'http://127.0.0.1:8000/storage/:path*',
      },
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*',
      },
    ]
  },
}

module.exports = nextConfig