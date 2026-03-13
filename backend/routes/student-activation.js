const express = require('express');
const User = require('../models/User');
const Student = require('../models/Student');

const router = express.Router();

// Student enrollment activation route
router.post('/activate-student', async (req, res) => {
    try {
        const { enrolledStudentId, password } = req.body;
        
        if (!enrolledStudentId || !password) {
            return res.status(400).json({ message: 'Student ID and password are required' });
        }

        // Find student by studentId
        const student = await Student.findOne({ studentId: enrolledStudentId });
        if (!student) {
            return res.status(404).json({ message: 'Student ID not found. Please contact your teacher.' });
        }

        // Check if student already has a user account
        if (student.userId) {
            return res.status(400).json({ message: 'This student ID is already activated.' });
        }

        // Create new user account
        const user = new User({
            username: enrolledStudentId,
            email: `${enrolledStudentId}@school.edu`,
            password: password,
            role: 'student',
            firstName: student.firstName || 'Student',
            lastName: student.lastName || enrolledStudentId
        });
        await user.save();

        // Link user to student record
        student.userId = user._id;
        await student.save();

        res.json({ 
            message: 'Student account activated successfully! You can now login with your Student ID.',
            studentId: enrolledStudentId
        });
    } catch (error) {
        console.error('Student activation error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;