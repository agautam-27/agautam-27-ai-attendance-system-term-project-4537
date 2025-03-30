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

            statsBody.innerHTML = ""; 
            data.users.forEach(user => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${user.email}</td>
                    <td>${user.role}</td>
                    <td>${user.apiCount}</td>
                    <td>
                        ${user.role === "user" ? `<button onclick="updateUserRole('${user.email}')">Make Admin</button>` : ""}
                        <button onclick="deleteUser('${user.email}')">Delete</button>
                    </td>
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

async function deleteUser(userEmail) {
    const adminEmail = sessionStorage.getItem("email");

    if (!confirm(`Are you sure you want to delete ${userEmail}?`)) return;

    try {
        const response = await fetch("http://localhost:5000/admin/delete-user", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ adminEmail, userEmail }),
        });

        const data = await response.json();
        alert(data.message);
        location.reload(); // Refresh table after deletion
    } catch (error) {
        console.error("Error deleting user:", error);
        alert("Failed to delete user.");
    }
}

async function updateUserRole(userEmail) {
    const adminEmail = sessionStorage.getItem("email");

    if (!confirm(`Are you sure you want to make ${userEmail} an admin?`)) return;

    try {
        const response = await fetch("http://localhost:5000/admin/update-role", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ adminEmail, userEmail }),
        });

        const data = await response.json();
        alert(data.message);
        location.reload(); // Refresh table to reflect role change
    } catch (error) {
        console.error("Error updating role:", error);
        alert("Failed to update user role.");
    }
}
