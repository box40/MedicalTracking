const express = require('express');
const cors = require('cors');
const path = require('path');
const passport = require('passport');

const authRoutes  = require('./routes/auth.cjs');
const dataRoutes  = require('./routes/data.cjs');
const oauthRoutes = require('./routes/oauth.cjs');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true })); // needed for Apple's POST callback
app.use(passport.initialize());

app.use('/api/auth',  authRoutes);
app.use('/api/auth',  oauthRoutes);
app.use('/api/data',  dataRoutes);

// Serve built frontend in production
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => console.log(`MedTrack server running on http://localhost:${PORT}`));
