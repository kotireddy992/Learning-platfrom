const { auth, authorize } = require('./auth');

// Middleware to ensure user is authenticated and has admin role
const adminAuth = [auth, authorize('admin')];

module.exports = { adminAuth };
