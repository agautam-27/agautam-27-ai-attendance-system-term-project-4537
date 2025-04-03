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
from datetime import datetime
import time  # For performance monitoring

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
# cred = credentials.Certificate("serviceAccountKey.json") #keep this line uncomment when want to push changes
cred = credentials.Certificate("database/serviceAccountKey.json") #keep this comment only , only uncomment when testing local host
firebase_admin.initialize_app(cred)
db = firestore.client()

# Global configuration
FACE_RECOGNITION_TOLERANCE = 0.6  # Default is 0.6, lower is more strict, higher is more lenient
MODEL_CONFIDENCE = 0.5  # Confidence threshold for YOLO model

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
        results = model.predict(source=img, conf=MODEL_CONFIDENCE, verbose=False)  # Added confidence threshold

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
        face_locations = face_recognition.face_locations(rgb_img)
        if len(face_locations) == 0:
            return jsonify({"error": "No face found in image."}), 400
            
        # Get the encoding of the first face found
        encodings = face_recognition.face_encodings(rgb_img, face_locations)
        if len(encodings) == 0:
            return jsonify({"error": "Failed to encode face."}), 400

        # Save to Firestore
        db.collection("face_encodings").document(email).set({
            "encoding": encodings[0].tolist()  # convert NumPy array to list
        })
        
        # Update API count after successful face registration
        try:
            db.collection("users").document(email).update({
                "apiCount": firestore.Increment(1)
            })
        except Exception as user_e:
            print(f"Warning: Could not update API count: {user_e}")
            # Continue with registration even if API count update fails

        return jsonify({"message": "Face registered successfully!"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/verify-face", methods=["POST"])
@swag_from({
    "tags": ["Face Verification"],
    "summary": "Verify multiple faces against registered faces",
    "description": "Upload an image to verify all faces in the image against registered users",
    "parameters": [
        {
            "name": "image",
            "in": "formData",
            "type": "file",
            "required": True,
            "description": "Image file containing faces to verify"
        }
    ],
    "responses": {
        "200": {
            "description": "Face verification result",
            "schema": {
                "type": "object",
                "properties": {
                    "match": {"type": "boolean"},
                    "matched_users": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "email": {"type": "string"},
                                "name": {"type": "string"},
                                "studentId": {"type": "string"}
                            }
                        }
                    },
                    "total_faces_detected": {"type": "integer"},
                    "total_matches": {"type": "integer"},
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
    start_time = time.time()
    try:
        file = request.files.get("image")
        if not file:
            return jsonify({"error": "Image required"}), 400

        img_bytes = np.frombuffer(file.read(), np.uint8)
        img = cv2.imdecode(img_bytes, cv2.IMREAD_COLOR)
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        # OPTIMIZATION: Set model parameters
        # Detect face locations with optimized parameters
        # Using the 'hog' model which is faster than 'cnn'
        face_locations = face_recognition.face_locations(rgb_img, model="hog")
        print(f"Face detection took {time.time() - start_time:.2f} seconds")
        
        if not face_locations:
            return jsonify({"error": "No faces found in image."}), 400

        # Encode faces - using already detected locations for efficiency
        face_encodings = face_recognition.face_encodings(rgb_img, face_locations)
        print(f"Face encoding took {time.time() - start_time:.2f} seconds")
        
        if not face_encodings:
            return jsonify({"error": "Failed to encode faces."}), 400

        # Get all saved encodings from Firestore
        start_db_time = time.time()
        saved_faces = list(db.collection("face_encodings").stream())
        if not saved_faces:
            return jsonify({"error": "No registered faces found in database."}), 404
        print(f"Database fetch took {time.time() - start_db_time:.2f} seconds")

        # Prepare a dictionary of saved encodings
        saved_encodings = {}
        for doc in saved_faces:
            email = doc.id
            data = doc.to_dict()
            saved_encodings[email] = np.array(data["encoding"])

        # For storing matched users
        matched_users = []
        matched_emails = set()  # To prevent duplicates
        
        # Get current date
        today = datetime.now().strftime("%Y-%m-%d")

        # OPTIMIZATION: Batch comparison
        # Convert saved_encodings to a list for batch processing
        emails = list(saved_encodings.keys())
        known_face_encodings = [saved_encodings[email] for email in emails]
        
        # Compare each detected face against all saved faces
        compare_start = time.time()
        for i, face_encoding in enumerate(face_encodings):
            # This does all comparisons at once with a specified tolerance
            matches = face_recognition.compare_faces(known_face_encodings, face_encoding, tolerance=FACE_RECOGNITION_TOLERANCE)
            
            # Find matches
            for j, match in enumerate(matches):
                if match and emails[j] not in matched_emails:
                    email = emails[j]
                    matched_emails.add(email)  # Prevent duplicate matches
                    
                    # Get user data from Firestore
                    user_data = None
                    name = "Unknown"
                    student_id = ""
                    
                    try:
                        # Get the user document directly by email
                        user_doc = db.collection("users").document(email).get()
                        
                        if user_doc.exists:
                            user_data = user_doc.to_dict()
                            name = user_data.get("name", "Unknown")
                            student_id = user_data.get("studentId", "")
                            
                            # Update API count for this user
                            db.collection("users").document(email).update({
                                "apiCount": firestore.Increment(1)
                            })
                        else:
                            # As a fallback, try querying by email field
                            user_query = db.collection("users").where("email", "==", email).limit(1).get()
                            
                            if user_query and len(user_query) > 0:
                                user_data = user_query[0].to_dict()
                                name = user_data.get("name", "Unknown")
                                student_id = user_data.get("studentId", "")
                                
                                # Update API count for this user
                                query_doc = user_query[0].reference
                                query_doc.update({
                                    "apiCount": firestore.Increment(1)
                                })
                            else:
                                name = email  # Use email as fallback
                    except Exception as e:
                        print(f"Error getting user data: {e}")
                    
                    # Add to matched users with full user info
                    matched_users.append({
                        "email": email,
                        "name": name,
                        "studentId": student_id
                    })
                    
                    # Create a valid document ID using student ID if available
                    doc_id = student_id if student_id and student_id.strip() else email
                    
                    # Log attendance for this user with additional info
                    try:
                        attendance_data = {
                            "email": email,
                            "name": name,
                            "studentId": student_id,
                            "date": today,
                            "timestamp": firestore.SERVER_TIMESTAMP
                        }
                        
                        db.collection("attendance").document(doc_id).set(attendance_data)
                    except Exception as e:
                        print(f"Error saving attendance: {e}")
                        
        print(f"Face comparison took {time.time() - compare_start:.2f} seconds")
        print(f"Total verification time: {time.time() - start_time:.2f} seconds")

        if matched_users:
            return jsonify({
                "match": True,
                "matched_users": matched_users,
                "total_faces_detected": len(face_encodings),
                "total_matches": len(matched_users)
            })
        else:
            return jsonify({
                "match": False,
                "message": "No matching faces found.",
                "total_faces_detected": len(face_encodings)
            })

    except Exception as e:
        print(f"Error in verify_face: {e}")
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
                    "matched_users": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "email": {"type": "string"},
                                "name": {"type": "string"},
                                "studentId": {"type": "string"}
                            }
                        }
                    },
                    "total_faces_detected": {"type": "integer"},
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

        # OPTIMIZATION: Same as in verify_face
        # Use 'hog' model which is faster
        face_locations = face_recognition.face_locations(rgb_img, model="hog")
        if not face_locations:
            return jsonify({"error": "No faces found."}), 400

        # Encode all faces in the image
        face_encodings = face_recognition.face_encodings(rgb_img, face_locations)
        
        # Get all saved encodings from Firestore
        saved_faces = list(db.collection("face_encodings").stream())
        
        # OPTIMIZATION: Batch comparison approach
        # Prepare lists for batch processing
        emails = []
        known_face_encodings = []
        
        for doc in saved_faces:
            email = doc.id
            data = doc.to_dict()
            emails.append(email)
            known_face_encodings.append(np.array(data["encoding"]))
            
        # For storing matched users
        matched_users = []
        matched_emails = set()  # To prevent duplicates
        
        # Compare each detected face against all saved faces at once
        for face_encoding in face_encodings:
            matches = face_recognition.compare_faces(known_face_encodings, face_encoding, tolerance=FACE_RECOGNITION_TOLERANCE)
            
            # Process matches
            for i, match in enumerate(matches):
                if match and emails[i] not in matched_emails:
                    email = emails[i]
                    matched_emails.add(email)
                    
                    # Get user data from Firestore
                    try:
                        user_doc = db.collection("users").document(email).get()
                        
                        if user_doc.exists:
                            user_data = user_doc.to_dict()
                            name = user_data.get("name", "Unknown")
                            student_id = user_data.get("studentId", "")
                        else:
                            # If not found, use email as name
                            name = email
                            student_id = ""
                    except Exception as e:
                        print(f"Error getting user data: {e}")
                        name = email  # Use email as fallback
                        student_id = ""
                        
                    matched_users.append({
                        "email": email,
                        "name": name,
                        "studentId": student_id
                    })
                    
        if matched_users:
            return jsonify({
                "match": True,
                "matched_users": matched_users,
                "total_faces_detected": len(face_encodings)
            })
        else:
            return jsonify({
                "match": False, 
                "message": "No matching faces found.",
                "total_faces_detected": len(face_encodings)
            })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port)