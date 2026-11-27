// Vercel entry for every /api/* request and the /p/:slug pages (rewritten to /api/p/...).
// The handlers below are the same Request -> Response functions Netlify runs; this file only
// routes between them and supplies the small context they read.
import api from "../netlify/functions/api.mts";
import page from "../netlify/functions/page.mts";

const context = {
  ip: undefined as string | undefined,
  waitUntil: (task: Promise<unknown>) => {
    void task.catch(() => {});
  },
};

function handler(req: Request): Promise<Response> {
  const pathname = new URL(req.url).pathname;
  if (/^\/(api\/)?p\/[^/]+(\/book)?$/.test(pathname))
    return page(req, context as never);
  return api(req, context as never);
}

// Vercel's Node runtime calls `fetch` with a standard Request (a bare function would get Node's IncomingMessage).
export default { fetch: handler };
