// API utility functions
const API_BASE_URL = 'https://school-lms-6hcp.onrender.com';
window.API = {
    baseURL: API_BASE_URL + '/api',

    // Get auth headers
    getAuthHeaders() {
        const token = localStorage.getItem('school_auth_token');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    },

    // Make API request
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...this.getAuthHeaders(),
            ...options.headers
        };

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage;
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
                } catch {
                    errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }

            return await response.json();
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    },

    // Teacher Dashboard APIs
    async getTeacherDashboard() {
        return await this.request('/teacher/dashboard');
    },

    async getTeacherLessons() {
        return await this.request('/teacher/lessons');
    },

    async getTeacherFeedback() {
        return await this.request('/teacher/feedback');
    },

    async getTeacherStudents() {
        return await this.request('/teacher/students');
    },

    async addStudent(studentData) {
        // Create approval data from form data
        const approvalData = {
            email: studentData.email,
            studentName: `${studentData.firstName} ${studentData.lastName}`,
            rollNumber: studentData.rollNumber,
            grade: studentData.grade,
            section: studentData.section,
            parentPhone: studentData.parentPhone
        };
        
        return await this.request('/teacher/approve-student', {
            method: 'POST',
            body: JSON.stringify(approvalData)
        });
    },

    async markAttendance(attendanceData) {
        return await this.request('/teacher/attendance', {
            method: 'POST',
            body: JSON.stringify(attendanceData)
        });
    },

    async markLessonComplete(lessonId) {
        return await this.request(`/teacher/lessons/${lessonId}/complete`, {
            method: 'PATCH'
        });
    },

    async getStudentsForAttendance(date) {
        return await this.request(`/teacher/students/attendance?date=${date}`);
    },

    async getApprovedStudents() {
        return await this.request('/teacher/approved-students');
    },

    async markStudentAttendance(attendanceData) {
        return await this.request('/teacher/students/attendance', {
            method: 'POST',
            body: JSON.stringify(attendanceData)
        });
    },

    async getStudentAttendanceByTeacher(studentId) {
        return await this.request(`/teacher/students/${studentId}/attendance`);
    },

    async getStudentProgressByTeacher(studentId) {
        return await this.request(`/teacher/students/${studentId}/progress`);
    },

    // Student APIs
    async getStudentDashboard() {
        return await this.request('/student/dashboard');
    },

    async getStudentLessons() {
        return await this.request('/student/my-lessons');
    },

    async getLesson(lessonId) {
        return await this.request(`/student/lessons/${lessonId}`);
    },

    async submitFeedback(feedbackData) {
        return await this.request('/student/feedback', {
            method: 'POST',
            body: JSON.stringify(feedbackData)
        });
    },

    async getStudentProgress() {
        return await this.request('/student/progress');
    },

    async getStudentAttendance() {
        return await this.request('/student/attendance-comprehensive');
    },

    async getAttendanceCalendar(month, year) {
        return await this.request(`/student/attendance-calendar?month=${month}&year=${year}`);
    },

    // Lesson Progress APIs
    async updateLessonProgress(lessonId, progressData) {
        return await this.request(`/student/lessons/${lessonId}/progress`, {
            method: 'PUT',
            body: JSON.stringify(progressData)
        });
    },

    async getLessonProgress(lessonId) {
        return await this.request(`/student/lessons/${lessonId}/progress`);
    },

    // Teacher Lesson Progress APIs
    async getLessonStudentProgress(lessonId) {
        return await this.request(`/teacher/lessons/${lessonId}/student-progress`);
    },

    async getStudentProgressAnalytics() {
        return await this.request('/teacher/student-progress-analytics');
    },

    // Video sharing APIs
    async shareVideo(videoData) {
        return await this.request('/teacher/share-video', {
            method: 'POST',
            body: JSON.stringify(videoData)
        });
    },

    async getSharedVideos() {
        return await this.request('/teacher/shared-videos');
    },

    async getVideosByClass(className) {
        return await this.request(`/teacher/shared-videos/class/${className}`);
    },

    async getVideoClasses() {
        return await this.request('/teacher/video-classes');
    },

    async deleteSharedVideo(videoId) {
        return await this.request(`/teacher/shared-videos/${videoId}`, {
            method: 'DELETE'
        });
    },

    async deleteStudentFromTeacher(studentId) {
        return await this.request(`/teacher/students/${studentId}`, {
            method: 'DELETE'
        });
    },

    async getStudentVideos() {
        return await this.request('/student/videos');
    },

    // Admin APIs
    async getAdminDashboard() {
        return await this.request('/admin/dashboard');
    },

    async getTeachers() {
        return await this.request('/admin/teachers');
    },

    async getStudents() {
        try {
            console.log('API: Fetching students from /admin/students');
            const result = await this.request('/admin/students');
            console.log('API: Students response:', result);
            return result;
        } catch (error) {
            console.error('API: Error fetching students:', error);
            // Try alternative endpoint if main one fails
            try {
                console.log('API: Trying alternative endpoint /admin/all-students');
                const altResult = await this.request('/admin/all-students');
                console.log('API: Alternative students response:', altResult);
                return altResult;
            } catch (altError) {
                console.error('API: Alternative endpoint also failed:', altError);
                throw error; // Throw original error
            }
        }
    },

    async getClasses() {
        return await this.request('/admin/classes');
    },

    async getStudentsByClass(className) {
        return await this.request(`/admin/students/class/${className}`);
    },

    async addStudentByAdmin(studentData) {
        return await this.request('/admin/students', {
            method: 'POST',
            body: JSON.stringify(studentData)
        });
    },

    async markClassAttendance(className, attendanceData) {
        return await this.request(`/admin/attendance/class/${className}`, {
            method: 'POST',
            body: JSON.stringify(attendanceData)
        });
    },

    async getClassAttendance(className, date) {
        return await this.request(`/admin/attendance/class/${className}/${date}`);
    },

    async getFeedbackAnalytics() {
        return await this.request('/admin/analytics/feedback');
    },

    async getAlerts() {
        return await this.request('/admin/alerts');
    },

    async toggleUserStatus(userId) {
        return await this.request(`/admin/users/${userId}/toggle-status`, {
            method: 'PUT'
        });
    },

    async assignClassesToTeacher(teacherId, assignedClasses) {
        return await this.request('/admin/assign-classes', {
            method: 'POST',
            body: JSON.stringify({ teacherId, assignedClasses })
        });
    },

    async getTeacherClasses(teacherId) {
        return await this.request(`/admin/teacher-classes/${teacherId}`);
    },

    // Remove default users
    async removeDefaultUsers() {
        return await this.request('/admin/remove-default-users', {
            method: 'DELETE'
        });
    },

    // Bulk operations
    async bulkActivateStudents() {
        return await this.request('/admin/students/bulk-activate', {
            method: 'PUT'
        });
    },

    async bulkDeactivateStudents() {
        return await this.request('/admin/students/bulk-deactivate', {
            method: 'PUT'
        });
    },

    // Delete student (Admin)
    async deleteStudentFromAdmin(studentId) {
        return await this.request(`/admin/students/${studentId}`, {
            method: 'DELETE'
        });
    },

    // Delete teacher
    async deleteTeacher(teacherId) {
        return await this.request(`/admin/teachers/${teacherId}`, {
            method: 'DELETE'
        });
    },

    // Update student
    async updateStudent(studentId, studentData) {
        return await this.request(`/admin/students/${studentId}`, {
            method: 'PUT',
            body: JSON.stringify(studentData)
        });
    },

    // Update teacher
    async updateTeacher(teacherId, teacherData) {
        return await this.request(`/admin/teachers/${teacherId}`, {
            method: 'PUT',
            body: JSON.stringify(teacherData)
        });
    },

    // Get all users
    async getAllUsers() {
        return await this.request('/admin/users');
    }
};

// Legacy api object for backward compatibility
window.api = {
    baseURL: API_BASE_URL + '/api',

    // Check if user is authenticated
    isAuthenticated() {
        return !!localStorage.getItem('school_auth_token');
    },

    // Get current user from storage
    getCurrentUser() {
        const userStr = localStorage.getItem('school_user_data');
        return userStr ? JSON.parse(userStr) : null;
    },

    // Set authentication data
    setAuth(token, user) {
        localStorage.setItem('school_auth_token', token);
        localStorage.setItem('school_user_data', JSON.stringify(user));
    },

    // Clear authentication data
    clearAuth() {
        localStorage.removeItem('school_auth_token');
        localStorage.removeItem('school_user_data');
    },

    // Get auth headers
    getAuthHeaders() {
        const token = localStorage.getItem('school_auth_token');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    },

    // Make API request
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...this.getAuthHeaders(),
            ...options.headers
        };

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            return data;
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    },

// Login
    async login(email, password) {
        try {
            const response = await this.request('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username: email, password })
            });

            if (response.success) {
                this.setAuth(response.token, response.user);
            }

            return response;
        } catch (error) {
            throw error;
        }
    },

    // Signup
    async signup(userData) {
        try {
            const response = await this.request('/auth/signup', {
                method: 'POST',
                body: JSON.stringify(userData)
            });

            if (response.success) {
                this.setAuth(response.token, response.user);
            }

            return response;
        } catch (error) {
            console.error('Signup error:', error);
            throw error;
        }
    },

    // Logout
    logout() {
        this.clearAuth();
        window.location.href = 'login.html';
    }
};



