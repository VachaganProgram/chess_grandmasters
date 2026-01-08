const API_URL = 'http://127.0.0.1:5000';

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    console.log('🔵 Attempting login...');
    console.log('Username:', username);
    console.log('Password length:', password.length);

    try {
        showResponse('⏳ Connecting to server...', 'info');

        const response = await fetch(`${API_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        console.log('🔵 Response status:', response.status);
        console.log('🔵 Response headers:', [...response.headers.entries()]);

        const data = await response.json();
        console.log('🔵 Response data:', data);

        const debugInfo = `
Status: ${response.status}
Response: ${JSON.stringify(data, null, 2)}
        `.trim();

        if (response.ok && data.token) {
            console.log('✅ Login successful!');
            
            localStorage.setItem('token', data.token);
            localStorage.setItem('username', data.username);
            localStorage.setItem('role', data.role);

            document.cookie = `role=${data.role}; path=/`;

            showResponse(
                `✅ Welcome, ${data.username}`, 
                'success'
            );

            setTimeout(() => {
                if (data.role === 'admin') {
                    window.location.href = '/admin';
                } else {
                    window.location.href = '/guest';
                }
            }, 1000);
        } else {
            console.error('❌ Login failed:', data.error);
            
            showResponse(
                `❌ ${data.error || 'Login failed'}`, 
                'error'
            );
        }
    } catch (error) {
        console.error('❌ Connection error:', error);
        
        showResponse(
            `❌ Connection error: ${error.message}<div class="debug-info">
Error: ${error.name}
Message: ${error.message}
Stack: ${error.stack}
            </div>`, 
            'error'
        );
    }
});

function showResponse(message, type) {
    const responseDiv = document.getElementById('response');
    responseDiv.innerHTML = message;
    responseDiv.className = `response ${type}`;
    responseDiv.style.display = 'block';
}

const role = localStorage.getItem('role');
if (role === 'admin') {
    console.log('Already logged in as admin, redirecting...');
    window.location.href = '/admin';
} else if (role) {
    console.log('Already logged in as guest, redirecting...');
    window.location.href = '/guest';
}
