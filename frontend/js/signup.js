// Signup page functionality
document.addEventListener('DOMContentLoaded', function() {
    const signupForm = document.getElementById('signupForm');
    
    signupForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Clear previous errors
        clearErrors();
        
        // Get form data
        const formData = {
            fullName: document.getElementById('fullName').value.trim(),
            email: document.getElementById('email').value.trim(),
            username: document.getElementById('username').value.trim(),
            password: document.getElementById('password').value,
            confirmPassword: document.getElementById('confirmPassword').value,
            userType: document.getElementById('userType').value
        };
        
        // Validate form
        if (!validateForm(formData)) {
            return;
        }
        
        // Show loading state
        const submitBtn = signupForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Creating Account...';
        submitBtn.disabled = true;
        
        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fullName: formData.fullName,
                    email: formData.email,
                    username: formData.username,
                    password: formData.password,
                    userType: formData.userType
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Signup failed');
            }
            
            // Store auth data
            sessionStorage.setItem('token', data.token);
            sessionStorage.setItem('user', JSON.stringify(data.user));
            
            // Show success message
            showMessage('Account created successfully! Redirecting...', 'success');
            
            // Redirect to appropriate dashboard
            setTimeout(() => {
                redirectToDashboard(data.user.role);
            }, 1500);
            
        } catch (error) {
            showError('signupError', error.message);
        } finally {
            // Reset button state
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
    
    function validateForm(data) {
        let isValid = true;
        
        // Full name validation
        if (!data.fullName || data.fullName.length < 2) {
            showError('fullNameError', 'Full name must be at least 2 characters');
            isValid = false;
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!data.email || !emailRegex.test(data.email)) {
            showError('emailError', 'Please enter a valid email address');
            isValid = false;
        }
        
        // Username validation
        if (!data.username || data.username.length < 3) {
            showError('usernameError', 'Username must be at least 3 characters');
            isValid = false;
        }
        
        // Password validation
        if (!data.password || data.password.length < 6) {
            showError('passwordError', 'Password must be at least 6 characters');
            isValid = false;
        }
        
        // Confirm password validation
        if (data.password !== data.confirmPassword) {
            showError('confirmPasswordError', 'Passwords do not match');
            isValid = false;
        }
        
        // User type validation
        if (!data.userType) {
            showError('userTypeError', 'Please select a user type');
            isValid = false;
        }
        
        return isValid;
    }
    
    function showError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }
    
    function clearErrors() {
        const errorElements = document.querySelectorAll('.error-message');
        errorElements.forEach(element => {
            element.textContent = '';
            element.style.display = 'none';
        });
    }
    
    function showMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            max-width: 300px;
        `;
        
        if (type === 'success') {
            messageDiv.style.backgroundColor = '#27ae60';
        } else {
            messageDiv.style.backgroundColor = '#e74c3c';
        }
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
    
    function redirectToDashboard(role) {
        const dashboards = {
            student: 'student-dashboard.html',
            teacher: 'teacher-dashboard.html',
            admin: 'admin-dashboard.html'
        };\n        \n        window.location.href = dashboards[role] || 'login.html';\n    }\n});