const express = require('express');
require('dotenv').config();

const app = express();

console.log('Starting server...');
console.log('Environment variables:');
console.log('PORT:', process.env.PORT);
console.log('MONGO_URI:', process.env.MONGO_URI);
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Not set');

// Test basic express setup
app.get('/test', (req, res) => {
    res.json({ message: 'Server is working!' });
});

const PORT = process.env.PORT || 5000;

try {
    app.listen(PORT, () => {
        console.log(`✅ Test server running on http://localhost:${PORT}`);
        console.log(`✅ Test endpoint: http://localhost:${PORT}/test`);
    });
} catch (error) {
    console.error('❌ Server startup error:', error);
}