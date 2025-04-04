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
 * Function to check if the user has the correct role, if not redirect to login
 * @return {boolean} True if the user has correct role, redirects otherwise
 */
function checkUserAccess() {
    const token = getToken();
    if (!token) {
        localStorage.clear();
        window.location.href = "../index.html";
        return false;
    }
    
    try {
        const decoded = jwtDecode(token);
        if (!decoded.email) {
            alert(messages.unauthorized || "Session expired. Please log in again.");
            localStorage.clear();
            window.location.href = "../index.html";
            return false;
        }
        
        // If user is an admin and trying to access user page, that's okay
        // But if admin tries to specifically check this, redirect to admin page
        if (decoded.role === "admin" && window.location.pathname.includes('user.html') && 
            !sessionStorage.getItem('viewing_as_user')) {
            if (confirm("You are logged in as an admin. Would you like to go to the admin page?")) {
                window.location.href = "admin.html";
                return false;
            } else {
                // Allow admin to view user page but mark that they chose to stay
                sessionStorage.setItem('viewing_as_user', 'true');
            }
        }
        
        return true;
    } catch (error) {
        console.error("Error checking user access:", error);
        localStorage.clear();
        window.location.href = "../index.html";
        return false;
    }
}

function checkTokenAndRedirect(){
    // Check if the token is expired
    if(isTokenExpired()){
        console.log("enter checks")
        localStorage.clear();
        // will reload the page and redirect to the login page
        window.location.href = "../index.html";
        return;
    }
    
    // Check if user has correct access
    if (!checkUserAccess()) {
        return;
    }
}

/**
 * Function to get the JWT token from localStorage
 * @return {string | null} The token if it exists, null otherwise
 */
function getToken(){
    return localStorage.getItem('token');
}

document.addEventListener("DOMContentLoaded", async function () {
    checkTokenAndRedirect(); // Check if the token is expired and redirect if necessary
    
    // DOM Elements
    const video = document.getElementById("video");
    const startCameraBtn = document.getElementById("start-camera-btn");
    const stopCameraBtn = document.getElementById("stop-camera-btn");
    const captureBtn = document.getElementById("capture-btn");
    const canvas = document.getElementById("canvas");
    const statusMessage = document.getElementById("status-message");
    const apiCountElement = document.getElementById("api-count");
    const userEmailElement = document.getElementById("user-email");
    const videoContainer = document.getElementById("video-container");
    const logoutBtn = document.getElementById("logout-btn");
    
    // Stream reference to stop camera
    let mediaStream = null;

        // Event Listeners
    startCameraBtn.addEventListener("click", startWebcam);
    stopCameraBtn.addEventListener("click", stopWebcam);
    captureBtn.addEventListener("click", captureAndRegisterFace);
    logoutBtn.addEventListener("click", logout);

    const token = getToken();
    let email = null;

    try{
        const decoded = jwtDecode(token);
        email = decoded?.email;
        
    } catch(error){ // if there is an error decoding the token->no email and redirect to login page
        console.log("Error decoding token: ", error);
        window.location.href = "../index.html";
        return;
    }
    
    userEmailElement.textContent = email;

    // Get user API count
    try {
        const response = await fetch(`https://agautam-27-ai-attendance-system-term-3fnn.onrender.com/dashboard?email=${email}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        const data = await response.json();

        if (response.ok) {
            apiCountElement.textContent = data.apiCount || 0;
        } else {
            apiCountElement.textContent = messages.apiCountError;
            console.error(messages.apiCountError, data.message);            
        }
    } catch (error) {
        console.error("Failed to fetch API count:", error);
        apiCountElement.textContent = "Error loading API count";
    }

    // Functions
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
            setStatusMessage(messages.cameraStarted, "info");
            
            // Show/hide buttons
            startCameraBtn.style.display = "none";
        } catch (err) {
            setStatusMessage(messages.failedWebcamAccess, "error");
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
            startCameraBtn.style.display = "inline-block";
            
            // Hide video container
            videoContainer.classList.add("hidden");
            
            // Clear status
            statusMessage.textContent = "";
            statusMessage.className = "";
        }
    }

    async function captureAndRegisterFace() {
        if (!mediaStream) {
            setStatusMessage(messages.cameraNotRunning, "error");
            return;
        }
        
        const ctx = canvas.getContext("2d");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
        canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append("image", blob, "face.jpg");
            formData.append("email", email);
    
            setStatusMessage(messages.registeringFace, "info");
    
            try {
                const response = await fetch("https://75a4-142-232-152-21.ngrok-free.app/register-face", {
                    method: "POST",
                    body: formData
                });
    
                const data = await response.json();
                if (response.ok) {
                    setStatusMessage(messages.faceRegistered, "success");
                    // Update API count display after successful face registration
                    updateApiCountDisplay();
                } else {
                    setStatusMessage(`❌ ${data.error}`, "error");
                }
            } catch (error) {
                console.error("Error registering face:", error);
                setStatusMessage(messages.faceRegistrationError, "error");
            }
        }, "image/jpeg");
    }
    
    function setStatusMessage(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = "";
        
        if (type === "success") {
            statusMessage.classList.add("success-message");
        } else if (type === "error") {
            statusMessage.classList.add("error-message");
        }
    }
    
    function logout() {
        // Clear all storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Redirect to login page
        window.location.href = "../index.html";
    }

        // Add the new function here, inside the DOMContentLoaded block
        async function updateApiCountDisplay() {
            try {
                const response = await fetch(`https://agautam-27-ai-attendance-system-term-3fnn.onrender.com/dashboard?email=${email}`, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    apiCountElement.textContent = data.apiCount || 0;
                } else {
                    console.error("Error fetching updated API count:", data.message);
                }
            } catch (error) {
                console.error(messages.apiCountUpdateError, error);
            }
        }
});