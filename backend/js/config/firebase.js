const admin = require("firebase-admin");

let serviceAccount;
let auth = null; // Default to null

try {
    serviceAccount = require("../../database/serviceAccountKey.json"); // ✅ Corrected path

    // If the file exists, initialize Firebase
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });

    auth = admin.auth(); // Assign auth only if Firebase is initialized

    console.log("✅ Firebase Admin Initialized.");
} catch (error) {
    console.log("⚠️ Firebase serviceAccountKey.json is missing. Ask your teammate to add it.");
    console.log("⚠️ Firebase not initialized. Waiting for serviceAccountKey.json...");
}

module.exports = auth; // Export auth (null if not initialized)
