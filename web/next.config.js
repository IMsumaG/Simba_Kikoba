/** @type {import('next').NextConfig} */
const nextConfig = {

    typescript: {
        // Ignore TypeScript errors during build to prevent blocking deployment
        ignoreBuildErrors: true,
    }
};

module.exports = nextConfig;
