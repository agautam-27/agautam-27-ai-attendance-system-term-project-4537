document.addEventListener("DOMContentLoaded", async function () {
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

    // Retrieve user email from session storage
    const email = sessionStorage.getItem("email");

    if (!email) {
        window.location.href = "../index.html";
        return;
    }
    
    userEmailElement.textContent = email;
    
    // Event Listeners
    startCameraBtn.addEventListener("click", startWebcam);
    stopCameraBtn.addEventListener("click", stopWebcam);
    captureBtn.addEventListener("click", captureAndRegisterFace);
    logoutBtn.addEventListener("click", logout);

    // Get user API count
    try {
        const response = await fetch(`http://localhost:5000/dashboard?email=${email}`);
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

