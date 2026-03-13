// Admin Dashboard functionality
let teacherPerformanceChart, progressDistributionChart, feedbackRatingsChart, understandingChart;

document.addEventListener('DOMContentLoaded', () => {
    // Check if user is admin
    const user = Auth.getUser();
    if (!user || user.role !== 'admin') {
        Auth.logout();
        return;
    }

    // Set admin name - handle both firstName/lastName and name formats
    const adminNameElement = document.getElementById('adminName');
    if (adminNameElement) {
        let displayName = 'Admin';
        if (user.firstName && user.lastName) {
            displayName = `${user.firstName} ${user.lastName}`;
        } else if (user.name) {
            displayName = user.name;
        } else if (user.username) {
            displayName = user.username;
        }
        adminNameElement.textContent = displayName;
    }

    // Initialize navigation
    initializeNavigation();
    
    // Load dashboard data
    loadDashboard();
});

function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.content-section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const targetSection = link.getAttribute('data-section');
            if (!targetSection) return; // Allow normal navigation for external links
            
            e.preventDefault();

            // Update active nav link
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Show target section
            sections.forEach(s => s.classList.remove('active'));
            document.getElementById(targetSection).classList.add('active');

            // Load section data
            loadSectionData(targetSection);
        });
    });
}

async function loadDashboard() {
    try {
        const data = await API.getAdminDashboard();
        
        // Update stats
        document.getElementById('totalTeachers').textContent = data.stats.totalTeachers;
        document.getElementById('totalStudents').textContent = data.stats.totalStudents;
        document.getElementById('totalLessons').textContent = data.stats.totalLessons;
        document.getElementById('completionRate').textContent = `${data.stats.completionRate}%`;

        // Load teacher attendance summary
        loadTeacherAttendanceSummary();

        // Create charts
        createTeacherPerformanceChart(data.teacherPerformance);
        createProgressDistributionChart(data.progressDistribution);
        
        // Display recent feedback
        displayRecentFeedback(data.recentFeedback);

    } catch (error) {
        console.error('Error loading dashboard:', error);
        console.error('Dashboard load error details:', error);
        showError('Dashboard temporarily unavailable. Please refresh the page.');
    }
}

async function loadTeacherAttendanceSummary() {
    try {
        const token = localStorage.getItem('school_auth_token');
        const response = await fetch('http://localhost:5000/api/admin/teachers/attendance/summary', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const summary = await response.json();
            document.getElementById('dashboardMarkedToday').textContent = summary.markedToday;
            document.getElementById('dashboardPendingToday').textContent = summary.pendingToday;
            document.getElementById('dashboardPresentToday').textContent = summary.presentToday;
        }
    } catch (error) {
        console.error('Error loading teacher attendance summary:', error);
    }
}

function createTeacherPerformanceChart(data) {
    const ctx = document.getElementById('teacherPerformanceChart').getContext('2d');
    
    if (teacherPerformanceChart) {
        teacherPerformanceChart.destroy();
    }

    teacherPerformanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(t => t.name),
            datasets: [
                {
                    label: 'Attendance Rate (%)',
                    data: data.map(t => parseFloat(t.attendanceRate)),
                    backgroundColor: 'rgba(37, 99, 235, 0.8)',
                    borderColor: 'rgba(37, 99, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Completion Rate (%)',
                    data: data.map(t => parseFloat(t.completionRate)),
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            },
            plugins: {
                legend: {
                    position: 'top'
                }
            }
        }
    });
}

function createProgressDistributionChart(data) {
    const ctx = document.getElementById('progressDistributionChart').getContext('2d');
    
    if (progressDistributionChart) {
        progressDistributionChart.destroy();
    }

    progressDistributionChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Excellent (80%+)', 'Good (60-79%)', 'Average (40-59%)', 'Poor (<40%)'],
            datasets: [{
                data: [data.excellent, data.good, data.average, data.poor],
                backgroundColor: [
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(239, 68, 68, 0.8)'
                ],
                borderColor: [
                    'rgba(16, 185, 129, 1)',
                    'rgba(59, 130, 246, 1)',
                    'rgba(245, 158, 11, 1)',
                    'rgba(239, 68, 68, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function displayRecentFeedback(feedback) {
    const container = document.getElementById('recentFeedbackList');
    
    if (!feedback || feedback.length === 0) {
        container.innerHTML = '<div class="no-data">No recent feedback available</div>';
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
                <div class="feedback-rating">${generateStars(f.rating)}</div>
            </div>
            <div class="feedback-content">
                <p><strong>Understanding:</strong> ${f.understanding}</p>
                <p><strong>Difficulty:</strong> ${f.difficulty}</p>
                ${f.comments ? `<p><strong>Comments:</strong> ${f.comments}</p>` : ''}
            </div>
        </div>
    `).join('');
}

async function loadSectionData(section) {
    switch (section) {
        case 'teachers':
            await loadTeachers();
            break;
        case 'students':
            await loadStudents();
            break;
        case 'classes':
            await loadClasses();
            break;
        case 'attendance':
            await loadAttendanceSection();
            break;
        case 'analytics':
            await loadAnalytics();
            break;
        case 'alerts':
            await loadAlerts();
            break;
    }
    
    // Initialize section-specific features
    initializeSectionFeatures(section);
}

async function loadTeachers() {
    try {
        console.log('Loading teachers from API...');
        const teachers = await API.getTeachers();
        console.log('Teachers received:', teachers);
        
        const container = document.getElementById('teachersList');
        
        if (!teachers || teachers.length === 0) {
            container.innerHTML = `
                <div class="no-data">
                    <h3>No Teachers Found</h3>
                    <p>Teachers will appear here when they sign up.</p>
                    <div class="debug-info">
                        <h4>Troubleshooting:</h4>
                        <ul>
                            <li>Make sure teachers are signing up with role "teacher"</li>
                            <li>Check if the database connection is working</li>
                            <li>Verify the backend server is running</li>
                        </ul>
                        <button class="btn btn-info" onclick="debugTeachers()">Debug Teachers</button>
                    </div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="section-header">
                <h3>Registered Teachers (${teachers.length})</h3>
                <p>Only teachers who have signed up are shown here.</p>
            </div>
            <table class="table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Employee ID</th>
                        <th>Email</th>
                        <th>Subject</th>
                        <th>Grade</th>
                        <th>Phone</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${teachers.map(teacher => `
                        <tr>
                            <td>${teacher.userId.firstName} ${teacher.userId.lastName}</td>
                            <td>${teacher.employeeId}</td>
                            <td>${teacher.userId.email}</td>
                            <td>${teacher.subject}</td>
                            <td>${teacher.assignedClasses ? teacher.assignedClasses.map(ac => `${ac.class}${ac.section}`).join(', ') : teacher.grade}</td>
                            <td>${teacher.phone || 'N/A'}</td>
                            <td>
                                <span class="lesson-status ${teacher.userId.isActive ? 'completed' : 'pending'}">
                                    ${teacher.userId.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td>
                                <div class="action-buttons">
                                    <button class="btn btn-sm btn-info" onclick="manageTeacherClasses('${teacher._id}')">
                                        Manage Classes
                                    </button>
                                    <button class="btn btn-sm btn-warning" onclick="editTeacher('${teacher._id}')">
                                        Edit
                                    </button>
                                    <button class="btn btn-sm btn-${teacher.userId.isActive ? 'secondary' : 'success'}" onclick="toggleTeacherStatus('${teacher.userId._id}')">
                                        ${teacher.userId.isActive ? 'Deactivate' : 'Activate'}
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Error loading teachers:', error);
        const container = document.getElementById('teachersList');
        container.innerHTML = `
            <div class="error-data">
                <h3>Error Loading Teachers</h3>
                <p>There was an error loading teacher data:</p>
                <div class="error-details">
                    <code>${error.message}</code>
                </div>
                <button class="btn btn-primary" onclick="loadTeachers()">Retry</button>
            </div>
        `;
    }
}

async function loadStudents() {
    try {
        console.log('Loading students from API...');
        
        // Show loading state
        const container = document.getElementById('studentsList');
        container.innerHTML = '<div class="loading">Loading students...</div>';
        
        const students = await API.getStudents();
        console.log('Students received:', students);
        
        if (!students || students.length === 0) {
            container.innerHTML = `
                <div class="no-data">
                    <h3>No Students Found</h3>
                    <p>Students will appear here when teachers add them through the "Add Student" feature.</p>
                    <div class="debug-info">
                        <h4>Troubleshooting:</h4>
                        <ul>
                            <li>Make sure teachers are adding students through their dashboard</li>
                            <li>Check if the database connection is working</li>
                            <li>Verify the backend server is running</li>
                        </ul>
                        <button class="btn btn-info" onclick="debugStudents()">Debug Students</button>
                        <button class="btn btn-primary" onclick="loadStudents()">Refresh Students</button>
                    </div>
                </div>
            `;
            return;
        }
        
        // Group students by class and section
        const groupedStudents = {};
        students.forEach(student => {
            const classKey = `${student.class}${student.section}`;
            if (!groupedStudents[classKey]) {
                groupedStudents[classKey] = {
                    class: student.class,
                    section: student.section,
                    students: []
                };
            }
            groupedStudents[classKey].students.push(student);
        });
        
        // Sort classes numerically
        const sortedClasses = Object.keys(groupedStudents).sort((a, b) => {
            const classA = parseInt(a.slice(0, -1));
            const classB = parseInt(b.slice(0, -1));
            if (classA !== classB) return classA - classB;
            return a.slice(-1).localeCompare(b.slice(-1));
        });
        
        container.innerHTML = `
            <div class="section-header">
                <h3>Students Added by Teachers (Class-wise)</h3>
            </div>
            <div class="class-wise-students">
                ${sortedClasses.map(classKey => {
                    const group = groupedStudents[classKey];
                    return `
                        <div class="class-group">
                            <div class="class-header">
                                <h4>Class ${group.class} - Section ${group.section}</h4>
                                <span class="student-count">${group.students.length} students</span>
                            </div>
                            <div class="class-students">
                                <table class="table">
                                    <thead>
                                        <tr>
                                            <th>Roll No.</th>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Teacher</th>
                                            <th>Status</th>
                                            <th>Registered</th>
                                            <th>Attendance</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${group.students.map(student => `
                                            <tr>
                                                <td><strong>${student.rollNumber}</strong></td>
                                                <td>${student.studentName}</td>
                                                <td>${student.email}</td>
                                                <td>${student.teacherName}</td>
                                                <td>
                                                    <span class="lesson-status ${student.isActive ? 'completed' : 'pending'}">
                                                        ${student.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span class="lesson-status ${student.hasRegistered ? 'completed' : 'pending'}">
                                                        ${student.hasRegistered ? 'Yes' : 'Pending'}
                                                    </span>
                                                </td>
                                                <td>${student.attendanceRate}% (${student.presentDays || 0}/${student.totalDays || 0})</td>
                                                <td>
                                                    <div class="action-buttons">
                                                        <button class="btn btn-sm btn-warning" onclick="editStudent('${student._id}')">
                                                            Edit
                                                        </button>
                                                        <button class="btn btn-sm btn-${student.isActive ? 'secondary' : 'success'}" onclick="toggleStudentStatus('${student._id}')">
                                                            ${student.isActive ? 'Deactivate' : 'Activate'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading students:', error);
        const container = document.getElementById('studentsList');
        container.innerHTML = `
            <div class="error-data">
                <h3>Error Loading Students</h3>
                <p>There was an error loading student data:</p>
                <div class="error-details">
                    <code>${error.message}</code>
                </div>
                <button class="btn btn-primary" onclick="loadStudents()">Retry</button>
                <button class="btn btn-info" onclick="debugStudents()">Debug Students</button>
            </div>
        `;
    }
}

async function loadClasses() {
    try {
        const students = await API.getStudents();
        const container = document.getElementById('classesList');
        
        if (!students || students.length === 0) {
            container.innerHTML = '<div class="no-data">No classes found. Students will appear when teachers add them.</div>';
            return;
        }
        
        // Group students by class and section
        const classGroups = {};
        students.forEach(student => {
            const classKey = `${student.class}${student.section}`;
            if (!classGroups[classKey]) {
                classGroups[classKey] = {
                    class: student.class,
                    section: student.section,
                    students: [],
                    registeredCount: 0,
                    avgAttendance: 0
                };
            }
            classGroups[classKey].students.push(student);
            if (student.hasRegistered) {
                classGroups[classKey].registeredCount++;
            }
        });
        
        // Calculate average attendance for each class
        Object.values(classGroups).forEach(group => {
            const totalAttendance = group.students.reduce((sum, s) => sum + s.attendanceRate, 0);
            group.avgAttendance = group.students.length > 0 ? Math.round(totalAttendance / group.students.length) : 0;
        });
        
        // Sort classes
        const sortedClasses = Object.keys(classGroups).sort((a, b) => {
            const classA = parseInt(a.slice(0, -1));
            const classB = parseInt(b.slice(0, -1));
            if (classA !== classB) return classA - classB;
            return a.slice(-1).localeCompare(b.slice(-1));
        });
        
        container.innerHTML = sortedClasses.map(classKey => {
            const group = classGroups[classKey];
            return `
                <div class="class-card" onclick="viewClassStudents('${group.class}', '${group.section}')">
                    <h3>Class ${group.class} - Section ${group.section}</h3>
                    <div class="class-stats">
                        <p><strong>${group.students.length}</strong> Total Students</p>
                        <p><strong>${group.registeredCount}</strong> Registered</p>
                        <p><strong>${group.avgAttendance}%</strong> Avg Attendance</p>
                    </div>
                    <div class="class-actions">
                        <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); viewClassStudents('${group.class}', '${group.section}')">View Students</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading classes:', error);
        showError('Failed to load classes data');
    }
}

async function viewClassStudents(className, section) {
    try {
        const allStudents = await API.getStudents();
        const classStudents = allStudents.filter(s => s.class === className && s.section === section);
        
        const classesList = document.getElementById('classesList');
        const classStudentsList = document.getElementById('classStudentsList');
        const selectedClassName = document.getElementById('selectedClassName');
        const classStudentsTable = document.getElementById('classStudentsTable');
        
        classesList.style.display = 'none';
        classStudentsList.style.display = 'block';
        selectedClassName.textContent = `Class ${className} - Section ${section} Students`;
        
        classStudentsTable.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Roll No.</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Teacher</th>
                        <th>Status</th>
                        <th>Registered</th>
                        <th>Attendance</th>
                    </tr>
                </thead>
                <tbody>
                    ${classStudents.map(student => `
                        <tr>
                            <td><strong>${student.rollNumber}</strong></td>
                            <td>${student.studentName}</td>
                            <td>${student.email}</td>
                            <td>${student.teacherName}</td>
                            <td>
                                <span class="lesson-status ${student.isActive ? 'completed' : 'pending'}">
                                    ${student.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td>
                                <span class="lesson-status ${student.hasRegistered ? 'completed' : 'pending'}">
                                    ${student.hasRegistered ? 'Yes' : 'Pending'}
                                </span>
                            </td>
                            <td>${student.attendanceRate}% (${student.presentDays || 0}/${student.totalDays || 0})</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Error loading class students:', error);
        showError('Failed to load class students');
    }
}

function backToClasses() {
    const classesList = document.getElementById('classesList');
    const classStudentsList = document.getElementById('classStudentsList');
    
    classesList.style.display = 'block';
    classStudentsList.style.display = 'none';
}

async function loadAttendanceSection() {
    try {
        const students = await API.getStudents();
        const classSelect = document.getElementById('attendanceClassSelect');
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('attendanceDate').value = today;
        
        // Get unique class-section combinations
        const classOptions = new Set();
        students.forEach(student => {
            classOptions.add(`${student.class}-${student.section}`);
        });
        
        // Sort class options
        const sortedOptions = Array.from(classOptions).sort((a, b) => {
            const [classA, sectionA] = a.split('-');
            const [classB, sectionB] = b.split('-');
            const numA = parseInt(classA);
            const numB = parseInt(classB);
            if (numA !== numB) return numA - numB;
            return sectionA.localeCompare(sectionB);
        });
        
        classSelect.innerHTML = '<option value="">Select Class & Section</option>' + 
            sortedOptions.map(option => {
                const [cls, section] = option.split('-');
                return `<option value="${option}">Class ${cls} - Section ${section}</option>`;
            }).join('');
    } catch (error) {
        console.error('Error loading attendance section:', error);
        showError('Failed to load attendance data');
    }
}

async function loadAttendanceForClass() {
    const classSection = document.getElementById('attendanceClassSelect').value;
    const date = document.getElementById('attendanceDate').value;
    
    if (!classSection || !date) {
        showError('Please select both class-section and date');
        return;
    }
    
    const [className, section] = classSection.split('-');
    
    try {
        const allStudents = await API.getStudents();
        const classStudents = allStudents.filter(s => s.class === className && s.section === section);
        
        const container = document.getElementById('attendanceList');
        const actions = document.getElementById('attendanceActions');
        
        if (classStudents.length === 0) {
            container.innerHTML = '<div class="no-data">No students found for this class and section</div>';
            actions.style.display = 'none';
            return;
        }
        
        container.innerHTML = `
            <div class="attendance-header">
                <h3>Class ${className} - Section ${section} Attendance for ${date}</h3>
                <p>${classStudents.length} students</p>
            </div>
            ${classStudents.map(student => `
                <div class="attendance-student">
                    <div class="student-info">
                        <strong>Roll ${student.rollNumber}</strong>
                        <span>${student.studentName}</span>
                        <span class="teacher-info">(Added by: ${student.teacherName})</span>
                        <span class="registration-status ${student.hasRegistered ? 'registered' : 'pending'}">
                            ${student.hasRegistered ? 'Registered' : 'Pending Registration'}
                        </span>
                    </div>
                    <div class="attendance-options">
                        <label>
                            <input type="radio" name="attendance_${student._id}" value="present">
                            Present
                        </label>
                        <label>
                            <input type="radio" name="attendance_${student._id}" value="absent">
                            Absent
                        </label>
                        <label>
                            <input type="radio" name="attendance_${student._id}" value="late">
                            Late
                        </label>
                    </div>
                </div>
            `).join('')}
        `;
        
        actions.style.display = 'flex';
        window.currentAttendanceStudents = classStudents;
        
    } catch (error) {
        console.error('Error loading attendance:', error);
        showError('Failed to load attendance data');
    }
}

async function saveAttendance() {
    const className = document.getElementById('attendanceClassSelect').value;
    const date = document.getElementById('attendanceDate').value;
    
    if (!window.currentAttendanceStudents) {
        showError('No attendance data to save');
        return;
    }
    
    const attendanceData = [];
    
    window.currentAttendanceStudents.forEach(student => {
        const selectedStatus = document.querySelector(`input[name="attendance_${student._id}"]:checked`);
        if (selectedStatus) {
            attendanceData.push({
                studentId: student._id,
                status: selectedStatus.value,
                notes: ''
            });
        }
    });
    
    if (attendanceData.length === 0) {
        showError('Please mark attendance for at least one student');
        return;
    }
    
    try {
        await API.markClassAttendance(className, { date, attendanceData });
        showSuccess('Attendance saved successfully');
        loadAttendanceForClass(); // Reload to show updated data
    } catch (error) {
        console.error('Error saving attendance:', error);
        showError('Failed to save attendance');
    }
}

function markAllPresent() {
    if (!window.currentAttendanceStudents) return;
    
    window.currentAttendanceStudents.forEach(student => {
        const presentRadio = document.querySelector(`input[name="attendance_${student._id}"][value="present"]`);
        if (presentRadio) presentRadio.checked = true;
    });
}

function markAllAbsent() {
    if (!window.currentAttendanceStudents) return;
    
    window.currentAttendanceStudents.forEach(student => {
        const absentRadio = document.querySelector(`input[name="attendance_${student._id}"][value="absent"]`);
        if (absentRadio) absentRadio.checked = true;
    });
}

function showAddStudentModal() {
    document.getElementById('addStudentModal').style.display = 'block';
}

function closeAddStudentModal() {
    document.getElementById('addStudentModal').style.display = 'none';
    document.getElementById('addStudentForm').reset();
}

// Add student form handler
document.addEventListener('DOMContentLoaded', () => {
    const addStudentForm = document.getElementById('addStudentForm');
    if (addStudentForm) {
        addStudentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(addStudentForm);
            const studentData = Object.fromEntries(formData.entries());
            
            try {
                await API.addStudent(studentData);
                showSuccess('Student added successfully');
                closeAddStudentModal();
                
                // Reload students if on students section
                const activeSection = document.querySelector('.nav-link.active')?.getAttribute('data-section');
                if (activeSection === 'students') {
                    loadStudents();
                } else if (activeSection === 'classes') {
                    loadClasses();
                }
            } catch (error) {
                console.error('Error adding student:', error);
                showError('Failed to add student: ' + error.message);
            }
        });
    }
});

async function loadAnalytics() {
    try {
        const data = await API.getFeedbackAnalytics();
        
        createFeedbackRatingsChart(data.ratings);
        createUnderstandingChart(data.understanding);
        
    } catch (error) {
        console.error('Error loading analytics:', error);
        showError('Failed to load analytics data');
    }
}

function createFeedbackRatingsChart(data) {
    const ctx = document.getElementById('feedbackRatingsChart').getContext('2d');
    
    if (feedbackRatingsChart) {
        feedbackRatingsChart.destroy();
    }

    feedbackRatingsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => `${d._id} Stars`),
            datasets: [{
                label: 'Number of Ratings',
                data: data.map(d => d.count),
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function createUnderstandingChart(data) {
    const ctx = document.getElementById('understandingChart').getContext('2d');
    
    if (understandingChart) {
        understandingChart.destroy();
    }

    understandingChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(d => d._id.charAt(0).toUpperCase() + d._id.slice(1)),
            datasets: [{
                data: data.map(d => d.count),
                backgroundColor: [
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(239, 68, 68, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

async function loadAlerts() {
    try {
        const alerts = await API.getAlerts();
        const container = document.getElementById('alertsList');
        
        if (!alerts || alerts.length === 0) {
            container.innerHTML = '<div class="no-data">No alerts at this time</div>';
            return;
        }

        container.innerHTML = alerts.map(alert => `
            <div class="alert-card ${alert.severity}">
                <div class="alert-header">
                    <div>
                        <strong>${alert.type.replace('_', ' ').toUpperCase()}</strong>
                        <p>${alert.message}</p>
                    </div>
                    <span class="alert-severity ${alert.severity}">${alert.severity.toUpperCase()}</span>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading alerts:', error);
        showError('Failed to load alerts');
    }
}

async function toggleUserStatus(userId) {
    try {
        await API.toggleUserStatus(userId);
        
        // Reload current section
        const activeSection = document.querySelector('.nav-link.active').getAttribute('data-section');
        loadSectionData(activeSection);
        
        showSuccess('User status updated successfully');
    } catch (error) {
        console.error('Error toggling user status:', error);
        showError('Failed to update user status');
    }
}

function refreshDashboard() {
    loadDashboard();
}

function showError(message) {
    // Create or update error notification
    let errorDiv = document.getElementById('errorNotification');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'errorNotification';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ef4444;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 1001;
            max-width: 400px;
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
    // Create or update success notification
    let successDiv = document.getElementById('successNotification');
    if (!successDiv) {
        successDiv = document.createElement('div');
        successDiv.id = 'successNotification';
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 1001;
            max-width: 400px;
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

// Manage teacher classes
async function manageTeacherClasses(teacherId) {
    try {
        const data = await API.getTeacherClasses(teacherId);
        const teacher = data.teacher;
        
        // Create modal for class assignment
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Manage Classes - ${teacher.name}</h3>
                    <button class="close-btn" onclick="closeClassModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <p><strong>Subject:</strong> ${teacher.subject}</p>
                    <h4>Assigned Classes:</h4>
                    <div id="assignedClassesList">
                        ${teacher.assignedClasses.map((ac, index) => `
                            <div class="class-assignment">
                                <span>Class ${ac.class} - Section ${ac.section}</span>
                                <button class="btn btn-sm btn-danger" onclick="removeClassAssignment(${index})">
                                    Remove
                                </button>
                            </div>
                        `).join('')}
                    </div>
                    <h4>Add New Class:</h4>
                    <div class="add-class-form">
                        <select id="newClass">
                            <option value="">Select Class</option>
                            ${[1,2,3,4,5,6,7,8,9,10,11,12].map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                        <select id="newSection">
                            <option value="">Select Section</option>
                            ${['A','B','C','D'].map(s => `<option value="${s}">${s}</option>`).join('')}
                        </select>
                        <button class="btn btn-primary" onclick="addClassAssignment()">Add</button>
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-success" onclick="saveClassAssignments('${teacherId}')">Save Changes</button>
                        <button class="btn btn-secondary" onclick="closeClassModal()">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        window.currentClassModal = modal;
        window.currentAssignments = [...teacher.assignedClasses];
        
    } catch (error) {
        console.error('Error loading teacher classes:', error);
        showError('Failed to load teacher class assignments');
    }
}

function addClassAssignment() {
    const classSelect = document.getElementById('newClass');
    const sectionSelect = document.getElementById('newSection');
    
    if (!classSelect.value || !sectionSelect.value) {
        showError('Please select both class and section');
        return;
    }
    
    const newAssignment = {
        class: classSelect.value,
        section: sectionSelect.value
    };
    
    // Check for duplicates
    const exists = window.currentAssignments.some(a => 
        a.class === newAssignment.class && a.section === newAssignment.section
    );
    
    if (exists) {
        showError('This class and section is already assigned');
        return;
    }
    
    window.currentAssignments.push(newAssignment);
    updateAssignmentsList();
    
    classSelect.value = '';
    sectionSelect.value = '';
}

function removeClassAssignment(index) {
    window.currentAssignments.splice(index, 1);
    updateAssignmentsList();
}

function updateAssignmentsList() {
    const container = document.getElementById('assignedClassesList');
    container.innerHTML = window.currentAssignments.map((ac, index) => `
        <div class="class-assignment">
            <span>Class ${ac.class} - Section ${ac.section}</span>
            <button class="btn btn-sm btn-danger" onclick="removeClassAssignment(${index})">
                Remove
            </button>
        </div>
    `).join('');
}

async function saveClassAssignments(teacherId) {
    try {
        await API.assignClassesToTeacher(teacherId, window.currentAssignments);
        showSuccess('Class assignments saved successfully');
        closeClassModal();
        loadTeachers(); // Refresh teacher list
    } catch (error) {
        console.error('Error saving class assignments:', error);
        showError('Failed to save class assignments');
    }
}

// Debug function to check students
async function debugStudents() {
    try {
        console.log('=== DEBUGGING STUDENTS ===');
        
        // Test API connection
        const response = await fetch('/api/admin/students', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('school_auth_token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Students API Response Status:', response.status);
        console.log('Students API Response Headers:', response.headers);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Students API Response Data:', data);
            alert(`Students API working. Found ${data.length} students. Check console for details.`);
        } else {
            const errorText = await response.text();
            console.error('Students API Error:', errorText);
            alert(`Students API Error: ${response.status} - ${errorText}`);
        }
        
    } catch (error) {
        console.error('Debug students error:', error);
        alert(`Debug Students Error: ${error.message}`);
    }
}

// Debug function to check teachers
async function debugTeachers() {
    try {
        console.log('=== DEBUGGING TEACHERS ===');
        
        // Test API connection
        const response = await fetch('/api/admin/teachers', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('school_auth_token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('API Response Status:', response.status);
        console.log('API Response Headers:', response.headers);
        
        if (response.ok) {
            const data = await response.json();
            console.log('API Response Data:', data);
            alert(`API working. Found ${data.length} teachers. Check console for details.`);
        } else {
            const errorText = await response.text();
            console.error('API Error:', errorText);
            alert(`API Error: ${response.status} - ${errorText}`);
        }
        
    } catch (error) {
        console.error('Debug error:', error);
        alert(`Debug Error: ${error.message}`);
    }
}

// Close class modal function
function closeClassModal() {
    if (window.currentClassModal) {
        document.body.removeChild(window.currentClassModal);
        window.currentClassModal = null;
        window.currentAssignments = null;
    }
}

// Format date helper function
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Generate stars helper function
function generateStars(rating) {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars.push('★');
        } else {
            stars.push('☆');
        }
    }
    return stars.join('');
}

// Export data functions
async function exportStudentData() {
    try {
        const students = await API.getStudents();
        const csvContent = convertToCSV(students, [
            { key: 'studentName', label: 'Student Name' },
            { key: 'email', label: 'Email' },
            { key: 'rollNumber', label: 'Roll Number' },
            { key: 'class', label: 'Class' },
            { key: 'section', label: 'Section' },
            { key: 'teacherName', label: 'Teacher' },
            { key: 'attendanceRate', label: 'Attendance Rate (%)' },
            { key: 'hasRegistered', label: 'Registered' }
        ]);
        downloadCSV(csvContent, 'students_data.csv');
        showSuccess('Student data exported successfully');
    } catch (error) {
        console.error('Error exporting student data:', error);
        showError('Failed to export student data');
    }
}

async function exportTeacherData() {
    try {
        const teachers = await API.getTeachers();
        const csvContent = convertToCSV(teachers, [
            { key: 'userId.firstName', label: 'First Name' },
            { key: 'userId.lastName', label: 'Last Name' },
            { key: 'userId.email', label: 'Email' },
            { key: 'employeeId', label: 'Employee ID' },
            { key: 'subject', label: 'Subject' },
            { key: 'phone', label: 'Phone' },
            { key: 'userId.isActive', label: 'Active' }
        ]);
        downloadCSV(csvContent, 'teachers_data.csv');
        showSuccess('Teacher data exported successfully');
    } catch (error) {
        console.error('Error exporting teacher data:', error);
        showError('Failed to export teacher data');
    }
}

// CSV helper functions
function convertToCSV(data, columns) {
    const headers = columns.map(col => col.label).join(',');
    const rows = data.map(item => {
        return columns.map(col => {
            const value = getNestedValue(item, col.key);
            return `"${value || ''}"`;
        }).join(',');
    });
    return [headers, ...rows].join('\n');
}

function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj);
}

function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Bulk operations
async function bulkActivateStudents() {
    if (!confirm('Are you sure you want to activate all inactive students?')) {
        return;
    }
    
    try {
        const result = await API.bulkActivateStudents();
        showSuccess(`Activated ${result.count} students`);
        loadStudents();
    } catch (error) {
        console.error('Error activating students:', error);
        showError('Failed to activate students');
    }
}

async function bulkDeactivateStudents() {
    if (!confirm('Are you sure you want to deactivate all active students?')) {
        return;
    }
    
    try {
        const result = await API.bulkDeactivateStudents();
        showSuccess(`Deactivated ${result.count} students`);
        loadStudents();
    } catch (error) {
        console.error('Error deactivating students:', error);
        showError('Failed to deactivate students');
    }
}

// Print functions
function printStudentList() {
    const printWindow = window.open('', '_blank');
    const studentsTable = document.querySelector('#studentsList .class-wise-students');
    
    if (!studentsTable) {
        showError('No student data to print');
        return;
    }
    
    printWindow.document.write(`
        <html>
            <head>
                <title>Student List</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .class-header { background-color: #e3f2fd; padding: 10px; margin: 20px 0 10px 0; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <h1>School Performance System - Student List</h1>
                <p>Generated on: ${new Date().toLocaleDateString()}</p>
                ${studentsTable.innerHTML}
            </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
}

function printTeacherList() {
    const printWindow = window.open('', '_blank');
    const teachersTable = document.querySelector('#teachersList table');
    
    if (!teachersTable) {
        showError('No teacher data to print');
        return;
    }
    
    printWindow.document.write(`
        <html>
            <head>
                <title>Teacher List</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <h1>School Performance System - Teacher List</h1>
                <p>Generated on: ${new Date().toLocaleDateString()}</p>
                ${teachersTable.outerHTML}
            </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
}

// Refresh functions
function refreshTeachers() {
    loadTeachers();
}

function refreshStudents() {
    loadStudents();
}

function refreshClasses() {
    loadClasses();
}

// Teacher management functions
async function editTeacher(teacherId) {
    try {
        const teachers = await API.getTeachers();
        const teacher = teachers.find(t => t._id === teacherId);
        
        if (!teacher) {
            showError('Teacher not found');
            return;
        }
        
        // Create edit modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Edit Teacher</h3>
                    <button class="close-btn" onclick="closeEditModal()">&times;</button>
                </div>
                <form id="editTeacherForm" class="modal-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label>First Name</label>
                            <input type="text" name="firstName" value="${teacher.userId.firstName}" required>
                        </div>
                        <div class="form-group">
                            <label>Last Name</label>
                            <input type="text" name="lastName" value="${teacher.userId.lastName}" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" name="email" value="${teacher.userId.email}" required>
                        </div>
                        <div class="form-group">
                            <label>Subject</label>
                            <input type="text" name="subject" value="${teacher.subject}" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Phone</label>
                            <input type="tel" name="phone" value="${teacher.phone || ''}">
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeEditModal()">Cancel</button>
                        <button type="submit" class="btn btn-primary">Update Teacher</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        window.currentEditModal = modal;
        
        // Handle form submission
        document.getElementById('editTeacherForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const teacherData = Object.fromEntries(formData.entries());
            
            try {
                await API.updateTeacher(teacherId, teacherData);
                showSuccess('Teacher updated successfully');
                closeEditModal();
                loadTeachers();
            } catch (error) {
                showError('Failed to update teacher: ' + error.message);
            }
        });
        
    } catch (error) {
        console.error('Error editing teacher:', error);
        showError('Failed to load teacher data');
    }
}

async function toggleTeacherStatus(userId) {
    try {
        await API.toggleUserStatus(userId);
        showSuccess('Teacher status updated successfully');
        loadTeachers();
    } catch (error) {
        console.error('Error toggling teacher status:', error);
        showError('Failed to update teacher status');
    }
}

function closeEditModal() {
    if (window.currentEditModal) {
        document.body.removeChild(window.currentEditModal);
        window.currentEditModal = null;
    }
}

// Student management functions
async function editStudent(studentId) {
    try {
        const students = await API.getStudents();
        const student = students.find(s => s._id === studentId);
        
        if (!student) {
            showError('Student not found');
            return;
        }
        
        // Create edit modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Edit Student</h3>
                    <button class="close-btn" onclick="closeEditModal()">&times;</button>
                </div>
                <form id="editStudentForm" class="modal-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Student Name</label>
                            <input type="text" name="studentName" value="${student.studentName}" required>
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" name="email" value="${student.email}" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Roll Number</label>
                            <input type="text" name="rollNumber" value="${student.rollNumber}" required>
                        </div>
                        <div class="form-group">
                            <label>Class</label>
                            <select name="class" required>
                                ${[1,2,3,4,5,6,7,8,9,10,11,12].map(c => 
                                    `<option value="${c}" ${c == student.class ? 'selected' : ''}>${c}</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Section</label>
                            <select name="section" required>
                                ${['A','B','C','D'].map(s => 
                                    `<option value="${s}" ${s === student.section ? 'selected' : ''}>${s}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Parent Phone</label>
                            <input type="tel" name="parentPhone" value="${student.parentPhone || ''}">
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeEditModal()">Cancel</button>
                        <button type="submit" class="btn btn-primary">Update Student</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        window.currentEditModal = modal;
        
        // Handle form submission
        document.getElementById('editStudentForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const studentData = Object.fromEntries(formData.entries());
            
            try {
                await API.updateStudent(studentId, studentData);
                showSuccess('Student updated successfully');
                closeEditModal();
                loadStudents();
            } catch (error) {
                showError('Failed to update student: ' + error.message);
            }
        });
        
    } catch (error) {
        console.error('Error editing student:', error);
        showError('Failed to load student data');
    }
}

async function toggleStudentStatus(studentId) {
    try {
        const students = await API.getStudents();
        const student = students.find(s => s._id === studentId);
        
        if (!student) {
            showError('Student not found');
            return;
        }
        
        // Find the user ID from the student data
        // Since we're working with approved students, we need to find the actual user
        const users = await API.getAllUsers();
        const user = users.find(u => u.email === student.email);
        
        if (user) {
            await API.toggleUserStatus(user._id);
            showSuccess('Student status updated successfully');
            loadStudents();
        } else {
            showError('Student user account not found');
        }
    } catch (error) {
        console.error('Error toggling student status:', error);
        showError('Failed to update student status');
    }
}

// Search and filter functionality
function initializeSearchAndFilters() {
    // Teacher search
    const teacherSearch = document.getElementById('teacherSearch');
    if (teacherSearch) {
        teacherSearch.addEventListener('input', (e) => {
            filterTeachers(e.target.value);
        });
    }
    
    // Student search
    const studentSearch = document.getElementById('studentSearch');
    if (studentSearch) {
        studentSearch.addEventListener('input', (e) => {
            filterStudents(e.target.value, document.getElementById('classFilter')?.value || '');
        });
    }
    
    // Class filter
    const classFilter = document.getElementById('classFilter');
    if (classFilter) {
        classFilter.addEventListener('change', (e) => {
            filterStudents(document.getElementById('studentSearch')?.value || '', e.target.value);
        });
    }
}

function filterTeachers(searchTerm) {
    const teacherRows = document.querySelectorAll('#teachersList tbody tr');
    teacherRows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const matches = text.includes(searchTerm.toLowerCase());
        row.style.display = matches ? '' : 'none';
    });
}

function filterStudents(searchTerm, classFilter) {
    const classGroups = document.querySelectorAll('.class-group');
    
    classGroups.forEach(group => {
        const classHeader = group.querySelector('.class-header h4').textContent;
        const classNumber = classHeader.match(/Class (\d+)/)?.[1];
        
        // Check class filter
        const classMatches = !classFilter || classNumber === classFilter;
        
        if (!classMatches) {
            group.style.display = 'none';
            return;
        }
        
        // Check search term
        const studentRows = group.querySelectorAll('tbody tr');
        let visibleRows = 0;
        
        studentRows.forEach(row => {
            const text = row.textContent.toLowerCase();
            const matches = text.includes(searchTerm.toLowerCase());
            row.style.display = matches ? '' : 'none';
            if (matches) visibleRows++;
        });
        
        // Hide group if no visible rows
        group.style.display = visibleRows > 0 ? '' : 'none';
    });
}

// Initialize search and filters when sections are loaded
function initializeSectionFeatures(section) {
    if (section === 'teachers' || section === 'students') {
        setTimeout(() => {
            initializeSearchAndFilters();
        }, 100);
    }
}


// View student attendance details
async function viewStudentAttendance(studentId, studentName) {
    try {
        const response = await fetch(`http://localhost:5000/api/admin/students/${studentId}/attendance`, {
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to load attendance');
        
        const data = await response.json();
        
        const modalHtml = `
            <div id="attendanceModal" class="modal" style="display: flex;">
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h3>${studentName} - Attendance Details</h3>
                        <button class="close-btn" onclick="closeAttendanceModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="stats-grid" style="margin-bottom: 20px;">
                            <div class="stat-card">
                                <h3>${data.attendanceRate}%</h3>
                                <p>Overall Attendance</p>
                            </div>
                            <div class="stat-card">
                                <h3>${data.presentDays}</h3>
                                <p>Present Days</p>
                            </div>
                            <div class="stat-card">
                                <h3>${data.totalDays}</h3>
                                <p>Total Days</p>
                            </div>
                            <div class="stat-card">
                                <h3>${data.absentDays}</h3>
                                <p>Absent Days</p>
                            </div>
                        </div>
                        
                        <h4>Recent Attendance Records</h4>
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Day</th>
                                    <th>Status</th>
                                    <th>Teacher</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.records.map(record => {
                                    const date = new Date(record.date);
                                    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                                    return `
                                        <tr>
                                            <td>${formatDate(record.date)}</td>
                                            <td>${dayName}</td>
                                            <td>
                                                <span class="lesson-status ${record.status === 'present' ? 'completed' : record.status === 'late' ? 'pending' : 'cancelled'}">
                                                    ${record.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td>${record.teacherName || 'N/A'}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        const existingModal = document.getElementById('attendanceModal');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        document.getElementById('attendanceModal').addEventListener('click', (e) => {
            if (e.target.id === 'attendanceModal') closeAttendanceModal();
        });
        
    } catch (error) {
        console.error('Error loading attendance:', error);
        showError('Failed to load attendance details');
    }
}

function closeAttendanceModal() {
    const modal = document.getElementById('attendanceModal');
    if (modal) modal.remove();
}

