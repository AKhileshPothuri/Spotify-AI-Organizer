const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ['@spotify-organizer/types'],
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
};

export default nextConfig;
