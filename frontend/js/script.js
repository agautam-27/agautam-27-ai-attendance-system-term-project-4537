document.addEventListener("DOMContentLoaded", function () {
    const loginContainer = document.querySelector(".container"); 
    const registerContainer = document.getElementById("register-container"); 
    const showRegisterLink = document.getElementById("show-register");
    const showLoginLink = document.getElementById("show-login");

    // Show register form when clicking "Register here"
    showRegisterLink.addEventListener("click", function (e) {
        e.preventDefault();
        loginContainer.classList.add("hidden");
        registerContainer.classList.remove("hidden");
    });

    // Show login form when clicking "Login here"
    showLoginLink.addEventListener("click", function (e) {
        e.preventDefault();
        registerContainer.classList.add("hidden");
        loginContainer.classList.remove("hidden");
    });

    document.getElementById("register-form").addEventListener("submit", async function (e) {
        e.preventDefault();
        const email = document.getElementById("register-email").value;
        const password = document.getElementById("register-password").value;
        const role = document.querySelector('input[name="role"]:checked').value; 
    
        const response = await fetch("https://agautam-27-ai-attendance-system-term-3fnn.onrender.com/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password, role }),
        });
    
        const data = await response.json();
        alert(data.message);
    
        if (response.ok) {
            document.getElementById("register-container").classList.add("hidden");
            document.querySelector(".container").classList.remove("hidden");
        }
    });

    document.getElementById("login-form").addEventListener("submit", async function (e) {
        e.preventDefault();
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
    
        const response = await fetch("https://agautam-27-ai-attendance-system-term-3fnn.onrender.com/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
        });
    
        const data = await response.json();
        alert(data.message);
    
        if (response.ok) {
            sessionStorage.setItem("email", email);
        
            if (data.overQuota) {
                alert("You've exceeded your free 20 API calls. Service will continue, but please be aware.");
            }
        
            if (data.role === "admin") {
                window.location.href = "pages/admin.html"; 
            } else if (data.role === "user") {
                window.location.href = "pages/user.html"; 
            }
        }
         
    });
});
