const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', process.env.FRONTEND_URL, process.env.ADMIN_URL].filter(Boolean),
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/exco', require('./routes/exco'));
app.use('/api/lecturers', require('./routes/lecturers'));
app.use('/api/materials', require('./routes/materials'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/students', require('./routes/students'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'NISGS Backend Running' }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nisgs')
  .then(() => {
    console.log('✅ MongoDB connected');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 NISGS Backend running on port ${PORT}`));
  })
  .catch(err => console.error('❌ MongoDB error:', err));

module.exports = app;
