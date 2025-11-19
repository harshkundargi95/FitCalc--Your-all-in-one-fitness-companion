# FitCalc – All-in-One Fitness Companion 🚀

FitCalc is a modern, web-based Single Page Application (SPA) designed to be your comprehensive fitness companion. It seamlessly combines essential health calculators with personalized progress tracking and goal setting into a single, intuitive interface.

## ✨ Key Features

* **Secure Authentication:** User sign-up and login powered by **Firebase Authentication** for a secure experience.
* **Fitness Calculators:**
    * **BMI Calculator:** Calculates Body Mass Index and provides corresponding health categories (Underweight, Normal, Overweight, Obese).
    * **Calorie Calculator (TDEE):** Estimates daily calorie needs based on biometrics and activity level.
    * **Water Intake:** Recommends daily hydration targets based on weight and activity.
    * **Protein Calculator:** Suggests protein intake aligned with specific fitness goals (e.g., Muscle Gain, Maintenance).
* **Progress Tracker:**
    * Log daily weight entries with data integrity checks (prevents logging future dates).
    * Visualizes weight trends over time using an **interactive Chart.js graph**.
    * View and manage a detailed history log.
* **Goal Setting:**
    * Set and track progress toward specific starting and target weights.
    * A visual progress bar shows the percentage completion toward the goal.
    * Dynamic health tips are displayed based on whether the goal is weight loss or gain.
* **Responsive Design:** Fully optimized for mobile, tablet, and desktop devices using **Tailwind CSS**.

## 🛠️ Tech Stack

FitCalc is built as a serverless application utilizing the power of the Google Firebase platform.

| Category | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | HTML5, JavaScript (ES6+) | Core application structure and logic. |
| **Styling** | Tailwind CSS | Utility-first framework for responsive and modern styling. |
| **Visualization** | Chart.js | Interactive and dynamic weight trend charts. |
| **Hosting** | Firebase Hosting | Fast, secure static hosting via Google's global CDN. |
| **Authentication** | Firebase Authentication | User identity and session management. |
| **Database** | Cloud Firestore | Real-time NoSQL database for storing user data (profiles, progress logs, goals). |

## 🌐 Live Deployment

The project is deployed live and securely on Firebase Hosting.

**Live URL:** [https://fitcalc-79278.web.app](https://fitcalc-79278.web.app) *(Note: Replace this with your final live URL)*

## 💻 How to Run Locally

Follow these steps to set up and run the FitCalc application on your local machine.

### Prerequisites

You must have the following installed:

* **Node.js & npm**
* **Firebase CLI** (Install globally via your terminal):
    ```bash
    npm install -g firebase-tools
    ```

### Installation Steps

1.  **Clone the Repository:**
    ```bash
    git clone <your-repository-url>
    cd FitCalc
    ```
2.  **Initialize Firebase:**
    You need to link your local folder to your Firebase project.
    ```bash
    firebase login
    firebase init hosting
    ```
    * Select **"Use an existing project"** and choose your project (`fitcalc-79278`).
    * For **Public directory**, enter: `public`
    * For **Configure as a single-page app**, enter: `No`
    * For **Set up automatic builds with GitHub**, enter: `No`
3.  **Run Local Server:**
    Start a local server to test the app live:
    ```bash
    firebase serve
    ```
    The terminal will provide a local URL (usually `http://localhost:5000`). Open this in your browser.

## 🚀 Deployment Strategy

To deploy your changes to the live website, execute the following command in your project directory:

```bash
firebase deploy --only "hosting,firestore"
```

> **Note:** The `--only "hosting,firestore"` flag ensures only the website code and database security rules are updated, preventing errors related to other, potentially unconfigured, Firebase services like Cloud Functions.

## 🗺️ Future Roadmap

We are constantly working to enhance FitCalc. Here's a look at what's planned:

* **AI Integration:** Plans to integrate **Gemini AI** to provide highly personalized meal plans and workout routines based on user biometrics and progress data (requires upgrade to the Blaze plan).
* **Social Features:** Ability to share progress and achievements with friends.
* **More Metrics:** Tracking for additional body measurements (waist, hips, chest) and body fat percentage calculation.

---
Built with ❤️ for health and fitness.
