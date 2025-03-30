import jwtDecode from "https://cdn.jsdelivr.net/npm/jwt-decode@3.1.2/build/jwt-decode.esm.js";

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
        const {exp} = jwtDecode(token); // decond token to get the expiration time
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

function checkTokenAndRedirect(){
    // Check if the token is expired
    if(isTokenExpired()){
        console.log("enter checks")
        localStorage.clear();
        // will reload the page and redirect to the login page
        window.location.href = "../index.html";
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
    
    // if (!email) {
    //     window.location.href = "../index.html";
    //     return;
    // }
    
    userEmailElement.textContent = email;

    // Get user API count
    try {
        const response = await fetch(`http://localhost:5000/dashboard?email=${email}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        const data = await response.json();

        if (response.ok) {
            apiCountElement.textContent = data.apiCount || 0;
        } else {
            apiCountElement.textContent = "Error fetching data";
            console.error("Error fetching API count:", data.message);
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
            setStatusMessage("Camera started. Ready to register your face.", "info");
            
            // Show/hide buttons
            startCameraBtn.style.display = "none";
        } catch (err) {
            setStatusMessage("Failed to access webcam. Please check permissions.", "error");
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
            setStatusMessage("Camera is not running. Please start the camera first.", "error");
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
    
            setStatusMessage("Registering your face...", "info");
    
            try {
                const response = await fetch("http://localhost:5001/register-face", {
                    method: "POST",
                    body: formData
                });
    
                const data = await response.json();
                if (response.ok) {
                    setStatusMessage("✅ Face registered successfully!", "success");
                    // Update API count display after successful face registration
                    updateApiCountDisplay();
                } else {
                    setStatusMessage(`❌ ${data.error}`, "error");
                }
            } catch (error) {
                console.error("Error registering face:", error);
                setStatusMessage("❌ Server error during registration.", "error");
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
        // Clear session storage
        sessionStorage.removeItem("email");
        sessionStorage.removeItem("role");
        
        // Redirect to login page
        window.location.href = "../index.html";
    }

        // Add the new function here, inside the DOMContentLoaded block
        async function updateApiCountDisplay() {
            try {
                const response = await fetch(`http://localhost:5000/dashboard?email=${email}`);
                const data = await response.json();
                
                if (response.ok) {
                    apiCountElement.textContent = data.apiCount || 0;
                } else {
                    console.error("Error fetching updated API count:", data.message);
                }
            } catch (error) {
                console.error("Failed to update API count:", error);
            }
        }
});

