import Koa from "koa";
import mount from "koa-mount";
import logger from "koa-logger";
import serveStatic from "koa-static";
import pug from "pug";
import * as lib from "./views/lib.ts";
import * as kaggyi from "./kagic_eventsource.ts";
import { TOKEN, CONFIG } from "./config.ts";

const app = new Koa();
app.use(logger());

function pug_with_lib(earl: string) {
  const pug_function = pug.compileFile(earl);
  return function (locals?: object) {
    return pug_function({ ...locals, ...lib });
  };
}

const views = {
  home: pug_with_lib("views/home.pug"),
  search: pug_with_lib("views/search.pug"),
};

app.use(async (ctx, next) => {
  if (ctx.URL.pathname === "/search") {
    var q = ctx.URL.searchParams.get("q");
    var batch = parseInt(ctx.URL.searchParams.get("batch"));
    var lucky = ctx.URL.searchParams.get("btnI");
    var results;
    if (q) {
      results = await kaggyi.search(q, batch);
    }
    if (lucky && results) {
      ctx.redirect(results.results[0].url);
      return;
    }
    ctx.body = views.search({
      query: q,
      results: [],
      ...results,
    });
    ctx.type = "html";
    return;
  }

  if (ctx.URL.pathname === "/") {
    ctx.body = views.home();
    ctx.type = "html";
    return;
  }

  if (ctx.URL.pathname === "/favicon.ico") {
    ctx.redirect("/images/favicon.ico");
    return;
  }

  await next();
});

app.use(mount("/images", serveStatic("images")));

app.listen(CONFIG.listen.port, CONFIG.listen.host);
