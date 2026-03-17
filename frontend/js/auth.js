// Auth utility functions
window.Auth = {
    // Get token from localStorage
    getToken() {
        return localStorage.getItem('school_auth_token');
    },

    // Get user from localStorage
    getUser() {
        const userStr = localStorage.getItem('school_user_data');
        return userStr ? JSON.parse(userStr) : null;
    },

    // Set token
    setToken(token) {
        localStorage.setItem('school_auth_token', token);
    },

    // Set user
    setUser(user) {
        localStorage.setItem('school_user_data', JSON.stringify(user));
    },

    // Check if authenticated
    isAuthenticated() {
        return !!this.getToken() && !!this.getUser();
    },

    // Logout
    logout() {
        localStorage.removeItem('school_auth_token');
        localStorage.removeItem('school_user_data');
        window.location.href = 'login.html';
    },

    // Redirect to appropriate dashboard
    redirectToDashboard(role) {
        const dashboards = {
            admin: 'admin-dashboard.html',
            teacher: 'teacher-dashboard.html',
            student: 'student-dashboard.html'
        };
        window.location.href = dashboards[role] || 'login.html';
    }
};

console.log('Auth.js loaded');

// Check authentication on page load
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop();
    const publicPages = ['login.html', 'signup.html', 'login-fixed.html'];
    
    if (!publicPages.includes(currentPage) && !Auth.isAuthenticated()) {
        window.location.href = 'login.html';
    }
});
