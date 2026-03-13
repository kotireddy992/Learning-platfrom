// Test script to verify teacher signup and login flow
const fetch = require('node-fetch');

async function testTeacherFlow() {
    const baseURL = 'http://localhost:5000/api';
    
    try {
        console.log('Testing teacher signup and login flow...');
        
        // Test teacher signup
        const signupData = {
            name: 'Test Teacher New',
            email: 'testteacher.new@test.com',
            password: 'password123',
            role: 'teacher',
            subject: 'Mathematics'
        };
        
        console.log('1. Testing teacher signup...');
        const signupResponse = await fetch(`${baseURL}/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(signupData)
        });
        
        const signupResult = await signupResponse.json();
        console.log('Signup result:', signupResult.success ? 'SUCCESS' : 'FAILED');
        
        if (!signupResult.success) {
            console.error('Signup failed:', signupResult.message);
            return;
        }
        
        const token = signupResult.token;
        console.log('Token received:', token ? 'YES' : 'NO');
        
        // Test login
        console.log('2. Testing teacher login...');
        const loginResponse = await fetch(`${baseURL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: signupData.email,
                password: signupData.password
            })
        });
        
        const loginResult = await loginResponse.json();
        console.log('Login result:', loginResult.success ? 'SUCCESS' : 'FAILED');
        
        if (!loginResult.success) {
            console.error('Login failed:', loginResult.message);
            return;
        }
        
        const loginToken = loginResult.token;
        
        // Test assigned classes
        console.log('3. Testing assigned classes...');
        const classesResponse = await fetch(`${baseURL}/teacher/assigned-classes`, {
            headers: {
                'Authorization': `Bearer ${loginToken}`
            }
        });
        
        const classes = await classesResponse.json();
        console.log('Classes found:', classes.length);
        console.log('Classes:', classes);
        
        // Test students for attendance
        if (classes.length > 0) {
            console.log('4. Testing students for attendance...');
            const studentsResponse = await fetch(`${baseURL}/teacher/students/attendance?class=${classes[0]}`, {
                headers: {
                    'Authorization': `Bearer ${loginToken}`
                }
            });
            
            const students = await studentsResponse.json();
            console.log('Students found:', students.length);
            
            if (students.length > 0) {
                console.log('First student:', students[0].userId.firstName, students[0].userId.lastName);
                
                // Test marking attendance
                console.log('5. Testing attendance marking...');
                const attendanceResponse = await fetch(`${baseURL}/teacher/students/attendance`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${loginToken}`
                    },
                    body: JSON.stringify({
                        studentId: students[0]._id,
                        date: new Date().toISOString().split('T')[0],
                        status: 'present'
                    })
                });
                
                const attendanceResult = await attendanceResponse.json();
                console.log('Attendance marking:', attendanceResponse.ok ? 'SUCCESS' : 'FAILED');
                
                if (attendanceResponse.ok) {
                    // Test updated attendance percentage
                    console.log('6. Testing updated attendance percentage...');
                    const updatedStudentsResponse = await fetch(`${baseURL}/teacher/students/attendance?class=${classes[0]}`, {
                        headers: {
                            'Authorization': `Bearer ${loginToken}`
                        }
                    });
                    
                    const updatedStudents = await updatedStudentsResponse.json();
                    const updatedStudent = updatedStudents.find(s => s._id === students[0]._id);
                    console.log('Updated attendance rate:', updatedStudent?.attendanceRate + '%');
                }
            }
        }
        
        console.log('✅ All tests completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testTeacherFlow();