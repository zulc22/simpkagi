import Koa from "koa";
import mount from "koa-mount";
import logger from "koa-logger";
import serveStatic from "koa-static";
import pug from "pug";
import * as lib from "./views/lib.ts";
import * as kagi from "./kagisch.ts";
import { TOKEN, CONFIG } from "./config.ts";

const app = new Koa();
app.use(logger());

// create a decorated pug template engine instance that includes a
// 'standard library' of helpful JS/TS host functions
function pug_with_lib(earl: string): (locals?: object) => string {
  const pug_function = pug.compileFile(earl);
  return function (locals?: object) {
    return pug_function({ ...locals, ...lib });
  };
}

const views = {
  home: pug_with_lib("views/home.pug"),
  search: pug_with_lib("views/search.pug"),
};

type KoaMiniHandler = (ctx: Koa.Context) => void;

namespace Router {
  const pathname_matches: { [pathname: string]: KoaMiniHandler } = {
    "/search": perform_search,
    "/": render(views.home),
    "/favicon.ico": redirect_to("/images/favicon.ico"),
  };

  export async function route(ctx: Koa.Context, next: Koa.Next) {
    if (pathname_matches)
      for (const [pathname, func] of Object.entries(pathname_matches)) {
        if (ctx.URL.pathname === pathname) return await func(ctx);
      }

    await next();
  }

  async function perform_search(ctx: Koa.Context) {
    var q = ctx.URL.searchParams.get("q");
    var batch = parseInt(ctx.URL.searchParams.get("batch") || "0");
    var lucky = ctx.URL.searchParams.get("btnI");
    var results;
    if (q) {
      results = await kagi.search(q, batch);
    }
    if (lucky && results) {
      ctx.redirect(results.results[0].url);
      return;
    }
    await render(views.search, {
      query: q,
      results: [],
      ...results,
    })(ctx);
  }

  function redirect_to(location: string): KoaMiniHandler {
    return (ctx: Koa.Context) => {
      ctx.redirect(location);
    };
  }

  function render(
    v: (locals?: object) => string,
    locals?: object,
  ): KoaMiniHandler {
    return (ctx: Koa.Context) => {
      ctx.body = v(locals);
      ctx.type = "html";
    };
  }
}

app.use(Router.route);

app.use(mount("/images", serveStatic("images")));

console.log(
  `Listening on http://${CONFIG.listen.host || "localhost"}:${CONFIG.listen.port}/`,
);
app.listen(CONFIG.listen.port, CONFIG.listen.host);
