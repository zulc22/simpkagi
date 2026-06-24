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

function err_config_unloadable(explanation: string) {
  console.error(`${explanation}

Hint:
In config.ini, expected something along the lines of:

[listen]
port = default: 8080
host = default: 0.0.0.0 -- listen on all interfaces

[kagi]
private_link = private session link or token; tokens automatically get clipped out of links

(default values need not be specified.)`);
}

async function get_config(): Promise<AppConfiguration> {
  var text: string;
  var tree: { [key: string]: any };

  // read config.ini text

  try {
    text = await readFile("./config.ini", { encoding: "utf-8" });
  } catch {
    err_config_unloadable("Failed to read config.ini (does it exist?)");
    process.exit(1);
  }

  // parse as ini

  try {
    tree = ini.parse(text);
  } catch {
    err_config_unloadable("Could not parse config.ini");
    process.exit(1);
  }

  // validate and fill in missing options

  if (!tree.listen) tree.listen = {};

  if (tree.listen.port) {
    tree.listen.port = parseInt(tree.listen.port);
  } else {
    tree.listen.port = 8080;
  }

  if (!tree.kagi || !tree.kagi.private_link) {
    err_config_unloadable("Required Kagi token was not specified.");
    process.exit(1);
  }

  return tree as AppConfiguration;
}

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

export const CONFIG = await get_config();
export const TOKEN = get_kagi_token_from_config();
