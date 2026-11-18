// Cloudflare Pages Function: REST für die App unter /api/...
import { handleRequest } from '../../server/mcp/handler';
import type { Env } from '../../server/mcp/store';

export const onRequest = (ctx: { request: Request; env: Env }): Promise<Response> =>
  handleRequest(ctx.request, ctx.env);
