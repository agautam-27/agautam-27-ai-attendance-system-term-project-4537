const messages = {
    // Admin messages
    unauthorized: "Unauthorized. Please log in as admin.",
    errorFetchingData: "Error fetching user data.",
    failedFetchStats: "Failed to fetch stats.",
    failedFetchApiStats: "Failed to fetch API stats.",
    webcamStarted: "Webcam started. Ready to capture.",
    failedWebcamAccess: "Failed to access webcam.",
    facesDetected: "Faces detected: ",
    noRegisteredStudents: "Faces detected but no registered students found.",
    noFacesDetected: "No faces detected in the image.",
    errorAttendanceCheck: "Error during attendance check.",
    confirmDeleteUser: "Are you sure you want to delete {email}?",
    confirmMakeAdmin: "Are you sure you want to make {email} an admin?",
    failedDeleteUser: "Failed to delete user.",
    failedUpdateRole: "Failed to update user role.",

    // Reset password messages
    invalidResetLink: "Invalid reset link.",
    passwordResetSuccess: "Password reset successful! Redirecting to login...",
    resetFailed: "Reset failed.",
    resetError: "❌ Something went wrong. Try again later.",

    // Registration & Login messages
    registrationSuccess: "Registration successful! Please log in.",
    registrationFailed: "Registration failed.",
    connectionError: "Connection error. Please try again later.",
    loginFailed: "Login failed. Please check your credentials.",
    exceededQuota: "You've exceeded your free 20 API calls. Service will continue, but please be aware.",

    // Forgot password messages
    resetEmailSent: "Password reset email sent! Please check your inbox.",
    resetEmailFailed: "Failed to send reset email.",

    // User page messages
    cameraStarted: "Camera started. Ready to register your face.",
    failedWebcamAccess: "Failed to access webcam. Please check permissions.",
    cameraNotRunning: "Camera is not running. Please start the camera first.",
    registeringFace: "Registering your face...",
    faceRegistered: "✅ Face registered successfully!",
    faceRegistrationError: "❌ Server error during registration.",
    logoutSuccess: "Logged out successfully.",
    apiCountError: "Error fetching API count.",
    apiCountUpdateError: "Failed to update API count.",
};

export default messages;
