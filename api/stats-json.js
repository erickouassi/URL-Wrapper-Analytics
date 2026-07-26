import fs from "fs";
import path from "path";

export default function handler(req, res) {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "Missing ?url" });

  const file = path.join(process.cwd(), "data", "clicks.json");
  let clicks = [];

  if (fs.existsSync(file)) {
    clicks = JSON.parse(fs.readFileSync(file));
  }

  const filtered = clicks.filter(c => c.url === url);

  res.json({
    url,
    totalClicks: filtered.length,
    recent: filtered.slice(-50)
  });
}

