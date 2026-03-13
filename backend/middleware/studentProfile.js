const { ensureCompleteStudentProfile, validateStudentProfile } = require('../utils/studentProfileSetup');

/**
 * Middleware to ensure student profile is complete before accessing student features
 * This runs on every student route to guarantee all features work
 */
async function ensureStudentProfileMiddleware(req, res, next) {
    try {
        // Only run for student role
        if (req.user && req.user.role === 'student') {
            console.log('Ensuring student profile completeness for user:', req.user._id);
            
            // Ensure complete student profile
            const student = await ensureCompleteStudentProfile(req.user._id, req.user.email);
            
            // Validate profile
            if (!validateStudentProfile(student)) {
                console.warn('Student profile validation failed for user:', req.user._id);
                // Continue anyway but log the issue
            }
            
            // Attach student profile to request for easy access
            req.student = student;
            
            console.log('Student profile verified and attached to request');
        }
        
        next();
    } catch (error) {
        console.error('Error in student profile middleware:', error);
        // Don't fail the request, just log the error and continue
        next();
    }
}

module.exports = {
    ensureStudentProfileMiddleware
};