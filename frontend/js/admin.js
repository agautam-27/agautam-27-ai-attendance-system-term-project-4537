document.addEventListener("DOMContentLoaded", async function () {
    const statsTable = document.getElementById("stats-table");
    const statsBody = document.getElementById("stats-body");
    const statusMessage = document.getElementById("status-message");
    const showStatsBtn = document.getElementById("show-stats-btn");
    const startAttendanceBtn = document.getElementById("start-attendance-btn");
    const videoContainer = document.getElementById("video-container");
    const video = document.getElementById("admin-video");
    const canvas = document.getElementById("admin-canvas");
    const captureBtn = document.getElementById("capture-attendance-btn");
    const statusText = document.getElementById("attendance-status");

    const adminEmail = sessionStorage.getItem("email");
    if (!adminEmail) {
        statusMessage.textContent = "Unauthorized. Please log in as admin.";
        return;
    }

    // Fetch and show stats on button click
    showStatsBtn.addEventListener("click", async () => {
        showStatsBtn.disabled = true;
        try {
            const response = await fetch(`http://localhost:5000/admin/stats?email=${adminEmail}`);
            const data = await response.json();

            if (!response.ok) {
                statusMessage.textContent = data.message || "Failed to fetch stats.";
                return;
            }

            data.users.forEach(user => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${user.email}</td>
                    <td>${user.role}</td>
                    <td>${user.apiCount}</td>
                `;
                statsBody.appendChild(row);
            });

            statsTable.style.display = "table";
        } catch (error) {
            statusMessage.textContent = "Error fetching data.";
            console.error("Fetch error:", error);
        }
    });

    // Webcam access for attendance
    async function startWebcam() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            videoContainer.style.display = "block";
            statusText.textContent = "Webcam started. Ready to capture.";
        } catch (err) {
            statusText.textContent = "Failed to access webcam.";
            console.error(err);
        }
    }

    async function captureAndCheckAttendance() {
        const ctx = canvas.getContext("2d");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append("image", blob, "attendance.jpg");

            statusText.textContent = "Processing...";

            try {
                const response = await fetch("http://localhost:5001/verify-face", {

                    method: "POST",
                    body: formData,
                });

                const data = await response.json();

                if (response.ok && data.match) {
                    statusText.textContent = `✅ ${data.email} marked present!`;
                } else {
                    statusText.textContent = "❌ No matching face found.";
                }
            } catch (error) {
                console.error("Error checking attendance:", error);
                statusText.textContent = "Error during attendance check.";
            }
        }, "image/jpeg");
    }

    startAttendanceBtn.addEventListener("click", startWebcam);
    captureBtn.addEventListener("click", captureAndCheckAttendance);
});
