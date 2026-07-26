const db = require('../db');
const axios = require('axios');

const GA_MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID;
const GA_API_SECRET = process.env.GA_API_SECRET;

module.exports = function(app) {
  app.get('/go', async (req, res) => {
    const url = req.query.url;

    if (!url) {
      return res.status(400).send("Missing ?url parameter");
    }

    // Log click locally
    const clicks = db.load();
    clicks.push({
      url,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      referrer: req.headers['referer'] || null,
      timestamp: Date.now()
    });
    db.save(clicks);

    // Send event to Google Analytics
    if (GA_MEASUREMENT_ID && GA_API_SECRET) {
      try {
        await axios.post(
          `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`,
          {
            client_id: req.ip,
            events: [
              {
                name: "url_wrapper_click",
                params: {
                  destination_url: url,
                  referrer: req.headers['referer'] || "none",
                  user_agent: req.headers['user-agent']
                }
              }
            ]
          }
        );
      } catch (err) {
        console.error("GA error:", err.message);
      }
    }

    res.redirect(url);
  });
};
