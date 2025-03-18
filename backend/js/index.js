require("dotenv").config();
const express = require("express");
const cors = require("cors");

const admin = require("firebase-admin");
const serviceAccount = require("./../database/serviceAccountKey.json"); 

const bcrypt = require("bcrypt");
const saltRounds = 10;


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
        const { email, password, role } = req.body;

        if (!email || !password || !role) {
            return res.status(400).json({ message: "Email, password, and role are required." });
        }

        
        const userDoc = await db.collection("users").doc(email).get();
        if (userDoc.exists) {
            return res.status(400).json({ message: "User already exists." });
        }

        const hashedPassword = await bcrypt.hash(password, saltRounds);

        await db.collection("users").doc(email).set({
            email,
            password: hashedPassword,
            role,
            apiCount: 0, 
        });

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
            apiCount: (userData.apiCount || 0) + 1
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



// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
