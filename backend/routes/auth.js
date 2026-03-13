const express = require('express');
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const ApprovedStudent = require('../models/ApprovedStudent');
const jwt = require('jsonwebtoken');
const { ensureCompleteTeacherProfile, initializeTeacherDashboard } = require('../utils/teacherProfileSetup');
const { ensureCompleteStudentProfile, initializeStudentDashboard } = require('../utils/studentProfileSetup');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'school_performance_secret_key_2024';

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });
};



// Login route
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const user = await User.findOne({ 
            $or: [{ username }, { email: username }],
            isActive: true 
        });
        
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = generateToken(user._id);
        
        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                username: user.username,
                name: user.name,
                role: user.role,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Signup route
router.post('/signup', async (req, res) => {
    try {
        console.log('Signup request received:', req.body);
        
        const { name, email, password, role, employeeId, subject, studentId, class: studentClass } = req.body;

        // Basic validation
        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: 'Name, email, password, and role are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        if (!['administrator', 'teacher', 'student'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role selected' });
        }

        // Prevent multiple admin accounts
        if (role === 'administrator') {
            const existingAdmin = await User.findOne({ role: 'admin' });
            if (existingAdmin) {
                return res.status(403).json({ 
                    message: 'Admin account already exists. Only one admin is allowed.' 
                });
            }
        }

        // For students, check if email is approved by teacher
        if (role === 'student') {
            console.log('Checking approved student for email:', email.toLowerCase());
            const approvedStudent = await ApprovedStudent.findOne({ 
                email: email.toLowerCase().trim(),
                isUsed: false 
            });
            
            console.log('Found approved student:', approvedStudent);
            
            if (!approvedStudent) {
                return res.status(400).json({ 
                    message: 'This email is not approved for student registration. Please contact your teacher.' 
                });
            }
        }

        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [{ username: email }, { email }] 
        });

        if (existingUser) {
            return res.status(400).json({ 
                message: 'User with this email already exists' 
            });
        }

        // Create user
        const userRole = role === 'administrator' ? 'admin' : role;
        const user = new User({
            name,
            email,
            username: email,
            password,
            role: userRole
        });

        await user.save();
        console.log('User created successfully:', user._id);

        // Create role-specific profile
        try {
            if (role === 'teacher') {
                // Use comprehensive teacher profile setup
                const teacher = await ensureCompleteTeacherProfile(user._id);
                
                // Update with provided data if available
                if (employeeId) teacher.employeeId = employeeId;
                if (subject) teacher.subject = subject;
                await teacher.save();
                
                // Initialize teacher dashboard
                await initializeTeacherDashboard(teacher._id);
                
                // Note: No default students added - teachers will add their own
                
                console.log('Complete teacher profile created and initialized');
            } else if (role === 'student') {
                const approvedStudent = await ApprovedStudent.findOne({ 
                    email: email.toLowerCase().trim(),
                    isUsed: false 
                });
                
                if (approvedStudent) {
                    // Use comprehensive student profile setup
                    const student = await ensureCompleteStudentProfile(user._id, user.email);
                    
                    // Update with approved student data
                    student.rollNumber = approvedStudent.rollNumber;
                    student.class = approvedStudent.grade;
                    student.grade = approvedStudent.grade;
                    student.section = approvedStudent.section;
                    student.parentPhone = approvedStudent.parentPhone || '0000000000';
                    await student.save();
                    
                    // Mark approved student as used
                    approvedStudent.isUsed = true;
                    approvedStudent.usedAt = new Date();
                    await approvedStudent.save();
                    
                    // Initialize student dashboard
                    await initializeStudentDashboard(student._id);
                    
                    console.log('Complete student profile created and initialized');
                } else {
                    // Create basic student profile for non-approved students
                    const student = await ensureCompleteStudentProfile(user._id, user.email);
                    await initializeStudentDashboard(student._id);
                    console.log('Basic student profile created and initialized');
                }
            }
        } catch (profileError) {
            console.error('Profile creation error:', profileError);
            // Continue without failing - profile can be created later
        }

        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            token,
            user: {
                id: user._id,
                username: user.username,
                name: user.name,
                role: userRole,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Signup error:', error);
        
        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({ 
                message: 'Email already exists' 
            });
        }
        
        res.status(500).json({ 
            message: 'Server error during signup', 
            error: error.message 
        });
    }
});

module.exports = router;