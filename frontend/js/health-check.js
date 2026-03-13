// Health check for backend server
class HealthCheck {
    static async checkServer() {
        try {
            const response = await fetch('http://localhost:5000/api/health');
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Server is running:', data.message);
                return true;
            }
        } catch (error) {
            console.error('❌ Server health check failed:', error.message);
            this.showServerError();
            return false;
        }
    }

    static showServerError() {
        // Create error modal if it doesn't exist
        if (!document.getElementById('serverErrorModal')) {
            const modal = document.createElement('div');
            modal.id = 'serverErrorModal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            `;
            
            modal.innerHTML = `
                <div style="
                    background: white;
                    padding: 2rem;
                    border-radius: 8px;
                    text-align: center;
                    max-width: 400px;
                    margin: 1rem;
                ">
                    <h3 style="color: #dc2626; margin-bottom: 1rem;">⚠️ Server Not Running</h3>
                    <p style="margin-bottom: 1.5rem;">
                        Backend server is not running. Please start the server with:
                    </p>
                    <code style="
                        background: #f3f4f6;
                        padding: 0.5rem;
                        border-radius: 4px;
                        display: block;
                        margin-bottom: 1.5rem;
                    ">npm start</code>
                    <button onclick="location.reload()" style="
                        background: #2563eb;
                        color: white;
                        border: none;
                        padding: 0.75rem 1.5rem;
                        border-radius: 4px;
                        cursor: pointer;
                    ">Retry</button>
                </div>
            `;
            
            document.body.appendChild(modal);
        }
    }

    static async init() {
        // Skip health check for login page initially
        if (window.location.pathname.includes('login.html')) {
            return;
        }
        
        const isHealthy = await this.checkServer();
        if (!isHealthy) {
            return false;
        }
        
        // Set up periodic health checks
        setInterval(() => {
            this.checkServer();
        }, 30000); // Check every 30 seconds
        
        return true;
    }
}

// Initialize health check when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    HealthCheck.init();
});