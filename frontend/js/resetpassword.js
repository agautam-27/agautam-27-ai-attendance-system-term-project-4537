import messages from "../messages/lang/en.js";

document.addEventListener("DOMContentLoaded", () => {
    //the link in email contains the token and email as query parameters
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const email = params.get("email");

    if (!token || !email) {
        document.body.innerHTML = `<p>${messages.invalidResetLink}</p>`;
        return;
    }

    // in resetpassword.html, we have a form with id reset-form and an input with id new-password
    const form = document.getElementById("reset-form");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const newPassword = document.getElementById("new-password").value;

        //"http://localhost:5000/reset-password"
        //"https://agautam-27-ai-attendance-system-term-3fnn.onrender.com/reset-password"
        try {
            const response = await fetch("http://localhost:5000/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, token, newPassword }),
            });

            const data = await response.json();

            if (response.ok) {
                alert(messages.passwordResetSuccess);
                window.location.href = "../index.html";
            } else {
                alert(`❌ ${data.message || messages.resetFailed}`);
            }
        } catch (err) {
            console.error("Reset error:", err);
            alert(messages.resetError);
        }
    });
});
