document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const email = params.get("email");

    if (!token || !email) {
        document.body.innerHTML = "<p>Invalid reset link.</p>";
        return;
    }

    const form = document.getElementById("reset-form");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const newPassword = document.getElementById("new-password").value;

        try {
            const response = await fetch("https://agautam-27-ai-attendance-system-term-3fnn.onrender.com/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, token, newPassword }),
            });

            const data = await response.json();

            if (response.ok) {
                alert("Password reset successful! Redirecting to login...");
                window.location.href = "../index.html";
            } else {
                alert(`❌ ${data.message || "Reset failed."}`);
            }
        } catch (err) {
            console.error("Reset error:", err);
            alert("❌ Something went wrong. Try again later.");
        }
    });
});
