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

function deleteCookie(name) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

// Add current user declaration at the top
let currentUser = null;

// Fetch current user on page load
async function fetchCurrentUser() {
    try {
        const response = await fetch('/api/current-user/');
        const data = await response.json();
        currentUser = data;  // Store the user object
        console.log('Current user:', currentUser);
    } catch (error) {
        console.error('Error fetching current user:', error);
        // window.location.href = '/login/';
    }
}

// Fetch all users from the backend
async function fetchUsers() {
    try {
        const response = await fetch('http://127.0.0.1:8000/api/users/');
        const data = await response.json();
        if (response.ok) {
            populateUsersList(data.users);
        } else {
            console.error('Failed to fetch users:', data.error);
        }
    } catch (error) {
        console.error('Error fetching users:', error);
    }
}

// Modified populateUsersList function
function populateUsersList(users) {
    const usersList = document.getElementById('users-list');
    usersList.innerHTML = ''; // Clear existing items
    
    users.forEach(user => {
        const listItem = document.createElement('li');
        listItem.className = 'user-item';
        listItem.innerHTML = `
            <button class="user-button" data-userid="${user.id}" onclick="loadChatHistory(${user.id})">
                <span class="avatar">${user.username[0].toUpperCase()}</span>
                ${user.username}
            </button>
        `;
        usersList.appendChild(listItem);
    });
}

// Add at the top of chat.js
function checkAuth() {
    const username = getCookie('username');
    if (!username) {
        window.location.href = '/login/';
        return;
    }
    document.getElementById('username').textContent = username;
}

// Add logout handler
function handleLogout() {
    deleteCookie('username');
    // Call Django logout endpoint
    fetch('/logout/', {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCookie('csrftoken'),
        }
    }).then(() => {
        window.location.href = '/login/';
    });
}

let currentRecipient = null;

// Modified loadChatHistory function
async function loadChatHistory(userId) {
    try {
        // Show loading state
        document.getElementById('chat-prompt').style.display = 'none';
        document.getElementById('chat-history').style.display = 'block';
        
        // Fetch chat history from API
        const response = await fetch(`http://127.0.0.1:8000/api/messages/${userId}/`);
        const messages = await response.json();
        console.log(messages);
        if (response.ok) {
            console.log("here");
            renderMessages(messages);
            currentRecipient = userId;
            setupWebSocket(userId);
            window.history.pushState({}, '', `/chat/${userId}/`);
        } else {
            console.error('Failed to load messages:', messages.error);
        }
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

function renderMessages(messages) {
    const container = document.getElementById('message-container');
    
    
    if (!currentUser) {
        console.error('Current user not loaded!');
        return;
    }
    
    messages.forEach(msg => {
        const isSent = msg.sender === currentUser.id;
        const bubble = document.createElement('div');
        bubble.className = `message ${isSent ? 'sent' : 'received'}`;
        bubble.innerHTML = `
            <div>${msg.content}</div>
            <div class="message-info">
                ${new Date(msg.timestamp).toLocaleTimeString()}
            </div>
        `;
        container.appendChild(bubble);
    });
    
    // Scroll to bottom
    container.scrollIntoView(false);
}

// Auto-resize textarea
function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}


let chatSocket = null;

function setupWebSocket(recipientId) {
    if(chatSocket) {
        chatSocket.close();
    }
    
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/chat/${recipientId}/`;
    
    chatSocket = new WebSocket(wsUrl);
    
    // Add CSRF token to connection
    chatSocket.onopen = function(e) {
        this.send(JSON.stringify({
            'type': 'auth',
            'token': getCookie('csrftoken')
        }));
    };

    chatSocket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        console.log(data)
        if(data.error) {
            console.error('WebSocket error:', data.error);
            return;
        }
        renderMessages([{
            content: data.message,
            sender: data.sender_id,
            timestamp: data.timestamp
        }]);
    };

    chatSocket.onclose = function(e) {
        if(e.code === 4001) {
            window.location.href = '/login/';
        }
        console.log('WebSocket closed:', e);
    };
}

function handleSendMessage() {
    const input = document.getElementById('message-input');
    const content = input.value.trim();
    
    if(content && currentRecipient) {
        chatSocket.send(JSON.stringify({
            'type':'message',
            'message': content
        }));
        input.value = '';
    }
}

// Initialize chat page with auth check
document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    await fetchCurrentUser();  // Wait for user data first
    await fetchUsers();
});