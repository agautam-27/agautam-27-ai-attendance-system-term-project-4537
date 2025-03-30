require("dotenv").config();
const express = require("express");
const cors = require("cors");
const sendResetEmail = require("./utils/sendEmail"); // Import the sendResetEmail function
const admin = require("firebase-admin");

//uncomment the line below when you push to github, so then it uses hosted services
const serviceAccount = require("/etc/secrets/serviceAccountKey.json");

// comment the line out below when u push, when testing locally keep it uncommented 
//const serviceAccount = require("../database/serviceAccountKey.json");

const crypto = require("crypto"); 


const bcrypt = require("bcrypt");
const saltRounds = 10;

const tokens = {}; 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const app = express();


// Middleware
app.use(cors()); // Allows frontend to connect
app.use(express.json()); // Parses JSON requests

// Test Route
app.get("/", (req, res) => {
    res.send("AI Attendance API is running...");
});

app.post("/register", async (req, res) => {
    try {
        const { email, password, role, name, studentId } = req.body;

        if (!email || !password || !role || !name) {
            return res.status(400).json({ message: "Email, password, name and role are required." });
        }

        if (role === "user" && (!studentId)) {
            return res.status(400).json({ message: "Student ID is required for user registration." });
        }

        const userDoc = await db.collection("users").doc(email).get();
        if (userDoc.exists) {
            return res.status(400).json({ message: "User already exists." });
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
            return res.status(400).json({ message: "Email and password are required." });
        }

        const userDoc = await db.collection("users").doc(email).get();
        if (!userDoc.exists) {
            return res.status(404).json({ message: "User not found." });
        }
        
        const userData = userDoc.data(); 
        
        const isMatch = await bcrypt.compare(password, userData.password);
        

        if (!isMatch) {
            return res.status(401).json({ message: "Invalid password." });
        }
        
        // Increment API count
        await db.collection("users").doc(email).update({
            apiCount: admin.firestore.FieldValue.increment(1)
        });
        
        res.status(200).json({
            message: "Login successful!",
            userId: email,
            email: userData.email,
            role: userData.role,
            apiCount: (userData.apiCount || 0) + 1,
            overQuota: (userData.apiCount || 0) + 1 > 20
        });
        

    } catch (error) {
        res.status(500).json({ message: "Error logging in." });
    }
});


app.get("/dashboard", async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({ message: "Email is required." });
        }

        const userDoc = await db.collection("users").doc(email).get();
        if (!userDoc.exists) {
            return res.status(404).json({ message: "User not found." });
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
        res.status(500).json({ message: "Error fetching user details." });
    }
});

app.get("/admin/stats", async (req, res) => {
    try {
        const { email } = req.query;

        // Check if user is admin
        const adminDoc = await db.collection("users").doc(email).get();
        if (!adminDoc.exists) {
            return res.status(404).json({ message: "Admin user not found." });
        }

        const adminData = adminDoc.data();
        if (adminData.role !== "admin") {
            return res.status(403).json({ message: "Access denied. Admins only." });
        }

        // Fetch all users
        const snapshot = await db.collection("users").get();
        const usageData = [];

        snapshot.forEach(doc => {
            const user = doc.data();
            usageData.push({
                email: user.email,
                role: user.role,
                apiCount: user.apiCount || 0
            });
        });

        res.status(200).json({ users: usageData });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch admin stats." });
    }
});


// Route to handle forgot password and generate token
app.post("/request-password-reset", async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Email is required." });
    }

    const userDoc = await db.collection("users").doc(email).get();
    if (!userDoc.exists) {
        return res.status(404).json({ message: "No account with that email exists." });
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

    console.log("RESET LINK (Send via email):", resetLink);

    const emailResponse = await sendResetEmail(email, resetLink);
    if(emailResponse.success){
        return res.status(200).json({ message: "Password reset email sent successfully." });
    } else{
        return res.status(500).json({ message: "Error sending email." });
    }
});

app.post("/reset-password", async (req, res) => {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
        return res.status(400).json({ message: "All fields are required." });
    }

    const userRef = db.collection("users").doc(email);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
        return res.status(404).json({ message: "User not found." });
    }

    const userData = userDoc.data();

    // Check if token is valid and not expired
    if (
        !userData.resetToken ||
        userData.resetToken !== token ||
        !userData.resetTokenExpiry ||
        Date.now() > userData.resetTokenExpiry
    ) {
        return res.status(400).json({ message: "Reset link is invalid or has expired." });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and remove the reset token fields
    await userRef.update({
        password: hashedPassword,
        resetToken: admin.firestore.FieldValue.delete(),
        resetTokenExpiry: admin.firestore.FieldValue.delete(),
    });

    res.status(200).json({ message: "Password has been successfully reset." });
});

app.delete("/admin/delete-user", async (req, res) => {
    try {
        const { adminEmail, userEmail } = req.body;

        // Verify admin
        const adminDoc = await db.collection("users").doc(adminEmail).get();
        if (!adminDoc.exists || adminDoc.data().role !== "admin") {
            return res.status(403).json({ message: "Unauthorized. Admins only." });
        }

        // Check if user exists
        const userDoc = await db.collection("users").doc(userEmail).get();
        if (!userDoc.exists) {
            return res.status(404).json({ message: "User not found." });
        }

        // Delete user
        await db.collection("users").doc(userEmail).delete();
        res.status(200).json({ message: `User ${userEmail} deleted successfully.` });

    } catch (error) {
        res.status(500).json({ message: "Error deleting user.", error: error.message });
    }
});

app.patch("/admin/update-role", async (req, res) => {
    try {
        const { adminEmail, userEmail } = req.body;

        // Verify admin
        const adminDoc = await db.collection("users").doc(adminEmail).get();
        if (!adminDoc.exists || adminDoc.data().role !== "admin") {
            return res.status(403).json({ message: "Unauthorized. Admins only." });
        }

        // Check if user exists
        const userDoc = await db.collection("users").doc(userEmail).get();
        if (!userDoc.exists) {
            return res.status(404).json({ message: "User not found." });
        }

        // Update role
        await db.collection("users").doc(userEmail).update({ role: "admin" });
        res.status(200).json({ message: `User ${userEmail} is now an admin.` });

    } catch (error) {
        res.status(500).json({ message: "Error updating role.", error: error.message });
    }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
