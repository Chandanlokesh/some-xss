// Signup Logic
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // Store user data in localStorage
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userPassword', password);

        document.getElementById('signupMessage').innerText = 'Signup successful! You can now login.';
        signupForm.reset();
    });
}

// Login Logic
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        const storedEmail = localStorage.getItem('userEmail');
        const storedPassword = localStorage.getItem('userPassword');

        if (email === storedEmail && password === storedPassword) {
            // Successful login
            localStorage.setItem('isLoggedIn', true);
            window.location.href = 'dashboard.html'; // Redirect to dashboard
        } else {
            // Error message
            document.getElementById('errorMessage').innerText = 'Invalid email or password';
        }
    });
}

// Check login status for Dashboard
if (window.location.pathname === '/dashboard.html') {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
        window.location.href = 'login.html'; // Redirect to login if not logged in
    }
}

// Logout Logic
function logout() {
    localStorage.removeItem('isLoggedIn');
    window.location.href = 'login.html'; // Redirect to login page after logout
}
