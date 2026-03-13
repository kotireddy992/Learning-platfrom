const Teacher = require('../models/Teacher');

/**
 * Comprehensive teacher profile setup utility
 * Ensures all teacher features are properly initialized for new teachers
 */

async function ensureCompleteTeacherProfile(userId) {
    try {
        let teacher = await Teacher.findOne({ userId });
        
        if (!teacher) {
            console.log('Creating new teacher profile for user:', userId);
            
            // Create complete teacher profile with all required fields
            teacher = new Teacher({
                userId,
                employeeId: `T${Date.now()}`,
                subject: 'General',
                assignedClasses: [
                    { class: '10', section: 'A' }  // Default assignment
                ],
                // Legacy fields for backward compatibility
                assigned_class: 'Grade 10A',
                assigned_section: 'A',
                grade: '10',
                phone: '0000000000',
                address: '',
                joinDate: new Date(),
                performanceScore: 0,
                totalLessons: 0,
                completedLessons: 0,
                attendanceDays: 0,
                totalWorkingDays: 0
            });
            
            await teacher.save();
            console.log('Complete teacher profile created successfully');
        } else {
            // Update existing profile to ensure all fields are present
            let needsUpdate = false;
            
            // Ensure assignedClasses array exists
            if (!teacher.assignedClasses || teacher.assignedClasses.length === 0) {
                teacher.assignedClasses = [{ class: '10', section: 'A' }];
                needsUpdate = true;
            }
            
            // Ensure all numeric fields have default values
            if (teacher.performanceScore === undefined) {
                teacher.performanceScore = 0;
                needsUpdate = true;
            }
            if (teacher.totalLessons === undefined) {
                teacher.totalLessons = 0;
                needsUpdate = true;
            }
            if (teacher.completedLessons === undefined) {
                teacher.completedLessons = 0;
                needsUpdate = true;
            }
            if (teacher.attendanceDays === undefined) {
                teacher.attendanceDays = 0;
                needsUpdate = true;
            }
            if (teacher.totalWorkingDays === undefined) {
                teacher.totalWorkingDays = 0;
                needsUpdate = true;
            }
            
            // Ensure legacy fields for backward compatibility
            if (!teacher.assigned_class) {
                teacher.assigned_class = 'Grade 10A';
                needsUpdate = true;
            }
            if (!teacher.assigned_section) {
                teacher.assigned_section = 'A';
                needsUpdate = true;
            }
            if (!teacher.grade) {
                teacher.grade = '10';
                needsUpdate = true;
            }
            if (!teacher.phone) {
                teacher.phone = '0000000000';
                needsUpdate = true;
            }
            if (!teacher.joinDate) {
                teacher.joinDate = new Date();
                needsUpdate = true;
            }
            
            if (needsUpdate) {
                await teacher.save();
                console.log('Teacher profile updated with missing fields');
            }
        }
        
        return teacher;
    } catch (error) {
        console.error('Error ensuring teacher profile:', error);
        throw error;
    }
}

/**
 * Initialize teacher dashboard data
 * Sets up default data structures for new teachers
 */
async function initializeTeacherDashboard(teacherId) {
    try {
        // This function can be extended to create default lessons, 
        // sample data, or other initialization tasks
        console.log('Teacher dashboard initialized for:', teacherId);
        return true;
    } catch (error) {
        console.error('Error initializing teacher dashboard:', error);
        return false;
    }
}

/**
 * Validate teacher profile completeness
 * Checks if all required fields are present and valid
 */
function validateTeacherProfile(teacher) {
    const requiredFields = [
        'userId', 'employeeId', 'subject', 'assigned_class', 
        'assigned_section', 'grade', 'phone'
    ];
    
    const missingFields = requiredFields.filter(field => !teacher[field]);
    
    if (missingFields.length > 0) {
        console.warn('Teacher profile missing fields:', missingFields);
        return false;
    }
    
    // Ensure assignedClasses array exists
    if (!teacher.assignedClasses || teacher.assignedClasses.length === 0) {
        console.warn('Teacher profile missing assignedClasses');
        return false;
    }
    
    return true;
}

module.exports = {
    ensureCompleteTeacherProfile,
    initializeTeacherDashboard,
    validateTeacherProfile
};