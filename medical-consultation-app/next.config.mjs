/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ['192.168.56.1', '192.168.56.1:3033'],
  logging: {
    browserToTerminal: true,
  },
}

export default nextConfig
