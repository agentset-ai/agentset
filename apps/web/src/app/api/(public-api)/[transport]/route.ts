import {
  MCP_SERVER_INFO,
  MCP_SERVER_INSTRUCTIONS,
  registerTools,
} from "@/lib/mcp";
import { verifyMcpToken } from "@/lib/mcp/auth";
import { createMcpHandler, withMcpAuth } from "mcp-handler";

export const preferredRegion = "iad1"; // make this closer to the DB
export const maxDuration = 120;

const handler = createMcpHandler(
  (server) => {
    registerTools(server);
  },
  {
    serverInfo: MCP_SERVER_INFO,
    instructions: MCP_SERVER_INSTRUCTIONS,
  },
  {
    basePath: "/api",
    disableSse: true,
    maxDuration: 120,
    verboseLogs: false,
  },
);

// authenticated with an org API key: Authorization: Bearer agentset_xxx
const authHandler = withMcpAuth(handler, verifyMcpToken, { required: true });

export { authHandler as GET, authHandler as POST, authHandler as DELETE };
