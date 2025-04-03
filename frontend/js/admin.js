// USED AI tools like GPT to enhance functionality and connection of the db with the application

import jwtDecode from "https://cdn.jsdelivr.net/npm/jwt-decode@3.1.2/build/jwt-decode.esm.js";
import messages from "../messages/lang/en.js";

/**
 * Function to check if the JWT is expired
 * @return {boolean} True if the token is expired, false otherwise
 */
function isTokenExpired(){
    const token = getToken();
    if(!token){
        return true;
    }
    try{
        const {exp} = jwtDecode(token); // decode token to get the expiration time
        console.log("date time now: ", Date.now());
        console.log("expiration time: ", exp );
        const res = Date.now() >= exp*1000; // check if the token is expired
        console.log("res: ", res);
        return res;
    } catch(error){
        console.log("Error checking token expiration: ", error);
        return true;
    }
}

/**
 * Function to get the JWT token from localStorage
 * @return {string | null} The token if it exists, null otherwise
 */
function getToken(){
    return localStorage.getItem('token');
}

/**
 * Function to check if the user is an admin, if not redirect to login
 * @return {boolean} True if the user is admin, redirects otherwise
 */
function checkAdminAccess() {
    const token = getToken();
    if (!token) {
        localStorage.clear();
        window.location.href = "../index.html";
        return false;
    }
    
    try {
        const decoded = jwtDecode(token);
        if (!decoded.email || decoded.role !== "admin") {
            // User is not an admin, show alert and redirect
            alert(messages.unauthorizedAdmin || "Unauthorized access. This page is for admins only.");
            localStorage.clear();
            window.location.href = "../index.html";
            return false;
        }
        
        // User is authorized, make admin content visible and remove loading indicator
        document.querySelector('.admin-container').classList.remove('auth-hidden');
        const loadingElement = document.getElementById('auth-loading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        return true;
    } catch (error) {
        console.error("Error checking admin access:", error);
        localStorage.clear();
        window.location.href = "../index.html";
        return false;
    }
}

function checkTokenAndRedirect(){
    // Check if the token is expired
    if(isTokenExpired()){
        console.log("Token expired, redirecting to login")
        localStorage.clear();
        // will reload the page and redirect to the login page
        window.location.href = "../index.html";
        return;
    }
    
    // Check if user has admin access
    if (!checkAdminAccess()) {
        return;
    }
}

document.addEventListener("DOMContentLoaded", async function () {
    // Hide admin content until authentication is confirmed
    const adminContainer = document.querySelector('.admin-container');
    if (adminContainer) {
        adminContainer.classList.add('auth-hidden');
    }
    
    // First check token expiry and admin role
    checkTokenAndRedirect();
    
    // Rest of your admin.js code remains the same
    // DOM Elements
    const statsTable = document.getElementById("stats-table");
    const statsBody = document.getElementById("stats-body");
    const statusMessage = document.getElementById("status-message");
    const showStatsBtn = document.getElementById("show-stats-btn");
    const startAttendanceBtn = document.getElementById("start-attendance-btn");
    const videoContainer = document.getElementById("video-container");
    const video = document.getElementById("admin-video");
    const canvas = document.getElementById("admin-canvas");
    const captureBtn = document.getElementById("capture-attendance-btn");
    const stopCameraBtn = document.getElementById("stop-camera-btn");
    const statusText = document.getElementById("attendance-status");
    const logoutBtn = document.getElementById("logout-btn");
    
    // New DOM Elements for API stats
    const apiStatsTable = document.getElementById("api-stats-table");
    const apiStatsBody = document.getElementById("api-stats-body");

    // Tab navigation
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const refreshApiStatsBtn = document.getElementById("refresh-api-stats-btn");

    // Set up tab navigation
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and hide all content
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.add('hidden'));
            
            // Add active class to clicked button and show corresponding content
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(`${tabId}-content`).classList.remove('hidden');
            
            // If switching to API stats tab, refresh the data
            if (tabId === 'api-stats') {
                fetchAndDisplayApiStats();
            }
        });
    });
    
    // Create attendance results container if it doesn't exist
    let attendanceResults = document.getElementById("attendance-results");
    if (!attendanceResults) {
        attendanceResults = document.createElement("div");
        attendanceResults.id = "attendance-results";
        videoContainer.appendChild(attendanceResults);
    }
    
    // Stream reference to stop camera
    let mediaStream = null;

    // Get admin email from token
    const token = getToken();
    let adminEmail = null;

    try{
        const decoded = jwtDecode(token);
        adminEmail = decoded?.email;
        
    } catch(error){ // if there is an error decoding the token->no email and redirect to login page
        console.log("Error decoding token: ", error);
        statusMessage.textContent = messages.unauthorized;
        return;
    }

    // Event Listeners
    showStatsBtn.addEventListener("click", fetchAllStats);
    refreshApiStatsBtn.addEventListener("click", fetchAndDisplayApiStats); // Add this event listener
    startAttendanceBtn.addEventListener("click", startWebcam);
    stopCameraBtn.addEventListener("click", stopWebcam);
    captureBtn.addEventListener("click", captureAndCheckAttendance);
    logoutBtn.addEventListener("click", logout);
    
    // Initial data load
    fetchAllStats(); // Load user stats initially
    
    // The rest of the admin.js functions remain the same...
    // (fetchAllStats, fetchAndDisplayUserStats, fetchAndDisplayApiStats, startWebcam, stopWebcam, captureAndCheckAttendance, logout)
    
    async function fetchAllStats() {
        showStatsBtn.disabled = true;
        try {
            await fetchAndDisplayUserStats();
        } catch (error) {
            statusMessage.textContent = messages.errorFetchingData;
            console.error("Fetch error:", error);
        } finally {
            showStatsBtn.disabled = false;
        }
    }
    
    async function fetchAndDisplayUserStats() {
        try {
            const tokenLocalStorage = getToken();
            const response = await fetch(`https://agautam-27-ai-attendance-system-term-3fnn.onrender.com/admin/stats?email=${adminEmail}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${tokenLocalStorage}`,
                }
            });
            const data = await response.json();

            if (!response.ok) {
                statusMessage.textContent = data.message || "Failed to fetch stats.";
                return;
            }

            statsBody.innerHTML = ""; 
            data.users.forEach(user => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${user.username || 'Unknown'}</td>
                    <td>${user.email}</td>
                    <td>${user.token || 'N/A'}</td>
                    <td>${user.apiCount}</td>
                    <td>
                        ${user.role === "user" ? `<button class="update-role-btn" data-email="${user.email}">Make Admin</button>` : ""}
                        <button class="delete-user-btn" data-email="${user.email}">Delete</button>
                    </td>
                `;
                statsBody.appendChild(row);
            });

            // Add event listeners to the buttons after the table is populated
            document.querySelectorAll('.update-role-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const userEmail = e.target.getAttribute('data-email');
                    updateUserRole(userEmail);
                });
            });

            document.querySelectorAll('.delete-user-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const userEmail = e.target.getAttribute('data-email');
                    deleteUser(userEmail);
                });
            });

            statsTable.classList.remove("hidden");
        } catch (error) {
            console.error("Error fetching user stats:", error);
            throw error;
        }
    }
    
    async function fetchAndDisplayApiStats() {
        try {
            const tokenLocalStorage = getToken();
            refreshApiStatsBtn.disabled = true;
            const response = await fetch(`https://agautam-27-ai-attendance-system-term-3fnn.onrender.com/admin/api-stats?email=${adminEmail}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${tokenLocalStorage}`,
                },
            });
            const data = await response.json();

            if (!response.ok) {
                statusMessage.textContent = data.message || "Failed to fetch API stats.";
                return;
            }

            apiStatsBody.innerHTML = ""; 
            data.endpoints.forEach(endpoint => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${endpoint.method}</td>
                    <td>${endpoint.endpoint}</td>
                    <td>${endpoint.count}</td>
                `;
                apiStatsBody.appendChild(row);
            });

            apiStatsTable.classList.remove("hidden");
        } catch (error) {
            console.error("Error fetching API stats:", error);
            statusMessage.textContent = "Error fetching API stats.";
        } finally {
            refreshApiStatsBtn.disabled = false;
        }
    }
    
    async function startWebcam() {
        try {
            // Check if camera is already running
            if (mediaStream) {
                return;
            }
            
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: true
            });
            
            video.srcObject = stream;
            mediaStream = stream;
            videoContainer.classList.remove("hidden");
            statusText.textContent = messages.webcamStarted;
            
            // Show/hide buttons
            startAttendanceBtn.style.display = "none";
        } catch (err) {
            statusText.textContent = messages.failedWebcamAccess;
            console.error(err);
        }
    }
    
    function stopWebcam() {
        if (mediaStream) {
            // Stop all tracks
            mediaStream.getTracks().forEach(track => track.stop());
            mediaStream = null;
            
            // Clear video source
            video.srcObject = null;
            
            // Show/hide buttons
            startAttendanceBtn.style.display = "inline-block";
            
            // Hide video container
            videoContainer.classList.add("hidden");
            
            // Clear status
            statusText.textContent = "";
            
            // Clear attendance results
            attendanceResults.innerHTML = "";
        }
    }

    async function captureAndCheckAttendance() {
        if (!mediaStream) {
            return;
        }
        
        const ctx = canvas.getContext("2d");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append("image", blob, "attendance.jpg");

            statusText.textContent = "Processing...";
            attendanceResults.innerHTML = ''; // Clear previous results

            try {
                const response = await fetch("https://79ba-142-232-152-21.ngrok-free.app/verify-face", {
                    method: "POST",
                    body: formData,
                });

                const data = await response.json();

                if (response.ok) {
                    // Display total faces detected
                    const facesDetectedText = document.createElement("p");
                    facesDetectedText.textContent = messages.facesDetected + (data.total_faces_detected || 0);
                    attendanceResults.appendChild(facesDetectedText);
                    
                    if (data.match && data.matched_users && data.matched_users.length > 0) {
                        // Create attendance table
                        const table = document.createElement("table");
                        table.className = "attendance-table";
                        table.innerHTML = `
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Student ID</th>
                                    <th>Email</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody id="attendance-table-body"></tbody>
                        `;
                        attendanceResults.appendChild(table);
                        
                        const tableBody = document.getElementById("attendance-table-body");
                        
                        // Format current date and time
                        const now = new Date();
                        const dateTimeStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();
                        
                        // Add each matched user to the table
                        data.matched_users.forEach(user => {
                            const row = document.createElement("tr");
                            row.innerHTML = `
                                <td>${user.name || "Unknown"}</td>
                                <td>${user.studentId || "N/A"}</td>
                                <td>${user.email}</td>
                                <td>Present</td>
                            `;
                            tableBody.appendChild(row);
                        });
                        
                        statusText.textContent = `Marked ${data.matched_users.length} student(s) present!`;
                    } else {
                        if (data.total_faces_detected > 0) {
                            statusText.textContent = messages.noRegisteredStudents;
                        } else {
                            statusText.textContent = messages.noFacesDetected;
                        }                        
                    }
                } else {
                    statusText.textContent = data.error || "Error during attendance check.";
                }
            } catch (error) {
                console.error("Error checking attendance:", error);
                statusText.textContent = "Error during attendance check.";
            }
        }, "image/jpeg");
    }
    
    function logout() {
        // Clear storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Redirect to login page
        window.location.href = "../index.html";
    }
});

async function deleteUser(userEmail) {
    // Get admin email from the JWT token
    const token = localStorage.getItem('token');
    let adminEmail = null;
    
    try {
        const decoded = jwtDecode(token);
        adminEmail = decoded?.email;
    } catch(error) {
        console.error("Error decoding token:", error);
        alert("Authentication error. Please log in again.");
        window.location.href = "../index.html";
        return;
    }

    if (!confirm(messages.confirmDeleteUser.replace("{email}", userEmail))) return;

    try {
        const response = await fetch("https://agautam-27-ai-attendance-system-term-3fnn.onrender.com/admin/delete-user", {
            method: "DELETE",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
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
    // Get admin email from the JWT token
    const token = localStorage.getItem('token');
    let adminEmail = null;
    
    try {
        const decoded = jwtDecode(token);
        adminEmail = decoded?.email;
    } catch(error) {
        console.error("Error decoding token:", error);
        alert("Authentication error. Please log in again.");
        window.location.href = "../index.html";
        return;
    }

    if (!confirm(messages.confirmMakeAdmin.replace("{email}", userEmail))) return;

    try {
        const response = await fetch("https://agautam-27-ai-attendance-system-term-3fnn.onrender.com/admin/update-role", {
            method: "PATCH",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
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