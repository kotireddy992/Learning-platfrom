// Utility functions and validation
export const utils = {
    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;
        alertDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            max-width: 300px;
        `;
        
        switch (type) {
            case 'success':
                alertDiv.style.backgroundColor = '#27ae60';
                break;
            case 'error':
                alertDiv.style.backgroundColor = '#e74c3c';
                break;
            case 'warning':
                alertDiv.style.backgroundColor = '#f39c12';
                break;
            default:
                alertDiv.style.backgroundColor = '#3498db';
        }
        
        document.body.appendChild(alertDiv);
        
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }
};

export const validation = {
    validateRequired(value, fieldName) {
        if (!value || value.trim() === '') {
            return `${fieldName} is required`;
        }
        return null;
    },

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return 'Please enter a valid email address';
        }
        return null;
    },

    validatePassword(password) {
        if (password.length < 6) {
            return 'Password must be at least 6 characters long';
        }
        return null;
    },

    validateForm(data, rules) {
        const errors = {};
        let isValid = true;

        for (const field in rules) {
            const fieldRules = rules[field];
            const value = data[field];

            for (const rule of fieldRules) {
                const error = rule(value);
                if (error) {
                    errors[field] = error;
                    isValid = false;
                    break;
                }
            }
        }

        return { isValid, errors };
    },

    displayErrors(errors) {
        for (const field in errors) {
            const errorElement = document.getElementById(`${field}Error`);
            if (errorElement) {
                errorElement.textContent = errors[field];
                errorElement.style.display = 'block';
            }
        }
    },

    clearErrors() {
        const errorElements = document.querySelectorAll('.error-message');
        errorElements.forEach(element => {
            element.textContent = '';
            element.style.display = 'none';
        });
    }
};
