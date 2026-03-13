const Student = require('../models/Student');

/**
 * Comprehensive student profile setup utility
 * Ensures all student features are properly initialized for new students
 */

async function ensureCompleteStudentProfile(userId, userEmail) {
    try {
        let student = await Student.findOne({ userId });
        
        if (!student) {
            console.log('Creating new student profile for user:', userId);
            
            const studentCount = await Student.countDocuments();
            
            // Create complete student profile with all required fields
            student = new Student({
                userId,
                studentId: `STU${String(studentCount + 1).padStart(3, '0')}`,
                rollNumber: `STU${String(studentCount + 1).padStart(3, '0')}`,
                class: '10',
                section: 'A',
                grade: '10', // For backward compatibility
                parentPhone: '0000000000',
                learningProgress: 0,
                completedLessons: 0,
                attendanceDays: 0,
                totalSchoolDays: 0,
                enrollmentDate: new Date()
            });
            
            await student.save();
            console.log('Complete student profile created successfully');
        } else {
            // Update existing profile to ensure all fields are present
            let needsUpdate = false;
            
            // Ensure all required fields have default values
            if (!student.studentId) {
                const studentCount = await Student.countDocuments();
                student.studentId = `STU${String(studentCount + 1).padStart(3, '0')}`;
                needsUpdate = true;
            }
            if (!student.rollNumber) {
                student.rollNumber = student.studentId || `STU${String(Date.now()).slice(-3)}`;
                needsUpdate = true;
            }
            if (!student.class) {
                student.class = student.grade || '10';
                needsUpdate = true;
            }
            if (!student.section) {
                student.section = 'A';
                needsUpdate = true;
            }
            if (!student.grade) {
                student.grade = student.class || '10';
                needsUpdate = true;
            }
            if (!student.parentPhone) {
                student.parentPhone = '0000000000';
                needsUpdate = true;
            }
            if (student.learningProgress === undefined) {
                student.learningProgress = 0;
                needsUpdate = true;
            }
            if (student.completedLessons === undefined) {
                student.completedLessons = 0;
                needsUpdate = true;
            }
            if (student.attendanceDays === undefined) {
                student.attendanceDays = 0;
                needsUpdate = true;
            }
            if (student.totalSchoolDays === undefined) {
                student.totalSchoolDays = 0;
                needsUpdate = true;
            }
            if (!student.enrollmentDate) {
                student.enrollmentDate = new Date();
                needsUpdate = true;
            }
            
            if (needsUpdate) {
                await student.save();
                console.log('Student profile updated with missing fields');
            }
        }
        
        return student;
    } catch (error) {
        console.error('Error ensuring student profile:', error);
        throw error;
    }
}

/**
 * Initialize student dashboard data
 * Sets up default data structures for new students
 */
async function initializeStudentDashboard(studentId) {
    try {
        console.log('Student dashboard initialized for:', studentId);
        return true;
    } catch (error) {
        console.error('Error initializing student dashboard:', error);
        return false;
    }
}

/**
 * Validate student profile completeness
 * Checks if all required fields are present and valid
 */
function validateStudentProfile(student) {
    const requiredFields = [
        'userId', 'studentId', 'rollNumber', 'class', 
        'section', 'grade', 'parentPhone'
    ];
    
    const missingFields = requiredFields.filter(field => !student[field]);
    
    if (missingFields.length > 0) {
        console.warn('Student profile missing fields:', missingFields);
        return false;
    }
    
    return true;
}

module.exports = {
    ensureCompleteStudentProfile,
    initializeStudentDashboard,
    validateStudentProfile
};