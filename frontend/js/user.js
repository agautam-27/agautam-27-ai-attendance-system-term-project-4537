document.addEventListener("DOMContentLoaded", async function () {
    const video = document.getElementById("video");
    const captureBtn = document.getElementById("capture-btn");
    const canvas = document.getElementById("canvas");
    const statusMessage = document.getElementById("status-message");
    const apiCountElement = document.getElementById("api-count");
    const userEmailElement = document.getElementById("user-email");

    // Retrieve user email from session storage
    const email = sessionStorage.getItem("email");

    if (email) {
        userEmailElement.textContent = email;
        
        try {
            const response = await fetch(`http://localhost:5000/dashboard?email=${email}`);
            const data = await response.json();

            if (response.ok) {
                apiCountElement.textContent = data.apiCount || 0; // Display API count
            } else {
                apiCountElement.textContent = "Error fetching data";
                console.error("Error fetching API count:", data.message);
            }
        } catch (error) {
            console.error("Failed to fetch API count:", error);
            apiCountElement.textContent = "Error loading API count";
        }
    } else {
        apiCountElement.textContent = "User not logged in";
    }

    // Start webcam
    async function startWebcam() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
        } catch (error) {
            console.error("Error accessing webcam:", error);
            statusMessage.textContent = "Webcam access denied.";
        }
    }

    async function captureAndRegisterFace() {
        const ctx = canvas.getContext("2d");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append("image", blob, "face.jpg");
            formData.append("email", email);

            statusMessage.textContent = "Registering your face...";

            try {
                const response = await fetch("http://localhost:5001/register-face", {
                    method: "POST",
                    body: formData
                });

                const data = await response.json();
                if (response.ok) {
                    statusMessage.textContent = "✅ Face registered!";
                } else {
                    statusMessage.textContent = `❌ ${data.error}`;
                }
            } catch (error) {
                console.error("Error registering face:", error);
                statusMessage.textContent = "❌ Server error during registration.";
            }
        }, "image/jpeg");
    }

    captureBtn.addEventListener("click", captureAndRegisterFace);
    startWebcam();
});
