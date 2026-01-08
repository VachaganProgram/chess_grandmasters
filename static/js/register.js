const API_URL = 'http://127.0.0.1:5000';

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (password.length < 6) {
        showResponse('❌ Password must be at least 6 characters', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/v1/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            showResponse(`✅ Welcome, ${username}`, 'success');

            setTimeout(() => {
                window.location.href = '/login';
            }, 1000);
        } else {
            showResponse(`❌ ${data.error || 'Registration failed'}`, 'error');
        }
    } catch (error) {
        showResponse(`❌ Connection error: ${error.message}`, 'error');
    }
});

function showResponse(message, type) {
    const responseDiv = document.getElementById('response');
    responseDiv.innerHTML = message;
    responseDiv.className = `response ${type}`;
    responseDiv.style.display = 'block';
}
