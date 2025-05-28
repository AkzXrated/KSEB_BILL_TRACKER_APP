from flask import Flask, render_template, jsonify, request
import os
from datetime import datetime

# Import our KSEB calculation logic
from calculations import calculate_kseb_bill  # Ensure this import is at the top

app = Flask(__name__, static_folder='static', template_folder='.')

# --- Firebase Configuration (REPLACE WITH YOUR ACTUAL CONFIG) ---
FIREBASE_CONFIG = {
    "apiKey": "AIzaSyAPdAtOfpfW6YQYGet8Ow6OjYi4EAUb_N4",
    "authDomain": "kseb-tracker-app.firebaseapp.com",
    "projectId": "kseb-tracker-app",
    "storageBucket": "kseb-tracker-app.firebasestorage.app",
    "messagingSenderId": "246760546625",
    "appId": "1:246760546625:web:470cc5ee3e95d59bb541c0",
    "measurementId": "G-S0BJY7MTBV"
}

# --- Flask Routes ---


@app.route('/')
def index():
    """Serves the main HTML page."""
    return render_template('index.html')


@app.route('/firebase-config', methods=['GET'])
def get_firebase_config():
    """Provides Firebase configuration to the frontend."""
    return jsonify(FIREBASE_CONFIG)

# --- Placeholder API Endpoints (We will fill these in later) ---
# These endpoints will now interact with Firestore via the Python SDK,
# or some logic might be moved directly to the frontend JavaScript.


@app.route('/api/save_daily_reading', methods=['POST'])
def save_daily_reading():
    """Placeholder for saving daily meter readings."""
    return jsonify({"status": "success", "message": "Daily reading endpoint placeholder"})


@app.route('/api/get_latest_daily_reading', methods=['GET'])
def get_latest_daily_reading():
    """Placeholder for getting the most recent daily reading."""
    return jsonify({"status": "success", "message": "Get latest daily reading endpoint placeholder"})


# Changed to POST to send data
@app.route('/api/calculate_estimated_bill', methods=['POST'])
def calculate_estimated_bill():
    """Calculates the estimated bill for the current cycle based on units provided."""
    data = request.get_json()  # Get JSON data from frontend
    units = data.get('units')

    if units is None or not isinstance(units, (int, float)):
        return jsonify({"error": "Invalid or missing 'units' parameter."}), 400

    try:
        bill_details = calculate_kseb_bill(units)
        return jsonify(bill_details)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/generate_official_bill', methods=['POST'])
def generate_official_bill():
    """Placeholder for generating an official bi-monthly bill."""
    return jsonify({"status": "success", "message": "Generate official bill endpoint placeholder"})


@app.route('/api/save_official_bill', methods=['POST'])
def save_official_bill():
    """Placeholder for saving an official bi-monthly bill record."""
    return jsonify({"status": "success", "message": "Save official bill endpoint placeholder"})


@app.route('/api/get_latest_official_bill', methods=['GET'])
def get_latest_official_bill():
    """Placeholder for getting the most recent official bill record."""
    return jsonify({"status": "success", "message": "Get latest official bill endpoint placeholder"})


@app.route('/api/get_daily_usage_data', methods=['GET'])
def get_daily_usage_data():
    """Placeholder for getting daily usage data for charts."""
    return jsonify({"status": "success", "message": "Get daily usage data endpoint placeholder"})


if __name__ == '__main__':
    # Run the Flask development server
    app.run(debug=True)  # debug=True allows automatic reloading on code changes
