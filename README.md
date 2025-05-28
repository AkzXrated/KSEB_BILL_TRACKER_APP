# ⚡ KSEB Bill Tracker: Your Smart Electricity Companion 🏡

![GitHub last commit](https://img.shields.io/github/last-commit/AkzXrated/KSEB_BILL_TRACKER_APP)
![GitHub top language](https://img.shields.io/github/languages/top/AkzXrated/KSEB_BILL_TRACKER_APP)
![GitHub repo size](https://img.shields.io/github/repo-size/AkzXrated/KSEB_BILL_TRACKER_APP)
![GitHub contributors](https://img.shields.io/github/contributors/AkzXrated/KSEB_BILL_TRACKER_APP)

Welcome to the **KSEB Bill Tracker**, a personal web application designed to help KSEB consumers in Kerala, India, effortlessly monitor their electricity consumption and get estimated bill calculations. Say goodbye to bill surprises! 👋

This project is a full-stack application built with Flask (Python) for the backend and a modern JavaScript frontend powered by Firebase for data persistence.

---

## ✨ Features

* **⚡ Daily Meter Readings:** Easily log your daily electricity meter readings.
* **📊 Real-time Estimated Bill:** Get an instant, accurate estimate of your current bi-monthly bill based on your accumulated readings.
* **🗓️ Bill Cycle Tracking:** Automatically tracks your current bi-monthly billing cycle.
* **💸 Official Bill Finalization:** Record your actual official KSEB bills for historical tracking.
* **📈 Bill Comparison:** See how your current estimated bill compares to your past bi-monthly averages.
* **🔒 Secure Data Storage:** Your reading data is securely stored in Google Firebase Firestore.

---

## ⚠️ Important Note on Tariff Calculation

This application's bill calculation logic is **strictly based on the publicly available tariff details provided on [https://bills.kseb.in/](https://bills.kseb.in/) for the **Domestic (LT-IA) consumer category only**. It currently **does not support** other tariff categories or special rates. Future updates may include support for additional tariff types if required. Please refer to official KSEB sources for definitive bill amounts.

---

## 🛠️ Technologies Used

### Frontend
* **HTML5:** For structuring the web content.
* **CSS (Tailwind CSS):** For rapid and responsive UI design.
* **JavaScript:** For all client-side logic, interactivity, and dynamic updates.
* **Firebase SDK:** For real-time data storage (Firestore) and user authentication (Auth).

### Backend
* **Python:** The core programming language.
* **Flask:** A lightweight Python web framework for handling API requests and serving the frontend.
* **`calculations.py`:** A dedicated module for precise KSEB tariff calculations.

---

## 🚀 Getting Started

To get this project up and running on your local machine, follow these steps:

### Prerequisites

* Python 3.x installed.
* `pip` (Python package installer).
* A Firebase Project set up with Firestore enabled and Web App configured. You'll need its `apiKey`, `authDomain`, `projectId`, etc.
* Git installed on your system.

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/AkzXrated/KSEB_BILL_TRACKER_APP.git](https://github.com/AkzXrated/KSEB_BILL_TRACKER_APP.git)
    cd KSEB_BILL_TRACKER_APP
    ```

2.  **Create and activate a Python virtual environment:**
    * **Linux/macOS:**
        ```bash
        python3 -m venv venv
        source venv/bin/activate
        ```
    * **Windows:**
        ```bash
        python -m venv venv
        .\venv\Scripts\activate
        ```

3.  **Install backend dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Configure Firebase:**
    * Open `app.py`.
    * Locate the `FIREBASE_CONFIG` dictionary.
    * Replace the placeholder values with your actual Firebase project's web app configuration details.
        ```python
        FIREBASE_CONFIG = {
          "apiKey": "YOUR_API_KEY",
          "authDomain": "YOUR_PROJECT_ID.firebaseapp.com",
          "projectId": "YOUR_PROJECT_ID",
          "storageBucket": "YOUR_PROJECT_ID.appspot.com",
          "messagingSenderId": "YOUR_SENDER_ID",
          "appId": "YOUR_APP_ID",
          "measurementId": "YOUR_MEASUREMENT_ID"
        }
        ```
    * **Note:** These are client-side public keys and are safe to be in your code. Ensure your Firebase Firestore Security Rules are set up to properly secure user data (e.g., `allow read, write: if request.auth.uid == resource.data.userId;`).

5.  **Run the Flask backend server:**
    ```bash
    flask run
    # Or simply: python app.py (if you prefer)
    ```
    The server will typically run on `http://127.0.0.1:5000/`.

6.  **Open in your browser:**
    Navigate to `http://127.0.0.1:5000/` in your web browser.

---

## 💡 How to Use

1.  **Add Daily Readings:** On the main interface, input your current meter reading and the date. Click "Add Reading."
2.  **View Estimated Bill:** The system will automatically calculate and display your estimated bill for the current bi-monthly cycle.
3.  **Finalize Official Bill:** When your official KSEB bill arrives, enter the end date of that bill cycle and the actual amount. This helps track your historical spending and provides a basis for comparison.
4.  **Bill Comparison:** See how your estimated and actual bills stack up against your historical averages.

---

## 📊 KSEB Tariff Structure (Domestic - LT-IA)

The `calculations.py` module accurately implements the bi-monthly (60-day) tariff structure for domestic consumers in Kerala, based on current KSERC regulations (as of last update).

### Fixed Charges (FC)

| Consumption Slab (Bi-monthly Units) | Fixed Charge (₹) |
| :---------------------------------- | :--------------- |
| 0 - 100                             | 99.50            |
| 101 - 200                           | 169.00           |
| 201 - 300                           | 209.00           |
| 301 - 400                           | 279.00           |
| 401 - 500                           | 318.50           |
| 501 - 600                           | 437.00           |
| 601 - 700                           | 542.00           |
| 701 - 800                           | 636.50           |
| 801 - 900                           | 720.00           |
| 901 - 1000                          | 800.00           |
| 1001+                               | 875.00           |

### Energy Charges (EC) Per Unit

| Consumption Slab (Bi-monthly Units) | Rate (₹/unit) |
| :---------------------------------- | :------------ |
| 0 - 80                              | 3.75          |
| 81 - 120                            | 4.80          |
| 121 - 200                           | 6.40          |
| 201 - 300                           | 7.60          |
| 301 - 400                           | 8.10          |
| 401 - 500                           | 8.50          |
| 501 - 600                           | 9.00          |
| 601 - 700                           | 9.20          |
| 701 - 800                           | 9.40          |
| 801 - 900                           | 9.60          |
| 901 - 1000                          | 9.80          |
| 1001+                               | 10.00         |

### Other Charges/Subsidies

* **Electricity Duty:** 10% on Fixed Charge + Energy Charge
* **Fuel Surcharge:** ₹0.05 per unit
* **Meter Rent:** ₹6.00 per bill
* **FC Subsidy:** -₹40.00 for consumption $\le$ 120 units
* **EC Subsidy:** -₹6.00 for consumption $\le$ 40 units (specific calculation based on units)

---

## 🛣️ Future Plans & Roadmap

We have exciting plans to enhance the KSEB Bill Tracker! Here's a glimpse of what's coming:

* **Graphical Usage Analytics:** 📈 Implement charts and graphs to visualize daily, weekly, and monthly electricity consumption trends. This will provide deeper insights into usage patterns.
* **Daily Consumption Warnings:** 🔔 Develop smart alerts that notify users if their daily consumption puts them on track to exceed specific slab limits, helping them manage usage proactively.
* **Predictive Bill Forecasting:** 🔮 Utilize historical data to predict future bill amounts more accurately based on ongoing consumption trends.
* **User Accounts & Profiles:** 👤 Allow users to create dedicated accounts to manage their data more robustly (currently uses anonymous Firebase auth, which will be maintained for simplicity until a more robust system is needed).
* **Multiple Meter Support:** 🏡 Feature to track consumption for more than one electricity meter.
* **Notification System:** 📧 SMS/Email reminders for meter reading submission or bill finalization.

---

## 🤝 Contributing

Contributions are always welcome! If you have ideas for new features, bug fixes, or improvements, please feel free to:

1.  Fork this repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name` or `bugfix/your-bug-fix`).
3.  Make your changes.
4.  Commit your changes (`git commit -m 'feat: Add new feature X'`).
5.  Push to your branch (`git push origin feature/your-feature-name`).
6.  Open a Pull Request.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---

Developed in Kerala, India. 🇮🇳

**Last Updated:** May 28, 2025
