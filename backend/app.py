import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import firebase_admin
from firebase_admin import credentials, firestore
from ultralytics import YOLO
import face_recognition
from flasgger import Swagger, swag_from

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # 🔹 Allow all frontend requests

# Initialize Swagger
swagger_config = {
    "headers": [],
    "specs": [
        {
            "endpoint": "apispec",
            "route": "/apispec.json",
            "rule_filter": lambda rule: True,
            "model_filter": lambda tag: True,
        }
    ],
    "static_url_path": "/flasgger_static",
    "swagger_ui": True,
    "specs_route": "/docs/",
}

swagger = Swagger(app, config=swagger_config)

# Load the model 
model = YOLO("yolov8n.pt")  

# Initialize Firebase
cred = credentials.Certificate("serviceAccountKey.json") #keep this line uncomment when want to push changes
#cred = credentials.Certificate("database/serviceAccountKey.json") #keep this comment only , only uncomment when testing local host
firebase_admin.initialize_app(cred)
db = firestore.client()

@app.route("/detect", methods=["POST"])
@swag_from({
    "tags": ["Face Detection"],
    "summary": "Detect faces in an image",
    "description": "Upload an image to detect all faces using YOLOv8 model",
    "parameters": [
        {
            "name": "image",
            "in": "formData",
            "type": "file",
            "required": True,
            "description": "Image file to detect faces from"
        }
    ],
    "responses": {
        "200": {
            "description": "Faces detected successfully",
            "schema": {
                "type": "object",
                "properties": {
                    "faces_detected": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "x1": {"type": "integer"},
                                "y1": {"type": "integer"},
                                "x2": {"type": "integer"},
                                "y2": {"type": "integer"}
                            }
                        }
                    }
                }
            }
        },
        "400": {
            "description": "Bad request - No image file found"
        },
        "500": {
            "description": "Internal server error"
        }
    }
})
def detect_faces():
    try:
        if "image" not in request.files:
            return jsonify({"error": "No image file found"}), 400

        file = request.files["image"]
        img = np.frombuffer(file.read(), np.uint8)
        img = cv2.imdecode(img, cv2.IMREAD_COLOR)

        # Perform face detection using YOLOv8
        results = model.predict(source=img)

        faces_detected = []
        for r in results:
            for box in r.boxes.xyxy:  # Get bounding boxes
                x1, y1, x2, y2 = map(int, box)
                faces_detected.append({"x1": x1, "y1": y1, "x2": x2, "y2": y2})

        return jsonify({"faces_detected": faces_detected})

    except Exception as e:
        return jsonify({"error": str(e)}), 500 

@app.route("/register-face", methods=["POST"])
@swag_from({
    "tags": ["Face Registration"],
    "summary": "Register a face for a user",
    "description": "Register a face associated with an email for future verification",
    "parameters": [
        {
            "name": "email",
            "in": "formData",
            "type": "string",
            "required": True,
            "description": "Email address of the user"
        },
        {
            "name": "image",
            "in": "formData",
            "type": "file",
            "required": True,
            "description": "Image file containing the face to register"
        }
    ],
    "responses": {
        "200": {
            "description": "Face registered successfully",
            "schema": {
                "type": "object",
                "properties": {
                    "message": {"type": "string"}
                }
            }
        },
        "400": {
            "description": "Bad request - Email or image required, or no face found in image"
        },
        "500": {
            "description": "Internal server error"
        }
    }
})
def register_face():
    try:
        email = request.form.get("email")
        if not email:
            return jsonify({"error": "Email required"}), 400

        file = request.files.get("image")
        if not file:
            return jsonify({"error": "Image required"}), 400

        img_bytes = np.frombuffer(file.read(), np.uint8)
        img = cv2.imdecode(img_bytes, cv2.IMREAD_COLOR)

        # Convert image to RGB (required for face_recognition)
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        # Get face encodings
        encodings = face_recognition.face_encodings(rgb_img)
        if len(encodings) == 0:
            return jsonify({"error": "No face found in image."}), 400

        # Save to Firestore
        db.collection("face_encodings").document(email).set({
            "encoding": encodings[0].tolist()  # convert NumPy array to list
        })

        return jsonify({"message": "Face registered successfully!"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/verify-face", methods=["POST"])
@swag_from({
    "tags": ["Face Verification"],
    "summary": "Verify a face against registered faces",
    "description": "Upload an image to verify if the face matches any registered user",
    "parameters": [
        {
            "name": "image",
            "in": "formData",
            "type": "file",
            "required": True,
            "description": "Image file containing the face to verify"
        }
    ],
    "responses": {
        "200": {
            "description": "Face verification result",
            "schema": {
                "type": "object",
                "properties": {
                    "match": {"type": "boolean"},
                    "email": {"type": "string", "description": "Email of the matched user (if match is true)"},
                    "message": {"type": "string", "description": "Message if no match found (if match is false)"}
                }
            }
        },
        "400": {
            "description": "Bad request - Image required or no face found"
        },
        "500": {
            "description": "Internal server error"
        }
    }
})
def verify_face():
    try:
        file = request.files.get("image")
        if not file:
            return jsonify({"error": "Image required"}), 400

        img_bytes = np.frombuffer(file.read(), np.uint8)
        img = cv2.imdecode(img_bytes, cv2.IMREAD_COLOR)
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        # Encode face from the uploaded image
        uploaded_encodings = face_recognition.face_encodings(rgb_img)
        if not uploaded_encodings:
            return jsonify({"error": "No face found."}), 400

        uploaded_encoding = uploaded_encodings[0]

        # Get all saved encodings from Firestore
        saved_faces = db.collection("face_encodings").stream()

        for doc in saved_faces:
            data = doc.to_dict()
            saved_encoding = np.array(data["encoding"])

            # Compare face using face_recognition
            results = face_recognition.compare_faces([saved_encoding], uploaded_encoding)
            if results[0]:
                # Match found
                email = doc.id

                # Log attendance
                db.collection("attendance").add({
                    "email": email,
                    "timestamp": firestore.SERVER_TIMESTAMP
                })

                return jsonify({"match": True, "email": email})

        return jsonify({"match": False, "message": "No matching face found."})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/check-attendance", methods=["POST"])
@swag_from({
    "tags": ["Attendance"],
    "summary": "Check attendance using face recognition",
    "description": "Upload an image to check if the face matches any registered user for attendance",
    "parameters": [
        {
            "name": "image",
            "in": "formData",
            "type": "file",
            "required": True,
            "description": "Image file containing the face to check for attendance"
        }
    ],
    "responses": {
        "200": {
            "description": "Attendance check result",
            "schema": {
                "type": "object",
                "properties": {
                    "match": {"type": "boolean"},
                    "email": {"type": "string", "description": "Email of the matched user (if match is true)"},
                    "message": {"type": "string", "description": "Message if no match found (if match is false)"}
                }
            }
        },
        "400": {
            "description": "Bad request - Image required or no face found"
        },
        "500": {
            "description": "Internal server error"
        }
    }
})
def check_attendance():
    try:
        file = request.files.get("image")
        if not file:
            return jsonify({"error": "Image required"}), 400

        img_bytes = np.frombuffer(file.read(), np.uint8)
        img = cv2.imdecode(img_bytes, cv2.IMREAD_COLOR)
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        unknown_encodings = face_recognition.face_encodings(rgb_img)
        if not unknown_encodings:
            return jsonify({"match": False, "message": "No face found."}), 400

        unknown_encoding = unknown_encodings[0]

        # Fetch all stored encodings from Firestore
        docs = db.collection("face_encodings").stream()
        for doc in docs:
            data = doc.to_dict()
            known_encoding = np.array(data["encoding"])

            match = face_recognition.compare_faces([known_encoding], unknown_encoding)[0]
            if match:
                return jsonify({"match": True, "email": doc.id})

        return jsonify({"match": False, "message": "No matching face found."})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))  # fallback to 5000
    app.run(host="0.0.0.0", port=port)
