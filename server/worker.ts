// Cloudflare Worker: liefert die App (statische Dateien aus dist) und beantwortet /mcp/… und /api/… selbst.
import { handleRequest } from './mcp/handler';
import type { Env } from './mcp/store';

interface WorkerEnv extends Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith('/mcp/') || pathname.startsWith('/api/'))
      return handleRequest(request, env);
    return env.ASSETS.fetch(request);
  },
};
