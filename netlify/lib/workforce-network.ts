import { lookup } from "node:dns/promises";
import https from "node:https";
import { gunzipSync, inflateSync, brotliDecompressSync } from "node:zlib";
import ipaddr from "ipaddr.js";
import { ApiError } from "./security.js";

// Resolve at connection time and pin the actual socket to a public address.
export async function publicHost(host: string) {
  if (!/^[a-z0-9.-]+$/i.test(host) || !host.includes(".") || host.endsWith("."))
    throw new ApiError(400, "عنوان الخادم غير مسموح.");
  let timer: ReturnType<typeof setTimeout> | undefined;
  const records = await Promise.race([
    lookup(host, { all: true }),
    new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new ApiError(502, "تعذر الوصول إلى خادم الاتصال.")),
        5000,
      );
    }),
  ]).finally(() => clearTimeout(timer));
  if (
    !records.length ||
    records.some(({ address }) => ipaddr.process(address).range() !== "unicast")
  )
    throw new ApiError(
      400,
      "يجب استخدام خادم عام؛ العناوين الداخلية غير مسموحة.",
    );
  return records[0];
}
export function publicUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ApiError(400, "أدخل رابط HTTPS صالحاً.");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443")
  )
    throw new ApiError(400, "يسمح بروابط HTTPS العامة فقط.");
  return url;
}
export async function safePageRequest(
  raw: string,
  method: string,
  headers: Record<string, string>,
  body: Buffer | null,
) {
  const url = publicUrl(raw),
    address = await publicHost(url.hostname);
  return new Promise<{
    status: number;
    headers: Record<string, string>;
    body: Buffer;
  }>((resolve, reject) => {
    const request = https.request(
      url,
      {
        method,
        headers: { ...headers, host: url.host, "accept-encoding": "identity" },
        rejectUnauthorized: true,
        servername: url.hostname,
        family: address.family,
        lookup: (_host, _options, callback) =>
          callback(null, address.address, address.family),
      },
      (response) => {
        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > 3_000_000) request.destroy(new Error("size"));
          else chunks.push(chunk);
        });
        response.on("error", reject);
        response.on("end", () => {
          try {
            let content: Buffer = Buffer.concat(chunks);
            const encoding = response.headers["content-encoding"];
            if (encoding === "gzip")
              content = gunzipSync(content, { maxOutputLength: 3_000_000 });
            else if (encoding === "br")
              content = brotliDecompressSync(content, {
                maxOutputLength: 3_000_000,
              });
            else if (encoding === "deflate")
              content = inflateSync(content, { maxOutputLength: 3_000_000 });
            else if (encoding && encoding !== "identity")
              throw new Error("encoding");
            resolve({
              status: response.statusCode || 502,
              headers: Object.fromEntries(
                Object.entries(response.headers)
                  .filter(
                    ([key]) =>
                      ![
                        "transfer-encoding",
                        "content-length",
                        "content-encoding",
                      ].includes(key),
                  )
                  .map(([key, value]) => [
                    key,
                    Array.isArray(value) ? value.join("\n") : value || "",
                  ]),
              ),
              body: content,
            });
          } catch {
            reject(new Error("invalid response"));
          }
        });
      },
    );
    const timer = setTimeout(() => request.destroy(new Error("timeout")), 9000);
    request.on("close", () => clearTimeout(timer));
    request.on("error", reject);
    if (body) request.write(body);
    request.end();
  });
}
