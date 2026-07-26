module.exports = function(app) {
  app.get('/health', (req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });
};
