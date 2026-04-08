document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const loginName = document.getElementById('loginName').value;
    const password = document.getElementById('password').value;
    const message = document.getElementById('message');

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ loginName, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('userRole', data.role);
            localStorage.setItem('username', data.username);
            
            message.style.color = 'green';
            message.innerText = '登入成功！正在導向 Dashboard...';
            setTimeout(() => { window.location.href = '/dashboard.html'; }, 1000);
        } else {
            message.style.color = 'red';
            message.innerText = data.message || '登入失敗';
        }
    } catch (err) {
        message.innerText = '連線伺服器失敗';
    }
});

if (response.ok) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('userId', data._id); 
    localStorage.setItem('username', data.username);
    localStorage.setItem('userRole', data.role);
}