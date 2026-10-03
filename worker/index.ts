import { httpServerHandler } from 'cloudflare:node';
import { configureCloudflareRuntime, createCloudflareHttpServer, runDailyUsageReset } from '../server.cloudflare';
import { SynaxRealtimeHub } from './realtime';

export { SynaxRealtimeHub };

interface Env {
  ASSETS: Fetcher;
  SYNAX_REALTIME_HUB: DurableObjectNamespace;
  SUPABASE_URL: string;
  SUPABASE_SECRET_KEY: string;
}

let serverPromise: Promise<import('node:http').Server> | null = null;
let handlerPromise: Promise<any> | null = null;

async function getApiHandler(env: Env, ctx: ExecutionContext) {
  configureCloudflareRuntime(env, ctx);

  if (!serverPromise) {
    serverPromise = createCloudflareHttpServer().catch((error) => {
      serverPromise = null;
      throw error;
    });
  }

  const server = await serverPromise;

  if (!handlerPromise) {
    handlerPromise = Promise.resolve(httpServerHandler(server) as any);
  }

  return handlerPromise;
}

export default {
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    configureCloudflareRuntime(env, ctx);
    try {
      await runDailyUsageReset(controller.scheduledTime);
    } catch (error) {
      console.error('SYNAX midnight daily reset failed:', error);
      throw error;
    }
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket traffic gets its own Cloudflare-native durable connection layer.
    if (url.pathname === '/ws' && request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      const id = env.SYNAX_REALTIME_HUB.idFromName('main');
      const stub = env.SYNAX_REALTIME_HUB.get(id);
      return stub.fetch(request);
    }

    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      try {
        const apiHandler = await getApiHandler(env, ctx);
        if (!apiHandler || typeof apiHandler.fetch !== 'function') {
          throw new Error('Cloudflare httpServerHandler did not create a fetch handler.');
        }
        return await apiHandler.fetch(request, env, ctx);
      } catch (error) {
        console.error('SYNAX API Worker error:', error);
        return new Response(JSON.stringify({
          error: 'SYNAX backend failed to initialize.',
          detail: error instanceof Error ? error.message : String(error),
        }), {
          status: 503,
          headers: { 'content-type': 'application/json; charset=utf-8' },
        });
      }
    }

    // Static React SPA.
    return env.ASSETS.fetch(request);
  },
};
