// Student Dashboard functionality
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is student
    const user = Auth.getUser();
    if (!user || user.role !== 'student') {
        Auth.logout();
        return;
    }

    // Set student name with proper fallback logic
    const studentNameElement = document.getElementById('studentName');
    if (studentNameElement) {
        let displayName = 'Student';
        if (user.firstName && user.lastName) {
            displayName = `${user.firstName} ${user.lastName}`;
        } else if (user.name) {
            displayName = user.name;
        } else if (user.email) {
            displayName = user.email.split('@')[0];
        }
        studentNameElement.textContent = displayName;
    }

    // Initialize navigation
    initializeNavigation();
    
    // Load dashboard data
    loadDashboard();

    // Initialize forms
    initializeForms();
});

// Utility functions
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

function generateStars(rating) {
    if (!rating) return '☆☆☆☆☆';
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    let stars = '★'.repeat(fullStars);
    if (hasHalfStar) stars += '☆';
    stars += '☆'.repeat(5 - Math.ceil(rating));
    return stars;
}

function showError(message) {
    // Create or update error notification
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
    // Create or update success notification
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

// Global logout function
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
        const data = await API.getStudentDashboard();
        
        // Get comprehensive attendance with comprehensive error handling
        let attendanceData;
        try {
            attendanceData = await API.getStudentAttendance();
        } catch (error) {
            console.warn('Attendance API not available:', error);
            attendanceData = { attendancePercentage: 0 };
        }
        
        const attendancePercentage = attendanceData.attendancePercentage || 0;
        
        // Update dashboard with comprehensive attendance percentage and fallbacks
        const statsElements = {
            attendanceRate: `${attendancePercentage}%`,
            completedLessons: data.stats?.completedLessons || 0,
            learningProgress: `${data.stats?.learningProgress || 0}%`
        };
        
        Object.entries(statsElements).forEach(([key, value]) => {
            const element = document.getElementById(key);
            if (element) element.textContent = value;
        });
        
        // Calculate average rating from feedback
        const avgRating = data.myFeedback && data.myFeedback.length > 0 ? 
            (data.myFeedback.reduce((sum, f) => sum + f.rating, 0) / data.myFeedback.length).toFixed(1) : 0;
        document.getElementById('averageRating').textContent = avgRating;

        // Try to get lessons from new API for recent lessons display
        try {
            const lessonsResponse = await API.getStudentLessons();
            if (lessonsResponse.success && lessonsResponse.lessons) {
                displayRecentLessons(lessonsResponse.lessons);
            } else {
                displayRecentLessons(data.assignedLessons || []);
            }
        } catch (error) {
            console.warn('Could not load lessons from new API, using dashboard data:', error);
            displayRecentLessons(data.assignedLessons || []);
        }
        
        // Display my feedback
        displayMyFeedback(data.myFeedback || []);

    } catch (error) {
        console.error('Error loading dashboard:', error);
        
        // Set default values instead of showing error
        document.getElementById('attendanceRate').textContent = '0%';
        document.getElementById('completedLessons').textContent = '0';
        document.getElementById('learningProgress').textContent = '0%';
        document.getElementById('averageRating').textContent = '0';
        
        displayRecentLessons([]);
        displayMyFeedback([]);
    }
}

function displayRecentLessons(assignments) {
    const container = document.getElementById('recentLessonsList');
    
    if (!assignments || assignments.length === 0) {
        container.innerHTML = '<div class="no-data">No lessons available yet</div>';
        return;
    }

    // Handle both old format (assignments) and new format (direct lessons)
    const lessons = assignments.map(item => {
        if (item.lessonId) {
            // Old format with lessonId structure
            return {
                _id: item.lessonId._id,
                title: item.lessonId.title,
                subject: item.lessonId.subject,
                description: item.lessonId.description,
                scheduledDate: item.lessonId.scheduledDate,
                duration: item.lessonId.duration,
                teacher_name: item.teacherId ? `${item.teacherId.firstName || ''} ${item.teacherId.lastName || ''}` : 'Unknown Teacher'
            };
        } else {
            // New format (direct lesson object)
            return {
                _id: item.lesson_id || item._id,
                title: item.title,
                subject: item.subject,
                description: item.description,
                scheduledDate: item.created_at,
                duration: 60,
                teacher_name: item.teacher_name || 'Unknown Teacher'
            };
        }
    });

    container.innerHTML = lessons.slice(0, 5).map(lesson => `
        <div class="lesson-card" onclick="viewLessonDetails('${lesson._id}')">
            <h4>${lesson.title || 'Untitled Lesson'}</h4>
            <div class="lesson-meta">
                <span>📚 ${lesson.subject || 'General'}</span>
                <span>👨🏫 ${lesson.teacher_name}</span>
                <span>📅 ${formatDate(lesson.scheduledDate)}</span>
                <span>⏱️ ${lesson.duration || 60} min</span>
            </div>
            <p class="lesson-description">${lesson.description || 'No description available'}</p>
            <div class="lesson-actions">
                <span class="lesson-status completed">Available</span>
                <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); viewLessonDetails('${lesson._id}')">
                    View Lesson
                </button>
            </div>
        </div>
    `).join('');
}

function displayMyFeedback(feedback) {
    const container = document.getElementById('myFeedbackList');
    
    if (!feedback || feedback.length === 0) {
        container.innerHTML = '<div class="no-data">No feedback submitted yet</div>';
        return;
    }

    container.innerHTML = feedback.slice(0, 5).map(f => `
        <div class="feedback-card">
            <div class="feedback-header">
                <div>
                    <strong>${f.lessonId.title}</strong>
                    <div class="feedback-meta">
                        Submitted: ${formatDate(f.createdAt)}
                    </div>
                </div>
                <div class="feedback-rating">${generateStars(f.rating)}</div>
            </div>
            <div class="feedback-content">
                <p><strong>Understanding:</strong> ${f.understanding}</p>
                <p><strong>Difficulty:</strong> ${f.difficulty.replace('_', ' ')}</p>
                ${f.comments ? `<p><strong>Comments:</strong> ${f.comments}</p>` : ''}
            </div>
        </div>
    `).join('');
}

function initializeForms() {
    // Feedback form
    const feedbackForm = document.getElementById('lessonFeedbackForm');
    feedbackForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(feedbackForm);
        const feedbackData = {
            lessonId: formData.get('lessonId'),
            rating: parseInt(formData.get('rating')),
            understanding: formData.get('understanding'),
            difficulty: formData.get('difficulty'),
            comments: formData.get('comments'),
            suggestions: formData.get('suggestions')
        };

        try {
            await API.submitFeedback(feedbackData);
            showSuccess('Feedback submitted successfully');
            feedbackForm.reset();
            closeLessonModal();
            
            // Refresh dashboard
            loadDashboard();
        } catch (error) {
            console.error('Error submitting feedback:', error);
            showError(error.message || 'Failed to submit feedback');
        }
    });
}

async function loadSectionData(section) {
    switch (section) {
        case 'lessons':
            await loadLessons();
            break;
        case 'assignments':
            await loadAssignments();
            break;
        case 'attendance':
            await loadAttendance();
            break;
        case 'calendar':
            await loadCalendar();
            break;
        case 'progress':
            await loadProgress();
            break;
        case 'videos':
            await loadVideos();
            break;
    }
}

async function loadLessons() {
    try {
        const response = await API.getStudentLessons();
        const container = document.getElementById('lessonsList');
        
        if (!response.success || !response.lessons || response.lessons.length === 0) {
            container.innerHTML = '<div class="no-data">No lessons available for your class and section yet</div>';
            return;
        }

        const lessons = response.lessons;
        
        container.innerHTML = lessons.map(lesson => `
            <div class="lesson-card" onclick="viewLessonDetails('${lesson.lesson_id}')">
                <h4>${lesson.title}</h4>
                <div class="lesson-meta">
                    <span>📚 ${lesson.subject}</span>
                    <span>🎓 Class ${lesson.class} - Section ${lesson.section}</span>
                    <span>👨🏫 ${lesson.teacher_name}</span>
                    <span>📅 ${formatDate(lesson.created_at)}</span>
                </div>
                <p class="lesson-description">${lesson.description}</p>
                
                ${lesson.attachment_url ? `
                    <div class="lesson-attachment">
                        <a href="${lesson.attachment_url}" class="btn btn-sm btn-secondary" download>
                            📎 Download Attachment
                        </a>
                    </div>
                ` : ''}
                
                <div class="lesson-actions">
                    <span class="lesson-status completed">Available</span>
                    <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); viewLessonDetails('${lesson.lesson_id}')">
                        View Lesson
                    </button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading lessons:', error);
        const container = document.getElementById('lessonsList');
        container.innerHTML = '<div class="no-data">Unable to load lessons. Please check if the server is running.</div>';
    }
}

async function loadProgress() {
    try {
        const data = await API.getStudentProgress();
        
        // Update progress bar with fallbacks
        const progressBar = document.getElementById('overallProgressBar');
        const progressText = document.getElementById('overallProgressText');
        
        const progress = data.learningProgress || 0;
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${progress}% Complete`;
        
        // Display feedback history
        displayFeedbackHistory(data.feedbackHistory || []);
        
    } catch (error) {
        console.error('Error loading progress:', error);
        const container = document.getElementById('feedbackHistory');
        container.innerHTML = '<div class="no-data">Unable to load progress data. Please check if the server is running.</div>';
        
        // Set default values
        const progressBar = document.getElementById('overallProgressBar');
        const progressText = document.getElementById('overallProgressText');
        progressBar.style.width = '0%';
        progressText.textContent = '0% Complete';
    }
}

async function loadAttendance() {
    try {
        const data = await API.getStudentAttendance();
        
        // Display comprehensive attendance with teacher count info
        const { totalWorkingDays, presentDays, absentDays, attendancePercentage, teacherCount, message } = data;
        
        // Update stats display with comprehensive data
        document.getElementById('totalDays').textContent = totalWorkingDays;
        document.getElementById('presentDays').textContent = presentDays;
        document.getElementById('absentDays').textContent = absentDays;
        document.getElementById('attendancePercentage').textContent = `${attendancePercentage}%`;
        
        // Determine color based on percentage
        let percentageColor = '#dc2626'; // red
        if (attendancePercentage >= 75) {
            percentageColor = '#059669'; // green
        } else if (attendancePercentage >= 50) {
            percentageColor = '#d97706'; // yellow/orange
        }
        
        // Calculate late days from records
        const lateDays = data.records ? data.records.filter(r => r.status === 'late').length : 0;
        
        // Show comprehensive teacher info
        const container = document.getElementById('attendanceRecords');
        const teacherInfo = teacherCount > 0 ? 
            `<div class="attendance-info">📊 ${message || `Attendance from ${teacherCount} teacher(s)`}</div>` : '';
        
        // Create attendance rate card
        const attendanceRateCard = `
            <div class="overall-attendance-summary" style="margin-bottom: 20px; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h3 style="color: white; margin: 0 0 10px 0; font-size: 1.3em;">Overall Attendance Rate</h3>
                <div style="font-size: 3.5em; font-weight: 700; color: ${percentageColor}; text-shadow: 2px 2px 4px rgba(0,0,0,0.2);">${attendancePercentage}%</div>
                <div style="color: rgba(255,255,255,0.95); margin-top: 12px; font-size: 1em; font-weight: 500;">
                    ${presentDays} Present + ${lateDays} Late out of ${totalWorkingDays} total days
                </div>
                <div style="color: rgba(255,255,255,0.8); margin-top: 8px; font-size: 0.9em;">
                    ${message || `Attendance tracked across all subjects`}
                </div>
            </div>
        `;
        
        // Display attendance records from all teachers with comprehensive info
        displayAttendanceRecords(data.records, attendanceRateCard + teacherInfo);
        
    } catch (error) {
        console.error('Error loading attendance:', error);
        const container = document.getElementById('attendanceRecords');
        container.innerHTML = '<div class="no-data">Unable to load attendance data. Please check if the server is running.</div>';
        
        // Set default values
        document.getElementById('totalDays').textContent = '0';
        document.getElementById('presentDays').textContent = '0';
        document.getElementById('absentDays').textContent = '0';
        document.getElementById('attendancePercentage').textContent = '0%';
    }
}

async function loadCalendar() {
    try {
        // Set current month and year
        const now = new Date();
        const monthSelect = document.getElementById('monthSelect');
        const yearSelect = document.getElementById('yearSelect');
        
        if (monthSelect && yearSelect) {
            monthSelect.value = now.getMonth() + 1;
            yearSelect.value = now.getFullYear();
            
            // Automatically load calendar
            await loadAttendanceCalendar();
            
            // Set up auto-refresh every 30 seconds
            if (window.calendarRefreshInterval) {
                clearInterval(window.calendarRefreshInterval);
            }
            window.calendarRefreshInterval = setInterval(async () => {
                await loadAttendanceCalendar();
            }, 30000);
        }
    } catch (error) {
        console.error('Error loading calendar:', error);
        const now = new Date();
        document.getElementById('monthSelect').value = now.getMonth() + 1;
        document.getElementById('yearSelect').value = now.getFullYear();
        await loadAttendanceCalendar();
    }
}

async function loadAttendanceCalendar() {
    try {
        const month = document.getElementById('monthSelect').value;
        const year = document.getElementById('yearSelect').value;
        const data = await API.getAttendanceCalendar(month, year);
        
        // Fetch overall attendance data
        const overallData = await API.getStudentAttendance();
        const overallPercentage = overallData.attendancePercentage || 0;
        const overallPresent = overallData.presentDays || 0;
        const overallTotal = overallData.totalWorkingDays || 0;
        
        // Determine color for overall percentage
        let overallColor = '#dc2626';
        if (overallPercentage >= 75) {
            overallColor = '#059669';
        } else if (overallPercentage >= 50) {
            overallColor = '#d97706';
        }
        
        const container = document.getElementById('attendanceCalendarTable');
        
        if (!data.subjects || Object.keys(data.subjects).length === 0) {
            container.innerHTML = `
                <div class="overall-attendance-summary" style="margin-bottom: 20px; padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <h3 style="color: white; margin: 0 0 10px 0; font-size: 1.2em;">Overall Attendance Rate</h3>
                    <div style="font-size: 3em; font-weight: 700; color: ${overallColor}; text-shadow: 2px 2px 4px rgba(0,0,0,0.2);">${overallPercentage}%</div>
                    <div style="color: rgba(255,255,255,0.9); margin-top: 10px; font-size: 0.95em;">
                        ${overallPresent} Present out of ${overallTotal} total days (All Months)
                    </div>
                </div>
                <div class="no-data">No attendance records for this month</div>
            `;
            return;
        }
        
        // Calculate monthly attendance percentage
        let totalPresent = 0;
        let totalLate = 0;
        let totalDays = 0;
        
        Object.values(data.subjects).forEach(stats => {
            totalPresent += stats.P;
            totalLate += stats.L;
            totalDays += (stats.P + stats.A + stats.L);
        });
        
        const monthlyPercentage = totalDays > 0 
            ? Math.round(((totalPresent + totalLate) / totalDays) * 100) 
            : 0;
        
        // Determine color based on monthly percentage
        let monthlyColor = '#dc2626';
        if (monthlyPercentage >= 75) {
            monthlyColor = '#059669';
        } else if (monthlyPercentage >= 50) {
            monthlyColor = '#d97706';
        }
        
        // Generate calendar table
        const daysHeader = Array.from({length: data.daysInMonth}, (_, i) => 
            `<th>${String(i+1).padStart(2,'0')}</th>`
        ).join('');
        
        const subjectRows = Object.entries(data.subjects).map(([subjectName, stats]) => {
            const dayCells = Array.from({length: data.daysInMonth}, (_, i) => {
                const status = stats.days[i+1] || '';
                return `<td class="cell-${status}">${status}</td>`;
            }).join('');
            
            const percentage = stats.P + stats.A + stats.L > 0 
                ? Math.round((stats.P / (stats.P + stats.A + stats.L)) * 100) 
                : 0;
            
            return `
                <tr>
                    <td>${subjectName}</td>
                    ${dayCells}
                    <td style="font-weight: 600; color: #059669;">${stats.P}</td>
                    <td style="font-weight: 600; color: #dc2626;">${stats.A}</td>
                    <td style="font-weight: 600; color: #d97706;">${stats.L}</td>
                    <td style="font-weight: 600; color: #2563eb;">${stats.H}</td>
                    <td style="font-weight: 700; color: #1e293b; background: #f1f5f9;">${percentage}%</td>
                </tr>
            `;
        }).join('');
        
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <div class="overall-attendance-summary" style="padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <h3 style="color: white; margin: 0 0 10px 0; font-size: 1.1em;">Overall Attendance</h3>
                    <div style="font-size: 2.5em; font-weight: 700; color: ${overallColor}; text-shadow: 2px 2px 4px rgba(0,0,0,0.2);">${overallPercentage}%</div>
                    <div style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 0.85em;">
                        ${overallPresent} / ${overallTotal} days (All Months)
                    </div>
                </div>
                <div class="monthly-attendance-summary" style="padding: 15px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 10px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <h3 style="color: white; margin: 0 0 10px 0; font-size: 1.1em;">This Month</h3>
                    <div style="font-size: 2.5em; font-weight: 700; color: ${monthlyColor}; text-shadow: 2px 2px 4px rgba(0,0,0,0.2);">${monthlyPercentage}%</div>
                    <div style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 0.85em;">
                        ${totalPresent} P + ${totalLate} L / ${totalDays} days
                    </div>
                </div>
            </div>
            <table class="att-cal">
                <thead>
                    <tr>
                        <th>Subject</th>
                        ${daysHeader}
                        <th>P</th>
                        <th>A</th>
                        <th>L</th>
                        <th>H</th>
                        <th>%</th>
                    </tr>
                </thead>
                <tbody>
                    ${subjectRows}
                </tbody>
            </table>
        `;
        
    } catch (error) {
        console.error('Error loading attendance calendar:', error);
        document.getElementById('attendanceCalendarTable').innerHTML = 
            '<div class="no-data">Unable to load attendance calendar. Please try again.</div>';
    }
}

function displayAttendanceRecords(records, teacherInfo = '') {
    const container = document.getElementById('attendanceRecords');
    
    if (!records || records.length === 0) {
        container.innerHTML = '<div class="no-data">No attendance records found</div>';
        return;
    }

    // Group records by date to show unique dates only
    const uniqueDates = new Map();
    records.forEach(record => {
        const dateKey = record.date.split('T')[0]; // Get YYYY-MM-DD format
        if (!uniqueDates.has(dateKey)) {
            uniqueDates.set(dateKey, record);
        }
    });
    
    const uniqueRecords = Array.from(uniqueDates.values());

    container.innerHTML = `
        ${teacherInfo}
        <div class="attendance-summary">
            <p><strong>Showing ${uniqueRecords.length} unique working days</strong> (weekends excluded, duplicates removed)</p>
            ${records.length !== uniqueRecords.length ? 
                `<p class="duplicate-info">📊 Removed ${records.length - uniqueRecords.length} duplicate entries from multiple teachers</p>` : ''}
        </div>
        <div class="table-wrapper">
            <table class="attendance-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Day</th>
                        <th>Status</th>
                        <th>Month</th>
                    </tr>
                </thead>
                <tbody>
                    ${uniqueRecords.map(record => {
                        const date = new Date(record.date);
                        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                        const monthName = date.toLocaleDateString('en-US', { month: 'long' });
                        const statusIcon = record.status === 'present' ? '✅' : record.status === 'late' ? '⚠️' : '❌';
                        return `
                            <tr class="${record.status}">
                                <td class="date-cell">${formatDate(record.date)}</td>
                                <td class="day-cell">${dayName}</td>
                                <td class="status-cell">
                                    ${statusIcon} <span class="attendance-status ${record.status}">${record.status.toUpperCase()}</span>
                                </td>
                                <td class="month-cell">${monthName} ${date.getFullYear()}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Filter attendance by selected month
function filterAttendanceByMonth() {
    const monthInput = document.getElementById('attendanceMonth');
    if (!monthInput.value) {
        showError('Please select a month to filter');
        return;
    }
    
    const selectedMonth = monthInput.value; // Format: YYYY-MM
    loadAttendanceForMonth(selectedMonth);
}

// Show all attendance records
function showAllAttendance() {
    document.getElementById('attendanceMonth').value = '';
    loadAttendance();
}

// Load attendance for specific month
async function loadAttendanceForMonth(month) {
    try {
        const data = await API.getStudentAttendance();
        
        // Filter records by selected month
        const filteredRecords = data.attendanceRecords.filter(record => {
            const recordMonth = record.date.substring(0, 7); // Get YYYY-MM format
            return recordMonth === month;
        });
        
        // Update stats for filtered month
        const totalDays = filteredRecords.length;
        const presentDays = filteredRecords.filter(record => record.status === 'present').length;
        const absentDays = filteredRecords.filter(record => record.status === 'absent').length;
        const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
        
        document.getElementById('totalDays').textContent = totalDays;
        document.getElementById('presentDays').textContent = presentDays;
        document.getElementById('absentDays').textContent = absentDays;
        document.getElementById('attendancePercentage').textContent = `${attendanceRate}%`;
        
        // Display filtered records
        displayAttendanceRecords(filteredRecords);
        
    } catch (error) {
        console.error('Error loading filtered attendance:', error);
        showError('Failed to load attendance for selected month');
    }
}

function displayFeedbackHistory(feedback) {
    const container = document.getElementById('feedbackHistory');
    
    if (!feedback || feedback.length === 0) {
        container.innerHTML = '<div class="no-data">No feedback history available</div>';
        return;
    }

    container.innerHTML = feedback.map(f => `
        <div class="feedback-card">
            <div class="feedback-header">
                <div>
                    <strong>${f.lessonId.title}</strong>
                    <div class="feedback-meta">
                        Subject: ${f.lessonId.subject} | ${formatDateTime(f.createdAt)}
                    </div>
                </div>
                <div class="feedback-rating">${generateStars(f.rating)}</div>
            </div>
            <div class="feedback-content">
                <div class="feedback-details">
                    <span><strong>Understanding:</strong> ${f.understanding}</span>
                    <span><strong>Difficulty:</strong> ${f.difficulty.replace('_', ' ')}</span>
                </div>
                ${f.comments ? `<p><strong>Comments:</strong> ${f.comments}</p>` : ''}
                ${f.suggestions ? `<p><strong>Suggestions:</strong> ${f.suggestions}</p>` : ''}
            </div>
        </div>
    `).join('');
}

async function openLessonModal(lessonId) {
    try {
        const lesson = await API.getLesson(lessonId);
        
        // Update modal content
        document.getElementById('modalLessonTitle').textContent = lesson.title;
        document.getElementById('feedbackLessonId').value = lesson._id;
        
        const lessonContent = document.getElementById('lessonContent');
        const teacher = lesson.teacherId || {};
        const progress = lesson.progress || {};
        
        lessonContent.innerHTML = `
                <div class="lesson-details">
                    <div class="lesson-meta">
                        <span><strong>Subject:</strong> ${lesson.subject}</span>
                        <span><strong>Grade:</strong> ${lesson.grade}</span>
                        <span><strong>Teacher:</strong> ${teacher.firstName || ''} ${teacher.lastName || ''}</span>
                        <span><strong>Duration:</strong> ${lesson.duration} minutes</span>
                        <span><strong>Completed:</strong> ${formatDate(lesson.completedDate)}</span>
                    </div>
                    
                    <div class="lesson-progress-section">
                        <h4>Your Progress</h4>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress.progress || 0}%"></div>
                        </div>
                        <div class="progress-details">
                            <span>Overall: ${progress.progress || 0}%</span>
                            <span>Status: ${progress.status || 'not_started'}</span>
                            <span>Time Spent: ${progress.timeSpent || 0} minutes</span>
                        </div>
                    </div>
                    
                    <div class="lesson-description">
                        <h4>Description</h4>
                        <p>${lesson.description}</p>
                    </div>
                    
                    ${lesson.objectives && lesson.objectives.length > 0 ? `
                        <div class="lesson-objectives">
                            <h4>Learning Objectives</h4>
                            <ul>
                                ${lesson.objectives.map(obj => `<li>${obj}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    ${lesson.videoUrl || lesson.videoFile ? `
                        <div class="lesson-video">
                            <h4>Video Lesson</h4>
                            <div class="video-progress">
                                <span>Video Progress: ${progress.videoProgress || 0}%</span>
                                <span>${progress.videoWatched ? '✅ Completed' : '⏸️ Not Completed'}</span>
                            </div>
                            ${lesson.videoUrl ? `
                                <a href="${lesson.videoUrl}" target="_blank" class="btn btn-primary" onclick="trackVideoStart('${lesson._id}')">
                                    Watch Video
                                </a>
                            ` : ''}
                            ${lesson.videoFile ? `
                                <video id="lessonVideo" controls style="width: 100%; max-width: 600px;" 
                                       ontimeupdate="trackVideoProgress('${lesson._id}')" 
                                       onended="markVideoCompleted('${lesson._id}')">
                                    <source src="/api/teacher/files/${lesson.videoFile}" type="video/mp4">
                                    Your browser does not support the video tag.
                                </video>
                                <button class="btn btn-secondary" onclick="markVideoCompleted('${lesson._id}')">Mark Video as Completed</button>
                            ` : ''}
                        </div>
                    ` : ''}
                    
                    ${lesson.assignmentFile ? `
                        <div class="lesson-assignment">
                            <h4>Assignment</h4>
                            <div class="assignment-progress">
                                <span>${progress.assignmentDownloaded ? '✅ Downloaded' : '📄 Not Downloaded'}</span>
                                <span>${progress.assignmentCompleted ? '✅ Completed' : '⏸️ Not Completed'}</span>
                            </div>
                            <a href="/api/teacher/files/${lesson.assignmentFile}" target="_blank" class="btn btn-secondary" 
                               onclick="markAssignmentDownloaded('${lesson._id}')">
                                Download Assignment
                            </a>
                            <button class="btn btn-success" onclick="markAssignmentCompleted('${lesson._id}')">
                                Mark Assignment as Completed
                            </button>
                        </div>
                    ` : ''}
                    
                    ${lesson.notes ? `
                        <div class="lesson-notes">
                            <h4>Teacher Notes</h4>
                            <p>${lesson.notes}</p>
                        </div>
                    ` : ''}
                    
                    <div class="student-notes">
                        <h4>Your Notes</h4>
                        <textarea id="studentNotes" placeholder="Add your notes about this lesson...">${progress.studentNotes || ''}</textarea>
                        <button class="btn btn-secondary" onclick="saveStudentNotes('${lesson._id}')">
                            Save Notes
                        </button>
                    </div>
                </div>
        `;
        
        // Show feedback form only if lesson is completed
        const feedbackForm = document.getElementById('feedbackForm');
        if (progress.status === 'completed') {
            feedbackForm.style.display = 'block';
        } else {
            feedbackForm.style.display = 'none';
        }
        
        // Show modal
        document.getElementById('lessonModal').style.display = 'flex';
        
    } catch (error) {
        console.error('Error loading lesson:', error);
        showError('Failed to load lesson details');
    }
}

function closeLessonModal() {
    document.getElementById('lessonModal').style.display = 'none';
    document.getElementById('lessonFeedbackForm').reset();
}

function refreshDashboard() {
    loadDashboard();
}

// Close modal when clicking outside
document.getElementById('lessonModal').addEventListener('click', (e) => {
    if (e.target.id === 'lessonModal') {
        closeLessonModal();
    }
});

// Progress tracking functions
async function trackVideoStart(lessonId) {
    try {
        await updateLessonProgress(lessonId, { videoProgress: 1 });
    } catch (error) {
        console.error('Error tracking video start:', error);
    }
}

async function trackVideoProgress(lessonId) {
    try {
        const video = document.getElementById('lessonVideo');
        if (video && video.duration > 0) {
            const progress = Math.round((video.currentTime / video.duration) * 100);
            await updateLessonProgress(lessonId, { videoProgress: progress });
        }
    } catch (error) {
        console.error('Error tracking video progress:', error);
    }
}

async function markVideoCompleted(lessonId) {
    try {
        await updateLessonProgress(lessonId, { 
            videoWatched: true, 
            videoProgress: 100 
        });
        showSuccess('Video marked as completed!');
        // Refresh the modal to show updated progress
        setTimeout(() => openLessonModal(lessonId), 1000);
    } catch (error) {
        console.error('Error marking video completed:', error);
        showError('Failed to update video progress');
    }
}

async function markAssignmentDownloaded(lessonId) {
    try {
        await updateLessonProgress(lessonId, { assignmentDownloaded: true });
    } catch (error) {
        console.error('Error marking assignment downloaded:', error);
    }
}

async function markAssignmentCompleted(lessonId) {
    try {
        await updateLessonProgress(lessonId, { 
            assignmentCompleted: true,
            assignmentDownloaded: true 
        });
        showSuccess('Assignment marked as completed!');
        // Refresh the modal to show updated progress
        setTimeout(() => openLessonModal(lessonId), 1000);
    } catch (error) {
        console.error('Error marking assignment completed:', error);
        showError('Failed to update assignment progress');
    }
}

async function saveStudentNotes(lessonId) {
    try {
        const notes = document.getElementById('studentNotes').value;
        await updateLessonProgress(lessonId, { studentNotes: notes });
        showSuccess('Notes saved successfully!');
    } catch (error) {
        console.error('Error saving notes:', error);
        showError('Failed to save notes');
    }
}

async function updateLessonProgress(lessonId, progressData) {
    try {
        const response = await fetch(`/api/student/lessons/${lessonId}/progress`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Auth.getToken()}`
            },
            body: JSON.stringify(progressData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to update progress');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error updating lesson progress:', error);
        throw error;
    }
}

// Debug assignment loading
async function debugAssignments() {
    try {
        const response = await fetch('https://school-lms-6hcp.onrender.com/api/student/assignments/debug', {
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });
        
        const debugData = await response.json();
        console.log('Assignment Debug Data:', debugData);
        
        // Show debug info in console
        console.log('Student Info:', debugData.studentInfo);
        console.log('All Assignments:', debugData.allAssignments);
        console.log('Matching Assignments:', debugData.matchingAssignments);
        
        // Show alert with debug info
        alert(`Debug Info:
Student: ${debugData.studentInfo.email}
Class: ${debugData.studentInfo.class}
Section: ${debugData.studentInfo.section}
Total Assignments: ${debugData.totalAssignments}
Matching Assignments: ${debugData.matchingCount}

Check console for detailed info.`);
        
    } catch (error) {
        console.error('Debug error:', error);
        alert('Debug failed: ' + error.message);
    }
}

// Add debug button to assignments section
function addDebugButton() {
    const assignmentsSection = document.getElementById('assignments');
    if (assignmentsSection && !document.getElementById('debugBtn')) {
        const debugBtn = document.createElement('button');
        debugBtn.id = 'debugBtn';
        debugBtn.className = 'btn btn-warning';
        debugBtn.textContent = 'Debug Assignments';
        debugBtn.onclick = debugAssignments;
        debugBtn.style.margin = '10px';
        
        const sectionHeader = assignmentsSection.querySelector('.section-header');
        if (sectionHeader) {
            sectionHeader.appendChild(debugBtn);
        }
    }
}

// Load assignments for student
async function loadAssignments() {
    addDebugButton(); // Add debug button
    
    try {
        const response = await fetch('https://school-lms-6hcp.onrender.com/api/student/assignments', {
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Assignment load error:', errorData);
            
            // Show specific error message if available
            if (errorData.message) {
                document.getElementById('assignmentsList').innerHTML = 
                    `<div class="no-data">${errorData.message}</div>`;
            } else {
                document.getElementById('assignmentsList').innerHTML = 
                    '<div class="no-data">No assignments available yet</div>';
            }
            return;
        }
        
        const assignments = await response.json();
        console.log('Loaded assignments:', assignments);
        displayAssignments(assignments);
    } catch (error) {
        console.error('Error loading assignments:', error);
        document.getElementById('assignmentsList').innerHTML = 
            '<div class="no-data">No assignments available yet</div>';
    }
}

// Display assignments
function displayAssignments(assignments) {
    const container = document.getElementById('assignmentsList');
    
    if (!assignments || assignments.length === 0) {
        container.innerHTML = `
            <div class="no-videos-message">
                <div class="no-videos-icon">📝</div>
                <h3>No Assignments Available</h3>
                <p>Your teacher hasn't shared any assignments yet. Check back later!</p>
            </div>
        `;
        return;
    }
    
    // Group assignments by type
    const assignmentsByType = {
        'assignment': [],
        'quiz': [],
        'project': []
    };
    
    assignments.forEach(assignment => {
        const type = assignment.assignmentType || 'assignment';
        if (assignmentsByType[type]) {
            assignmentsByType[type].push(assignment);
        } else {
            assignmentsByType['assignment'].push(assignment);
        }
    });
    
    // Generate HTML for each type
    let html = '';
    
    Object.entries(assignmentsByType).forEach(([type, items]) => {
        if (items.length === 0) return;
        
        const typeIcon = type === 'quiz' ? '📋' : type === 'project' ? '🎯' : '📝';
        const typeName = type.charAt(0).toUpperCase() + type.slice(1) + 's';
        
        html += `
            <div class="subject-section">
                <h3 class="subject-header">${typeIcon} ${typeName}</h3>
                <div class="videos-grid">
                    ${items.map(assignment => {
                        const dueDate = new Date(assignment.dueDate);
                        const now = new Date();
                        const isOverdue = now > dueDate && !assignment.isSubmitted;
                        const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
                        
                        let statusBadge = '';
                        let statusClass = '';
                        
                        if (assignment.isSubmitted) {
                            statusBadge = '✅ Submitted';
                            statusClass = 'status-submitted';
                        } else if (isOverdue) {
                            statusBadge = '❌ Overdue';
                            statusClass = 'status-overdue';
                        } else if (daysUntilDue <= 2) {
                            statusBadge = '⚠️ Due Soon';
                            statusClass = 'status-due-soon';
                        } else {
                            statusBadge = '📌 Pending';
                            statusClass = 'status-pending';
                        }
                        
                        return `
                            <div class="video-card assignment-card-new ${statusClass}">
                                <div class="assignment-thumbnail">
                                    <div class="assignment-icon-large">
                                        ${type === 'quiz' ? '📋' : type === 'project' ? '🎯' : '📝'}
                                    </div>
                                    <div class="assignment-status-badge ${statusClass}">
                                        ${statusBadge}
                                    </div>
                                </div>
                                
                                <div class="video-content">
                                    <h4 class="video-title">${assignment.title}</h4>
                                    
                                    <div class="video-meta">
                                        <span class="teacher-info">
                                            <i class="icon">👨🏫</i>
                                            ${assignment.teacherName || 'Teacher'}
                                        </span>
                                        <span class="date-info ${isOverdue ? 'overdue-date' : ''}">
                                            <i class="icon">📅</i>
                                            Due: ${formatDate(assignment.dueDate)}
                                        </span>
                                    </div>
                                    
                                    ${assignment.description ? `
                                        <p class="video-description">${assignment.description}</p>
                                    ` : ''}
                                    
                                    ${assignment.grade ? `
                                        <div class="assignment-grade">
                                            <strong>Grade:</strong> ${assignment.grade}/100
                                        </div>
                                    ` : ''}
                                    
                                    ${assignment.feedback ? `
                                        <div class="assignment-feedback-preview">
                                            <strong>Feedback:</strong> ${assignment.feedback.substring(0, 100)}${assignment.feedback.length > 100 ? '...' : ''}
                                        </div>
                                    ` : ''}
                                    
                                    <div class="video-actions">
                                        ${assignment.filePath ? `
                                            <button class="btn btn-secondary video-watch-btn" 
                                                    onclick="downloadAssignment('${assignment.filePath}', '${assignment.filename || 'assignment.pdf'}')">
                                                <i class="icon">📥</i> Download
                                            </button>
                                        ` : ''}
                                        
                                        ${!assignment.isSubmitted && !isOverdue ? `
                                            <button class="btn btn-primary video-watch-btn" 
                                                    onclick="showSubmitModal('${assignment._id}', '${assignment.title}')">
                                                <i class="icon">📤</i> Submit
                                            </button>
                                        ` : ''}
                                        
                                        ${assignment.isSubmitted ? `
                                            <span class="submitted-badge">
                                                <i class="icon">✓</i> Submitted ${formatDate(assignment.submittedAt)}
                                            </span>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Show submission modal
function showSubmitModal(assignmentId, title) {
    document.getElementById('submitModalTitle').textContent = `Submit: ${title}`;
    document.getElementById('assignmentSubmissionForm').dataset.assignmentId = assignmentId;
    document.getElementById('submitAssignmentModal').style.display = 'flex';
}

// Close submission modal
function closeSubmitModal() {
    document.getElementById('submitAssignmentModal').style.display = 'none';
    document.getElementById('assignmentSubmissionForm').reset();
}

// Submit assignment
async function submitAssignment(event) {
    event.preventDefault();
    
    const form = event.target;
    const assignmentId = form.dataset.assignmentId;
    const formData = new FormData(form);
    
    try {
        const response = await fetch(`https://school-lms-6hcp.onrender.com/api/student/assignments/${assignmentId}/submit`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            },
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message);
        }
        
        showSuccess('Assignment submitted successfully!');
        closeSubmitModal();
        loadAssignments(); // Refresh list
    } catch (error) {
        document.getElementById('submissionError').textContent = error.message;
        document.getElementById('submissionError').style.display = 'block';
    }
}

// Download assignment file
function downloadAssignment(filePath, filename) {
    if (!filePath) {
        showError('Assignment file not available');
        return;
    }
    
    // Use the teacher files endpoint which doesn't require auth
    const downloadUrl = `https://school-lms-6hcp.onrender.com/api/teacher/files/${filePath}`;
    
    // Create temporary link and trigger download
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename || 'assignment.pdf';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    showSuccess('Assignment download started!');
}

// Initialize assignment form
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('assignmentSubmissionForm');
    if (form) {
        form.addEventListener('submit', submitAssignment);
    }
});

// Load videos shared with student's section
async function loadVideos() {
    const container = document.getElementById('videosList');
    container.innerHTML = '<div class="loading">Loading videos...</div>';
    
    try {
        const response = await API.getStudentVideos();
        
        if (!response.videos || response.videos.length === 0) {
            container.innerHTML = `
                <div class="no-videos-message">
                    <div class="no-videos-icon">🎥</div>
                    <h3>No Videos Available</h3>
                    <p>Your teacher hasn't shared any videos yet. Check back later!</p>
                </div>
            `;
            return;
        }

        // Group videos by subject
        const videosBySubject = {};
        response.videos.forEach(video => {
            const subject = video.subject || 'General';
            if (!videosBySubject[subject]) {
                videosBySubject[subject] = [];
            }
            videosBySubject[subject].push(video);
        });

        // Generate HTML for each subject group
        container.innerHTML = Object.entries(videosBySubject).map(([subject, videos]) => `
            <div class="subject-section">
                <h3 class="subject-header">📚 ${subject}</h3>
                <div class="videos-grid">
                    ${videos.map(video => {
                        const isYouTube = video.type === 'youtube';
                        const videoId = isYouTube ? extractYouTubeId(video.url) : null;
                        const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;
                        const videoUrl = isYouTube ? video.url : `https://school-lms-6hcp.onrender.com/api/teacher/files/${video.filePath}`;
                        
                        return `
                            <div class="video-card ${isYouTube ? 'youtube-video' : 'file-video'}">
                                <div class="video-thumbnail">
                                    ${thumbnailUrl ? `
                                        <img src="${thumbnailUrl}" alt="${video.title}" class="thumbnail-image" 
                                             onerror="this.src='https://img.youtube.com/vi/${videoId}/hqdefault.jpg'">
                                        <div class="play-overlay" onclick="watchYouTubeVideo('${video.url}', '${video.title}')">
                                            <div class="play-button">▶</div>
                                        </div>
                                    ` : `
                                        <div class="file-thumbnail">
                                            <div class="file-icon">📹</div>
                                            <span class="file-type">${video.filename ? video.filename.split('.').pop().toUpperCase() : 'VIDEO'}</span>
                                        </div>
                                    `}
                                </div>
                                
                                <div class="video-content">
                                    <h4 class="video-title">${video.title}</h4>
                                    <div class="video-meta">
                                        <span class="teacher-info">
                                            <i class="icon">👨🏫</i>
                                            ${video.teacher_name || 'Teacher'}
                                        </span>
                                        <span class="date-info">
                                            <i class="icon">📅</i>
                                            ${formatDate(video.createdAt)}
                                        </span>
                                    </div>
                                    
                                    ${video.description ? `
                                        <p class="video-description">${video.description}</p>
                                    ` : ''}
                                    
                                    <div class="video-actions">
                                        ${isYouTube ? `
                                            <button class="btn btn-primary video-watch-btn" onclick="watchYouTubeVideo('${video.url}', '${video.title}')">
                                                <i class="icon">▶</i> Watch on YouTube
                                            </button>
                                        ` : `
                                            <button class="btn btn-primary video-watch-btn" onclick="playVideoInline('${video.filePath}', '${video.title}')">
                                                <i class="icon">▶</i> Play Video
                                            </button>
                                            <a href="${videoUrl}" download="${video.filename}" class="btn btn-secondary">
                                                <i class="icon">📥</i> Download
                                            </a>
                                        `}
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading videos:', error);
        container.innerHTML = `
            <div class="error-message">
                <div class="error-icon">⚠️</div>
                <h3>Unable to Load Videos</h3>
                <p>There was an error loading the videos. Please check your connection and try again.</p>
                <button class="btn btn-primary" onclick="loadVideos()">Retry</button>
            </div>
        `;
    }
}

// Helper function to extract YouTube video ID
function extractYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// Function to watch YouTube video
function watchYouTubeVideo(url, title) {
    // Open YouTube video in new tab
    window.open(url, '_blank');
    
    // Show success message
    showSuccess(`Opening "${title}" in YouTube`);
}

// Function to play video inline with download option
function playVideoInline(filePath, title) {
    const videoUrl = `https://school-lms-6hcp.onrender.com/api/teacher/files/${filePath}`;
    
    // Create modal for video player
    const modalHtml = `
        <div id="videoPlayerModal" class="modal video-modal" style="display: flex; z-index: 2000;">
            <div class="modal-content video-modal-content" style="max-width: 900px; width: 95%;">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="close-btn" onclick="closeVideoPlayerModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <video id="inlineVideoPlayer" controls autoplay style="width: 100%; max-height: 500px; background: #000; border-radius: 8px;">
                        <source src="${videoUrl}" type="video/mp4">
                        <source src="${videoUrl}" type="video/webm">
                        <source src="${videoUrl}" type="video/ogg">
                        Your browser does not support the video tag.
                    </video>
                    <div style="margin-top: 15px; text-align: center;">
                        <a href="${videoUrl}" download="${title}.mp4" class="btn btn-secondary" style="margin: 5px;">
                            📥 Download Video
                        </a>
                        <button class="btn btn-secondary" onclick="closeVideoPlayerModal()" style="margin: 5px;">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('videoPlayerModal');
    if (existingModal) existingModal.remove();
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Close on outside click
    document.getElementById('videoPlayerModal').addEventListener('click', (e) => {
        if (e.target.id === 'videoPlayerModal') {
            closeVideoPlayerModal();
        }
    });
}

// Close video player modal
function closeVideoPlayerModal() {
    const modal = document.getElementById('videoPlayerModal');
    if (modal) {
        const video = document.getElementById('inlineVideoPlayer');
        if (video) video.pause();
        modal.remove();
    }
}

// Function to open video details modal
function openVideoModal(videoId, title, urlOrFilename, type) {
    // Create modal HTML
    const modalHtml = `
        <div id="videoModal" class="modal video-modal" style="display: flex;">
            <div class="modal-content video-modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="close-btn" onclick="closeVideoModal()">&times;</button>
                </div>
                <div class="modal-body">
                    ${type === 'youtube' ? `
                        <div class="video-player">
                            <iframe 
                                src="https://www.youtube.com/embed/${extractYouTubeId(urlOrFilename)}" 
                                frameborder="0" 
                                allowfullscreen
                                class="youtube-iframe">
                            </iframe>
                        </div>
                    ` : `
                        <div class="video-player">
                            <div id="videoLoadingMessage" style="text-align: center; padding: 20px; color: #666;">Loading video...</div>
                            <video id="modalVideoPlayer" controls preload="metadata" style="width: 100%; max-height: 400px; display: none;" 
                                   onloadstart="console.log('Video loading started')" 
                                   oncanplay="handleVideoCanPlay()" 
                                   onerror="handleVideoError(this)">
                                <source src="/api/teacher/files/${urlOrFilename}" type="video/mp4">
                                <source src="/api/teacher/files/${urlOrFilename}" type="video/webm">
                                <source src="/api/teacher/files/${urlOrFilename}" type="video/ogg">
                                Your browser does not support the video tag.
                            </video>
                            <div id="videoErrorMessage" style="display: none; text-align: center; padding: 20px; color: #ff6b6b; background: #2c2c2c; border-radius: 8px; margin-top: 10px;">
                                <h4>Video Not Available</h4>
                                <p>The video file could not be loaded.</p>
                                <a href="/api/teacher/files/${urlOrFilename}" target="_blank" style="color: #4CAF50; text-decoration: none;">📥 Try downloading the video file</a>
                            </div>
                        </div>
                    `}
                    
                    <div class="video-info">
                        <h4>Video Information</h4>
                        <div class="info-grid">
                            <div class="info-item">
                                <span class="info-label">Type:</span>
                                <span class="info-value">${type === 'youtube' ? 'YouTube Video' : 'Video File'}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Source:</span>
                                <span class="info-value">${type === 'youtube' ? 'YouTube' : 'Teacher Upload'}</span>
                            </div>
                            ${type !== 'youtube' ? `
                                <div class="info-item">
                                    <span class="info-label">Download:</span>
                                    <span class="info-value">
                                        <a href="/api/teacher/files/${urlOrFilename}" download style="color: #4CAF50; text-decoration: none;">
                                            📥 Download Video
                                        </a>
                                    </span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('videoModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Add click outside to close
    document.getElementById('videoModal').addEventListener('click', (e) => {
        if (e.target.id === 'videoModal') {
            closeVideoModal();
        }
    });
    
    // For uploaded videos, try to load the video
    if (type !== 'youtube') {
        const video = document.getElementById('modalVideoPlayer');
        if (video) {
            video.load();
        }
    }
}

// Function to close video modal
function closeVideoModal() {
    const modal = document.getElementById('videoModal');
    if (modal) {
        modal.remove();
    }
}

// View lesson details function
function viewLessonDetails(lessonId) {
    openLessonModal(lessonId);
}

// Video error handling functions
function handleVideoError(videoElement) {
    console.error('Video loading error');
    const loadingMessage = document.getElementById('videoLoadingMessage');
    const errorMessage = document.getElementById('videoErrorMessage');
    
    if (loadingMessage) loadingMessage.style.display = 'none';
    if (errorMessage) errorMessage.style.display = 'block';
    if (videoElement) videoElement.style.display = 'none';
}

function handleVideoCanPlay() {
    console.log('Video can play');
    const video = document.getElementById('modalVideoPlayer');
    const loadingMessage = document.getElementById('videoLoadingMessage');
    
    if (loadingMessage) loadingMessage.style.display = 'none';
    if (video) video.style.display = 'block';
}
