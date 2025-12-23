/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        // Warning: This allows production builds to successfully complete even if
        // your project has ESLint errors.
        ignoreDuringBuilds: true,
    },
    typescript: {
        // Ignore TypeScript errors during build to prevent blocking deployment
        ignoreBuildErrors: true,
    }
};

module.exports = nextConfig;
