const path = require('path');

module.exports = function(app) {
  app.get('/stats', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'stats.html'));
  });
};
