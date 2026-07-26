require('dotenv').config();
const express = require('express');
const app = express();

require('./routes/go')(app);
require('./routes/stats')(app);
require('./routes/statsPage')(app);
require('./routes/health')(app);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`URL Wrapper running on port ${PORT}`));
