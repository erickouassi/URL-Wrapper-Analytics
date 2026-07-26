export default function handler(req, res) {
  res.json({ status: "ok", timestamp: Date.now() });
}
