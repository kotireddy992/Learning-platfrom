// Login page functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check if API is available
    if (typeof window.api === 'undefined') {
        console.error('API not loaded');
        showError('System error: API not available');
        return;
    }

    // Check if already logged in
    if (window.api.isAuthenticated()) {
        const user = window.api.getCurrentUser();
        if (user && user.role) {
            redirectToDashboard(user.role);
            return;
        }
    }
    
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('error-message');
    
    if (!loginForm) {
        console.error('Login form not found');
        return;
    }
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        
        if (!usernameInput || !passwordInput) {
            showError('Form elements not found');
            return;
        }
        
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        
        if (!username || !password) {
            showError('Please enter both email/username and password');
            return;
        }
        
        // Show loading state
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        if (!submitBtn) {
            showError('Submit button not found');
            return;
        }
        
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Logging in...';
        submitBtn.disabled = true;
        
        try {
            console.log('Attempting login with:', { username });
            const response = await window.api.login(username, password);
            
            if (response && response.success && response.user) {
                showSuccess(`Welcome, ${response.user.name}!`);
                
                // Redirect to appropriate dashboard
                setTimeout(() => {
                    redirectToDashboard(response.user.role);
                }, 1000);
            } else {
                throw new Error('Invalid response from server');
            }
            
        } catch (error) {
            console.error('Login error:', error);
            showError(error.message || 'Login failed. Please check your credentials.');
        } finally {
            // Reset button state
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
    
    function showError(message) {
        if (!errorMessage) {
            console.error('Error message element not found');
            alert('Error: ' + message);
            return;
        }
        
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        errorMessage.className = 'error-message';
        
        // Hide error after 5 seconds
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }
    
    function showSuccess(message) {
        if (!errorMessage) {
            console.log('Success:', message);
            return;
        }
        
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        errorMessage.className = 'success-message';
        
        // Hide message after 3 seconds
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 3000);
    }
    
    function redirectToDashboard(role) {
        const dashboards = {
            admin: '/pages/admin-dashboard.html',
            teacher: '/pages/teacher-dashboard.html',
            student: '/pages/student-dashboard.html'
        };
        
        const url = dashboards[role];
        if (url) {
            window.location.href = url;
        } else {
            console.error('Unknown role:', role);
            showError('Unknown user role');
        }
    }
});