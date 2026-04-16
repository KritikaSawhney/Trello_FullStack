require('dotenv').config();
const express = require('express');
const cors = require('cors');

const boardRoutes = require('./src/routes/boards');
const listRoutes = require('./src/routes/lists');
const cardRoutes = require('./src/routes/cards');
const memberRoutes = require('./src/routes/members');
const labelRoutes = require('./src/routes/labels');
const searchRoutes = require('./src/routes/search');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Serve static uploads
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/boards', boardRoutes);
app.use('/api/lists', listRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/labels', labelRoutes);
app.use('/api/search', searchRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`🚀 Trello Clone Backend running on http://localhost:${PORT}`);
});

module.exports = app;
