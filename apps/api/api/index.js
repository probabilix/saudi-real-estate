// ─────────────────────────────────────────────────────────────────────────────
// Vercel Serverless Bridge
// ─────────────────────────────────────────────────────────────────────────────
// This file acts as the entry point for Vercel's Zero-Config deployment.
// It bridges incoming serverless requests to the compiled Fastify application.

const server = require('../dist/index.js');

module.exports = async (req, res) => {
  // Extract the default export (the bootstrap handler) from our compiled code
  const handler = server.default || server;
  
  // Forward the request to Fastify
  return await handler(req, res);
};
