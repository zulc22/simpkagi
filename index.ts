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

class Router {
  pathname_matches!: { [pathname: string]: (ctx: Koa.Context) => void };

  constructor() {
    this.pathname_matches = {
      "/search": this.perform_search,
      "/": this.render(views.home),
      "/favicon.ico": this.redirect_to("/images/favicon.ico"),
    };
  }

  async route(ctx: Koa.Context, next: Koa.Next) {
    if (this.pathname_matches)
      for (const [pathname, func] of Object.entries(this.pathname_matches)) {
        if (ctx.URL.pathname === pathname) return await func(ctx);
      }

    await next();
  }

  async perform_search(ctx: Koa.Context) {
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
    await this.render(views.search, {
      query: q,
      results: [],
      ...results,
    })(ctx);
  }

  redirect_to(location: string): (ctx: Koa.Context) => void {
    return (ctx: Koa.Context) => {
      ctx.redirect(location);
    };
  }

  render(
    v: (locals?: object) => string,
    locals?: object,
  ): (ctx: Koa.Context) => void {
    return (ctx: Koa.Context) => {
      ctx.body = v(locals);
      ctx.type = "html";
    };
  }
}

const r = new Router();
app.use(r.route);

app.use(mount("/images", serveStatic("images")));

console.log(
  `Listening on http://${CONFIG.listen.host || "localhost"}:${CONFIG.listen.port}/`,
);
app.listen(CONFIG.listen.port, CONFIG.listen.host);
