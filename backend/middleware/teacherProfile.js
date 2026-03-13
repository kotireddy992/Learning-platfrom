const { ensureCompleteTeacherProfile, validateTeacherProfile } = require('../utils/teacherProfileSetup');

/**
 * Middleware to ensure teacher profile is complete before accessing teacher features
 * This runs on every teacher route to guarantee all features work
 */
async function ensureTeacherProfileMiddleware(req, res, next) {
    try {
        // Only run for teacher role
        if (req.user && req.user.role === 'teacher') {
            console.log('Ensuring teacher profile completeness for user:', req.user._id);
            
            // Ensure complete teacher profile
            const teacher = await ensureCompleteTeacherProfile(req.user._id);
            
            // Validate profile
            if (!validateTeacherProfile(teacher)) {
                console.warn('Teacher profile validation failed for user:', req.user._id);
                // Continue anyway but log the issue
            }
            
            // Attach teacher profile to request for easy access
            req.teacher = teacher;
            
            console.log('Teacher profile verified and attached to request');
        }
        
        next();
    } catch (error) {
        console.error('Error in teacher profile middleware:', error);
        // Don't fail the request, just log the error and continue
        next();
    }
}

module.exports = {
    ensureTeacherProfileMiddleware
};