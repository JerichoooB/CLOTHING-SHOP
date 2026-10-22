export function sameOrigin(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== req.get("host"))
        return res.status(403).json({ error: "This request is not allowed." });
    } catch {
      return res.status(403).json({ error: "This request is not allowed." });
    }
  }
  if (req.get("sec-fetch-site") === "cross-site")
    return res.status(403).json({ error: "This request is not allowed." });
  next();
}
export function requireUser(req, res, next) {
  if (!req.user)
    return res.status(401).json({ error: "Please log in to continue." });
  next();
}
export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin")
    return res.status(403).json({ error: "Administrator access is required." });
  next();
}
export function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  error.expose = true;
  throw error;
}
