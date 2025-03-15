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

    // Capture and send image for face detection
    async function captureAndSendImage() {
        const ctx = canvas.getContext("2d");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append("image", blob, "face_scan.jpg");

            statusMessage.textContent = "Scanning face...";

            try {
                const response = await fetch("http://localhost:5001/detect", {
                    method: "POST",
                    body: formData
                });

                const data = await response.json();

                if (data.faces_detected.length > 0) {
                    statusMessage.textContent = "Face detected!";
                    console.log("Detected faces:", data.faces_detected);
                } else {
                    statusMessage.textContent = "No face detected. Try again.";
                }
            } catch (error) {
                console.error("Error detecting face:", error);
                statusMessage.textContent = "Error detecting face.";
            }
        }, "image/jpeg");
    }

    captureBtn.addEventListener("click", captureAndSendImage);
    startWebcam();
});
