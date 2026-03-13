const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Basic middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

// Request logging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// Health check first
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

// Connect to MongoDB only after basic setup
let dbConnected = false;
const connectDB = async () => {
    try {
        const mongoose = require('mongoose');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/school_performance_db');
        console.log('✅ MongoDB Connected');
        dbConnected = true;
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        console.log('⚠️  Server will run without database');
    }
};

// Import routes with error handling
try {
    const authRoutes = require('./routes/auth');
    const teacherRoutes = require('./routes/teacher');
    const studentRoutes = require('./routes/student');
    const adminRoutes = require('./routes/admin');

    app.use('/api/auth', authRoutes);
    app.use('/api/teacher', teacherRoutes);
    app.use('/api/student', studentRoutes);
    app.use('/api/admin', adminRoutes);
    
    console.log('✅ Routes loaded successfully');
} catch (error) {
    console.error('❌ Route loading error:', error.message);
}

// API error handler
app.use('/api/*', (req, res) => {
    if (!dbConnected) {
        return res.status(503).json({ message: 'Database not connected' });
    }
    res.status(404).json({ message: 'API endpoint not found' });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Server Error:', error.message);
    res.status(500).json({ message: 'Internal server error' });
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/login.html'));
});

const PORT = process.env.PORT || 5000;

// Start server
app.listen(PORT, async () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🌐 Frontend: http://localhost:${PORT}`);
    console.log(`🔗 API: http://localhost:${PORT}/api`);
    
    // Connect to database after server starts
    await connectDB();
});

module.exports = app;