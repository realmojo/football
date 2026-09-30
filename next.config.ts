import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {};

export default nextConfig;

// `next dev` 에서 Cloudflare 바인딩을 쓸 수 있게 한다.
initOpenNextCloudflareForDev();
