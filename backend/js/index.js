require("dotenv").config();
const express = require("express");
const cors = require("cors");
const sendResetEmail = require("./utils/sendEmail"); // Import the sendResetEmail function
const admin = require("firebase-admin");
const jwt = require("jsonwebtoken");
const checkAuth = require("./utils/checkAuth"); // Import the checkAuth middleware for JWT authorization
const messages = require("../messages/lang/en");

//uncomment the line below when you push to github, so then it uses hosted services
// const serviceAccount = require("/etc/secrets/serviceAccountKey.json");

// comment the line out below when u push, when testing locally keep it uncommented 
const serviceAccount = require("../database/serviceAccountKey.json");

const crypto = require("crypto"); 

const bcrypt = require("bcrypt");
const saltRounds = 10;

const tokens = {}; 

const JWT_SECRET = process.env.JWT_SECRET;
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Create Express app instance first
const app = express();

// In index.js, add this before apiStats definition
const endpointNames = {
    "/register": "/API/v1/users/register",
    "/login": "/API/v1/auth/login",
    "/dashboard": "/API/v1/users/dashboard",
    "/admin/stats": "/API/v1/admin/stats",
    "/admin/api-stats": "/API/v1/admin/api-stats",
    "/request-password-reset": "/API/v1/auth/request-reset",
    "/reset-password": "/API/v1/auth/reset",
    "/admin/delete-user": "/API/v1/admin/users/delete",
    "/admin/update-role": "/API/v1/admin/users/update-role",
    "/": "/API/v1/status"
  };


  const apiStats = {
    endpoints: {},
    trackEndpoint: function(method, endpoint) {
        // Map the raw endpoint to a more structured name
        const displayEndpoint = endpointNames[endpoint] || endpoint;
        const key = `${method} ${displayEndpoint}`;
        if (!this.endpoints[key]) {
            this.endpoints[key] = 0;
        }
        this.endpoints[key]++;
    }
};

// Middleware
app.use(cors()); // Allows frontend to connect
app.use(express.json()); // Parses JSON requests

// Add tracking middleware after other middleware
app.use((req, res, next) => {
    apiStats.trackEndpoint(req.method, req.path);
    next();
});

// Test Route
app.get("/", (req, res) => {
    res.send("AI Attendance API is running...");
});

app.post("/register", async (req, res) => {
    try {
        const { email, password, role, name, studentId } = req.body;

        if (!email || !password || !role || !name) {
            return res.status(400).json({ message: messages.requiredFields });
        }

        if (role === "user" && (!studentId)) {
            return res.status(400).json({ message: messages.studentIdRequired });
        }

        const userDoc = await db.collection("users").doc(email).get();
        if (userDoc.exists) {
            return res.status(400).json({ message: messages.userAlreadyExists });
        }

        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const userData = {
            email,
            password: hashedPassword,
            role,
            apiCount: 0,
            name: name
        };

        if (role === "user") {
            userData.studentId = studentId;
        }

        await db.collection("users").doc(email).set(userData);

        res.status(201).json({ message: "User registered successfully!", userId: email });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: messages.requiredFieldsLogin });
        }

        const userDoc = await db.collection("users").doc(email).get();
        if (!userDoc.exists) {
            return res.status(404).json({ message: messages.userNotFound });
        }
        
        const userData = userDoc.data(); 
        
        const isMatch = await bcrypt.compare(password, userData.password);
        

        if (!isMatch) {
            return res.status(401).json({ message: messages.invalidPassword });
        }
        
        // Increment API count
        await db.collection("users").doc(email).update({
            apiCount: admin.firestore.FieldValue.increment(1)
        });

         // change expiration time to any time you want for testing        
        const token = jwt.sign({email: email}, JWT_SECRET, {expiresIn: '60s'});
        
        res.status(200).json({
            token: token,
            message: messages.loginSuccess,
            userId: email,
            email: userData.email,
            role: userData.role,
            apiCount: (userData.apiCount || 0) + 1,
            overQuota: (userData.apiCount || 0) + 1 > 20
        });
        

    } catch (error) {
        console.log("Error in login in index.js: ", error);
        res.status(500).json({ message: messages.errorLoggingIn });
    }
});


app.get("/dashboard", checkAuth, async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({ message: messages.emailRequired });
        }

        const userDoc = await db.collection("users").doc(email).get();
        if (!userDoc.exists) {
            return res.status(404).json({ message: messages.userNotFound });
        }

        const userData = userDoc.data();
        const isAdmin = userData.role === "admin";

        res.status(200).json({
            message: `Welcome ${isAdmin ? "Admin" : "User"}`,
            userId: email,
            email: userData.email,
            role: userData.role,
            apiCount: userData.apiCount
        });
    } catch (error) {
        res.status(500).json({ message: messages.errorUserDetails });
    }
});

app.get("/admin/api-stats", checkAuth, async (req, res) => {
    try {
        const { email } = req.query;

        // Check if user is admin
        const adminDoc = await db.collection("users").doc(email).get();
        if (!adminDoc.exists) {
            return res.status(404).json({ message: messages.adminUserNotFound });
        }

        const adminData = adminDoc.data();
        if (adminData.role !== "admin") {
            return res.status(403).json({ message: messages.unauthorizedAdmin });
        }

        // Format the endpoint stats for display
        const endpointStats = Object.entries(apiStats.endpoints).map(([key, count]) => {
            const [method, endpoint] = key.split(' ');
            return {
                method,
                endpoint,
                count
            };
        });

        res.status(200).json({ endpoints: endpointStats });
    } catch (error) {
        res.status(500).json({ message: messages.apiStatsFail });
    }
});

app.get("/admin/stats",  checkAuth, async (req, res) => {
    try {
        const { email } = req.query;

        // Check if user is admin
        const adminDoc = await db.collection("users").doc(email).get();
        if (!adminDoc.exists) {
            return res.status(404).json({ message: messages.adminUserNotFound});
        }

        const adminData = adminDoc.data();
        if (adminData.role !== "admin") {
            return res.status(403).json({ message: messages.unauthorizedAdmin });
        }

        // Fetch all users
        const snapshot = await db.collection("users").get();
        const usageData = [];

        snapshot.forEach(doc => {
            const user = doc.data();
            usageData.push({
                username: user.name || 'Unknown',  // Added username
                email: user.email,
                token: user.password ? user.password.substring(0, 10) + '...' : 'No token',  // Using password hash as token for demo
                apiCount: user.apiCount || 0,
                role: user.role
            });
        });

        res.status(200).json({ users: usageData });
    } catch (error) {
        res.status(500).json({ message: messages.failedToFetchAdminStats });
    }
});


// Route to handle forgot password and generate token
app.post("/request-password-reset", async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: messages.emailRequired });
    }

    const userDoc = await db.collection("users").doc(email).get();
    if (!userDoc.exists) {
        return res.status(404).json({ message: messages.noEmailExists });
    }

    // Generate a random token
    const token = crypto.randomBytes(20).toString("hex");

    // Set token and expiry in Firestore
    await db.collection("users").doc(email).update({
        resetToken: token,
        resetTokenExpiry: Date.now() + 3600000 // valid for 1 hour
    });

    // Simulate sending email (for bonus: display this on frontend)
    // const resetLink = `https://face-detection-attendance4537.netlify.app//frontend/pages/resetpassword.html?token=${token}&email=${email}`;
    // const resetLink = `https://face-detection-attendance4537.netlify.app/frontend/pages/resetpassword.html?token=${token}&email=${email}`;
    // const resetLink = `https://face-detection-attendance4537.netlify.app/frontend/pages/resetpassword.html?token=${token}&email=${email}`;
    const resetLink = `https://face-detection-attendance4537.netlify.app/resetpassword.html?token=${token}&email=${email}`;

    // const resetLink = `/resetpassword.html?token=${token}&email=${email}`;
    console.log("RESET LINK (Send via email):", resetLink);

    const emailResponse = await sendResetEmail(email, resetLink);
    if(emailResponse.success){
        return res.status(200).json({ message: messages.passwordEmailSent });
    } else{
        return res.status(500).json({ message: messages.errorSendingEmail });
    }
});

app.post("/reset-password", async (req, res) => {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
        return res.status(400).json({ message: messages.allFieldsRequired });
    }

    const userRef = db.collection("users").doc(email);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
        return res.status(404).json({ message: messages.userNotFound });
    }

    const userData = userDoc.data();

    // Check if token is valid and not expired
    if (
        !userData.resetToken ||
        userData.resetToken !== token ||
        !userData.resetTokenExpiry ||
        Date.now() > userData.resetTokenExpiry
    ) {
        return res.status(400).json({ message: messages.invalidResetLink });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and remove the reset token fields
    await userRef.update({
        password: hashedPassword,
        resetToken: admin.firestore.FieldValue.delete(),
        resetTokenExpiry: admin.firestore.FieldValue.delete(),
    });

    res.status(200).json({ message: messages.passwordResetSuccess });
});

app.delete("/admin/delete-user", checkAuth, async (req, res) => {
    try {
        const { adminEmail, userEmail } = req.body;

        // Verify admin
        const adminDoc = await db.collection("users").doc(adminEmail).get();
        if (!adminDoc.exists || adminDoc.data().role !== "admin") {
            return res.status(403).json({ message: messages.unauthorizedAdmin });
        }

        // Check if user exists
        const userDoc = await db.collection("users").doc(userEmail).get();
        if (!userDoc.exists) {
            return res.status(404).json({ message: messages.userNotFound });
        }

        // Delete user
        await db.collection("users").doc(userEmail).delete();
        res.status(200).json({ message: messages.userDeleted(userEmail) });

    } catch (error) {
        res.status(500).json({ message: messages.errorDeletingUser, error: error.message });
    }
});

app.patch("/admin/update-role",  checkAuth, async (req, res) => {
    try {
        const { adminEmail, userEmail } = req.body;

        // Verify admin
        const adminDoc = await db.collection("users").doc(adminEmail).get();
        if (!adminDoc.exists || adminDoc.data().role !== "admin") {
            return res.status(403).json({ message: messages.unauthorizedAdmin });
        }

        // Check if user exists
        const userDoc = await db.collection("users").doc(userEmail).get();
        if (!userDoc.exists) {
            return res.status(404).json({ message: messages.userNotFound });
        }

        // Update role
        await db.collection("users").doc(userEmail).update({ role: "admin" });
        res.status(200).json({ message: messages.userUpdatedToAdmin(userEmail) });

    } catch (error) {
        res.status(500).json({ message: messages.errorUpdatingRole, error: error.message });
    }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));