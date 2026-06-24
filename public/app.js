// ============================================================
// FitCalc — Application Logic & Animations
// ============================================================

// --- Firebase SDK Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  onSnapshot,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  Timestamp,
  limit,
  setLogLevel,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ============================================================
// 1. Firebase Configuration & Initialization
// ============================================================

import { firebaseConfig } from "./firebase-config.js";

let app, auth, db, userId;

// Environment globals (may be injected by hosting platform)
const appId =
  typeof window.__appId !== "undefined" ? window.__appId : "fitcalc-default";

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  setLogLevel("error"); // Only log errors
} catch (e) {
  console.error("Error initializing Firebase:", e);
}

// ============================================================
// 2. DOM Element References
// ============================================================

const $ = (id) => document.getElementById(id);
const $$ = (selector) => document.querySelectorAll(selector);

// Auth
const authContainer = $("auth-container");
const appPage = $("app-page");
const appFooter = $("app-footer");
const loginPage = $("login-page");
const signupPage = $("signup-page");
const loginForm = $("login-form");
const signupForm = $("signup-form");
const logoutBtn = $("logout-btn");
const showLoginLink = $("show-login");
const showSignupLink = $("show-signup");
const loginError = $("login-error");
const signupError = $("signup-error");

// Navigation
const navLinks = $$(".nav-link");
const appPages = $$(".app-page");

// Header
const appHeader = $("app-header");
const themeToggle = $("theme-toggle");
const iconSun = themeToggle.querySelector(".icon-sun");
const iconMoon = themeToggle.querySelector(".icon-moon");

// Initialize Dark Mode
const storedTheme = localStorage.getItem("fitcalc-theme");
if (storedTheme === "dark") {
  document.body.classList.add("dark-theme");
  iconMoon.style.display = "none";
  iconSun.style.display = "inline";
}

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-theme");
  const isDark = document.body.classList.contains("dark-theme");
  localStorage.setItem("fitcalc-theme", isDark ? "dark" : "light");
  
  if (isDark) {
    iconMoon.style.display = "none";
    iconSun.style.display = "inline";
  } else {
    iconSun.style.display = "none";
    iconMoon.style.display = "inline";
  }
});

// Set max date for progress log
try {
  const today = new Date().toISOString().split("T")[0];
  const progressDateInput = $("progress-date");
  if (progressDateInput) {
    progressDateInput.setAttribute("max", today);
  }
} catch (e) {
  console.error("Could not set max date:", e);
}

// ============================================================
// 3. App State
// ============================================================

let currentUser = null;
let progressChart = null;
let unsubscribeListeners = [];

// ============================================================
// 4. Toast Notification System
// ============================================================

function showToast(message, type = "info", duration = 3500) {
  const container = $("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  const icons = {
    success: "✓",
    error: "✕",
    info: "ℹ",
  };

  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" aria-label="Close">&times;</button>
  `;

  container.appendChild(toast);

  // Close on click
  toast.querySelector(".toast-close").addEventListener("click", () => {
    dismissToast(toast);
  });

  // Auto dismiss
  setTimeout(() => dismissToast(toast), duration);
}

function dismissToast(toast) {
  if (toast.classList.contains("toast-exit")) return;
  toast.classList.add("toast-exit");
  toast.addEventListener("animationend", () => toast.remove());
}

// ============================================================
// 5. Animated Number Counter
// ============================================================

function animateNumber(element, target, suffix = "", duration = 800) {
  const start = 0;
  const startTime = performance.now();
  const decimals = target.toString().includes(".") ? target.toString().split(".")[1].length : 0;

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = start + (target - start) * eased;

    element.textContent = current.toFixed(decimals) + suffix;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

// ============================================================
// 6. Auth — Form Crossfade
// ============================================================

function showAuthForm(formToShow, formToHide) {
  formToHide.classList.remove("form-visible");
  formToHide.classList.add("form-hidden");

  formToShow.classList.remove("form-hidden");
  formToShow.classList.add("form-visible");
  // Re-trigger the CSS animation
  formToShow.style.animation = "none";
  formToShow.offsetHeight; // force reflow
  formToShow.style.animation = "";
}

showLoginLink.addEventListener("click", (e) => {
  e.preventDefault();
  showAuthForm(loginPage, signupPage);
});

showSignupLink.addEventListener("click", (e) => {
  e.preventDefault();
  showAuthForm(signupPage, loginPage);
});

// ============================================================
// 7. Auth — Firebase Authentication
// ============================================================

function showAuthError(element, message) {
  element.textContent = message;
  element.classList.add("visible");
  setTimeout(() => element.classList.remove("visible"), 5000);
}

async function initializeAuth() {
  if (!auth) {
    console.error("Firebase Auth is not initialized.");
    return;
  }

  // Apply saved persistence preference on startup
  const savedPersistence = localStorage.getItem("fitcalc-remember-me");
  try {
    if (savedPersistence === "local") {
      await setPersistence(auth, browserLocalPersistence);
    } else {
      await setPersistence(auth, browserSessionPersistence);
    }
  } catch (e) {
    console.warn("Could not set persistence:", e);
  }

  onAuthStateChanged(auth, (user) => {
    // Only accept non-anonymous, email-verified users
    if (user && !user.isAnonymous && user.email) {
      currentUser = user;
      userId = user.uid;

      // Transition: auth → app
      authContainer.style.opacity = "0";
      authContainer.style.transition = "opacity 0.4s ease";

      setTimeout(() => {
        authContainer.style.display = "none";
        appPage.style.display = "block";
        appPage.style.opacity = "0";
        requestAnimationFrame(() => {
          appPage.style.transition = "opacity 0.5s ease";
          appPage.style.opacity = "1";
        });
        appFooter.style.display = "block";
        attachFirestoreListeners();
        initScrollAnimations();
      }, 400);
    } else {
      // If anonymous or no user, stay on the auth screen
      if (user && user.isAnonymous) {
        signOut(auth); // Clear any anonymous session
      }
      currentUser = null;
      userId = null;

      appPage.style.display = "none";
      appFooter.style.display = "none";
      authContainer.style.display = "flex";
      authContainer.style.opacity = "1";

      detachFirestoreListeners();
    }
  });
}

initializeAuth();

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("signup-email").value;
  const password = $("signup-password").value;
  signupError.classList.remove("visible");

  const btn = signupForm.querySelector(".btn-primary");
  btn.classList.add("loading");

  try {
    // New signups always use session persistence (they can check Remember Me on login)
    await setPersistence(auth, browserSessionPersistence);
    await createUserWithEmailAndPassword(auth, email, password);
    showToast("Account created successfully!", "success");
  } catch (error) {
    showAuthError(signupError, error.message);
    btn.classList.remove("loading");
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("login-email").value;
  const password = $("login-password").value;
  const rememberMe = $("remember-me").checked;
  loginError.classList.remove("visible");

  const btn = loginForm.querySelector(".btn-primary");
  btn.classList.add("loading");

  try {
    // Set persistence based on "Remember Me" checkbox
    if (rememberMe) {
      await setPersistence(auth, browserLocalPersistence);
      localStorage.setItem("fitcalc-remember-me", "local");
    } else {
      await setPersistence(auth, browserSessionPersistence);
      localStorage.removeItem("fitcalc-remember-me");
    }

    await signInWithEmailAndPassword(auth, email, password);
    showToast("Welcome back!", "success");
  } catch (error) {
    showAuthError(loginError, "Invalid email or password.");
    btn.classList.remove("loading");
  }
});

logoutBtn.addEventListener("click", async () => {
  localStorage.removeItem("fitcalc-remember-me");
  try {
    // Reset to session persistence so the next login doesn't auto-persist
    await setPersistence(auth, browserSessionPersistence);
  } catch (e) {
    console.warn("Could not reset persistence:", e);
  }
  await signOut(auth);
  showToast("Logged out successfully.", "info");
});

// ============================================================
// 8. Firestore Listeners
// ============================================================

function attachFirestoreListeners() {
  if (!currentUser || !userId || !appId) return;

  const progressCollectionRef = collection(
    db,
    "artifacts",
    appId,
    "users",
    userId,
    "progress"
  );
  const progressQuery = query(progressCollectionRef);

  const progressUnsub = onSnapshot(
    progressQuery,
    (snapshot) => {
      const progressData = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      renderProgressTable(progressData);
      renderProgressChart(progressData);
      loadGoalData();
    },
    (error) => console.error("Error listening to progress:", error)
  );

  const goalDocRef = doc(
    db,
    "artifacts",
    appId,
    "users",
    userId,
    "goals",
    "userGoals"
  );
  const goalsUnsub = onSnapshot(
    goalDocRef,
    () => loadGoalData(),
    (error) => console.error("Error listening to goals:", error)
  );

  const userDataRef = doc(
    db,
    "artifacts",
    appId,
    "users",
    userId,
    "userData",
    "profile"
  );
  const userDataUnsub = onSnapshot(
    userDataRef,
    () => loadGoalData(),
    (error) => console.error("Error listening to user data:", error)
  );

  unsubscribeListeners = [progressUnsub, goalsUnsub, userDataUnsub];
}

function detachFirestoreListeners() {
  unsubscribeListeners.forEach((unsub) => unsub());
  unsubscribeListeners = [];
}

// ============================================================
// 9. Navigation — Smooth Page Transitions
// ============================================================

let currentPage = "dashboard-page";

navLinks.forEach((link) => {
  link.addEventListener("click", function (e) {
    e.preventDefault();
    const targetPageId = this.dataset.page;
    if (targetPageId === currentPage) return;

    // Update nav active state
    navLinks.forEach((l) => l.classList.remove("active"));
    this.classList.add("active");

    // Animate out current page
    const currentPageEl = $(currentPage);
    const targetPageEl = $(targetPageId);

    if (currentPageEl) {
      currentPageEl.classList.remove("page-visible");
      currentPageEl.classList.add("page-hidden");
    }

    // Animate in new page after delay
    setTimeout(() => {
      if (currentPageEl) {
        currentPageEl.style.display = "none";
      }
      if (targetPageEl) {
        targetPageEl.style.display = "block";
        // Force reflow
        targetPageEl.offsetHeight;
        targetPageEl.classList.remove("page-hidden");
        targetPageEl.classList.add("page-visible");
        // Re-trigger scroll animations for the new page
        initScrollAnimations();
      }
      currentPage = targetPageId;
    }, 400);
  });
});

// ============================================================
// 10. Calculator Tab Transitions
// ============================================================

const tabButtons = $$(".tab-btn");
let currentTab = "bmi";

tabButtons.forEach((tab) => {
  tab.addEventListener("click", () => {
    const targetTab = tab.dataset.tab;
    if (targetTab === currentTab) return;

    // Update tab active state
    tabButtons.forEach((t) => t.classList.remove("tab-active"));
    tab.classList.add("tab-active");

    // Fade out current content
    const currentContent = $(currentTab);
    const targetContent = $(targetTab);

    if (currentContent) {
      currentContent.style.opacity = "0";
      currentContent.style.transform = "translateY(10px)";
      currentContent.style.transition =
        "opacity 0.25s ease, transform 0.25s ease";
    }

    setTimeout(() => {
      // Hide old, show new
      $$(".calculator-content").forEach((c) => {
        c.style.display = "none";
        c.style.opacity = "0";
        c.style.transform = "translateY(10px)";
      });

      if (targetContent) {
        targetContent.style.display = "block";
        // Force reflow
        targetContent.offsetHeight;
        targetContent.style.transition =
          "opacity 0.35s ease, transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)";
        targetContent.style.opacity = "1";
        targetContent.style.transform = "translateY(0)";
      }

      currentTab = targetTab;
    }, 250);
  });
});

// Initialize first tab's style
const firstTab = $("bmi");
if (firstTab) {
  firstTab.style.opacity = "1";
  firstTab.style.transform = "translateY(0)";
}

// ============================================================
// 11. Calculators — Business Logic
// ============================================================

// --- BMI ---
$("bmi-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const height = parseFloat($("bmi-height").value);
  const weight = parseFloat($("bmi-weight").value);

  if (height > 0 && weight > 0) {
    const bmi = (weight / (height / 100) ** 2).toFixed(2);
    const category = getBMICategory(bmi);
    const colorClass = getBMICategoryColorClass(category);

    // --- Show result immediately ---
    const resultEl = $("bmi-result");
    resultEl.innerHTML = `
      <p style="font-size: 0.9rem; color: #64748b;">Your BMI is</p>
      <p class="result-value ${colorClass}" id="bmi-value">${bmi}</p>
      <p class="${colorClass}" style="font-weight: 600; margin-top: 0.25rem;">${category}</p>
    `;
    resultEl.style.display = "block";
    resultEl.classList.add("result-entering");
    setTimeout(() => resultEl.classList.remove("result-entering"), 500);

    // Animate the number
    const valueEl = $("bmi-value");
    if (valueEl) animateNumber(valueEl, parseFloat(bmi));

    showToast("BMI calculated!", "success");

    // --- Try to save to Firestore (non-blocking) ---
    if (currentUser && userId && appId) {
      try {
        await setDoc(
          doc(db, "artifacts", appId, "users", userId, "userData", "profile"),
          { height },
          { merge: true }
        );
        await saveProgressEntry(Timestamp.now(), weight);
        // Update result to show it was logged
        resultEl.insertAdjacentHTML("beforeend", `<p class="text-success" style="font-size: 0.85rem; margin-top: 0.75rem;">✓ Weight logged to Progress Tracker!</p>`);
      } catch (err) {
        console.warn("Could not save BMI to Firestore:", err.message);
      }
    }
  } else {
    showToast("Please enter valid height and weight.", "error");
  }
});

// --- Calories ---
const genderButtons = $$("#calorie-form .gender-btn");
genderButtons.forEach((button) =>
  button.addEventListener("click", () => {
    genderButtons.forEach((btn) => btn.classList.remove("selected"));
    button.classList.add("selected");
  })
);

$("calorie-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const age = parseFloat($("calorie-age").value);
  const height = parseFloat($("calorie-height").value);
  const weight = parseFloat($("calorie-weight").value);
  const activityLevel = $("activity-level").value;
  const selectedGender = document.querySelector(
    "#calorie-form .gender-btn.selected"
  )?.dataset.value;

  if (age > 0 && height > 0 && weight > 0 && selectedGender) {
    const bmr =
      selectedGender === "male"
        ? 10 * weight + 6.25 * height - 5 * age + 5
        : 10 * weight + 6.25 * height - 5 * age - 161;
    const tdee = (bmr * parseFloat(activityLevel)).toFixed(0);

    // --- Show result immediately ---
    const resultEl = $("calorie-result");
    resultEl.innerHTML = `
      <p style="font-size: 0.9rem; color: #64748b;">Your daily calorie need is</p>
      <p class="result-value text-emerald" id="calorie-value">${tdee}</p>
      <p style="color: #64748b; font-size: 0.85rem;">kcal/day</p>
    `;
    resultEl.style.display = "block";
    resultEl.classList.add("result-entering");
    setTimeout(() => resultEl.classList.remove("result-entering"), 500);

    const valueEl = $("calorie-value");
    if (valueEl) animateNumber(valueEl, parseInt(tdee));

    showToast("Calories calculated!", "success");

    // --- Try to save to Firestore (non-blocking) ---
    if (currentUser && userId && appId) {
      try {
        await setDoc(
          doc(db, "artifacts", appId, "users", userId, "userData", "profile"),
          { tdee, activityLevel },
          { merge: true }
        );
      } catch (err) {
        console.warn("Could not save calorie data to Firestore:", err.message);
      }
    }
  } else {
    showToast("Please fill all fields and select a gender.", "error");
  }
});

// --- Water ---
$("water-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const weight = parseFloat($("water-weight").value);
  const activity = parseFloat($("water-activity").value) || 0;

  if (weight > 0) {
    const intake = (weight * 0.033 + (activity / 30) * 0.35).toFixed(2);

    const resultEl = $("water-result");
    resultEl.innerHTML = `
      <p style="font-size: 0.9rem; color: #64748b;">Recommended water intake</p>
      <p class="result-value text-cyan" id="water-value">${intake}</p>
      <p style="color: #64748b; font-size: 0.85rem;">Liters/day</p>
    `;
    resultEl.style.display = "block";
    resultEl.classList.add("result-entering");
    setTimeout(() => resultEl.classList.remove("result-entering"), 500);

    const valueEl = $("water-value");
    if (valueEl) animateNumber(valueEl, parseFloat(intake));

    showToast("Water intake calculated!", "success");
  }
});

// --- Protein ---
$("protein-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const weight = parseFloat($("protein-weight").value);
  const goal = parseFloat($("protein-goal").value);

  if (weight > 0) {
    const intake = (weight * goal).toFixed(1);

    const resultEl = $("protein-result");
    resultEl.innerHTML = `
      <p style="font-size: 0.9rem; color: #64748b;">Recommended protein intake</p>
      <p class="result-value text-amber" id="protein-value">${intake}</p>
      <p style="color: #64748b; font-size: 0.85rem;">g/day</p>
    `;
    resultEl.style.display = "block";
    resultEl.classList.add("result-entering");
    setTimeout(() => resultEl.classList.remove("result-entering"), 500);

    const valueEl = $("protein-value");
    if (valueEl) animateNumber(valueEl, parseFloat(intake));

    showToast("Protein intake calculated!", "success");
  }
});

// ============================================================
// 12. Progress Tracker
// ============================================================

async function saveProgressEntry(date, weight) {
  if (!currentUser || !userId || !appId) return;
  try {
    await addDoc(
      collection(db, "artifacts", appId, "users", userId, "progress"),
      { date, weight: parseFloat(weight) }
    );
  } catch (error) {
    console.error("Error saving progress:", error);
    showToast("Failed to save progress entry.", "error");
  }
}

function renderProgressTable(progressData) {
  const progressHistory = $("progress-history");
  if (!progressHistory) return;

  progressHistory.innerHTML = "";

  if (progressData.length === 0) {
    progressHistory.innerHTML = `
      <tr>
        <td colspan="3" class="empty-state" style="padding: 2rem; text-align: center; color: #94a3b8;">
          No entries yet. Log your first weight entry!
        </td>
      </tr>`;
    return;
  }

  // Sort by date descending
  const sortedData = [...progressData].sort((a, b) => {
    const dateA = a.date ? a.date.seconds : 0;
    const dateB = b.date ? b.date.seconds : 0;
    return dateB - dateA;
  });

  sortedData.forEach((entry, index) => {
    const row = document.createElement("tr");
    row.className = "row-enter";
    row.style.animationDelay = `${index * 0.05}s`;

    const dateString = entry.date
      ? entry.date.toDate().toLocaleDateString()
      : "N/A";

    row.innerHTML = `
      <td style="padding: 0.875rem 1.5rem; border-bottom: 1px solid #f1f5f9;">${dateString}</td>
      <td style="padding: 0.875rem 1.5rem; border-bottom: 1px solid #f1f5f9;">${entry.weight} kg</td>
      <td style="padding: 0.875rem 1.5rem; border-bottom: 1px solid #f1f5f9; text-align: right;">
        <button data-id="${entry.id}" class="btn-delete delete-progress">Delete</button>
      </td>
    `;

    progressHistory.appendChild(row);
  });
}

function renderProgressChart(progressData) {
  const chartElement = $("progress-chart");
  if (!chartElement) return;

  const ctx = chartElement.getContext("2d");
  if (progressChart) progressChart.destroy();

  const validData = progressData.filter((e) => e.date);
  const sortedData = [...validData].sort((a, b) => {
    const dateA = a.date ? a.date.seconds : 0;
    const dateB = b.date ? b.date.seconds : 0;
    return dateA - dateB;
  });

  // Gradient for the chart
  const gradient = ctx.createLinearGradient(0, 0, 0, 260);
  gradient.addColorStop(0, "rgba(99, 102, 241, 0.2)");
  gradient.addColorStop(1, "rgba(99, 102, 241, 0.01)");

  progressChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: sortedData.map((e) => e.date.toDate().toLocaleDateString()),
      datasets: [
        {
          label: "Weight (kg)",
          data: sortedData.map((e) => e.weight),
          borderColor: "#6366f1",
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          borderWidth: 2.5,
          pointRadius: 4,
          pointBackgroundColor: "#6366f1",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: "#4f46e5",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1200,
        easing: "easeOutQuart",
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "#1e293b",
          titleFont: { family: "Inter", size: 12 },
          bodyFont: { family: "Inter", size: 13, weight: "600" },
          padding: 10,
          cornerRadius: 8,
          displayColors: false,
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { family: "Inter", size: 11 },
            color: "#94a3b8",
          },
        },
        y: {
          grid: {
            color: "rgba(0, 0, 0, 0.04)",
          },
          ticks: {
            font: { family: "Inter", size: 11 },
            color: "#94a3b8",
          },
        },
      },
    },
  });
}

// Progress form submission
$("progress-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const dateStr = $("progress-date").value;
  const weight = $("progress-weight").value;
  const errorMsg = $("progress-form-error");

  const selectedDate = new Date(dateStr + "T00:00:00");
  const todayDate = new Date();
  todayDate.setHours(23, 59, 59, 999);

  if (selectedDate > todayDate) {
    if (errorMsg) errorMsg.textContent = "You cannot log entries for a future date.";
    showToast("Cannot log future dates.", "error");
    return;
  }

  if (errorMsg) errorMsg.textContent = "";

  if (dateStr && weight > 0) {
    if (!currentUser) {
      showToast("Please log in to save progress.", "error");
      return;
    }
    try {
      await saveProgressEntry(Timestamp.fromDate(new Date(dateStr)), weight);
      e.target.reset();
      showToast("Progress entry logged!", "success");
    } catch (err) {
      console.warn("Failed to log progress entry:", err.message);
      showToast("Could not save entry. Check Firestore permissions.", "error");
    }
  } else if (!dateStr || !weight) {
    if (errorMsg) errorMsg.textContent = "Please fill out both date and weight.";
  }
});

// Delete progress entry
const progressHistoryTable = $("progress-history");
if (progressHistoryTable) {
  progressHistoryTable.addEventListener("click", async (e) => {
    if (
      e.target.classList.contains("delete-progress") &&
      currentUser &&
      userId &&
      appId
    ) {
      const idToDelete = e.target.dataset.id;
      const row = e.target.closest("tr");

      // Animate row exit
      if (row) {
        row.classList.add("row-exit");
        row.addEventListener("animationend", async () => {
          try {
            await deleteDoc(
              doc(
                db,
                "artifacts",
                appId,
                "users",
                userId,
                "progress",
                idToDelete
              )
            );
            showToast("Entry deleted.", "info");
          } catch (error) {
            console.error("Error deleting document:", error);
            showToast("Failed to delete entry.", "error");
          }
        });
      }
    }
  });
}

// ============================================================
// 13. Fitness Goals
// ============================================================

async function loadGoalData() {
  if (!currentUser || !userId || !appId) return;

  const goalProgressDisplay = $("goal-progress-display");
  if (!goalProgressDisplay) return;

  const goalDocRef = doc(
    db,
    "artifacts",
    appId,
    "users",
    userId,
    "goals",
    "userGoals"
  );
  const progressCollectionRef = collection(
    db,
    "artifacts",
    appId,
    "users",
    userId,
    "progress"
  );
  const progressQuery = query(progressCollectionRef);
  const userProfileRef = doc(
    db,
    "artifacts",
    appId,
    "users",
    userId,
    "userData",
    "profile"
  );

  try {
    const [goalSnap, progressSnap, profileSnap] = await Promise.all([
      getDoc(goalDocRef),
      getDocs(progressQuery),
      getDoc(userProfileRef),
    ]);

    const goals = goalSnap.exists() ? goalSnap.data() : null;
    const profile = profileSnap.exists() ? profileSnap.data() : {};

    if (!goals) {
      goalProgressDisplay.innerHTML = `<p class="empty-state">No goals set yet. Set your first goal above!</p>`;
      return;
    }
    if (!profile.height) {
      goalProgressDisplay.innerHTML = `<p class="empty-state">Please calculate BMI first to see goal progress details.</p>`;
      return;
    }

    const startWeight = parseFloat(goals.start);
    const goalWeight = parseFloat(goals.goal);

    let currentWeight = startWeight || profile.weight || 0;
    if (!progressSnap.empty) {
      const allProgress = progressSnap.docs.map((d) => d.data());
      const sortedProgress = allProgress.sort((a, b) => {
        const dateA = a.date ? a.date.seconds : 0;
        const dateB = b.date ? b.date.seconds : 0;
        return dateB - dateA;
      });
      if (sortedProgress.length > 0) {
        currentWeight = parseFloat(sortedProgress[0].weight);
      }
    }

    // --- Update Dashboard & Profile UI ---
    updateDashboardUI(profile, currentWeight);
    updateProfileUI(profile, currentWeight);

    const totalChangeNeeded = startWeight - goalWeight;
    const changeMade = startWeight - currentWeight;
    let progress = 0;
    if (totalChangeNeeded !== 0) {
      progress = Math.min(
        100,
        Math.max(0, (changeMade / totalChangeNeeded) * 100)
      );
    } else if (currentWeight === goalWeight) {
      progress = 100;
    }

    const weightToGo = (currentWeight - goalWeight).toFixed(1);
    const goalBMI = (goalWeight / (profile.height / 100) ** 2).toFixed(2);
    const goalBMICategory = getBMICategory(goalBMI);

    const disclaimer =
      goalBMICategory === "Underweight" || goalBMICategory === "Obesity"
        ? `<div class="disclaimer-box"><strong>⚠ Health Disclaimer:</strong> Your target is in the '${goalBMICategory}' category. Consult a healthcare professional before pursuing this goal.</div>`
        : "";

    let tips = "";
    if (parseFloat(weightToGo) > 0) {
      tips = `<h4 class="section-subtitle" style="margin-top: 1.5rem;">Weight Loss Tips</h4>`;
      if (profile.tdee)
        tips += `<p style="margin-bottom: 0.5rem; font-size: 0.9rem; color: #475569;">Your maintenance: <strong>${profile.tdee} kcal</strong>. Aim for <strong style="color: var(--primary-600);">${profile.tdee - 500} kcal</strong> daily.</p>`;
      tips += `<ul class="tips-list"><li>Prioritize protein & fiber to feel full.</li><li>Incorporate regular cardio & strength training.</li><li>Stay hydrated and manage portion sizes.</li></ul>`;
    } else if (parseFloat(weightToGo) < 0) {
      tips = `<h4 class="section-subtitle" style="margin-top: 1.5rem;">Weight Gain Tips</h4>`;
      if (profile.tdee)
        tips += `<p style="margin-bottom: 0.5rem; font-size: 0.9rem; color: #475569;">Your maintenance: <strong>${profile.tdee} kcal</strong>. Aim for <strong style="color: var(--primary-600);">${parseInt(profile.tdee) + 300} kcal</strong> daily.</p>`;
      tips += `<ul class="tips-list"><li>Focus on nutrient-dense foods and snacks.</li><li>Ensure high protein intake & prioritize strength training.</li><li>Don't skip meals; consider liquid calories like smoothies.</li></ul>`;
    } else {
      tips = `<h4 style="color: var(--success); font-weight: 700; margin-top: 1.5rem;">🎉 Congratulations!</h4><p style="color: #475569;">You've reached your goal weight! Focus on maintaining healthy habits.</p>`;
    }

    const statusColor =
      parseFloat(weightToGo) === 0
        ? "color: var(--success);"
        : "color: var(--primary-600);";
    const statusText =
      parseFloat(weightToGo) === 0
        ? "✓ Goal Achieved!"
        : `${Math.abs(weightToGo)} kg away from your goal`;

    goalProgressDisplay.innerHTML = `
      <h3 class="section-subtitle">Your Goal Progress</h3>
      <div class="goal-stats">
        <span>Start: <strong>${startWeight} kg</strong></span>
        <span>Current: <strong>${currentWeight} kg</strong></span>
        <span>Goal: <strong>${goalWeight} kg</strong></span>
      </div>
      <div class="goal-progress-bar-track">
        <div class="goal-progress-bar-fill" style="width: ${progress}%"></div>
      </div>
      <p class="goal-status" style="${statusColor}">${statusText}</p>
      ${disclaimer}
      ${tips}
    `;
  } catch (error) {
    console.error("Error loading goal data:", error);
    goalProgressDisplay.innerHTML = `<p class="form-error">Error loading goal data. Check console.</p>`;
  }
}

$("goals-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser || !userId || !appId) {
    showToast("Please log in to set goals.", "error");
    return;
  }

  const start = parseFloat($("start-weight").value);
  const goal = parseFloat($("goal-weight").value);

  if (start > 0 && goal > 0) {
    try {
      await setDoc(
        doc(db, "artifacts", appId, "users", userId, "goals", "userGoals"),
        { start, goal }
      );
      showToast("Fitness goal saved!", "success");
    } catch (error) {
      console.error("Error saving goal:", error);
      showToast("Failed to save goal.", "error");
    }
  } else {
    showToast("Please enter valid start and goal weights.", "error");
  }
});

// ============================================================
// 14. Helper Functions
// ============================================================

function getBMICategory(bmi) {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal weight";
  if (bmi < 30) return "Overweight";
  return "Obesity";
}

function getBMICategoryColorClass(category) {
  if (category === "Underweight") return "bmi-underweight";
  if (category === "Normal weight") return "bmi-normal";
  if (category === "Overweight") return "bmi-overweight";
  return "bmi-obese";
}

// ============================================================
// 15. Header Scroll Effect
// ============================================================

if (appHeader) {
  window.addEventListener("scroll", () => {
    if (window.scrollY > 10) {
      appHeader.classList.add("scrolled");
    } else {
      appHeader.classList.remove("scrolled");
    }
  });
}

// ============================================================
// 16. Scroll-Triggered Animations (Intersection Observer)
// ============================================================

function initScrollAnimations() {
  const animatedElements = $$(".animate-on-scroll:not(.animated)");

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animated");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    animatedElements.forEach((el) => observer.observe(el));
  } else {
    // Fallback: just show everything
    animatedElements.forEach((el) => el.classList.add("animated"));
  }
}

// Init scroll animations on page load
document.addEventListener("DOMContentLoaded", initScrollAnimations);

// ============================================================
// 17. Dashboard & Profile UI Logic
// ============================================================

function updateDashboardUI(profile, latestWeight) {
  // BMI
  const dashBmiVal = $("dash-bmi-val");
  const dashBmiCat = $("dash-bmi-cat");
  if (profile.height && latestWeight > 0) {
    const bmi = (latestWeight / (profile.height / 100) ** 2).toFixed(2);
    const category = getBMICategory(bmi);
    const colorClass = getBMICategoryColorClass(category);
    dashBmiVal.textContent = bmi;
    dashBmiCat.textContent = category;
    dashBmiVal.className = `result-value ${colorClass}`;
    dashBmiCat.className = `${colorClass}`;
  } else {
    dashBmiVal.textContent = "--";
    dashBmiCat.textContent = "Log height/weight";
    dashBmiVal.className = "result-value text-primary-500";
    dashBmiCat.className = "text-muted";
  }

  // Weight
  const dashWeightVal = $("dash-weight-val");
  if (latestWeight > 0) {
    dashWeightVal.textContent = latestWeight;
  } else {
    dashWeightVal.textContent = "--";
  }

  // Calories
  const dashCalVal = $("dash-cal-val");
  if (profile.tdee) {
    dashCalVal.textContent = profile.tdee;
  } else {
    dashCalVal.textContent = "--";
  }
}

function updateProfileUI(profile, latestWeight) {
  if (profile.name && !$("profile-name").value) $("profile-name").value = profile.name;
  if (profile.dob && !$("profile-dob").value) {
    $("profile-dob").value = profile.dob;
    calculateAge(profile.dob);
  }
  if (profile.height && !$("profile-height").value) $("profile-height").value = profile.height;
  
  if (latestWeight > 0) {
    $("profile-weight").value = latestWeight;
  }

  if (currentUser && currentUser.email) {
    $("profile-email").value = currentUser.email;
  }
}

function calculateAge(dobString) {
  if (!dobString) return;
  const dob = new Date(dobString);
  const diff_ms = Date.now() - dob.getTime();
  const age_dt = new Date(diff_ms); 
  const age = Math.abs(age_dt.getUTCFullYear() - 1970);
  $("profile-age").value = age;
}

$("profile-dob").addEventListener("change", (e) => {
  calculateAge(e.target.value);
});

// Profile Details Submit
$("profile-details-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser || !userId || !appId) return;

  const name = $("profile-name").value;
  const dob = $("profile-dob").value;
  const height = parseFloat($("profile-height").value);

  try {
    const btn = e.target.querySelector("button");
    btn.classList.add("loading");
    
    await setDoc(
      doc(db, "artifacts", appId, "users", userId, "userData", "profile"),
      { name, dob, height },
      { merge: true }
    );
    showToast("Personal details saved!", "success");
    btn.classList.remove("loading");
  } catch (error) {
    console.error("Error saving profile:", error);
    showToast("Failed to save details.", "error");
    e.target.querySelector("button").classList.remove("loading");
  }
});

// Profile — Email is always read-only, set from current user
function setProfileEmail() {
  if (currentUser && currentUser.email) {
    $("profile-email").value = currentUser.email;
  }
}

// Change Password — Show/Hide Form Toggle
const showChangePasswordBtn = $("show-change-password-btn");
const changePasswordForm = $("change-password-form");
const cancelChangePasswordBtn = $("cancel-change-password-btn");

showChangePasswordBtn.addEventListener("click", () => {
  changePasswordForm.style.display = "block";
  showChangePasswordBtn.style.display = "none";
  // Clear any previous values
  $("current-password").value = "";
  $("new-password").value = "";
  $("confirm-new-password").value = "";
  $("password-change-error").textContent = "";
});

cancelChangePasswordBtn.addEventListener("click", () => {
  changePasswordForm.style.display = "none";
  showChangePasswordBtn.style.display = "block";
  $("password-change-error").textContent = "";
});

// Change Password — Form Submit
changePasswordForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  const currentPasswordVal = $("current-password").value;
  const newPasswordVal = $("new-password").value;
  const confirmPasswordVal = $("confirm-new-password").value;
  const errorEl = $("password-change-error");
  const btn = changePasswordForm.querySelector('button[type="submit"]');

  errorEl.textContent = "";

  // Validate new passwords match
  if (newPasswordVal !== confirmPasswordVal) {
    errorEl.textContent = "New passwords do not match.";
    errorEl.style.display = "block";
    return;
  }

  // Validate minimum length
  if (newPasswordVal.length < 6) {
    errorEl.textContent = "New password must be at least 6 characters.";
    errorEl.style.display = "block";
    return;
  }

  // Validate not same as current
  if (currentPasswordVal === newPasswordVal) {
    errorEl.textContent = "New password must be different from your current password.";
    errorEl.style.display = "block";
    return;
  }

  try {
    btn.classList.add("loading");

    // Step 1: Re-authenticate with current password
    const credential = EmailAuthProvider.credential(currentUser.email, currentPasswordVal);
    await reauthenticateWithCredential(currentUser, credential);

    // Step 2: Update to new password
    await updatePassword(currentUser, newPasswordVal);

    showToast("Password updated successfully!", "success");
    changePasswordForm.style.display = "none";
    showChangePasswordBtn.style.display = "block";

    // Clear fields
    $("current-password").value = "";
    $("new-password").value = "";
    $("confirm-new-password").value = "";
  } catch (error) {
    console.error("Error changing password:", error);

    if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
      errorEl.textContent = "Current password is incorrect. Please try again.";
    } else if (error.code === "auth/weak-password") {
      errorEl.textContent = "New password is too weak. Use at least 6 characters.";
    } else {
      errorEl.textContent = error.message || "Failed to change password.";
    }
    errorEl.style.display = "block";
  } finally {
    btn.classList.remove("loading");
  }
});
