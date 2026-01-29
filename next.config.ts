/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "source.unsplash.com" },

      // public objects
      {
        protocol: "https",
        hostname: "hcwlgzarrweenvdacddj.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },

      // signed objects
      {
        protocol: "https",
        hostname: "hcwlgzarrweenvdacddj.supabase.co",
        pathname: "/storage/v1/object/sign/**",
      },
    ],
  },
};

export default nextConfig;
