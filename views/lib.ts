import { encode } from "html-entities";

export { encode };

/**
 * Make all occurrences of keyword <b>bold</b>.
 * @param text
 * @param keyword
 * @returns string
 */
export function embolden(text: string, keyword: string): string {
  // var text = encode(text);
  var r = new RegExp(`(${RegExp.escape(encode(keyword))})`, "ig");
  return text.replaceAll(r, "<b>$1</b>");
}

/**
 * Cut off the string after the first word that makes the string
 * exceed (x) characters.
 * @param string
 * @param length
 * @returns string
 */
export function str_stop_after(string: string, length: number): string {
  return string.split(" ").reduce((a, c) => {
    if (a.length < length) a += c;
    return a;
  }, "");
}

/**
 * Add linebreaks to text every (x) characters.
 * @param text
 * @param columns
 * @returns string
 */
export function linebreak(text: string, columns: number): string {
  var lines: string[] = [""];
  for (var i = 0; i < text.length; i++) {
    var char = text[i];
    if (char === " " && lines[lines.length - 1].length >= columns) {
      lines.push("");
    } else {
      lines[lines.length - 1] += char;
    }
  }
  var output = "";
  for (var i = 0; i < lines.length; i++) {
    output += lines[i];
    if (i !== lines.length - 1) output += "<br>";
  }
  return output;
}
