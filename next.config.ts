import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // next dev nie dopisuje wtedy AGENTS.md / CLAUDE.md do repozytorium
  agentRules: false,
};

export default nextConfig;
