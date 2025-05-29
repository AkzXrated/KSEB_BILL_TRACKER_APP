# ⚡ KSEB Bill Tracker
![GitHub last commit](https://img.shields.io/github/last-commit/AkzXrated/KSEB_BILL_TRACKER_APP) 
![GitHub top language](https://img.shields.io/github/languages/top/AkzXrated/KSEB_BILL_TRACKER_APP)
![GitHub repo size](https://img.shields.io/github/repo-size/AkzXrated/KSEB_BILL_TRACKER_APP)
![GitHub contributors](https://img.shields.io/github/contributors/AkzXrated/KSEB_BILL_TRACKER_APP)
## Your Smart Companion for KSEB Electricity Consumption in Kerala!

KSEB Bill Tracker is a modern, intuitive web application designed to empower KSEB consumers in Kerala to actively monitor their daily electricity usage and estimate their bi-monthly bills. Say goodbye to bill surprises and gain complete control over your energy consumption habits!

---

### ✨ Key Features Implemented So Far

We've made significant progress in making your electricity tracking seamless and insightful:

* **Seamless User Authentication:**
    * **Google Sign-in:** Securely log in using your existing Google account.
    * **Anonymous Access:** Start tracking quickly without needing to sign in immediately.
    * Your data is privately stored and managed via Firebase, ensuring security and accessibility.
* **Intuitive Landing Experience:** A dedicated, clean, and single-column authentication screen provides a focused entry point into the application.
* **Daily Meter Reading Input:** Easily record your daily meter readings to build a robust history of your consumption.
* **Real-time Estimated Bill Calculation:** Get an up-to-the-minute estimate of your current bi-monthly bill based on your recorded readings and KSEB's tariff structure.
* **Comprehensive Bill Comparison & Insights:**
    * **Previous Bill Comparison:** See how your current usage compares to your last official KSEB bill.
    * **Average Bill Analysis:** Understand your consumption trends by comparing against your historical average bills.
    * **Deviation from Actual Bill:** Upon finalization, easily identify any discrepancies between your estimated and actual KSEB bill amounts.
* **Dynamic User Interface Feedback:** Receive instant, clear notifications and warnings for various actions, ensuring a smooth and informed user experience.
* **Refined & Responsive Layout:** Enjoy a user-friendly interface that elegantly adapts to different screen sizes, featuring a distinct two-column layout for core tracking, followed by full-width sections for detailed operations.

---

### 🚀 Getting Started

To run the KSEB Bill Tracker locally, follow these steps:

1.  **Clone the Repository:**
    ```bash
    git clone [YOUR_GITHUB_REPO_URL_HERE]
    cd kseb-bill-tracker
    ```
2.  **Backend Setup (Python/Flask):**
    * Ensure you have Python installed (preferably Python 3.8+).
    * Install the necessary Python packages:
        ```bash
        pip install Flask python-dotenv firebase-admin
        ```
    * **Firebase Configuration:**
        * Create a Firebase project on the [Firebase Console](https://console.firebase.google.com/).
        * Generate a Firebase service account key file (usually `firebase_credentials.json`) and place it in your Flask application's root directory.
        * (Optional but Recommended): Set up environment variables for your Firebase client-side API keys in a `.env` file, and load them in your Flask `app.py`. Alternatively, ensure your client-side keys are correctly placed in `script.js` (as per previous instructions).
    * Run the Flask application:
        ```bash
        python app.py
        ```
        (Your Flask app will typically run on `http://127.0.0.1:5000`)

3.  **Frontend Setup:**
    * The frontend uses standard HTML, CSS (Tailwind CSS via CDN), and JavaScript.
    * Ensure `index.html` is in your Flask `templates` directory (or served directly if not using templates), and `script.js` is in your `static` folder.

4.  **Access the Application:**
    Open your web browser and navigate to the address where your Flask server is running (e.g., `http://127.0.0.1:5000`).

---

### 🛠️ Technologies Used

* **Frontend:** HTML5, CSS3 (Tailwind CSS via CDN), JavaScript, Flatpickr.js (Date Picker), Font Awesome (Icons)
* **Backend:** Python (Flask)
* **Database & Authentication:** Google Firebase (Firestore for data storage, Authentication for user management)
* **Development Environment:** Windows 11 (User's primary OS), Ubuntu (for development)

---

### 💡 What's Next? (Future Enhancements)

We're excited to bring even more powerful features to the KSEB Bill Tracker:

* **Detailed Usage Analytics:** Visualizations and in-depth insights into your historical electricity consumption patterns.
* **Comprehensive Records Viewing:** A dedicated section to easily view, filter, and manage all your past daily readings and finalized official bills.
* **Advanced Bill Prediction:** More sophisticated models for forecasting future bill amounts based on your usage trends.
* **User Profiles & Settings:** Personalized tariff plan configurations, custom notification preferences, and more.
* **Offline Support:** Exploring options for progressive web app (PWA) features to enhance accessibility.

---

### 🤝 Contributing

Contributions are highly welcome! If you have suggestions, feature requests, or encounter any bugs, please feel free to open an issue or submit a pull request on GitHub.

---

### 📄 License

This project is licensed under the MIT License - see the `LICENSE` file for details.

---

### 👨‍💻 About the Developer

Made with ❤️ in Kannur, Kerala, India.
