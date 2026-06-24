<![CDATA[<div align="center">

# 🏋️ FitCalc — Your All-in-One Fitness Companion

[![Firebase Hosting](https://img.shields.io/badge/Hosted%20on-Firebase-FFCA28?logo=firebase&logoColor=white&style=for-the-badge)](https://fitcalc-79278.web.app)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white&style=for-the-badge)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black&style=for-the-badge)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white&style=for-the-badge)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?logo=chart.js&logoColor=white&style=for-the-badge)](https://www.chartjs.org/)

**A modern, serverless Single Page Application that combines essential health calculators, personalized progress tracking, and goal setting into one sleek, responsive interface.**

[**🚀 Live Demo**](https://fitcalc-79278.web.app) · [**🐛 Report Bug**](../../issues) · [**✨ Request Feature**](../../issues)

---

<img src="public/Image.png" alt="FitCalc — Futuristic fitness dashboard concept" width="600">

</div>

---

## 📋 Table of Contents

- [About the Project](#-about-the-project)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Deployment](#-deployment)
- [Future Roadmap](#-future-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🔍 About the Project

FitCalc was born from the idea that tracking your health shouldn't require juggling between multiple apps. Whether you need to quickly check your BMI, figure out your daily calorie target, or visualize your weight-loss journey over the past month — FitCalc has you covered in a **single tab**.

The entire front-end is built with **zero frameworks** — just vanilla HTML, CSS, and ES6+ JavaScript — while Firebase provides a robust, serverless back-end for authentication, data persistence, and hosting.

---

## ✨ Key Features

### 🔐 Secure Authentication
- Email/password sign-up & login powered by **Firebase Authentication**
- Seamless re-authentication flow for sensitive account changes (email/password updates)
- Animated crossfade transitions between auth forms

### 📊 Fitness Calculators
| Calculator | Description |
|:---|:---|
| **BMI** | Calculates Body Mass Index with color-coded health categories (Underweight, Normal, Overweight, Obese) |
| **Calorie (TDEE)** | Estimates daily calorie needs using the Mifflin-St Jeor equation, factoring in age, gender, height, weight & activity level |
| **Water Intake** | Recommends daily hydration targets based on weight and daily activity minutes |
| **Protein Intake** | Suggests protein goals aligned with fitness objectives (Weight Loss, Maintenance, Muscle Building) |

### 🏠 Personalized Dashboard
- At-a-glance summary cards for **current BMI**, **latest weight**, and **daily caloric needs**
- Animated number counters with eased transitions
- Scroll-triggered reveal animations via Intersection Observer

### 📈 Progress Tracker
- Log daily weight entries with **future-date prevention** for data integrity
- Interactive **Chart.js** line chart with gradient fills and smooth animations
- Full history table with row-by-row entry/exit animations
- Delete individual entries with animated transitions

### 🎯 Goal Setting
- Set starting and target weights with a visual **progress bar**
- Dynamic percentage-based completion tracking
- Contextual health tips — tailored for weight loss vs. weight gain goals
- Health disclaimers for goals targeting underweight/obese BMI ranges

### 👤 Profile & Account Settings
- Manage personal details (Name, Birthdate, Height) with **auto-calculated age**
- Latest weight synced automatically from the Progress Tracker
- Secure credential updates with Firebase re-authentication

### 🎨 Premium Design
- Fully **responsive** — optimized for mobile, tablet, and desktop
- **Dark mode** toggle with `localStorage` preference memory
- Glassmorphism UI elements, smooth page transitions, and micro-animations
- Custom design system built with **CSS Custom Properties** (120+ design tokens)
- Inter font family from Google Fonts
- Toast notification system with success/error/info variants

---

## 🛠️ Tech Stack

| Category | Technology | Purpose |
|:---|:---|:---|
| **Frontend** | HTML5, JavaScript (ES6+ Modules) | Core SPA structure and logic |
| **Styling** | Vanilla CSS (Custom Properties) | Premium design system with dark mode |
| **Visualization** | Chart.js | Interactive weight trend charts |
| **Auth** | Firebase Authentication | User identity & session management |
| **Database** | Cloud Firestore | Real-time NoSQL data store for profiles, progress, and goals |
| **Hosting** | Firebase Hosting | Global CDN with automatic SSL |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      Client (Browser)                    │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌────────┐  │
│  │ index.html│  │  app.js   │  │styles.css│  │Chart.js│  │
│  │  (SPA)   │  │ (ES6 Mod) │  │ (Design  │  │ (CDN)  │  │
│  │          │  │           │  │  System) │  │        │  │
│  └──────────┘  └─────┬─────┘  └──────────┘  └────────┘  │
└──────────────────────┼───────────────────────────────────┘
                       │ Firebase SDK (CDN)
              ┌────────┴────────┐
              ▼                 ▼
   ┌─────────────────┐ ┌──────────────────┐
   │   Firebase Auth  │ │ Cloud Firestore  │
   │  (Email/Password)│ │  (NoSQL DB)      │
   └─────────────────┘ └──────────────────┘
                                │
                       ┌────────┴────────┐
                       ▼                 ▼
              ┌──────────────┐  ┌──────────────┐
              │  /users/{uid}│  │  /goals/     │
              │  /progress/  │  │  /userData/  │
              └──────────────┘  └──────────────┘
```

---

## 📂 Project Structure

```
FitCalc/
├── public/                           # Hosted static files
│   ├── index.html                    # Single-page app entry point
│   ├── app.js                        # Application logic & Firebase integration
│   ├── styles.css                    # Complete CSS design system
│   ├── firebase-config.js            # Firebase credentials (gitignored)
│   ├── firebase-config.example.js    # Config template for new developers
│   └── Image.png                     # Hero/banner image
│
├── firebase.json                     # Firebase hosting config
├── .firebaserc                       # Firebase project alias (fitcalc-79278)
├── .gitignore                        # Git ignore rules
└── README.md                         # ← You are here
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Installation |
|:---|:---|
| **Node.js & npm** | [Download Node.js](https://nodejs.org/) |
| **Firebase CLI** | `npm install -g firebase-tools` |

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/harshkundargi95/FitCalc--Your-all-in-one-fitness-companion.git
   cd FitCalc--Your-all-in-one-fitness-companion
   ```

2. **Set up Firebase config**
   ```bash
   cp public/firebase-config.example.js public/firebase-config.js
   ```
   Open `public/firebase-config.js` and replace the placeholder values with your Firebase project credentials from the [Firebase Console](https://console.firebase.google.com/) → Project Settings → Your apps → Config.

3. **Link to your Firebase project**
   ```bash
   firebase login
   firebase init hosting
   ```
   When prompted:
   - Select **"Use an existing project"** → choose `fitcalc-79278` (or your own)
   - Public directory → `public`
   - Configure as SPA → `No`
   - Set up GitHub builds → `No`


4. **Start the local server**
   ```bash
   firebase serve
   ```
   Open [http://localhost:5000](http://localhost:5000) in your browser.

---

## 🌐 Deployment

Deploy your changes to production with a single command:

```bash
firebase deploy --only hosting
```

To deploy hosting along with Firestore security rules:

```bash
firebase deploy --only "hosting,firestore"
```

---

## 🗺️ Future Roadmap

- [ ] **📱 PWA Support** — Installable app with offline capabilities
- [ ] **👥 Social Features** — Share progress and achievements with friends
- [ ] **📏 More Metrics** — Body measurements (waist, hips, chest) and body fat percentage
- [ ] **📊 Advanced Analytics** — Weekly/monthly trends, streaks, and insights
- [ ] **🌍 Unit Preferences** — Toggle between metric (kg/cm) and imperial (lbs/in)

---

## 🤝 Contributing

Contributions make the open-source community an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. **Fork** the repository
2. **Create** your feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<div align="center">

Built with ❤️ for health and fitness.

**[⬆ Back to Top](#-fitcalc--your-all-in-one-fitness-companion)**

</div>
]]>
