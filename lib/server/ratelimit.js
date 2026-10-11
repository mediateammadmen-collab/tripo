// Small in-memory limiter: at most `perMinute` requests per visitor per minute (best effort, per server instance).

const buckets = new Map();

export function clientIp(req) {
  return (
    req.headers.get("x-nf-client-connection-ip") ||
    (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function rateLimited(name, req, perMinute) {
  const key = name + ":" + clientIp(req);
  const now = Date.now();
  const recent = (buckets.get(key) || []).filter((t) => now - t < 60_000);
  recent.push(now);
  buckets.set(key, recent);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (!v.length || now - v[v.length - 1] > 60_000) buckets.delete(k);
  }
  return recent.length > perMinute;
}
