require("dotenv").config();
const express = require("express");
const cors = require("cors");

const auth = require("./config/firebase"); // Import Firebase setup
const admin = require("firebase-admin");
const db = admin.firestore(); // Initialize Firestore

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
        const { email, password, role } = req.body;

        if (!email || !password || !role) {
            return res.status(400).json({ message: "Email, password, and role are required." });
        }

        if (!auth) {
            return res.status(500).json({ message: "Firebase is not initialized. Please try again later." });
        }

        // Create user in Firebase Authentication
        const user = await auth.createUser({
            email,
            password,
        });

        // Store user role in Firestore
        await db.collection("users").doc(user.uid).set({
            email: email,
            role: role,
        });

        res.status(201).json({ message: "User registered successfully!", userId: user.uid });
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

        if (!auth) {
            return res.status(500).json({ message: "Firebase is not initialized. Please try again later." });
        }

        // Get user from Firebase Authentication
        const userRecord = await auth.getUserByEmail(email);
        const userId = userRecord.uid;

        // Fetch user role from Firestore
        const userDoc = await db.collection("users").doc(userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({ message: "User role not found." });
        }

        const userRole = userDoc.data().role;

        res.status(200).json({
            message: "Login successful!",
            userId: userId,
            email: email,
            role: userRole,
        });
    } catch (error) {
        res.status(500).json({ message: "Invalid email or password." });
    }
});

app.get("/dashboard", async (req, res) => {
    try {
        const { email } = req.query; // Get email from request query

        if (!auth) {
            return res.status(500).json({ message: "Firebase is not initialized. Please try again later." });
        }

        if (!email) {
            return res.status(400).json({ message: "Email is required." });
        }

        // Get user details from Firebase
        const userRecord = await auth.getUserByEmail(email);

        // Check if the user is an admin
        const isAdmin = email === "admin@admin.com"; // Simple check

        res.status(200).json({
            message: `Welcome ${isAdmin ? "Admin" : "User"}`,
            userId: userRecord.uid,
            email: userRecord.email,
            role: isAdmin ? "Admin" : "User"
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching user details." });
    }
});

// Start Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
