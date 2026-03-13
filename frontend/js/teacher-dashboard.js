// Teacher Dashboard functionality
document.addEventListener('DOMContentLoaded', () => {
    const user = Auth.getUser();
    if (!user || user.role !== 'teacher') {
        Auth.logout();
        return;
    }

    const teacherNameElement = document.getElementById('teacherName');
    if (teacherNameElement) {
        const displayName = user.firstName && user.lastName 
            ? `${user.firstName} ${user.lastName}` 
            : user.name || user.email || 'Teacher';
        teacherNameElement.textContent = displayName;
    }

    initializeNavigation();
    loadDashboard();
    initializeForms();

    const attendanceDateElement = document.getElementById('attendanceDate');
    if (attendanceDateElement) {
        attendanceDateElement.value = new Date().toISOString().split('T')[0];
    }
    
    const studentAttendanceDateElement = document.getElementById('studentAttendanceDate');
    if (studentAttendanceDateElement) {
        studentAttendanceDateElement.addEventListener('change', async () => {
            await loadStudentsForAttendance();
            setTimeout(async () => {
                await loadDashboard();
                const attendanceRateElement = document.getElementById('attendanceRate');
                if (attendanceRateElement) {
                    try {
                        const dashboardData = await API.getTeacherDashboard();
                        attendanceRateElement.textContent = `${dashboardData.stats?.attendanceRate || 0}%`;
                    } catch (error) {
                        console.error('Error updating attendance rate:', error);
                    }
                }
            }, 1000);
        });
    }
});

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showError(message) {
    let errorDiv = document.getElementById('globalError');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'globalError';
        errorDiv.className = 'error-notification';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #fee;
            color: #c33;
            padding: 15px;
            border-radius: 5px;
            border: 1px solid #fcc;
            z-index: 1000;
            max-width: 300px;
        `;
        document.body.appendChild(errorDiv);
    }
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

function showSuccess(message) {
    let successDiv = document.getElementById('globalSuccess');
    if (!successDiv) {
        successDiv = document.createElement('div');
        successDiv.id = 'globalSuccess';
        successDiv.className = 'success-notification';
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #efe;
            color: #363;
            padding: 15px;
            border-radius: 5px;
            border: 1px solid #cfc;
            z-index: 1000;
            max-width: 300px;
        `;
        document.body.appendChild(successDiv);
    }
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 3000);
}

function logout() {
    Auth.logout();
}

function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.content-section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            const targetSection = link.getAttribute('data-section');
            if (!targetSection) return;

            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            sections.forEach(s => s.classList.remove('active'));
            document.getElementById(targetSection).classList.add('active');

            loadSectionData(targetSection);
        });
    });
}

async function loadDashboard() {
    try {
        const loadingElements = [
            'attendanceRate', 'totalLessons', 'completedLessons', 'completionRate'
        ];
        loadingElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = 'Loading...';
        });
        
        let data;
        try {
            data = await API.getTeacherDashboard();
        } catch (error) {
            console.warn('Dashboard API not available, using fallback data:', error);
            data = {
                stats: {
                    attendanceRate: 0,
                    presentDays: 0,
                    totalDays: 0,
                    totalLessons: 0,
                    completedLessons: 0,
                    completionRate: 0
                },
                lessons: [],
                recentFeedback: []
            };
        }
        
        // Display attendance with detailed info
        const attendanceRateElement = document.getElementById('attendanceRate');
        if (attendanceRateElement) {
            const rate = data.stats?.attendanceRate || 0;
            const present = data.stats?.presentDays || 0;
            const total = data.stats?.totalDays || 0;
            attendanceRateElement.textContent = `${rate}%`;
            attendanceRateElement.title = `${present} present out of ${total} days`;
            
            // Add subtitle if element exists
            const attendanceSubtitle = document.getElementById('attendanceSubtitle');
            if (attendanceSubtitle) {
                attendanceSubtitle.textContent = `${present} present out of ${total} days`;
            }
        }
        
        const statsElements = {
            totalLessons: data.stats?.totalLessons || 0,
            completedLessons: data.stats?.completedLessons || 0,
            completionRate: data.stats?.completionRate || 0
        };
        
        Object.entries(statsElements).forEach(([key, value]) => {
            const element = document.getElementById(key);
            if (element) {
                element.textContent = key.includes('Rate') ? `${value}%` : value;
            }
        });

        displayRecentLessons(data.lessons || []);
        displayRecentFeedback(data.recentFeedback || []);

    } catch (error) {
        console.error('Error loading dashboard:', error);
        showError('Dashboard temporarily unavailable. Please refresh the page or check if the server is running.');
        
        const defaultElements = {
            attendanceRate: '0%',
            totalLessons: '0',
            completedLessons: '0',
            completionRate: '0%'
        };
        
        Object.entries(defaultElements).forEach(([key, value]) => {
            const element = document.getElementById(key);
            if (element) element.textContent = value;
        });
        
        displayRecentLessons([]);
        displayRecentFeedback([]);
    }
}

function displayRecentLessons(lessons) {
    const container = document.getElementById('recentLessonsList');
    
    if (!lessons || lessons.length === 0) {
        container.innerHTML = '<div class="no-data">No lessons created yet</div>';
        return;
    }

    container.innerHTML = lessons.map(lesson => `
        <div class="lesson-card">
            <h4>${lesson.title}</h4>
            <div class="lesson-meta">
                <span>📚 ${lesson.subject}</span>
                <span>🎓 Grade ${lesson.grade}</span>
                <span>📅 ${formatDate(lesson.scheduledDate)}</span>
                <span>⏱️ ${lesson.duration} min</span>
            </div>
            <p class="lesson-description">${lesson.description}</p>
            <div class="lesson-actions">
                <span class="lesson-status ${lesson.isCompleted ? 'completed' : 'pending'}">
                    ${lesson.isCompleted ? 'Completed' : 'Pending'}
                </span>
                ${!lesson.isCompleted ? `
                    <button class="btn btn-sm btn-success" onclick="markLessonComplete('${lesson._id}')">
                        Mark Complete
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function displayRecentFeedback(feedback) {
    const container = document.getElementById('recentFeedbackList');
    
    if (!feedback || feedback.length === 0) {
        container.innerHTML = '<div class="no-data">No feedback received yet</div>';
        return;
    }

    container.innerHTML = feedback.map(f => `
        <div class="feedback-card">
            <div class="feedback-header">
                <div>
                    <strong>${f.studentId.firstName} ${f.studentId.lastName}</strong>
                    <div class="feedback-meta">
                        Lesson: ${f.lessonId.title} | ${formatDate(f.createdAt)}
                    </div>
                </div>
            </div>
            <div class="feedback-content">
                <p><strong>Understanding:</strong> ${f.understanding}</p>
                <p><strong>Difficulty:</strong> ${f.difficulty}</p>
                ${f.comments ? `<p><strong>Comments:</strong> ${f.comments}</p>` : ''}
                ${f.suggestions ? `<p><strong>Suggestions:</strong> ${f.suggestions}</p>` : ''}
            </div>
        </div>
    `).join('');
}

function initializeForms() {
    const attendanceForm = document.getElementById('attendanceForm');
    if (attendanceForm) {
        attendanceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(attendanceForm);
            const attendanceData = {
                date: formData.get('date'),
                status: formData.get('status')
            };

            try {
                await API.markAttendance(attendanceData);
                showSuccess('Attendance marked successfully');
                attendanceForm.reset();
                document.getElementById('attendanceDate').value = new Date().toISOString().split('T')[0];
                
                loadDashboard();
            } catch (error) {
                console.error('Error marking attendance:', error);
                showError('Failed to mark attendance');
            }
        });
    }

    const studentForm = document.getElementById('studentForm');
    if (studentForm) {
        studentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(studentForm);
            const studentData = {
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                email: formData.get('email'),
                rollNumber: formData.get('rollNumber'),
                grade: formData.get('grade'),
                section: formData.get('section'),
                parentPhone: formData.get('parentPhone')
            };

            const addStudentBtn = document.getElementById('addStudentBtn');
            const errorElement = document.getElementById('studentError');
            const successElement = document.getElementById('studentSuccess');
            
            addStudentBtn.classList.add('loading');
            addStudentBtn.disabled = true;
            errorElement.style.display = 'none';
            successElement.style.display = 'none';

            try {
                const response = await API.addStudent(studentData);
                
                successElement.textContent = 'Student added successfully! They can now sign up and will appear in your student list.';
                successElement.style.display = 'block';
                
                studentForm.reset();
                
                setTimeout(() => {
                    hideAddStudentForm();
                    
                    loadStudents();
                    loadClassView();
                    loadStudentAttendance();
                    updateDashboardStats();
                    
                    showSuccess('Student added successfully and will appear in all sections!');
                }, 2000);
                
            } catch (error) {
                console.error('Error adding student:', error);
                errorElement.textContent = error.message || 'Failed to add student';
                errorElement.style.display = 'block';
            } finally {
                addStudentBtn.classList.remove('loading');
                addStudentBtn.disabled = false;
            }
        });
    }

    const videoForm = document.getElementById('videoForm');
    if (videoForm) {
        videoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(videoForm);
            const shareVideoBtn = document.getElementById('shareVideoBtn');
            const errorElement = document.getElementById('videoError');
            const successElement = document.getElementById('videoSuccess');
            
            shareVideoBtn.disabled = true;
            errorElement.style.display = 'none';
            successElement.style.display = 'none';
            
            try {
                // Get form values
                const title = formData.get('title')?.trim();
                const videoClass = formData.get('class');
                const section = formData.get('section');
                const subject = formData.get('subject');
                const videoType = formData.get('videoType');
                const youtubeUrl = formData.get('youtubeUrl')?.trim();
                const videoFile = formData.get('videoFile');
                
                // Validate required fields
                if (!title) {
                    throw new Error('Video title is required');
                }
                if (!videoClass) {
                    throw new Error('Please select a target class');
                }
                if (!section) {
                    throw new Error('Please select a target section');
                }
                if (!subject) {
                    throw new Error('Please select a subject');
                }
                if (!videoType) {
                    throw new Error('Please select a video source type');
                }
                
                // Validate video source based on type
                if (videoType === 'youtube') {
                    if (!youtubeUrl || youtubeUrl === '') {
                        throw new Error('Please enter a YouTube URL');
                    }
                    if (!youtubeUrl.includes('youtube.com') && !youtubeUrl.includes('youtu.be')) {
                        throw new Error('Please enter a valid YouTube URL');
                    }
                    // Backend expects 'url' field, not 'youtubeUrl'
                    formData.set('url', youtubeUrl);
                } else if (videoType === 'upload') {
                    if (!videoFile || videoFile.size === 0) {
                        throw new Error('Video file is required when uploading videos');
                    }
                    if (videoFile.size > 2 * 1024 * 1024 * 1024) { // 2GB limit
                        throw new Error('Video file size must be less than 2GB');
                    }
                }
                
                // Ensure type field is properly set
                formData.set('type', videoType);
                
                const response = await fetch('http://localhost:5000/api/teacher/share-video', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${Auth.getToken()}`
                    },
                    body: formData
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    let errorMessage;
                    try {
                        const errorJson = JSON.parse(errorText);
                        errorMessage = errorJson.message || errorText;
                    } catch {
                        errorMessage = errorText;
                    }
                    throw new Error(errorMessage);
                }
                
                const result = await response.json();
                successElement.textContent = 'Video shared successfully!';
                successElement.style.display = 'block';
                
                videoForm.reset();
                // Reset radio buttons to default
                document.querySelector('input[name="videoType"][value="youtube"]').checked = true;
                document.getElementById('youtubeGroup').style.display = 'block';
                document.getElementById('uploadGroup').style.display = 'none';
                
                setTimeout(() => {
                    hideShareVideoForm();
                    loadSharedVideos();
                }, 2000);
                
            } catch (error) {
                console.error('Error sharing video:', error);
                errorElement.textContent = error.message || 'Failed to share video';
                errorElement.style.display = 'block';
            } finally {
                shareVideoBtn.disabled = false;
            }
        });
    }

    const videoTypeRadios = document.querySelectorAll('input[name="videoType"]');
    videoTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const youtubeGroup = document.getElementById('youtubeGroup');
            const uploadGroup = document.getElementById('uploadGroup');
            
            if (e.target.value === 'youtube') {
                youtubeGroup.style.display = 'block';
                uploadGroup.style.display = 'none';
            } else {
                youtubeGroup.style.display = 'none';
                uploadGroup.style.display = 'block';
            }
        });
    });

    const assignmentForm = document.getElementById('assignmentForm');
    if (assignmentForm) {
        assignmentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await createAssignment();
        });
    }
}

async function loadSectionData(section) {
    switch (section) {
        case 'students':
            await loadStudents();
            break;
        case 'class-view':
            await loadClassView();
            break;
        case 'student-attendance':
            await loadStudentAttendance();
            break;
        case 'lessons':
            await loadLessons();
            break;
        case 'share-video':
            await loadSharedVideos();
            break;
        case 'videos':
            await loadSharedVideos();
            break;
        case 'video-classes':
            await loadVideoClasses();
            break;
        case 'assignments':
            await loadAssignments();
            break;
        case 'feedback':
            await loadFeedback();
            break;
        case 'lesson-progress':
            // Load lesson progress functionality
            break;
    }
}

async function loadStudents() {
    try {
        let students = [];
        let approvedStudents = [];
        
        try {
            students = await API.getTeacherStudents() || [];
            approvedStudents = await API.getApprovedStudents() || [];
        } catch (error) {
            console.warn('Students API not available:', error);
        }
        
        console.log('Loaded students:', students.length, 'Approved:', approvedStudents.length);
        
        // Combine and deduplicate by email
        const allStudents = [...students, ...approvedStudents];
        const uniqueStudents = [];
        const seenEmails = new Set();
        
        for (const student of allStudents) {
            const email = student.email || student.userId?.email;
            if (email && !seenEmails.has(email)) {
                seenEmails.add(email);
                uniqueStudents.push(student);
            } else if (!email) {
                // Include students without email (shouldn't happen but just in case)
                console.warn('Student without email:', student);
                uniqueStudents.push(student);
            }
        }
        
        console.log('Unique students after deduplication:', uniqueStudents.length);
        
        const container = document.getElementById('studentsList');
        
        if (!uniqueStudents || uniqueStudents.length === 0) {
            container.innerHTML = '<div class="no-data">No students added yet. Add your first student!</div>';
            return;
        }

        container.innerHTML = uniqueStudents.map(student => {
            const studentName = student.studentName || 
                               (student.userId?.firstName && student.userId?.lastName ? 
                                `${student.userId.firstName} ${student.userId.lastName}` : 
                                student.userId?.name || 'Unknown Student');
            
            const studentEmail = student.email || student.userId?.email || 'N/A';
            const rollNumber = student.rollNumber || 'N/A';
            const grade = student.grade || student.class || 'N/A';
            const section = student.section || 'N/A';
            const parentPhone = student.parentPhone || 'N/A';
            const enrollmentDate = student.enrollmentDate || student.createdAt || new Date();
            const attendanceRate = student.attendanceRate || 0;
            
            let status = 'Active';
            let statusClass = 'completed';
            
            if (student.hasSignedUp) {
                status = 'Registered & Active';
                statusClass = 'completed';
            } else if (student.isApproved || student.teacherId) {
                status = 'Email Approved - Pending Registration';
                statusClass = 'pending';
            }
            
            return `
                <div class="student-card">
                    <div class="student-header">
                        <h4>${studentName}</h4>
                        <span class="lesson-status ${statusClass}">
                            ${status}
                        </span>
                    </div>
                    <div class="student-details">
                        <div class="detail-row">
                            <span class="detail-label">Email:</span>
                            <span class="detail-value">${studentEmail}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Grade & Section:</span>
                            <span class="detail-value">${grade} - ${section}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Roll Number:</span>
                            <span class="detail-value">${rollNumber}</span>
                        </div>
                        ${parentPhone !== 'N/A' ? `
                            <div class="detail-row">
                                <span class="detail-label">Parent Phone:</span>
                                <span class="detail-value">${parentPhone}</span>
                            </div>
                        ` : ''}
                        <div class="detail-row">
                            <span class="detail-label">Added Date:</span>
                            <span class="detail-value">${formatDate(enrollmentDate)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Attendance Rate:</span>
                            <span class="detail-value">${attendanceRate}%</span>
                        </div>
                    </div>
                    <div class="student-actions">
                        <button class="btn btn-sm btn-info" onclick="viewStudentProgress('${student._id}')">
                            View Progress
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="viewStudentAttendance('${student._id}')">
                            View Attendance
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="viewStudentLessons('${student._id}')">
                            View Lessons
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteStudent('${student._id}', '${studentName.replace(/'/g, "\\'")}')">🗑️ Delete</button>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading students:', error);
        const container = document.getElementById('studentsList');
        container.innerHTML = '<div class="no-data">Unable to load students. Please check if the server is running.</div>';
    }
}

async function loadStudentAttendance() {
    try {
        await loadAssignedClasses();
        
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('studentAttendanceDate');
        if (dateInput && !dateInput.value) {
            dateInput.value = today;
        }
        
        const container = document.getElementById('attendanceList');
        container.innerHTML = '<div class="no-data">Please select a class to view students</div>';
        
    } catch (error) {
        console.error('Error loading student attendance:', error);
        const container = document.getElementById('attendanceList');
        container.innerHTML = '<div class="no-data">Unable to load student attendance. Please check if the server is running.</div>';
    }
}

async function loadAssignedClasses() {
    try {
        const response = await fetch('http://localhost:5000/api/teacher/assigned-classes', {
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });
        
        if (response.ok) {
            const classes = await response.json();
            
            const classSelector = document.getElementById('classSelector');
            
            classSelector.innerHTML = '<option value="">Choose a class...</option>';
            classes.forEach(className => {
                classSelector.innerHTML += `<option value="${className}">${className}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading assigned classes:', error);
    }
}

async function loadStudentsForAttendance() {
    const classSelector = document.getElementById('classSelector');
    const dateInput = document.getElementById('studentAttendanceDate');
    const selectedClass = classSelector.value;
    const selectedDate = dateInput.value || new Date().toISOString().split('T')[0];
    
    const container = document.getElementById('attendanceList');
    
    if (!selectedClass) {
        container.innerHTML = '<div class="no-data">Please select a class to view students</div>';
        return;
    }
    
    try {
        container.innerHTML = '<div class="loading">Loading students...</div>';
        
        const response = await fetch(`http://localhost:5000/api/teacher/students/attendance?class=${selectedClass}&date=${selectedDate}`, {
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to load students: ${response.status} ${response.statusText}`);
        }
        
        const students = await response.json();
        
        if (!students || students.length === 0) {
            container.innerHTML = '<div class="no-data">No students found for this class. Please add students first.</div>';
            return;
        }

        container.innerHTML = students.map(student => {
            let studentName = 'Unknown Student';
            
            // Priority: userId.firstName+lastName > studentName > name > email > rollNumber
            if (student.userId?.firstName && student.userId?.lastName) {
                studentName = `${student.userId.firstName} ${student.userId.lastName}`;
            } else if (student.userId?.name) {
                studentName = student.userId.name;
            } else if (student.studentName) {
                studentName = student.studentName;
            } else if (student.firstName && student.lastName) {
                studentName = `${student.firstName} ${student.lastName}`;
            } else if (student.name) {
                studentName = student.name;
            } else if (student.userId?.email) {
                studentName = student.userId.email.split('@')[0];
            } else if (student.email) {
                studentName = student.email.split('@')[0];
            } else if (student.rollNumber) {
                studentName = `Student ${student.rollNumber}`;
            }
            
            return `
            <div class="attendance-card">
                <div class="student-info">
                    <h4>${studentName}</h4>
                    <div class="student-meta">
                        <span>ID: ${student.studentId || student._id || 'N/A'}</span>
                        <span>Roll: ${student.rollNumber || 'N/A'}</span>
                        <span>Class: ${student.class || 'N/A'}-${student.section || 'N/A'}</span>
                        <span>Overall Attendance: ${student.attendanceRate || 0}%</span>
                    </div>
                </div>
                <div class="attendance-controls">
                    <button class="btn btn-sm btn-success ${student.attendanceStatus === 'present' ? 'active' : ''}" 
                            onclick="markStudentAttendance('${student._id}', 'present')">
                        Present
                    </button>
                    <button class="btn btn-sm btn-warning ${student.attendanceStatus === 'late' ? 'active' : ''}" 
                            onclick="markStudentAttendance('${student._id}', 'late')">
                        Late
                    </button>
                    <button class="btn btn-sm btn-danger ${student.attendanceStatus === 'absent' ? 'active' : ''}" 
                            onclick="markStudentAttendance('${student._id}', 'absent')">
                        Absent
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteStudent('${student._id}', '${studentName.replace(/'/g, "\\'")}')" title="Remove Student">
                        ×
                    </button>
                </div>
            </div>
        `;
        }).join('');
        
        await updateDashboardStats();
        
    } catch (error) {
        console.error('Error loading students for attendance:', error);
        container.innerHTML = '<div class="no-data">Failed to load students. Please try again.</div>';
    }
}

async function loadClassView() {
    try {
        const response = await fetch('http://localhost:5000/api/teacher/assigned-classes', {
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });
        
        if (response.ok) {
            const classes = await response.json();
            
            const classSelector = document.getElementById('classViewSelector');
            
            classSelector.innerHTML = '<option value="">Choose a class...</option>';
            classes.forEach(className => {
                classSelector.innerHTML += `<option value="${className}">${className}</option>`;
            });
        }
        
        const container = document.getElementById('classStudentsList');
        container.innerHTML = '<div class="no-data">Select a class to view students</div>';
        
    } catch (error) {
        console.error('Error loading class view:', error);
        showError('Failed to load class view.');
    }
}

async function loadClassStudents() {
    const classSelector = document.getElementById('classViewSelector');
    const selectedClass = classSelector.value;
    const container = document.getElementById('classStudentsList');
    
    if (!selectedClass) {
        container.innerHTML = '<div class="no-data">Select a class to view students</div>';
        return;
    }
    
    try {
        container.innerHTML = '<div class="loading">Loading students...</div>';
        
        const response = await fetch(`http://localhost:5000/api/teacher/students/attendance?class=${selectedClass}`, {
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to load students: ${response.status} ${response.statusText}`);
        }
        
        const students = await response.json();
        
        if (!students || students.length === 0) {
            container.innerHTML = '<div class="no-data">No students found for this class. Please add students to this class first.</div>';
            return;
        }
        
        const totalStudents = students.length;
        const avgAttendance = students.reduce((sum, s) => sum + (s.attendanceRate || 0), 0) / totalStudents;
        const regularStudents = students.filter(s => s.type === 'regular').length;
        const approvedStudents = students.filter(s => s.type === 'approved').length;
        
        container.innerHTML = `
            <div class="class-summary">
                <h3>Class ${selectedClass} Overview</h3>
                <div class="class-stats">
                    <div class="class-stat-card">
                        <h3>${totalStudents}</h3>
                        <p>Total Students</p>
                    </div>
                    <div class="class-stat-card">
                        <h3>${regularStudents}</h3>
                        <p>Regular Students</p>
                    </div>
                    <div class="class-stat-card">
                        <h3>${approvedStudents}</h3>
                        <p>Approved Students</p>
                    </div>
                    <div class="class-stat-card">
                        <h3>${Math.round(avgAttendance)}%</h3>
                        <p>Avg Attendance</p>
                    </div>
                </div>
            </div>
            
            <div class="students-grid">
                ${students.map(student => {
                    let studentName = 'Unknown Student';
                    
                    // Priority: userId.firstName+lastName > studentName > name > email > rollNumber
                    if (student.userId?.firstName && student.userId?.lastName) {
                        studentName = `${student.userId.firstName} ${student.userId.lastName}`;
                    } else if (student.userId?.name) {
                        studentName = student.userId.name;
                    } else if (student.studentName) {
                        studentName = student.studentName;
                    } else if (student.firstName && student.lastName) {
                        studentName = `${student.firstName} ${student.lastName}`;
                    } else if (student.name) {
                        studentName = student.name;
                    } else if (student.userId?.email) {
                        studentName = student.userId.email.split('@')[0];
                    } else if (student.email) {
                        studentName = student.email.split('@')[0];
                    } else if (student.rollNumber) {
                        studentName = `Student ${student.rollNumber}`;
                    }
                    
                    return `
                    <div class="student-card">
                        <div class="student-header">
                            <h4>${studentName}</h4>
                            <span class="lesson-status ${student.type === 'regular' ? 'completed' : 'pending'}">
                                ${student.type === 'regular' ? 'Regular' : 'Approved'}
                            </span>
                        </div>
                        <div class="student-details">
                            <div class="detail-row">
                                <span class="detail-label">Email:</span>
                                <span class="detail-value">${student.email || student.userId?.email || 'N/A'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Class & Section:</span>
                                <span class="detail-value">${student.class || 'N/A'}-${student.section || 'N/A'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Roll Number:</span>
                                <span class="detail-value">${student.rollNumber || 'N/A'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Attendance Rate:</span>
                                <span class="detail-value">${student.attendanceRate || 0}%</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Today's Status:</span>
                                <span class="detail-value ${student.attendanceStatus || 'not-marked'}">
                                    ${student.attendanceStatus || 'Not Marked'}
                                </span>
                            </div>
                        </div>
                        <div class="student-actions">
                            <button class="btn btn-sm btn-info" onclick="viewStudentProgress('${student._id}')">
                                View Progress
                            </button>
                            <button class="btn btn-sm btn-secondary" onclick="viewStudentAttendance('${student._id}')">
                                View Attendance
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteStudent('${student._id}', '${studentName.replace(/'/g, "\\'")}')">× Delete</button>
                        </div>
                    </div>
                `;
                }).join('')}
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading class students:', error);
        container.innerHTML = '<div class="no-data">Failed to load students. Please try again.</div>';
    }
}

async function markStudentAttendance(studentId, status) {
    try {
        const dateInput = document.getElementById('studentAttendanceDate');
        const date = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
        
        const response = await fetch('http://localhost:5000/api/teacher/students/attendance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Auth.getToken()}`
            },
            body: JSON.stringify({ studentId, date, status })
        });
        
        if (!response.ok) {
            throw new Error('Failed to mark attendance');
        }
        
        showSuccess('Attendance marked successfully');
        
        // Force complete refresh
        await Promise.all([
            updateDashboardStats(),
            loadStudentsForAttendance()
        ]);
        
    } catch (error) {
        console.error('Error marking attendance:', error);
        showError('Failed to mark attendance');
    }
}

async function updateDashboardStats() {
    try {
        // Force fresh data with cache busting
        const timestamp = Date.now();
        const response = await fetch(`http://localhost:5000/api/teacher/dashboard?_t=${timestamp}`, {
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch dashboard stats');
        }
        
        const data = await response.json();
        
        const statsElements = {
            attendanceRate: data.stats?.attendanceRate || 0,
            totalLessons: data.stats?.totalLessons || 0,
            completedLessons: data.stats?.completedLessons || 0,
            completionRate: data.stats?.completionRate || 0
        };
        
        Object.entries(statsElements).forEach(([key, value]) => {
            const element = document.getElementById(key);
            if (element) {
                element.textContent = key.includes('Rate') ? `${value}%` : value;
            }
        });
        
        console.log('Dashboard stats updated:', statsElements);
        
    } catch (error) {
        console.error('Error updating dashboard stats:', error);
    }
}

async function loadLessons() {
    try {
        let lessons;
        try {
            lessons = await API.getTeacherLessons();
        } catch (error) {
            console.warn('Lessons API not available:', error);
            lessons = [];
        }
        
        const container = document.getElementById('lessonsList');
        
        if (!lessons || lessons.length === 0) {
            container.innerHTML = '<div class="no-data">No lessons created yet. Create your first lesson!</div>';
            return;
        }

        container.innerHTML = lessons.map(lesson => `
            <div class="lesson-card">
                <h4>${lesson.title}</h4>
                <div class="lesson-meta">
                    <span>📚 ${lesson.subject}</span>
                    <span>🎓 Grade ${lesson.grade}</span>
                    <span>📅 ${formatDate(lesson.scheduledDate)}</span>
                    <span>⏱️ ${lesson.duration} min</span>
                </div>
                <p class="lesson-description">${lesson.description}</p>
                
                <div class="lesson-actions">
                    <span class="lesson-status ${lesson.isCompleted ? 'completed' : 'pending'}">
                        ${lesson.isCompleted ? 'Completed' : 'Pending'}
                    </span>
                    ${!lesson.isCompleted ? `
                        <button class="btn btn-sm btn-success" onclick="markLessonComplete('${lesson._id}')">
                            Mark Complete
                        </button>
                    ` : `
                        <span class="completed-date">Completed: ${formatDate(lesson.completedDate)}</span>
                    `}
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading lessons:', error);
        const container = document.getElementById('lessonsList');
        container.innerHTML = '<div class="no-data">Unable to load lessons. Please check if the server is running.</div>';
    }
}

async function loadFeedback() {
    try {
        let feedback;
        try {
            feedback = await API.getTeacherFeedback();
        } catch (error) {
            console.warn('Feedback API not available:', error);
            feedback = [];
        }
        
        const container = document.getElementById('feedbackList');
        
        if (!feedback || feedback.length === 0) {
            container.innerHTML = '<div class="no-data">No feedback received yet</div>';
            return;
        }

        container.innerHTML = feedback.map(f => `
            <div class="feedback-card">
                <div class="feedback-header">
                    <div>
                        <strong>${f.studentId?.firstName || 'N/A'} ${f.studentId?.lastName || ''}</strong>
                        <div class="feedback-meta">
                            Lesson: ${f.lessonId?.title || 'N/A'} | ${formatDateTime(f.createdAt)}
                        </div>
                    </div>
                </div>
                <div class="feedback-content">
                    <div class="feedback-details">
                        <span><strong>Understanding:</strong> ${f.understanding || 'N/A'}</span>
                        <span><strong>Difficulty:</strong> ${f.difficulty ? f.difficulty.replace('_', ' ') : 'N/A'}</span>
                    </div>
                    ${f.comments ? `<p><strong>Comments:</strong> ${f.comments}</p>` : ''}
                    ${f.suggestions ? `<p><strong>Suggestions:</strong> ${f.suggestions}</p>` : ''}
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading feedback:', error);
        const container = document.getElementById('feedbackList');
        container.innerHTML = '<div class="no-data">Unable to load feedback. Please check if the server is running.</div>';
    }
}

function refreshAttendanceView() {
    loadStudentsForAttendance();
}

function refreshClassView() {
    loadClassStudents();
}

function showAddStudentForm() {
    document.getElementById('addStudentForm').style.display = 'flex';
}

function hideAddStudentForm() {
    document.getElementById('addStudentForm').style.display = 'none';
}

function hideShareVideoForm() {
    document.getElementById('shareVideoForm').style.display = 'none';
}

function refreshDashboard() {
    loadDashboard();
}

function refreshStudents() {
    loadStudents();
}

function showCreateLessonForm() {
    // This function would show lesson creation form if implemented
    showError('Lesson creation feature is not yet implemented');
}

function hideCreateLessonForm() {
    // This function would hide lesson creation form if implemented
}

function markLessonComplete(lessonId) {
    // This function would mark lesson as complete if implemented
    showError('Mark lesson complete feature is not yet implemented');
}

async function viewStudentProgress(studentId) {
    try {
        const response = await fetch(`http://localhost:5000/api/teacher/students/${studentId}/progress`, {
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load student progress');
        }
        
        const data = await response.json();
        
        document.getElementById('progressModalTitle').textContent = 
            `${data.student?.name || 'Student'} - Progress Report`;
        
        const progressContent = document.getElementById('progressContent');
        progressContent.innerHTML = `
            <div class="progress-overview">
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">📊</div>
                        <div class="stat-info">
                            <h3>${data.stats?.learningProgress || 0}%</h3>
                            <p>Learning Progress</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">📚</div>
                        <div class="stat-info">
                            <h3>${data.stats?.completedLessons || 0}</h3>
                            <p>Completed Lessons</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">📅</div>
                        <div class="stat-info">
                            <h3>${data.stats?.attendanceRate || 0}%</h3>
                            <p>Attendance Rate</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="progress-details">
                <h4>Recent Activity</h4>
                <div class="activity-list">
                    ${data.recentActivity && data.recentActivity.length > 0 ? data.recentActivity.map(activity => `
                        <div class="activity-item">
                            <span class="activity-date">${formatDate(activity.date)}</span>
                            <span class="activity-desc">${activity.description}</span>
                        </div>
                    `).join('') : '<div class="no-data">No recent activity</div>'}
                </div>
            </div>
        `;
        
        document.getElementById('progressModal').style.display = 'flex';
        
    } catch (error) {
        console.error('Error loading student progress:', error);
        showError('Failed to load student progress');
    }
}

function closeProgressModal() {
    document.getElementById('progressModal').style.display = 'none';
}

async function viewStudentAttendance(studentId) {
    try {
        const response = await fetch(`http://localhost:5000/api/teacher/students/${studentId}/attendance`, {
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load student attendance');
        }
        
        const data = await response.json();
        
        document.getElementById('attendanceModalTitle').textContent = 
            `${data.student?.name || 'Student'} - Attendance Records`;
        
        const attendanceContent = document.getElementById('attendanceContent');
        attendanceContent.innerHTML = `
            <div class="attendance-overview">
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">📅</div>
                        <div class="stat-info">
                            <h3>${data.stats?.totalDays || 0}</h3>
                            <p>Total Days</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">✅</div>
                        <div class="stat-info">
                            <h3>${data.stats?.presentDays || 0}</h3>
                            <p>Present Days</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">📊</div>
                        <div class="stat-info">
                            <h3>${data.stats?.attendanceRate || 0}%</h3>
                            <p>Attendance Rate</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="attendance-records">
                <h4>Recent Attendance (Last 30 days)</h4>
                <div class="attendance-table">
                    ${data.attendanceRecords && data.attendanceRecords.length > 0 ? data.attendanceRecords.map(record => `
                        <div class="attendance-row">
                            <span class="attendance-date">${formatDate(record.date)}</span>
                            <span class="attendance-status ${record.status}">${record.status}</span>
                        </div>
                    `).join('') : '<div class="no-data">No attendance records found</div>'}
                </div>
            </div>
        `;
        
        document.getElementById('attendanceModal').style.display = 'flex';
        
    } catch (error) {
        console.error('Error loading student attendance:', error);
        showError('Failed to load student attendance');
    }
}

function closeAttendanceModal() {
    document.getElementById('attendanceModal').style.display = 'none';
}

async function viewStudentLessons(studentId) {
    try {
        const response = await fetch(`http://localhost:5000/api/teacher/students/${studentId}/lessons`, {
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load student lessons');
        }
        
        const data = await response.json();
        
        document.getElementById('progressModalTitle').textContent = 
            `${data.student?.name || 'Student'} - Assigned Lessons`;
        
        const progressContent = document.getElementById('progressContent');
        progressContent.innerHTML = `
            <div class="lessons-overview">
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">📚</div>
                        <div class="stat-info">
                            <h3>${data.lessons?.length || 0}</h3>
                            <p>Total Lessons</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">✅</div>
                        <div class="stat-info">
                            <h3>${data.lessons?.filter(l => l.status === 'completed').length || 0}</h3>
                            <p>Completed</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">⏳</div>
                        <div class="stat-info">
                            <h3>${data.lessons?.filter(l => l.status === 'in_progress').length || 0}</h3>
                            <p>In Progress</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="lessons-list">
                <h4>Lesson Details</h4>
                ${data.lessons && data.lessons.length > 0 ? data.lessons.map(lesson => `
                    <div class="lesson-item">
                        <div class="lesson-header">
                            <h5>${lesson.title}</h5>
                            <span class="lesson-status ${lesson.status || 'not_started'}">
                                ${lesson.status === 'completed' ? '✅ Completed' : 
                                  lesson.status === 'in_progress' ? '⏳ In Progress' : 
                                  '📝 Not Started'}
                            </span>
                        </div>
                        <div class="lesson-meta">
                            <span>📚 ${lesson.subject}</span>
                            <span>📅 ${formatDate(lesson.createdAt)}</span>
                        </div>
                        <p>${lesson.description}</p>
                        ${lesson.progress ? `
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${lesson.progress}%"></div>
                            </div>
                            <span class="progress-text">${lesson.progress}% Complete</span>
                        ` : ''}
                    </div>
                `).join('') : '<div class="no-data">No lessons assigned</div>'}
            </div>
        `;
        
        document.getElementById('progressModal').style.display = 'flex';
        
    } catch (error) {
        console.error('Error loading student lessons:', error);
        showError('Failed to load student lessons');
    }
}

async function loadSharedVideos() {
    try {
        const response = await fetch('http://localhost:5000/api/teacher/shared-videos', {
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load shared videos');
        }
        
        const videos = await response.json();
        const container = document.getElementById('videosList');
        
        if (!videos || videos.length === 0) {
            container.innerHTML = '<div class="no-data">No videos shared yet</div>';
            return;
        }

        container.innerHTML = videos.map(video => `
            <div class="video-card">
                <h4>${video.title}</h4>
                <div class="video-meta">
                    <span>📹 ${video.type === 'youtube' ? 'YouTube' : 'Uploaded'}</span>
                    <span>🎓 Class ${video.class}</span>
                    <span>🎯 Section ${video.section}</span>
                    <span>📅 ${formatDate(video.createdAt)}</span>
                </div>
                <p class="video-description">${video.description || 'No description'}</p>
                ${video.type === 'youtube' ? `
                    <div class="video-preview">
                        <a href="${video.url}" target="_blank" class="btn btn-sm btn-primary">Watch on YouTube</a>
                    </div>
                ` : `
                    <div class="video-preview">
                        <button class="btn btn-sm btn-primary" onclick="playVideo('${video.filePath}', '${video.title}')">Play Video</button>
                    </div>
                `}
                <div class="video-actions">
                    <button class="btn btn-sm btn-danger" onclick="deleteVideo('${video._id}')">
                        Delete
                    </button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading videos:', error);
        const container = document.getElementById('videosList');
        container.innerHTML = '<div class="no-data">Unable to load videos</div>';
    }
}

async function loadVideoClasses() {
    try {
        const response = await fetch('http://localhost:5000/api/teacher/video-classes', {
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load video classes');
        }
        
        const classes = await response.json();
        const container = document.getElementById('videoClassesList');
        
        if (!classes || classes.length === 0) {
            container.innerHTML = '<div class="no-data">No video classes found. Share videos to see them organized by class.</div>';
            return;
        }

        container.innerHTML = classes.map(cls => `
            <div class="class-card" onclick="viewClassVideos('${cls.className}')">
                <h3>Class ${cls.className}</h3>
                <p>${cls.videoCount} Videos</p>
                <div class="class-actions">
                    <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); viewClassVideos('${cls.className}')">View Videos</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading video classes:', error);
        const container = document.getElementById('videoClassesList');
        container.innerHTML = '<div class="no-data">Failed to load video classes</div>';
    }
}

async function viewClassVideos(className) {
    try {
        const response = await fetch(`http://localhost:5000/api/teacher/video-classes/${className}/videos`, {
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load class videos');
        }
        
        const videos = await response.json();
        const videoClassesList = document.getElementById('videoClassesList');
        const classVideosList = document.getElementById('classVideosList');
        const selectedVideoClassName = document.getElementById('selectedVideoClassName');
        const classVideosTable = document.getElementById('classVideosTable');
        
        videoClassesList.style.display = 'none';
        classVideosList.style.display = 'block';
        selectedVideoClassName.textContent = `Class ${className} Videos`;
        
        if (!videos || videos.length === 0) {
            classVideosTable.innerHTML = '<div class="no-data">No videos shared for this class yet</div>';
            return;
        }
        
        classVideosTable.innerHTML = `
            <div class="videos-grid">
                ${videos.map(video => `
                    <div class="video-card">
                        <h4>${video.title}</h4>
                        <div class="video-meta">
                            <span>📹 ${video.type === 'youtube' ? 'YouTube' : 'Uploaded'}</span>
                            <span>🎯 Section ${video.section}</span>
                            <span>📅 ${formatDate(video.createdAt)}</span>
                        </div>
                        <p class="video-description">${video.description || 'No description'}</p>
                        ${video.type === 'youtube' ? `
                            <div class="video-preview">
                                <a href="${video.url}" target="_blank" class="btn btn-sm btn-primary">Watch on YouTube</a>
                            </div>
                        ` : `
                            <div class="video-preview">
                                <button class="btn btn-sm btn-primary" onclick="playVideo('${video.filePath}', '${video.title}')">Play Video</button>
                            </div>
                        `}
                        <div class="video-actions">
                            <button class="btn btn-sm btn-danger" onclick="deleteVideo('${video._id}')">
                                Delete
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading class videos:', error);
        const classVideosTable = document.getElementById('classVideosTable');
        classVideosTable.innerHTML = '<div class="no-data">Failed to load class videos</div>';
    }
}

function backToVideoClasses() {
    const videoClassesList = document.getElementById('videoClassesList');
    const classVideosList = document.getElementById('classVideosList');
    const allVideosList = document.getElementById('allVideosList');
    
    videoClassesList.style.display = 'block';
    classVideosList.style.display = 'none';
    allVideosList.style.display = 'none';
}

function playVideo(filePath, title) {
    const videoUrl = `http://localhost:5000/api/teacher/files/${filePath}`;
    window.open(videoUrl, '_blank');
}

async function viewAllVideos() {
    try {
        const response = await fetch('http://localhost:5000/api/teacher/shared-videos', {
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load videos');
        }
        
        const videos = await response.json();
        const videoClassesList = document.getElementById('videoClassesList');
        const classVideosList = document.getElementById('classVideosList');
        const allVideosList = document.getElementById('allVideosList');
        const allVideosTable = document.getElementById('allVideosTable');
        
        videoClassesList.style.display = 'none';
        classVideosList.style.display = 'none';
        allVideosList.style.display = 'block';
        
        if (!videos || videos.length === 0) {
            allVideosTable.innerHTML = '<div class="no-data">No videos shared yet</div>';
            return;
        }
        
        allVideosTable.innerHTML = `
            <div class="videos-grid">
                ${videos.map(video => `
                    <div class="video-card">
                        <h4>${video.title}</h4>
                        <div class="video-meta">
                            <span>📹 ${video.type === 'youtube' ? 'YouTube' : 'Uploaded'}</span>
                            <span>🎓 Class ${video.class}</span>
                            <span>🎯 Section ${video.section}</span>
                            <span>📅 ${formatDate(video.createdAt)}</span>
                        </div>
                        <p class="video-description">${video.description || 'No description'}</p>
                        ${video.type === 'youtube' ? `
                            <div class="video-preview">
                                <a href="${video.url}" target="_blank" class="btn btn-sm btn-primary">Watch on YouTube</a>
                            </div>
                        ` : `
                            <div class="video-preview">
                                <button class="btn btn-sm btn-primary" onclick="playVideo('${video.filePath}', '${video.title}')">Play Video</button>
                            </div>
                        `}
                        <div class="video-actions">
                            <button class="btn btn-sm btn-danger" onclick="deleteVideo('${video._id}')">
                                Delete
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading all videos:', error);
        const allVideosTable = document.getElementById('allVideosTable');
        allVideosTable.innerHTML = '<div class="no-data">Failed to load videos</div>';
    }
}

async function deleteVideo(videoId) {
    if (!confirm('Are you sure you want to delete this video?')) return;
    
    try {
        const response = await fetch(`http://localhost:5000/api/teacher/shared-videos/${videoId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete video');
        }
        
        showSuccess('Video deleted successfully');
        
        const activeSection = document.querySelector('.nav-link.active')?.getAttribute('data-section');
        if (activeSection === 'share-video') {
            loadSharedVideos();
        } else if (activeSection === 'video-classes') {
            const classVideosList = document.getElementById('classVideosList');
            const allVideosList = document.getElementById('allVideosList');
            
            if (allVideosList.style.display === 'block') {
                // Refresh all videos view
                viewAllVideos();
            } else if (classVideosList.style.display === 'block') {
                // Refresh class videos view
                const className = document.getElementById('selectedVideoClassName').textContent.replace('Class ', '').replace(' Videos', '');
                viewClassVideos(className);
            } else {
                // Refresh video classes list
                loadVideoClasses();
            }
        }
    } catch (error) {
        console.error('Error deleting video:', error);
        showError('Failed to delete video');
    }
}

function showShareVideoForm() {
    document.getElementById('shareVideoForm').style.display = 'flex';
}

async function loadAssignments() {
    try {
        const response = await fetch('http://localhost:5000/api/teacher/assignments', {
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load assignments');
        }
        
        const assignments = await response.json();
        const container = document.getElementById('assignmentsList');
        
        if (!assignments || assignments.length === 0) {
            container.innerHTML = '<div class="no-data">No assignments created yet. Create your first assignment!</div>';
            return;
        }

        container.innerHTML = assignments.map(assignment => `
            <div class="assignment-card">
                <h4>${assignment.title}</h4>
                <div class="assignment-meta">
                    <span>📚 ${assignment.subject}</span>
                    <span>🎓 Class ${assignment.class}-${assignment.section}</span>
                    <span>📅 Due: ${formatDate(assignment.dueDate)}</span>
                    <span>👥 ${assignment.submissionCount || 0} submissions</span>
                </div>
                <p class="assignment-description">${assignment.description}</p>
                
                <div class="assignment-actions">
                    <span class="assignment-status ${assignment.isActive ? 'active' : 'inactive'}">
                        ${assignment.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <button class="btn btn-sm btn-info" onclick="viewAssignmentSubmissions('${assignment._id}')">
                        View Submissions
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="downloadAssignmentFile('${assignment.filePath}')">
                        Download File
                    </button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading assignments:', error);
        const container = document.getElementById('assignmentsList');
        container.innerHTML = '<div class="no-data">Unable to load assignments. Please check if the server is running.</div>';
    }
}

function showCreateAssignmentForm() {
    document.getElementById('createAssignmentForm').style.display = 'flex';
}

function hideCreateAssignmentForm() {
    document.getElementById('createAssignmentForm').style.display = 'none';
}

async function createAssignment() {
    const form = document.getElementById('assignmentForm');
    const formData = new FormData(form);
    
    const createBtn = document.getElementById('createAssignmentBtn');
    const errorElement = document.getElementById('assignmentError');
    const successElement = document.getElementById('assignmentSuccess');
    
    createBtn.disabled = true;
    errorElement.style.display = 'none';
    successElement.style.display = 'none';
    
    try {
        const response = await fetch('http://localhost:5000/api/teacher/assignments', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            },
            body: formData
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText);
        }
        
        const result = await response.json();
        successElement.textContent = 'Assignment created and sent to students successfully!';
        successElement.style.display = 'block';
        
        form.reset();
        
        setTimeout(() => {
            hideCreateAssignmentForm();
            loadAssignments();
        }, 2000);
        
    } catch (error) {
        console.error('Error creating assignment:', error);
        errorElement.textContent = error.message || 'Failed to create assignment';
        errorElement.style.display = 'block';
    } finally {
        createBtn.disabled = false;
    }
}

async function viewAssignmentSubmissions(assignmentId) {
    try {
        const response = await fetch(`http://localhost:5000/api/teacher/assignments/${assignmentId}/submissions`, {
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load submissions');
        }
        
        const data = await response.json();
        
        document.getElementById('submissionsModalTitle').textContent = 
            `${data.assignment.title} - Submissions`;
        
        const submissionsContent = document.getElementById('submissionsContent');
        submissionsContent.innerHTML = `
            <div class="submissions-overview">
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">👥</div>
                        <div class="stat-info">
                            <h3>${data.totalStudents || 0}</h3>
                            <p>Total Students</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">✅</div>
                        <div class="stat-info">
                            <h3>${data.submissions?.length || 0}</h3>
                            <p>Submissions</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">⏰</div>
                        <div class="stat-info">
                            <h3>${(data.totalStudents || 0) - (data.submissions?.length || 0)}</h3>
                            <p>Pending</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="submissions-list">
                <h4>Student Submissions</h4>
                ${data.submissions && data.submissions.length > 0 ? data.submissions.map(submission => `
                    <div class="submission-item">
                        <div class="submission-header">
                            <h5>${submission.studentName}</h5>
                            <span class="submission-date">${formatDateTime(submission.submittedAt)}</span>
                        </div>
                        <div class="submission-details">
                            <p><strong>Status:</strong> <span class="status ${submission.status}">${submission.status}</span></p>
                            ${submission.grade ? `<p><strong>Grade:</strong> ${submission.grade}</p>` : ''}
                            ${submission.feedback ? `<p><strong>Feedback:</strong> ${submission.feedback}</p>` : ''}
                        </div>
                        <div class="submission-actions">
                            <button class="btn btn-sm btn-primary" onclick="downloadSubmission('${submission._id}')">
                                Download
                            </button>
                            <button class="btn btn-sm btn-success" onclick="gradeSubmission('${submission._id}')">
                                Grade
                            </button>
                        </div>
                    </div>
                `).join('') : '<div class="no-data">No submissions yet</div>'}
            </div>
        `;
        
        document.getElementById('submissionsModal').style.display = 'flex';
        
    } catch (error) {
        console.error('Error loading submissions:', error);
        showError('Failed to load assignment submissions');
    }
}

function closeSubmissionsModal() {
    document.getElementById('submissionsModal').style.display = 'none';
}

function downloadAssignmentFile(filePath) {
    const downloadUrl = `http://localhost:5000/api/teacher/files/${filePath}`;
    window.open(downloadUrl, '_blank');
}

function downloadSubmission(submissionId) {
    const downloadUrl = `http://localhost:5000/api/teacher/submissions/${submissionId}/download`;
    window.open(downloadUrl, '_blank');
}

function gradeSubmission(submissionId) {
    const grade = prompt('Enter grade (0-100):');
    const feedback = prompt('Enter feedback (optional):');
    
    if (grade === null) return;
    
    fetch(`http://localhost:5000/api/teacher/submissions/${submissionId}/grade`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Auth.getToken()}`
        },
        body: JSON.stringify({ grade: parseInt(grade), feedback })
    })
    .then(response => {
        if (response.ok) {
            showSuccess('Grade submitted successfully');
            // Refresh submissions view
            const assignmentId = document.getElementById('submissionsModalTitle').textContent.split(' - ')[0];
            // You might need to store assignmentId differently for proper refresh
        } else {
            throw new Error('Failed to submit grade');
        }
    })
    .catch(error => {
        console.error('Error grading submission:', error);
        showError('Failed to submit grade');
    });
}

async function deleteStudent(studentId, studentName) {
    if (!confirm(`Are you sure you want to remove ${studentName} from your class?`)) {
        return;
    }
    
    try {
        await API.deleteStudentFromTeacher(studentId);
        showSuccess('Student removed successfully');
        
        // Refresh all sections
        await loadStudents();
        await loadClassView();
        await loadStudentAttendance();
        await updateDashboardStats();
    } catch (error) {
        console.error('Error removing student:', error);
        showError('Failed to remove student: ' + error.message);
    }
}