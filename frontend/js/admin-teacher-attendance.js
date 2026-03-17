const API_URL = 'https://school-lms-6hcp.onrender.com/api';
let allTeachers = [];
let filteredTeachers = [];

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    displayCurrentDate();
    loadTeachers();
    loadSummary();
    setupEventListeners();
});

function checkAuth() {
    const token = localStorage.getItem('school_auth_token');
    const userData = localStorage.getItem('school_user_data');
    
    if (!token || !userData) {
        window.location.href = '../pages/login.html';
        return;
    }
    
    const user = JSON.parse(userData);
    if (user.role !== 'admin') {
        window.location.href = '../pages/login.html';
    }
}

function displayCurrentDate() {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = today.toLocaleDateString('en-US', options);
}

function setupEventListeners() {
    document.getElementById('searchInput').addEventListener('input', filterTeachers);
    document.getElementById('subjectFilter').addEventListener('change', filterTeachers);
    document.getElementById('statusFilter').addEventListener('change', filterTeachers);
}

async function loadTeachers() {
    try {
        showLoading(true);
        const token = localStorage.getItem('school_auth_token');
        
        const response = await fetch(`${API_URL}/admin/teachers/attendance/today`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load teachers');
        
        allTeachers = await response.json();
        filteredTeachers = [...allTeachers];
        
        populateSubjectFilter();
        displayTeachers();
        showLoading(false);
    } catch (error) {
        console.error('Error loading teachers:', error);
        showNotification('Failed to load teachers', 'error');
        showLoading(false);
    }
}

async function loadSummary() {
    try {
        const token = localStorage.getItem('school_auth_token');
        
        const response = await fetch(`${API_URL}/admin/teachers/attendance/summary`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load summary');
        
        const summary = await response.json();
        
        document.getElementById('totalTeachers').textContent = summary.totalTeachers;
        document.getElementById('markedToday').textContent = summary.markedToday;
        document.getElementById('pendingToday').textContent = summary.pendingToday;
        document.getElementById('presentToday').textContent = summary.presentToday;
    } catch (error) {
        console.error('Error loading summary:', error);
    }
}

function populateSubjectFilter() {
    const subjects = [...new Set(allTeachers.map(t => t.subject).filter(s => s))].sort();
    const subjectFilter = document.getElementById('subjectFilter');
    
    subjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject;
        option.textContent = subject;
        subjectFilter.appendChild(option);
    });
}

function filterTeachers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const subjectFilter = document.getElementById('subjectFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    
    filteredTeachers = allTeachers.filter(teacher => {
        const teacherName = (teacher.name || '').toLowerCase();
        const employeeId = (teacher.employeeId || '').toLowerCase();
        const matchesSearch = teacherName.includes(searchTerm) || employeeId.includes(searchTerm);
        const matchesSubject = !subjectFilter || teacher.subject === subjectFilter;
        const teacherStatus = teacher.attendance ? teacher.attendance.status : 'Pending';
        const matchesStatus = !statusFilter || teacherStatus === statusFilter;
        
        return matchesSearch && matchesSubject && matchesStatus;
    });
    
    displayTeachers();
}

function displayTeachers() {
    const tbody = document.getElementById('teachersTableBody');
    tbody.innerHTML = '';
    
    if (filteredTeachers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No teachers found</td></tr>';
        document.getElementById('teachersTable').style.display = 'table';
        return;
    }
    
    filteredTeachers.forEach(teacher => {
        const row = document.createElement('tr');
        
        const status = teacher.attendance ? teacher.attendance.status : 'Pending';
        const statusClass = `status-${status.toLowerCase()}`;
        const classes = teacher.assignedClasses?.map(c => `${c.class}-${c.section}`).join(', ') || 'N/A';
        const notes = teacher.attendance?.notes || '';
        const employeeId = teacher.employeeId || 'N/A';
        const teacherName = teacher.name || 'Unknown';
        const subject = teacher.subject || 'N/A';
        
        row.innerHTML = `
            <td>${employeeId}</td>
            <td>${teacherName}</td>
            <td>${subject}</td>
            <td>${classes}</td>
            <td><span class="status-badge ${statusClass}">${status}</span></td>
            <td>
                <div class="attendance-buttons">
                    <button class="btn btn-success" onclick="markAttendance('${teacher._id}', 'Present')">Present</button>
                    <button class="btn btn-danger" onclick="markAttendance('${teacher._id}', 'Absent')">Absent</button>
                    <button class="btn btn-warning" onclick="markAttendance('${teacher._id}', 'Leave')">Leave</button>
                </div>
            </td>
            <td>
                <input type="text" class="notes-input" id="notes-${teacher._id}" 
                       placeholder="Add notes..." value="${notes}">
            </td>
            <td>
                <button class="btn btn-danger" onclick="deleteTeacher('${teacher._id}', '${teacherName}')">Delete</button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    document.getElementById('teachersTable').style.display = 'table';
}

async function markAttendance(teacherId, status) {
    try {
        const notesInput = document.getElementById(`notes-${teacherId}`);
        const notes = notesInput ? notesInput.value : '';
        
        const token = localStorage.getItem('school_auth_token');
        
        const response = await fetch(`${API_URL}/admin/teachers/attendance/mark`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                attendanceData: [{ teacherId, status, notes }]
            })
        });
        
        if (!response.ok) throw new Error('Failed to mark attendance');
        
        const result = await response.json();
        
        if (result.successful > 0) {
            showNotification(`Attendance marked as ${status}`, 'success');
            await loadTeachers();
            await loadSummary();
        } else {
            throw new Error(result.errors[0]?.error || 'Failed to mark attendance');
        }
    } catch (error) {
        console.error('Error marking attendance:', error);
        showNotification(error.message, 'error');
    }
}

async function markAllPresent() {
    if (!confirm('Mark all teachers as Present for today?')) return;
    
    await bulkMarkAttendance('Present');
}

async function markAllAbsent() {
    if (!confirm('Mark all teachers as Absent for today?')) return;
    
    await bulkMarkAttendance('Absent');
}

async function bulkMarkAttendance(status) {
    try {
        showLoading(true);
        
        const attendanceData = filteredTeachers.map(teacher => ({
            teacherId: teacher._id,
            status,
            notes: `Bulk marked as ${status}`
        }));
        
        const token = localStorage.getItem('school_auth_token');
        
        const response = await fetch(`${API_URL}/admin/teachers/attendance/mark`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ attendanceData })
        });
        
        if (!response.ok) throw new Error('Failed to mark bulk attendance');
        
        const result = await response.json();
        
        showNotification(`${result.successful} teachers marked as ${status}`, 'success');
        await loadTeachers();
        await loadSummary();
        showLoading(false);
    } catch (error) {
        console.error('Error marking bulk attendance:', error);
        showNotification(error.message, 'error');
        showLoading(false);
    }
}

function exportToCSV() {
    const headers = ['Employee ID', 'Name', 'Subject', 'Assigned Classes', 'Status', 'Notes', 'Marked At'];
    const rows = filteredTeachers.map(teacher => {
        const status = teacher.attendance ? teacher.attendance.status : 'Pending';
        const classes = teacher.assignedClasses?.map(c => `${c.class}-${c.section}`).join('; ') || 'N/A';
        const notes = teacher.attendance?.notes || '';
        const markedAt = teacher.attendance?.markedAt ? new Date(teacher.attendance.markedAt).toLocaleString() : '';
        
        return [
            teacher.employeeId,
            teacher.name,
            teacher.subject,
            classes,
            status,
            notes,
            markedAt
        ];
    });
    
    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
        csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teacher-attendance-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showNotification('Attendance exported to CSV', 'success');
}

function viewHistory() {
    window.location.href = 'admin-teacher-attendance-history.html';
}

function refreshData() {
    loadTeachers();
    loadSummary();
    showNotification('Data refreshed', 'success');
}

function showLoading(show) {
    document.getElementById('loadingIndicator').style.display = show ? 'block' : 'none';
    document.getElementById('teachersTable').style.display = show ? 'none' : 'table';
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function logout() {
    localStorage.clear();
    window.location.href = '../pages/login.html';
}

async function deleteTeacher(teacherId, teacherName) {
    if (!confirm(`Are you sure you want to delete ${teacherName}?\n\nThis will permanently remove:\n- Teacher account\n- All lessons created by this teacher\n- All attendance records\n\nThis action cannot be undone!`)) {
        return;
    }
    
    try {
        showLoading(true);
        const token = localStorage.getItem('school_auth_token');
        
        const response = await fetch(`${API_URL}/admin/teachers/${teacherId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete teacher');
        }
        
        showNotification(`${teacherName} deleted successfully`, 'success');
        await loadTeachers();
        await loadSummary();
        showLoading(false);
    } catch (error) {
        console.error('Error deleting teacher:', error);
        showNotification(error.message, 'error');
        showLoading(false);
    }
}

