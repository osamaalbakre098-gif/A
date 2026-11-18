// Cloudflare Pages Function: MCP-Server unter /mcp/<Kopplungscode>
import { handleRequest } from '../../server/mcp/handler';
import type { Env } from '../../server/mcp/store';

export const onRequest = (ctx: { request: Request; env: Env }): Promise<Response> =>
  handleRequest(ctx.request, ctx.env);
