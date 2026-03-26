// Auth utility functions
window.Auth = {
    getToken() {
        return localStorage.getItem('school_auth_token');
    },

    getUser() {
        const userStr = localStorage.getItem('school_user_data');
        try {
            return userStr ? JSON.parse(userStr) : null;
        } catch {
            return null;
        }
    },

    setToken(token) {
        localStorage.setItem('school_auth_token', token);
    },

    setUser(user) {
        localStorage.setItem('school_user_data', JSON.stringify(user));
    },

    isAuthenticated() {
        return !!this.getToken() && !!this.getUser();
    },

    logout() {
        localStorage.removeItem('school_auth_token');
        localStorage.removeItem('school_user_data');
        window.location.href = 'login.html';
    },

    redirectToDashboard(role) {
        const dashboards = {
            admin: 'admin-dashboard.html',
            teacher: 'teacher-dashboard.html',
            student: 'student-dashboard.html'
        };
        window.location.href = dashboards[role] || 'login.html';
    },

    // Validates token with server - auto-clears stale/invalid tokens
    async validateToken() {
        const token = this.getToken();
        if (!token) return false;
        try {
            const base = 'https://school-lms-6hcp.onrender.com';
            const res = await fetch(`${base}/api/auth/validate`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401) {
                this.logout();
                return false;
            }
            return true;
        } catch {
            // Network error - server may be cold-starting, don't clear token
            return true;
        }
    }
};

console.log('Auth.js loaded');

// Check authentication on page load
document.addEventListener('DOMContentLoaded', async () => {
    const currentPage = window.location.pathname.split('/').pop();
    const publicPages = ['login.html', 'signup.html', 'login-fixed.html', 'index.html', ''];

    if (publicPages.includes(currentPage)) return;

    if (!Auth.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    // Validate token is still accepted by server
    await Auth.validateToken();
});
