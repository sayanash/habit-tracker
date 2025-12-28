const API_URL =
"https://script.google.com/macros/s/AKfycbzo38Vpr6xdOS8ReZBjx1JZTkrnhdS3gCdWRVFwgnVSkVEOOiiI78Cww_Bd21Zgm7Sn/exec";
let ALL_HABITS = [];
let HABIT_SUBMIT_LOCK = false;

/* =====================
   LOGIN
===================== */
function login() {
  const email = document.getElementById("email")?.value.trim();
  const password = document.getElementById("password")?.value.trim();

  if (!email || !password) {
    alert("Enter email and password");
    return;
  }

  fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({ action: "login", email, password })
  })
    .then(r => r.json())
    .then(data => {
      if (!data.success) {
        alert("Invalid credentials");
        return;
      }
      localStorage.setItem("email", email);
      location.href = "dashboard.html";
    });
}

/* =====================
   LOGOUT
===================== */
function logout() {
  localStorage.clear();
  location.href = "index.html";
}

/* =====================
   GREETING + QUOTE
===================== */
function setGreetingAndQuote() {
  const hour = new Date().getHours();
  let greeting =
    hour < 12 ? "Good Morning" :
    hour < 17 ? "Good Afternoon" :
    hour < 21 ? "Good Evening" :
    "Good Night";

  const quotes = [
    "Small steps, every day.",
    "Consistency beats motivation.",
    "Progress, not perfection.",
    "Discipline builds freedom.",
    "One day at a time."
  ];

  document.getElementById("greetingText").innerText = greeting;
  document.getElementById("quoteText").innerText =
    `"${quotes[Math.floor(Math.random() * quotes.length)]}"`;
}

/* =====================
   SIDEBAR NAV
===================== */
function toggleSidebar() {
  document.querySelector(".sidebar").classList.toggle("open");
  document.querySelector(".sidebar-overlay").classList.toggle("active");
}

function closeSidebar() {
  document.querySelector(".sidebar").classList.remove("open");
  document.querySelector(".sidebar-overlay").classList.remove("active");
}

function showSection(section) {
  document.querySelectorAll("main > section").forEach(s => s.hidden = true);
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));

  document.getElementById(`section-${section}`).hidden = false;
  document.getElementById(`nav-${section}`).classList.add("active");

  closeSidebar();
}


/* =====================
   ADD HABIT (NO SUGGESTIONS)
===================== */
function addHabit() {
  if (HABIT_SUBMIT_LOCK) return; // 🔒 prevent double submit

  const input = document.getElementById("habit");
  const habit = input.value.trim();

  if (!habit) {
    alert("Enter habit name");
    return;
  }

  // Case-insensitive + status-safe check
  const exists = ALL_HABITS.some(
    h =>
      h.habit.toLowerCase() === habit.toLowerCase() &&
      h.status === "habit"
  );

  if (exists) {
    alert("Habit already exists");
    return;
  }

  HABIT_SUBMIT_LOCK = true; // 🔐 lock

  fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "addHabit",
      email: localStorage.getItem("email"),
      habit,
      date: today(),
      status: "habit"
    })
  })
    .then(() => {
      input.value = "";
      loadHabits();
    })
    .finally(() => {
      HABIT_SUBMIT_LOCK = false; // 🔓 unlock
    });
}


/* =====================
   LOG DAILY COMPLETION
===================== */
function logHabitDone(habit) {
  const t = today();

  const alreadyDone = ALL_HABITS.some(
    h => h.habit === habit && h.date === t && h.status === "done"
  );

  if (alreadyDone) return;

  fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "addHabit",
      email: localStorage.getItem("email"),
      habit,
      date: t,
      status: "done"
    })
  }).then(loadHabits);
}

/* =====================
   FETCH DATA
===================== */
function loadHabits() {
  fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "getHabits",
      email: localStorage.getItem("email")
    })
  })
    .then(r => r.json())
    .then(data => {
      if (!data.success) return;

      ALL_HABITS = data.habits.map(h => ({
        habit: h.habit,
        date: String(h.date),
        status: h.status
      }));

      renderDashboard();
      renderCalendar();
      renderProgress();
    });
}

/* =====================
   DASHBOARD (TODAY)
===================== */
function renderDashboard() {
  const list = document.getElementById("habitList");
  list.innerHTML = "";

  const t = today();

  const habits = ALL_HABITS
    .filter(h => h.status === "habit")
    .map(h => h.habit);

  const completed = ALL_HABITS
    .filter(h => h.status === "done" && h.date === t)
    .map(h => h.habit);

  habits.forEach(habit => {
    const li = document.createElement("li");

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = completed.includes(habit);
    cb.disabled = cb.checked;
    cb.onchange = () => logHabitDone(habit);

    const label = document.createElement("span");
    label.textContent = habit;

    li.append(cb, label);
    list.appendChild(li);
  });

  if (!habits.length) {
    const li = document.createElement("li");
    li.style.opacity = 0.6;
    li.innerText = "No habits added yet";
    list.appendChild(li);
  }
}

/* =====================
   CALENDAR
===================== */
let SELECTED_DATE = null;

function renderCalendar() {
  const cal = document.getElementById("calendar");
  const box = document.getElementById("calendarHabits");

  cal.innerHTML = "";
  box.innerHTML = "";

  const now = new Date();
  const todayStr = today();

  const y = now.getFullYear();
  const m = now.getMonth();

  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();

  // Auto-select today if nothing selected
  if (!SELECTED_DATE) {
    SELECTED_DATE = todayStr;
    showHabitsForDate(todayStr);
  }

  for (let i = 0; i < first; i++) {
    cal.appendChild(document.createElement("div"));
  }

  for (let d = 1; d <= days; d++) {
    const dateStr =
      `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    const div = document.createElement("div");
    div.className = "day";
    div.innerText = d;

    const hasDone = ALL_HABITS.some(
      h => h.date === dateStr && h.status === "done"
    );

    const isPast = dateStr < todayStr;
    const hasAnyBefore = ALL_HABITS.some(h => h.date < dateStr);

    // ✅ GREEN: completed
    if (hasDone) {
      div.classList.add("done");
    }

    // ❌ RED: missed (past day, no completion)

    if (!hasDone && isPast && hasAnyBefore) {
    div.classList.add("missed");
    }


    // 🔵 SELECTED overrides everything
    if (SELECTED_DATE === dateStr) {
      div.classList.add("selected");
    }

    div.onclick = () => {
  SELECTED_DATE = dateStr;

  // Update selection styles only
  document.querySelectorAll(".day.selected")
    .forEach(d => d.classList.remove("selected"));

  div.classList.add("selected");
  showHabitsForDate(dateStr);
};


    cal.appendChild(div);
  }
}



function showHabitsForDate(date) {
  const box = document.getElementById("calendarHabits");
  const header = document.getElementById("selectedDateText");

  box.innerHTML = "";

  // Format date → "28th December, 2025"
  const d = new Date(date);
  const day = d.getDate();
  const month = d.toLocaleString("default", { month: "long" });
  const year = d.getFullYear();

  const suffix =
    day % 10 === 1 && day !== 11 ? "st" :
    day % 10 === 2 && day !== 12 ? "nd" :
    day % 10 === 3 && day !== 13 ? "rd" : "th";

  header.innerText = `${day}${suffix} ${month}, ${year}`;

  const habits = ALL_HABITS.filter(
    h => h.date === date && h.status === "done"
  );

  if (!habits.length) {
    const li = document.createElement("li");
    li.style.opacity = 0.6;
    li.innerText = "No habits completed on this day";
    box.appendChild(li);
    return;
  }

  habits.forEach(h => {
    const li = document.createElement("li");
    li.innerText = h.habit;
    box.appendChild(li);
  });
}


/* =====================
   PROGRESS / STREAKS
===================== */


function renderProgress() {
  const statusEl = document.getElementById("streakStatus");
  const globalEl = document.getElementById("globalStreak");
  const longestEl = document.getElementById("longestStreak");
  const habitBox = document.getElementById("habitStreaks");

  habitBox.innerHTML = "";

  // All completed habit dates
  const doneDates = ALL_HABITS
    .filter(h => h.status === "done")
    .map(h => h.date);

  const uniqueDates = [...new Set(doneDates)].sort();

  const todayStr = today();
  const yesterdayStr = today(new Date(Date.now() - 86400000));

  const doneToday = doneDates.includes(todayStr);
  const doneYesterday = doneDates.includes(yesterdayStr);

  /* =====================
     STATUS MESSAGE
  ===================== */

  if (!doneToday && doneYesterday) {
    statusEl.innerText = "⏳ Today pending — complete at least one habit";
    statusEl.style.color = "#f59e0b";
  }
  else if (!doneYesterday && uniqueDates.length > 0) {
    statusEl.innerText = "⚠️ You missed yesterday — streak reset";
    statusEl.style.color = "#ef4444";
  }
  else if (doneToday) {
    statusEl.innerText = "🔥 Streak active";
    statusEl.style.color = "#22c55e";
  }
  else {
    statusEl.innerText = "No streak yet — start today";
    statusEl.style.color = "#64748b";
  }

  /* =====================
     CURRENT STREAK
  ===================== */

  let streak = 0;
  let cursor = new Date();

  // If today not completed, check from yesterday
  if (!doneToday) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (doneDates.includes(today(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  globalEl.innerText = `🔥 Current Streak: ${streak} days`;

  /* =====================
     LONGEST STREAK
  ===================== */

  let longest = 0;
  let temp = 0;

  for (let i = 0; i < uniqueDates.length; i++) {
    if (i === 0) {
      temp = 1;
    } else {
      const prev = new Date(uniqueDates[i - 1]);
      const curr = new Date(uniqueDates[i]);
      const diff = (curr - prev) / 86400000;

      temp = diff === 1 ? temp + 1 : 1;
    }
    longest = Math.max(longest, temp);
  }

  longestEl.innerText = `🏆 Longest Streak: ${longest} days`;

  /* =====================
     HABIT-WISE STREAKS
  ===================== */

  const habitMap = {};

  ALL_HABITS
    .filter(h => h.status === "done")
    .forEach(h => {
      if (!habitMap[h.habit]) habitMap[h.habit] = [];
      habitMap[h.habit].push(h.date);
    });

  Object.keys(habitMap).forEach(habit => {
    const dates = [...new Set(habitMap[habit])];
    let s = 0;
    let d = new Date();

    if (!dates.includes(today(d))) {
      d.setDate(d.getDate() - 1);
    }

    while (dates.includes(today(d))) {
      s++;
      d.setDate(d.getDate() - 1);
    }

    const p = document.createElement("p");
    p.innerText = `${habit}: ${s} days`;
    habitBox.appendChild(p);
  });
}





/* =====================
   UTIL
===================== */
function today(d = new Date()) {
  const local = new Date(d);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().split("T")[0];
}

/* =====================
   INIT
===================== */

document.addEventListener("DOMContentLoaded", () => {
  if (location.pathname.includes("dashboard")) {
    if (!localStorage.getItem("email")) {
      location.href = "index.html";
      return;
    }

    setGreetingAndQuote();
    loadHabits();

    // 🔥 FORCE ONLY ONE SECTION ON LOAD
    showSection("dashboard");
  }
});
