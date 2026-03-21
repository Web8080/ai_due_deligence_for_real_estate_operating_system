// Author: Victor.I
// Dev proxy: browser -> same-origin /api/reos/* -> FastAPI (avoids CORS).
// Set REOS_API_PROXY_TARGET in frontend/.env.local if the API is not on 127.0.0.1:8000.

import { NextResponse } from "next/server";

const UPSTREAM = (process.env.REOS_API_PROXY_TARGET || "http://127.0.0.1:8000").replace(/\/$/, "");

const DROP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

async function proxy(request, routeParams) {
  const params = await routeParams;
  const segments = params.path ?? [];
  const subpath = segments.length ? segments.join("/") : "";
  const qs = new URL(request.url).search;
  const targetUrl = `${UPSTREAM}/${subpath}${qs}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!DROP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  const method = request.method;
  let body;
  if (!["GET", "HEAD"].includes(method)) {
    body = await request.arrayBuffer();
  }

  let upstream;
  try {
    upstream = await fetch(targetUrl, {
      method,
      headers,
      body: body && body.byteLength ? body : undefined,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      {
        detail: `Upstream unreachable at ${UPSTREAM}. Start uvicorn on port 8000 or set REOS_API_PROXY_TARGET in frontend/.env.local`,
      },
      { status: 502 }
    );
  }

  const outHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    const low = key.toLowerCase();
    if (low === "transfer-encoding") return;
    outHeaders.set(key, value);
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: outHeaders,
  });
}

export async function GET(request, ctx) {
  return proxy(request, ctx.params);
}
export async function POST(request, ctx) {
  return proxy(request, ctx.params);
}
export async function PUT(request, ctx) {
  return proxy(request, ctx.params);
}
export async function PATCH(request, ctx) {
  return proxy(request, ctx.params);
}
export async function DELETE(request, ctx) {
  return proxy(request, ctx.params);
}
export async function OPTIONS(request, ctx) {
  return proxy(request, ctx.params);
}
