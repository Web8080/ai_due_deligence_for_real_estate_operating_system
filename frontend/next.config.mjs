/** @type {import('next').NextConfig} */
// API proxy: `app/api/reos/[[...path]]/route.js` (reads REOS_API_PROXY_TARGET). Rewrites to external URLs
// were flaky with Turbopack in some setups; the route handler is explicit and returns 502 with a hint if the API is down.
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
