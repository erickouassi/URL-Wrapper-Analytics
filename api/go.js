import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  const url = req.query.url;
  if (!url) return res.status(400).send("Missing ?url parameter");

  const file = path.join(process.cwd(), "data", "clicks.json");
  let clicks = [];

  if (fs.existsSync(file)) {
    clicks = JSON.parse(fs.readFileSync(file));
  }

  clicks.push({
    url,
    ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress,
    userAgent: req.headers["user-agent"],
    referrer: req.headers["referer"] || null,
    timestamp: Date.now()
  });

  fs.writeFileSync(file, JSON.stringify(clicks, null, 2));

  return res.redirect(url);
}
