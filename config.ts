import { readFile } from "fs/promises";
import ini from "ini";

export type AppConfiguration = {
  listen: {
    port: number;
    host?: string;
  };
  kagi: {
    private_link: string;
  };
};

async function get_config() {
  var text = await readFile("./config.ini", { encoding: "utf-8" });
  try {
    var tree = ini.parse(text);
  } catch {
    console.error(`Could not read config.ini.

Expected something along the lines of:

[listen]
port = default: 8080
host = default: 0.0.0.0 -- listen on all interfaces

[kagi]
private_link = private session link or token; tokens automatically get clipped out of links

(default values need not be specified.)`);
    process.exit(1);
  }
  if (!tree.listen) tree.listen = {};
  if (tree.listen.port) {
    tree.listen.port = parseInt(tree.listen.port);
  } else {
    tree.listen.port = 8080;
  }
  return tree as AppConfiguration;
}
export const CONFIG = await get_config();

function get_kagi_token_from_config(): string {
  var token = CONFIG.kagi.private_link;
  if (token.startsWith("https://")) {
    var url = new URL(token);
    return url.searchParams.get("token")!;
  }
  if (token.includes("&")) {
    return token.slice(0, token.indexOf("&"));
  }
  return token;
}
export const TOKEN = get_kagi_token_from_config();
