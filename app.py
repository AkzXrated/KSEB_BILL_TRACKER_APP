# app.py
from calculations import calculate_kseb_bill
from flask import Flask, render_template, jsonify, request
import os
from datetime import datetime
from dotenv import load_dotenv  # <-- Add this import

# Load environment variables from .env file
load_dotenv()

# Import your KSEB bill calculation logic

app = Flask(__name__, static_folder='static', template_folder='.')

# --- Firebase Configuration (from .env) ---
FIREBASE_CONFIG = {
    "apiKey": os.getenv("FIREBASE_API_KEY"),
    "authDomain": os.getenv("FIREBASE_AUTH_DOMAIN"),
    "projectId": os.getenv("FIREBASE_PROJECT_ID"),
    "storageBucket": os.getenv("FIREBASE_STORAGE_BUCKET"),
    "messagingSenderId": os.getenv("FIREBASE_MESSAGING_SENDER_ID"),
    "appId": os.getenv("FIREBASE_APP_ID"),
    "measurementId": os.getenv("FIREBASE_MEASUREMENT_ID")
}

# --- Flask Routes ---


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/firebase-config', methods=['GET'])
def get_firebase_config():
    return jsonify(FIREBASE_CONFIG)


@app.route('/api/save_daily_reading', methods=['POST'])
def save_daily_reading():
    return jsonify({"status": "success", "message": "Daily reading endpoint placeholder"})


@app.route('/api/get_latest_daily_reading', methods=['GET'])
def get_latest_daily_reading():
    return jsonify({"status": "success", "message": "Get latest daily reading endpoint placeholder"})


@app.route('/api/calculate_estimated_bill', methods=['POST'])
def calculate_estimated_bill():
    data = request.get_json()
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
    return jsonify({"status": "success", "message": "Generate official bill endpoint placeholder"})


@app.route('/api/save_official_bill', methods=['POST'])
def save_official_bill():
    return jsonify({"status": "success", "message": "Save official bill endpoint placeholder"})


@app.route('/api/get_latest_official_bill', methods=['GET'])
def get_latest_official_bill():
    return jsonify({"status": "success", "message": "Get latest official bill endpoint placeholder"})


@app.route('/api/get_daily_usage_data', methods=['GET'])
def get_daily_usage_data():
    return jsonify({"status": "success", "message": "Get daily usage data endpoint placeholder"})


if __name__ == '__main__':
    app.run(debug=True)
