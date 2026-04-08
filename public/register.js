document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        loginName: document.getElementById('loginName').value,
        username: document.getElementById('username').value,
        password: document.getElementById('password').value,
        phone: document.getElementById('phone').value || "", 
        role: document.getElementById('role').value
    };

    const message = document.getElementById('message');

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            message.style.color = 'green';
            message.innerText = '註冊成功！3秒後跳轉至登入頁面...';
            setTimeout(() => { window.location.href = 'index.html'; }, 3000);
        } else {
            message.style.color = 'red';
            message.innerText = data.message || '註冊失敗';
        }
    } catch (err) {
        message.innerText = '連線伺服器失敗';
    }
});