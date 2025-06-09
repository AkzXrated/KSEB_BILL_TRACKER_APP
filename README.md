# ⚡ KSEB Bill Tracker  
**Your Smart Companion for KSEB Electricity Consumption in Kerala!**

![GitHub last commit](https://img.shields.io/github/last-commit/AkzXrated/KSEB_BILL_TRACKER_APP)
![GitHub top language](https://img.shields.io/github/languages/top/AkzXrated/KSEB_BILL_TRACKER_APP)
![GitHub repo size](https://img.shields.io/github/repo-size/AkzXrated/KSEB_BILL_TRACKER_APP)
![GitHub contributors](https://img.shields.io/github/contributors/AkzXrated/KSEB_BILL_TRACKER_APP)

---

**KSEB Bill Tracker** is a modern, intuitive web application designed to empower KSEB consumers in Kerala to actively monitor their daily electricity usage and estimate their bi-monthly bills. Say goodbye to bill surprises and gain complete control over your energy consumption habits!

---

## ✨ Key Features Implemented So Far

### ✅ Seamless User Authentication
- **Google Sign-in**: Securely log in using your Google account.
- **Anonymous Access**: Start tracking without signing in immediately.
- Data is securely managed using **Firebase Authentication** and **Firestore**.

### 🖥️ Intuitive Landing Experience
- Clean, focused single-column authentication screen.

### 🔢 Daily Meter Reading Input
- Record daily readings to build a rich consumption history.

### ⚡ Real-time Estimated Bill Calculation
- Bi-monthly bill estimates based on actual usage and **KSEB's tariff structure**.

### 📊 Comprehensive Bill Comparison & Insights
- **Previous Bill Comparison**
- **Average Bill Analysis**
- **Deviation from Actual Bill**

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

### 💬 Dynamic User Interface Feedback
- Real-time alerts, notifications, and warnings.

### 📱 Refined & Responsive Layout
- Two-column layout for tracking, full-width sections for deep-dive analytics.
- Mobile-friendly and accessible.

### 📈 Interactive Daily Usage Chart
- Line chart with:
  - **Average daily consumption** line
  - **Missing data handling** via `spanGaps`
  - **Zoom and Pan** (mouse, touch gestures)
  - **Reset Zoom** button

### 🧾 Bi-Monthly Bill Summary Chart
- Bar chart showing past consumption and actual billed amounts.

---

## 🚀 Getting Started

### Clone the Repository
```bash
git clone https://github.com/AkzXrated/KSEB_BILL_TRACKER_APP.git
cd kseb-bill-tracker
````

### 🔧 Backend Setup (Python/Flask)

1. Ensure Python 3.8+ is installed.

2. Install dependencies:

   ```bash
   pip install Flask python-dotenv firebase-admin
   ```

3. Create a Firebase Project via [Firebase Console](https://console.firebase.google.com/).

4. Download the Firebase Admin SDK key (JSON) and place it in the project root as `firebase_credentials.json`.

5. Add your Firebase client config in `app.py`:

> ⚠️ **Important**: Do **not** expose your real Firebase credentials in public repositories. Always replace them with placeholders or use environment variables.

```python
FIREBASE_CONFIG = {
    "apiKey": "YOUR_FIREBASE_API_KEY_HERE",
    "authDomain": "YOUR_FIREBASE_AUTH_DOMAIN",
    "projectId": "YOUR_FIREBASE_PROJECT_ID",
    "storageBucket": "YOUR_FIREBASE_STORAGE_BUCKET",
    "messagingSenderId": "YOUR_FIREBASE_MESSAGING_SENDER_ID",
    "appId": "YOUR_FIREBASE_APP_ID",
    "measurementId": "YOUR_FIREBASE_MEASUREMENT_ID"
}
```

Alternatively, load these values from a `.env` file using `python-dotenv`.

6. Run the Flask App:

```bash
python app.py
```

Access the app at: [http://127.0.0.1:5000](http://127.0.0.1:5000)

---

### 🧩 Frontend Setup

* Uses **HTML5**, **Tailwind CSS**, and **JavaScript**
* Ensure:

  * `index.html` is inside the Flask `templates` folder
  * `script.js` and other assets go in the `static` folder

---

## 🛠️ Technologies Used

**Frontend:**
`HTML5`, `CSS3 (Tailwind via CDN)`, `JavaScript`, `Chart.js`, `Chart.js Zoom Plugin`, `Flatpickr.js`, `Font Awesome`

**Backend:**
`Python (Flask)`

**Database & Auth:**
`Firebase Firestore`, `Firebase Authentication`

**Dev Environment:**
Windows 11 & Ubuntu

---

## 💡 What's Next? (Future Enhancements)

* 🔍 **Advanced Usage Analytics**
* 📚 **Comprehensive Records Viewing**
* 📈 **Improved Bill Prediction Models**
* 👤 **User Profiles & Settings**
* 🌐 **Offline Support / PWA**

---

## 🤝 Contributing

We welcome your contributions!
Feel free to:

* Open issues
* Submit feature requests
* Create pull requests
  Visit the [Issues](https://github.com/AkzXrated/KSEB_BILL_TRACKER_APP/issues) tab to get started.

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](./LICENSE) file for details.

---

## 👨‍💻 About the Developer

Made with ❤️ in **Kannur, Kerala, India**.

