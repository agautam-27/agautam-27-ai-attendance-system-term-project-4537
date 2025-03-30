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

    // Update the register form handler
    document.getElementById("register-form").addEventListener("submit", async function (e) {
        e.preventDefault();
        const email = document.getElementById("register-email").value;
        const password = document.getElementById("register-password").value;
        const role = document.querySelector('input[name="role"]:checked').value;
        const name = document.getElementById("register-name").value;
        const studentId = document.getElementById("register-student-id").value;
        const registerError = document.getElementById("register-error");

        // Clear previous error messages
        registerError.style.display = "none";
        registerError.textContent = "";

        const requestBody = { email, password, role, name };

        // Only add student ID if user is registering as "user"
        if (role === "user") {
            requestBody.studentId = studentId;
        }

        try {
            // const response = await fetch("https://agautam-27-ai-attendance-system-term-3fnn.onrender.com/register", {
            const response = await fetch("http://localhost:5000/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            });

            const data = await response.json();

            if (response.ok) {
                registerContainer.classList.add("hidden");
                loginContainer.classList.remove("hidden");
                alert("Registration successful! Please log in.");
            } else {
                registerError.textContent = data.message || "Registration failed.";
                registerError.style.display = "block";
                console.error(data.message || "Registration failed.");
            }
        } catch (error) {
            registerError.textContent = "Connection error. Please try again later.";
            registerError.style.display = "block";
            console.error("Registration error:", error);
        }
    });


    // Update the login form handler
    document.getElementById("login-form").addEventListener("submit", async function (e) {
        e.preventDefault();
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const loginError = document.getElementById("login-error");

        // Clear previous error messages
        loginError.style.display = "none";
        loginError.textContent = "";

        try {
            // const response = await fetch("https://agautam-27-ai-attendance-system-term-3fnn.onrender.com/login", {
            const response = await fetch("http://localhost:5000/login", {
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
                loginError.textContent = data.message || "Login failed. Please check your credentials.";
                loginError.style.display = "block";
                console.error(data.message || "Login failed.");
            }
        } catch (error) {
            loginError.textContent = "Connection error. Please try again later.";
            loginError.style.display = "block";
            console.error("Login error:", error);
        }
    });

    // Update the forgot password form handler
    document.getElementById("forgot-password-form").addEventListener("submit", async function (e) {
        e.preventDefault();
        const email = document.getElementById("reset-email").value;
        const resetError = document.getElementById("reset-error");

        // Clear previous error messages
        resetError.style.display = "none";
        resetError.textContent = "";

        try {
            // const response = await fetch("https://agautam-27-ai-attendance-system-term-3fnn.onrender.com/request-password-reset", {
            const response = await fetch("http://localhost:5000/request-password-reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                // Show success message
                alert("Password reset email sent! Please check your inbox.");
            } else {
                resetError.textContent = data.message || "Failed to send reset email.";
                resetError.style.display = "block";
            }
        } catch (error) {
            resetError.textContent = "Connection error. Please try again later.";
            resetError.style.display = "block";
            console.error("Reset error:", error);
        }
    });
});

document.addEventListener("DOMContentLoaded", function () {
    const studentIdField = document.getElementById("student-id-field");
    const roleInputs = document.querySelectorAll('input[name="role"]');

    // Function to toggle Student ID field
    function toggleStudentIdField() {
        const selectedRole = document.querySelector('input[name="role"]:checked').value;
        if (selectedRole === "admin") {
            studentIdField.style.display = "none"; 
        } else {
            studentIdField.style.display = "block"; 
        }
    }

    roleInputs.forEach(input => input.addEventListener("change", toggleStudentIdField));

    toggleStudentIdField();
});

document.addEventListener("DOMContentLoaded", function () {
    const loginContainer = document.querySelector(".container");
    const registerContainer = document.getElementById("register-container");
    const showRegisterLink = document.getElementById("show-register");
    const showLoginLink = document.getElementById("show-login");

    const registerStyle = document.getElementById("register-style");

    showRegisterLink.addEventListener("click", function (e) {
        e.preventDefault();
        loginContainer.classList.add("hidden");
        registerContainer.classList.remove("hidden");
        registerStyle.removeAttribute("disabled");  
    });

    showLoginLink.addEventListener("click", function (e) {
        e.preventDefault();
        registerContainer.classList.add("hidden");
        loginContainer.classList.remove("hidden");
        registerStyle.setAttribute("disabled", "true");  
    });
});



