from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Flask app
app = Flask(__name__)
CORS(app)

from ultralytics import YOLO

# Load the model 
model = YOLO("yolov8n.pt")  

# Initialize Firebase
cred = credentials.Certificate("database/serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

@app.route("/detect", methods=["POST"])
def detect_faces():
    try:
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
        return jsonify({"error": str(e)})

if __name__ == "__main__":
    app.run(debug=True, port=5001)
