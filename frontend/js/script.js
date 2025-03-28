document.addEventListener("DOMContentLoaded", function () {
    const loginContainer = document.querySelector(".container");
    const registerContainer = document.getElementById("register-container");
    const forgotPasswordContainer = document.getElementById("forgot-password-container");

    const showRegisterLink = document.getElementById("show-register");
    const showLoginLink = document.getElementById("show-login");
    const forgotPasswordLink = document.getElementById("forgot-password-link");
    const backToLoginLink = document.getElementById("back-to-login");

    // Toggle between forms
    showRegisterLink.addEventListener("click", function (e) {
        e.preventDefault();
        loginContainer.classList.add("hidden");
        registerContainer.classList.remove("hidden");
    });

    showLoginLink.addEventListener("click", function (e) {
        e.preventDefault();
        registerContainer.classList.add("hidden");
        loginContainer.classList.remove("hidden");
    });

    forgotPasswordLink.addEventListener("click", function (e) {
        e.preventDefault();
        loginContainer.classList.add("hidden");
        forgotPasswordContainer.classList.remove("hidden");
    });

    backToLoginLink.addEventListener("click", function (e) {
        e.preventDefault();
        forgotPasswordContainer.classList.add("hidden");
        loginContainer.classList.remove("hidden");
    });

    // Register user
    document.getElementById("register-form").addEventListener("submit", async function (e) {
        e.preventDefault();
        const email = document.getElementById("register-email").value;
        const password = document.getElementById("register-password").value;
        const role = document.querySelector('input[name="role"]:checked').value;

        const response = await fetch("https://agautam-27-ai-attendance-system-term-3fnn.onrender.com/register", {
        // const response = await fetch("http://localhost:5000/register", {

            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, role }),
        });

        const data = await response.json();

        if (response.ok) {
            registerContainer.classList.add("hidden");
            loginContainer.classList.remove("hidden");
        } else {
            console.error(data.message || "Registration failed.");
        }
    });

    // Login user
    document.getElementById("login-form").addEventListener("submit", async function (e) {
        e.preventDefault();
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        const response = await fetch("https://agautam-27-ai-attendance-system-term-3fnn.onrender.com/login", {
        // const response = await fetch("http://localhost:5000/login", {

            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok) {
            sessionStorage.setItem("email", email);

            if (data.role === "admin") {
                window.location.href = "pages/admin.html";
            } else {
                if (data.overQuota) {
                    alert("You've exceeded your free 20 API calls. Service will continue, but please be aware.");
                }
                window.location.href = "pages/user.html";
            }
        } else {
            console.error(data.message || "Login failed.");
        }
    });

    // Forgot password handler
    document.getElementById("forgot-password-form").addEventListener("submit", async function (e) {
        e.preventDefault();
        const email = document.getElementById("reset-email").value;

        const response = await fetch("https://agautam-27-ai-attendance-system-term-3fnn.onrender.com/request-password-reset", {
        //const response = await fetch("http://localhost:5000/request-password-reset", {

            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });

        const data = await response.json();

        if (response.ok) {
            // Show styled reset link instead of raw alert
            const linkContainer = document.getElementById("reset-link-container");
            const link = document.getElementById("reset-link");
            link.href = data.link;
            linkContainer.style.display = "block";
        }
        

    });
});
