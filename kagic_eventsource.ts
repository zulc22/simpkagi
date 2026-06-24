import { EventSource } from "eventsource";
import { TOKEN } from "./config.ts";
import EventEmitter, { once } from "node:events";
import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import * as fs from "node:fs/promises";

export type Result = {
  title: string;
  url: string;
  description: string;
  tools: Tool[];
  subresults?: Result[];
};

export type Tool = {
  name: string;
  url: string;
};

function kagi_eventstream(query: string, page?: number) {
  // generate URL: kagi.com/socket/search?q={}[&batch={}]
  var u = new URL("https://kagi.com/socket/search");
  u.searchParams.set("q", query);
  if (page) u.searchParams.set("batch", page.toString());

  // make eventsource with UA and auth tokens and schtuff
  const es = new EventSource(u.href, {
    fetch: (input, init) =>
      fetch(input, {
        ...init,
        headers: {
          ...init.headers,
          Cookie: `kagi_session=${TOKEN}`,
          "User-Agent":
            "Mozilla/5.0 (X11; Linux x86_64; rv:149.0) Gecko/20100101 Firefox/149.0",
        },
        "x-kagi-authorization": TOKEN,
      }),
  });

  return es;
}

type KagiEvent = {
  tag: string;
  payload: any;
  sent_at: number;
  kagi_version: string;
};

export type SearchData = {
  results: Result[];
  results_message: string;
  searchinfo: {
    share_url: string;
    curr_batch: number;
    curr_piece: number;
    next_batch: number;
    next_piece: number;
  };
};

// (==3
export async function search(
  query: string,
  page?: number,
): Promise<SearchData> {
  const es = kagi_eventstream(query, page);

  const done_ev = new EventEmitter();
  var tags: {
    top_content?: string;
    "top-content-unique"?: string;
    "search.info"?: {
      share_url: string;
      curr_batch: number;
      curr_piece: number;
      next_batch: number;
      next_piece: number;
    };
    search?: { content: string };
    related_searches?: string;
    domain_info?: string;
  } = {};

  es.addEventListener("message", (event) => {
    if (event.lastEventId === "CLOSE") {
      es.close();
      done_ev.emit("done");
      return;
    }
    if (event.data) {
      var d = JSON.parse(event.data) as KagiEvent[];
      for (const e of d) {
        if (e.tag === "search" && tags.search) {
          console.log("Merged");
          tags.search.content += e.payload.content;
        } else tags[e.tag] = e.payload;
      }
    }
  });

  await once(done_ev, "done");

  var results: Result[] = [];
  // await fs.writeFile("kagis_orig.html", tags.search.content);
  const $ = cheerio.load(tags.search.content);

  function parse_tool(
    tools_out: Tool[],
  ): (this: Element, i: number, elem: Element) => void {
    return function (this: Element, i, elem) {
      var url = $(this).attr("href")!;
      if (url.startsWith("/summarizer")) return;
      if (url.startsWith("/assistant")) return;
      tools_out.push({
        name: $(this).text().trim(),
        url,
      });
    };
  }

  function parse_result(c: cheerio.Cheerio<Element>): Result {
    var link = c.find(".__sri-title ._0_URL");

    var tools: Tool[] = [];
    c.find(".list_items a").each(parse_tool(tools));

    return {
      title: link.text().trim(),
      url: link.attr("href")!,
      description: c.find(".__sri-desc").text().trim(),
      tools,
    };
  }

  $("._ext_ub_r").each(function (this: Element, i, elem) {
    if ($(this).hasClass("widgetItem")) return;
    if ($(this).prop("tagName") === "DETAILS") return;

    if ($(this).hasClass("sri-group")) {
      var domresult = $(this).find("._0_SRI");
    } else {
      var domresult = $(this);
    }
    var subresults = $(this).find(".__srgi");

    var result = parse_result(domresult);
    result.subresults = [];
    subresults.each(function (this: Element, i, elem) {
      result.subresults.push(parse_result($(this)));
    });

    results.push(result);
  });

  console.log(tags["search.info"]);
  return {
    results,
    results_message: tags["top-content-unique"],
    searchinfo: tags["search.info"],
  };
}
