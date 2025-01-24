// Function to get the CSRF token from the cookie
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Handle login form submission
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('http://127.0.0.1:8000/api/login/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'),  // Add CSRF token
            },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();
        if (response.ok) {
            setCookie('username', username);
            window.location.href = '/chat/';
        }
         else {
            document.getElementById('error-message').textContent = data.error || 'Login failed';
        }
    } catch (error) {
        document.getElementById('error-message').textContent = 'An error occurred. Please try again.';
    }
});

// Handle signup form submission
document.getElementById('signup-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (password !== confirmPassword) {
        document.getElementById('error-message').textContent = 'Passwords do not match';
        return;
    }

    try {
        const response = await fetch('http://127.0.0.1:8000/api/signup/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'),  // Add CSRF token
            },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();
        if (response.ok) {
            setCookie('username', username);
            window.location.href = '/login/';
        }else {
            document.getElementById('error-message').textContent = data.error || 'Signup failed';
        }
    } catch (error) {
        document.getElementById('error-message').textContent = 'An error occurred. Please try again.';
    }
});

// Add cookie management functions
function setCookie(name, value, days=7) {
    const date = new Date();
    date.setTime(date.getTime() + (days*24*60*60*1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = `${name}=${value};${expires};path=/`;
}