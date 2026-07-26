const db = require('../db');

module.exports = function(app) {
  app.get('/stats/json', (req, res) => {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: "Missing ?url" });

    const clicks = db.load().filter(c => c.url === url);

    res.json({
      url,
      totalClicks: clicks.length,
      recent: clicks.slice(-50)
    });
  });
};

