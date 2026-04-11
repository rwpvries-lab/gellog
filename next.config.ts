import type { NextConfig } from "next";

/** Allow Next/Image to load Supabase Storage public objects for any project ref or local dev. */
function supabaseStorageRemotePatterns(): NonNullable<
  NonNullable<NextConfig["images"]>["remotePatterns"]
> {
  const patterns: NonNullable<
    NonNullable<NextConfig["images"]>["remotePatterns"]
  > = [
    {
      protocol: "https",
      hostname: "*.supabase.co",
      port: "",
      pathname: "/storage/v1/object/public/**",
    },
  ];

  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return patterns;

  try {
    const u = new URL(raw);
    const protocol = u.protocol === "http:" ? "http" : "https";
    patterns.push({
      protocol,
      hostname: u.hostname,
      port: u.port || "",
      pathname: "/storage/v1/object/public/**",
    });
  } catch {
    // leave wildcard-only patterns
  }

  return patterns;
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseStorageRemotePatterns(),
  },
  /** Ensure geolocation is not stripped by a CDN default; `(self)` = this origin only. */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Permissions-Policy",
            value: "geolocation=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
