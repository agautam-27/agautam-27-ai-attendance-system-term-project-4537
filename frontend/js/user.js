document.addEventListener("DOMContentLoaded", function () {
    const video = document.getElementById("video");
    const captureBtn = document.getElementById("capture-btn");
    const canvas = document.getElementById("canvas");
    const statusMessage = document.getElementById("status-message");

    // Request access to the webcam
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

        // Add user email from session
        const email = sessionStorage.getItem("email");
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


    // captureBtn.addEventListener("click", captureAndSendImage);
    captureBtn.addEventListener("click", captureAndRegisterFace);

    startWebcam();
});
