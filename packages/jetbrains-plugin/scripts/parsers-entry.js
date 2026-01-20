/**
 * Entry point for bundled parsers
 * Exposes the API that will be called from GraalJS
 */

// Import from the local parsers package
const {
  detectRoutes,
  detectAndParseRoutes,
  hasAnyProjectType,
  hasNextApp,
  hasNextPages,
  hasTRPC,
  hasNestJs,
  parseNextAppRoutes,
  parseNextPagesRoutes,
  parseTRPCRouters,
  parseNestJsRoutes,
} = require('../../parsers/dist/index.js');

// Export for use in GraalJS
module.exports = {
  detectRoutes,
  detectAndParseRoutes,
  hasAnyProjectType,
  hasNextApp,
  hasNextPages,
  hasTRPC,
  hasNestJs,
  parseNextAppRoutes,
  parseNextPagesRoutes,
  parseTRPCRouters,
  parseNestJsRoutes,
};
