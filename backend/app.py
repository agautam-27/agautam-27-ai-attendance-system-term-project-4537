import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import firebase_admin
from firebase_admin import credentials, firestore
from ultralytics import YOLO

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # 🔹 Allow all frontend requests

# Load the model 
model = YOLO("yolov8n.pt")  

# Initialize Firebase
# cred = credentials.Certificate("serviceAccountKey.json")
cred = credentials.Certificate("database/serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

@app.route("/detect", methods=["POST"])
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
        return jsonify({"error": str(e)}), 500  # 🔹 Ensure proper error response

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))  # fallback to 5000
    app.run(host="0.0.0.0", port=port)
