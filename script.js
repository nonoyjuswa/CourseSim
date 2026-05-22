/* =====================================================
   CourseSim – script.js  (Role-based + Drag & Drop)
   ===================================================== */

/* ── OOP Classes ──────────────────────────────────── */

class Student {
  constructor(name) { this.name = name; this.enrolledCourses = []; }
  enroll(course) {
    if (!this.enrolledCourses.includes(course)) { this.enrolledCourses.push(course); return true; }
    return false;
  }
  drop(course)    { this.enrolledCourses = this.enrolledCourses.filter(c => c !== course); }
  viewCourses()   { return this.enrolledCourses; }
}

class Course {
  constructor(code, title, capacity, prerequisite = null) {
    this.code = code; this.title = title;
    this.capacity = capacity; this.prerequisite = prerequisite;
    this.students = [];
  }
  isFull()         { return this.students.length >= this.capacity; }
  addStudent(s)    { if (!this.isFull() && !this.students.includes(s)) { this.students.push(s); return true; } return false; }
  removeStudent(s) { this.students = this.students.filter(x => x !== s); }
}

class Enrollment {
  constructor(student, course) { this.student = student; this.course = course; this.grade = null; }
  assignGrade(g) { this.grade = g; }
}

/* ── localStorage keys ────────────────────────────── */
const LS_USERS    = "cs_users";
const LS_CURRENT  = "cs_currentUser";
const LS_REQUESTS = "cs_pendingRequests";
const LS_COURSES  = "cs_courses";
const LS_ENROLLS  = "cs_enrollments";

/* ── Hardcoded system accounts ────────────────────── */
const SYSTEM_ACCOUNTS = [
  { id: "ADMIN-001", password: "admin123", name: "System Admin", role: "admin"     },
  { id: "REG-001",   password: "reg123",   name: "Registrar",    role: "registrar" }
];

/* ── Default course catalog (fallback if LS empty) ── */
const DEFAULT_COURSES = [
  { code: "ICT 111", title: "Object Oriented Programming", capacity: 3, prerequisite: null },
  { code: "ICT 112", title: "Operating Systems",           capacity: 2, prerequisite: null },
  { code: "ICT 113", title: "Database Systems",            capacity: 2, prerequisite: "ICT 111" },
  { code: "ICT 114", title: "Software Engineering",        capacity: 3, prerequisite: null }
];

/* ── Course catalog — always synced with localStorage ── */
function loadCourses() {
  const stored = localStorage.getItem(LS_COURSES);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch(e) {}
  }
  // Seed defaults on first load
  localStorage.setItem(LS_COURSES, JSON.stringify(DEFAULT_COURSES));
  return DEFAULT_COURSES.map(c => ({...c}));
}

function saveCourses(list) {
  localStorage.setItem(LS_COURSES, JSON.stringify(list));
}

let courses = loadCourses();

const students    = [];
const enrollments = [];

/* ── Helpers ──────────────────────────────────────── */

function togglePassword(inputId, button) {
  const input = document.getElementById(inputId);
  input.type  = input.type === "password" ? "text" : "password";
  button.textContent = input.type === "password" ? "Show" : "Hide";
}

function findCourse(code) { return courses.find(c => c.code.toLowerCase() === code.toLowerCase()); }
function findStudent(name) { return students.find(s => s.name.toLowerCase() === name.toLowerCase()); }
function findEnrollment(student, course) { return enrollments.find(e => e.student === student && e.course === course); }

function setMessage(text, color) {
  const el = document.getElementById("message") || document.getElementById("authMessage");
  if (!el) return;
  el.textContent = text;
  el.style.color = color || "#bfdbfe";
}

function initials(name) {
  return (name || "?").split(" ").map(n => n[0] || "").join("").slice(0, 2).toUpperCase();
}

/* ── Auth ─────────────────────────────────────────── */

function getCurrentUser() {
  return JSON.parse(localStorage.getItem(LS_CURRENT) || "null");
}

function generateStudentId() {
  const year  = new Date().getFullYear();
  const users = JSON.parse(localStorage.getItem(LS_USERS) || "[]");
  const seq   = String(users.length + 1).padStart(4, "0");
  const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const letter = alpha[Math.floor(Math.random() * alpha.length)];
  return `${year}-${seq}-${letter}`;
}

function registerAccount() {
  const nameEl = document.getElementById("regName");
  const passEl = document.getElementById("regPassword");
  const idDisp = document.getElementById("generatedId");
  const name     = nameEl ? nameEl.value.trim() : "";
  const password = passEl ? passEl.value.trim() : "";

  if (!name || !password)   return setMessage("Please fill in all fields.");
  if (password.length < 6)  return setMessage("Password must be at least 6 characters.");

  const users = JSON.parse(localStorage.getItem(LS_USERS) || "[]");
  let id, attempts = 0;
  do { id = generateStudentId(); attempts++; }
  while (users.some(u => u.id === id) && attempts < 20);

  users.push({ name, id, password, role: "student" });
  localStorage.setItem(LS_USERS, JSON.stringify(users));

  if (idDisp) { idDisp.textContent = `Your Student ID: ${id}`; idDisp.style.display = "block"; }
  setMessage("✓ Registration successful! Save your ID above, then log in.", "#86efac");
}

function login() {
  const id       = (document.getElementById("loginId")?.value || "").trim();
  const password = (document.getElementById("loginPassword")?.value || "").trim();

  const sys = SYSTEM_ACCOUNTS.find(a => a.id === id && a.password === password);
  if (sys) {
    localStorage.setItem(LS_CURRENT, JSON.stringify(sys));
    setMessage("✓ Login successful! Redirecting…", "#86efac");
    setTimeout(() => {
      window.location.href = sys.role === "admin" ? "admin.html" : "enrollments.html";
    }, 800);
    return;
  }

  const users = JSON.parse(localStorage.getItem(LS_USERS) || "[]");
  const user  = users.find(u => u.id === id && u.password === password);
  if (!user) return setMessage("Invalid ID or password. Please try again.");

  localStorage.setItem(LS_CURRENT, JSON.stringify(user));
  setMessage("✓ Login successful! Redirecting…", "#86efac");
  setTimeout(() => { window.location.href = "courses.html"; }, 800);
}

function logout() {
  localStorage.removeItem(LS_CURRENT);
  window.location.href = "index.html";
}

/* ── Sidebar ──────────────────────────────────────── */

function syncUserUI() {
  const profile  = getCurrentUser();
  const nameEl   = document.getElementById("sidebarName");
  const idEl     = document.getElementById("sidebarId");
  const avatarEl = document.getElementById("sidebarAvatar");
  const roleEl   = document.getElementById("sidebarRole");

  if (nameEl)   nameEl.textContent   = profile ? profile.name : "Guest";
  if (idEl)     idEl.textContent     = profile ? profile.id   : "—";
  if (avatarEl) avatarEl.textContent = initials(profile ? profile.name : "Guest");
  if (roleEl) {
    roleEl.textContent  = profile ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : "";
    roleEl.className    = "role-pill " + (profile ? profile.role : "");
  }

  const logoutLink = document.getElementById("navLogout");
  if (logoutLink) {
    if (profile) {
      logoutLink.textContent = "Logout";
      logoutLink.href        = "#";
      logoutLink.onclick     = (e) => { e.preventDefault(); logout(); };
    } else {
      logoutLink.textContent = "Login";
      logoutLink.href        = "index.html";
      logoutLink.onclick     = null;
    }
  }
}

/* ── Pending Requests ─────────────────────────────── */

function getRequests()        { return JSON.parse(localStorage.getItem(LS_REQUESTS) || "[]"); }
function saveRequests(reqs)   { localStorage.setItem(LS_REQUESTS, JSON.stringify(reqs)); }
function getEnrollments()     { return JSON.parse(localStorage.getItem(LS_ENROLLS) || "[]"); }
function saveEnrollments(arr) { localStorage.setItem(LS_ENROLLS, JSON.stringify(arr)); }

function submitEnrollRequest(courseCode) {
  const user = getCurrentUser();
  if (!user || user.role !== "student") return setMessage("You must be logged in as a student.");
  const course = findCourse(courseCode);
  if (!course) return setMessage("Course not found.");

  const savedEnrolls = getEnrollments();
  const activeCount  = savedEnrolls.filter(e => e.courseCode === courseCode && e.active).length;
  if (activeCount >= course.capacity) return setMessage("Course is full.");

  const alreadyEnrolled = savedEnrolls.some(e => e.studentId === user.id && e.courseCode === courseCode && e.active);
  if (alreadyEnrolled) return setMessage("You are already enrolled in this course.");

  const reqs = getRequests();
  const duplicate = reqs.find(r => r.studentId === user.id && r.courseCode === courseCode && r.status === "pending");
  if (duplicate) return setMessage("You already have a pending request for this course.");

  if (course.prerequisite) {
    const hasPrereq = savedEnrolls.some(e => e.studentId === user.id && e.courseCode === course.prerequisite && e.active);
    if (!hasPrereq) return setMessage(`Prerequisite required: ${course.prerequisite}`);
  }

  reqs.push({
    id: Date.now(), type: "enroll",
    studentId: user.id, studentName: user.name,
    courseCode, courseTitle: course.title,
    status: "pending", submittedAt: new Date().toLocaleString()
  });
  saveRequests(reqs);
  renderDragDrop();
  setMessage(`✓ Enroll request for ${courseCode} submitted. Awaiting registrar approval.`, "#86efac");
}

function submitDropRequest(courseCode) {
  const user = getCurrentUser();
  if (!user || user.role !== "student") return setMessage("You must be logged in as a student.");
  const course = findCourse(courseCode);
  if (!course) return setMessage("Course not found.");

  const savedEnrolls = getEnrollments();
  const enrolled = savedEnrolls.some(e => e.studentId === user.id && e.courseCode === courseCode && e.active);
  if (!enrolled) return setMessage("You are not enrolled in this course.");

  const reqs = getRequests();
  const duplicate = reqs.find(r => r.studentId === user.id && r.courseCode === courseCode && r.status === "pending" && r.type === "drop");
  if (duplicate) return setMessage("You already have a pending drop request for this course.");

  reqs.push({
    id: Date.now(), type: "drop",
    studentId: user.id, studentName: user.name,
    courseCode, courseTitle: course.title,
    status: "pending", submittedAt: new Date().toLocaleString()
  });
  saveRequests(reqs);
  renderDragDrop();
  setMessage(`✓ Drop request for ${courseCode} submitted. Awaiting registrar approval.`, "#86efac");
}

function cancelEnrollRequest(courseCode) {
  const user = getCurrentUser();
  if (!user) return;
  const reqs = getRequests();
  const idx  = reqs.findIndex(r => r.studentId === user.id && r.courseCode === courseCode && r.status === "pending" && r.type === "enroll");
  if (idx > -1) { reqs.splice(idx, 1); saveRequests(reqs); }
  renderDragDrop();
  setMessage(`Request for ${courseCode} cancelled.`, "#fde047");
}

function approveRequest(reqId) {
  const reqs = getRequests();
  const req  = reqs.find(r => r.id === reqId);
  if (!req) return;
  req.status = "approved";
  req.reviewedAt = new Date().toLocaleString();
  saveRequests(reqs);

  const savedEnrolls = getEnrollments();
  if (req.type === "enroll") {
    savedEnrolls.push({
      studentId: req.studentId, studentName: req.studentName,
      courseCode: req.courseCode, courseTitle: req.courseTitle,
      active: true, grade: null, enrolledAt: new Date().toLocaleString()
    });
  } else if (req.type === "drop") {
    const idx = savedEnrolls.findIndex(e => e.studentId === req.studentId && e.courseCode === req.courseCode && e.active);
    if (idx > -1) savedEnrolls[idx].active = false;
  }
  saveEnrollments(savedEnrolls);
  renderRequests();
  renderHistory();
  renderAllEnrollments();
  renderStats();
}

function rejectRequest(reqId) {
  const reqs = getRequests();
  const req  = reqs.find(r => r.id === reqId);
  if (!req) return;
  req.status = "rejected";
  req.reviewedAt = new Date().toLocaleString();
  saveRequests(reqs);
  renderRequests();
  renderHistory();
}

/* ── Drag & Drop Course Enrollment ───────────────── */

let draggedCourseCode = null;

function renderDragDrop() {
  const availableList = document.getElementById("availableCourses");
  const enrolledList  = document.getElementById("enrolledCourses");
  if (!availableList || !enrolledList) return;

  const user         = getCurrentUser();
  const savedEnrolls = getEnrollments();
  const reqs         = getRequests();

  const myActive  = savedEnrolls.filter(e => e.studentId === user.id && e.active).map(e => e.courseCode);
  const myPending = reqs.filter(r => r.studentId === user.id && r.status === "pending" && r.type === "enroll").map(r => r.courseCode);
  const myDropPending = reqs.filter(r => r.studentId === user.id && r.status === "pending" && r.type === "drop").map(r => r.courseCode);

  // ── Available column ──
  availableList.innerHTML = "";
  courses.forEach(course => {
    if (myActive.includes(course.code)) return; // already enrolled, skip
    if (myPending.includes(course.code)) return; // already pending, skip

    const activeCount = savedEnrolls.filter(e => e.courseCode === course.code && e.active).length;
    const isFull      = activeCount >= course.capacity;

    // Prerequisite check
    const hasPrereq = !course.prerequisite ||
      savedEnrolls.some(e => e.studentId === user.id && e.courseCode === course.prerequisite && e.active);
    const isLocked = !hasPrereq || isFull;

    const card = document.createElement("div");
    card.className = "course-card" + (isLocked ? " locked" : " draggable");
    card.dataset.code = course.code;

    if (!isLocked) {
      card.draggable = true;
      card.addEventListener("dragstart", e => {
        draggedCourseCode = course.code;
        card.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
      });
      card.addEventListener("dragend", () => {
        draggedCourseCode = null;
        card.classList.remove("dragging");
      });
    }

    let lockReason = "";
    if (isFull) lockReason = "Course full";
    else if (!hasPrereq) lockReason = `Needs: ${course.prerequisite}`;

    card.innerHTML = `
      <div class="cc-header">
        <span class="cc-code">${course.code}</span>
        <span class="cc-cap ${isFull ? "cap-full" : ""}">${activeCount}/${course.capacity}</span>
      </div>
      <div class="cc-title">${course.title}</div>
      ${course.prerequisite ? `<div class="cc-prereq">Prereq: ${course.prerequisite}</div>` : ""}
      ${isLocked ? `<div class="cc-lock">🔒 ${lockReason}</div>` : ""}
    `;
    availableList.appendChild(card);
  });

  if (availableList.children.length === 0) {
    availableList.innerHTML = '<div class="dd-empty">No available courses to enroll in.</div>';
  }

  // ── Enrolled / Pending column ──
  enrolledList.innerHTML = "";

  // Active enrollments
  myActive.forEach(code => {
    const course = findCourse(code);
    if (!course) return;
    const isPendingDrop = myDropPending.includes(code);
    const enr = savedEnrolls.find(e => e.studentId === user.id && e.courseCode === code && e.active);
    const gradeText = enr && enr.grade !== null ? `Grade: ${enr.grade}` : "Grade: pending";

    const card = document.createElement("div");
    card.className = "course-card enrolled" + (isPendingDrop ? " pending-drop" : "");
    card.innerHTML = `
      <div class="cc-header">
        <span class="cc-code">${course.code}</span>
        <span class="cc-status ${isPendingDrop ? "status-drop" : "status-enrolled"}">
          ${isPendingDrop ? "Drop pending" : "Enrolled"}
        </span>
      </div>
      <div class="cc-title">${course.title}</div>
      <div class="cc-grade">${gradeText}</div>
      ${!isPendingDrop ? `<button class="drop-btn" onclick="submitDropRequest('${code}')">Request Drop</button>` : ""}
    `;
    enrolledList.appendChild(card);
  });

  // Pending enroll requests
  myPending.forEach(code => {
    const course = findCourse(code);
    if (!course) return;
    const card = document.createElement("div");
    card.className = "course-card pending-enroll";
    card.innerHTML = `
      <div class="cc-header">
        <span class="cc-code">${course.code}</span>
        <span class="cc-status status-pending">Pending approval</span>
      </div>
      <div class="cc-title">${course.title}</div>
      <button class="cancel-btn" onclick="cancelEnrollRequest('${code}')">✕ Cancel Request</button>
    `;
    enrolledList.appendChild(card);
  });

  if (enrolledList.children.length === 0) {
    enrolledList.innerHTML = '<div class="dd-empty">Drag courses here to enroll.</div>';
  }

  // ── Drop zone events ──
  const dropZone = document.getElementById("enrolledZone");
  if (dropZone) {
    dropZone.ondragover = (e) => {
      e.preventDefault();
      dropZone.classList.add("drop-active");
    };
    dropZone.ondragleave = () => dropZone.classList.remove("drop-active");
    dropZone.ondrop = (e) => {
      e.preventDefault();
      dropZone.classList.remove("drop-active");
      if (draggedCourseCode) {
        submitEnrollRequest(draggedCourseCode);
        draggedCourseCode = null;
      }
    };
  }

  renderStats();
}

/* ── Render: Requests (Registrar view) ───────────── */

function renderRequests() {
  const list = document.getElementById("requestList");
  if (!list) return;
  const reqs = getRequests().filter(r => r.status === "pending");
  list.innerHTML = "";

  if (reqs.length === 0) {
    list.innerHTML = '<li class="empty-state">No pending requests.</li>';
    return;
  }
  reqs.forEach(req => {
    const li = document.createElement("li");
    li.className = "request-item";
    const badge = req.type === "enroll" ? "enroll-badge" : "drop-badge";
    li.innerHTML = `
      <div class="request-header">
        <span class="req-badge ${badge}">${req.type}</span>
        <span class="req-name">${req.studentName}</span>
        <span class="req-id">${req.studentId}</span>
      </div>
      <div class="req-course">${req.courseCode} – ${req.courseTitle}</div>
      <div class="req-time">Submitted: ${req.submittedAt}</div>
      <div class="req-actions">
        <button class="approve-btn" onclick="approveRequest(${req.id})">Approve</button>
        <button class="reject-btn" onclick="rejectRequest(${req.id})">Reject</button>
      </div>`;
    list.appendChild(li);
  });
}

function renderHistory() {
  const list = document.getElementById("historyList");
  if (!list) return;
  const reqs = getRequests().filter(r => r.status !== "pending").reverse();
  list.innerHTML = "";
  if (reqs.length === 0) { list.innerHTML = '<li class="empty-state">No history yet.</li>'; return; }
  reqs.forEach(req => {
    const li = document.createElement("li");
    li.className = "request-item";
    const statusClass = req.status === "approved" ? "approved-badge" : "rejected-badge";
    const typeBadge   = req.type === "enroll" ? "enroll-badge" : "drop-badge";
    li.innerHTML = `
      <div class="request-header">
        <span class="req-badge ${typeBadge}">${req.type}</span>
        <span class="req-badge ${statusClass}">${req.status}</span>
        <span class="req-name">${req.studentName}</span>
      </div>
      <div class="req-course">${req.courseCode} – ${req.courseTitle}</div>
      <div class="req-time">Reviewed: ${req.reviewedAt || "—"}</div>`;
    list.appendChild(li);
  });
}

/* ── Render: Student's own enrollments ───────────── */

function renderMyEnrollments() {
  const list = document.getElementById("myEnrollList");
  if (!list) return;
  const user = getCurrentUser();
  if (!user) return;
  const savedEnrolls = getEnrollments();
  const mine = savedEnrolls.filter(e => e.studentId === user.id && e.active);
  list.innerHTML = "";
  if (mine.length === 0) { list.innerHTML = '<li class="empty-state">You are not enrolled in any courses yet.</li>'; return; }
  mine.forEach(e => {
    const li = document.createElement("li");
    li.className = "student-item";
    const gradeText = e.grade !== null ? ` · Grade: <strong>${e.grade}</strong>` : " · Grade: pending";
    li.innerHTML = `
      <div class="student-title">${e.courseCode} – ${e.courseTitle}</div>
      <div class="student-meta">Enrolled ${e.enrolledAt}${gradeText}</div>`;
    list.appendChild(li);
  });
}

function renderMyRequests() {
  const list = document.getElementById("myRequestList");
  if (!list) return;
  const user = getCurrentUser();
  if (!user) return;
  const reqs = getRequests().filter(r => r.studentId === user.id).reverse();
  list.innerHTML = "";
  if (reqs.length === 0) { list.innerHTML = '<li class="empty-state">No requests yet.</li>'; return; }
  reqs.forEach(req => {
    const li = document.createElement("li");
    li.className = "request-item";
    const statusClass = req.status === "approved" ? "approved-badge" : req.status === "rejected" ? "rejected-badge" : "pending-badge";
    const typeBadge   = req.type === "enroll" ? "enroll-badge" : "drop-badge";
    li.innerHTML = `
      <div class="request-header">
        <span class="req-badge ${typeBadge}">${req.type}</span>
        <span class="req-badge ${statusClass}">${req.status}</span>
      </div>
      <div class="req-course">${req.courseCode} – ${req.courseTitle}</div>
      <div class="req-time">Submitted: ${req.submittedAt}</div>`;
    list.appendChild(li);
  });
}

/* ── Render: Registrar – All Enrollments ─────────── */

function renderAllEnrollments() {
  const list = document.getElementById("allEnrollList");
  if (!list) return;
  const savedEnrolls = getEnrollments().filter(e => e.active);
  list.innerHTML = "";
  if (savedEnrolls.length === 0) { list.innerHTML = '<li class="empty-state">No active enrollments.</li>'; return; }
  const byStudent = {};
  savedEnrolls.forEach(e => {
    if (!byStudent[e.studentId]) byStudent[e.studentId] = { name: e.studentName, id: e.studentId, courses: [] };
    byStudent[e.studentId].courses.push(e);
  });
  Object.values(byStudent).forEach(s => {
    const li = document.createElement("li");
    li.className = "student-item";
    const rows = s.courses.map(c => {
      const g = c.grade !== null ? ` (Grade: ${c.grade})` : "";
      return `${c.courseCode}${g}`;
    }).join(", ");
    li.innerHTML = `
      <div class="student-title">${s.name} <span style="font-size:.78rem;opacity:.6">${s.id}</span></div>
      <div class="student-meta">${rows}</div>`;
    list.appendChild(li);
  });
}

/* ── Stats ────────────────────────────────────────── */

function renderStats() {
  const savedEnrolls   = getEnrollments().filter(e => e.active);
  const uniqueStudents = [...new Set(savedEnrolls.map(e => e.studentId))].length;
  const pendingCount   = getRequests().filter(r => r.status === "pending").length;
  const fullCount      = courses.filter(c => {
    const cnt = savedEnrolls.filter(e => e.courseCode === c.code).length;
    return cnt >= c.capacity;
  }).length;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set("studentCount", uniqueStudents);
  set("courseCount",  courses.length);
  set("enrollCount",  savedEnrolls.length);
  set("fullCount",    fullCount);
  set("pendingCount", pendingCount);
}

/* ── Grade Assignment (Registrar only) ───────────── */

function assignGrade() {
  const studentId  = (document.getElementById("studentIdInput")?.value  || "").trim();
  const courseCode = (document.getElementById("courseCodeInput")?.value || "").trim();
  const raw        = (document.getElementById("gradeInput")?.value      || "").trim();
  const grade      = Number(raw);

  if (!studentId || !courseCode)  return setMessage("Enter student ID and course code.");
  if (raw === "" || isNaN(grade) || grade < 0 || grade > 100) return setMessage("Enter a valid grade 0–100.");

  const savedEnrolls = getEnrollments();
  const idx = savedEnrolls.findIndex(e =>
    e.studentId === studentId && e.courseCode.toLowerCase() === courseCode.toLowerCase() && e.active
  );
  if (idx === -1) return setMessage("Active enrollment not found.");

  savedEnrolls[idx].grade = grade;
  saveEnrollments(savedEnrolls);
  setMessage(`✓ Grade ${grade} assigned to ${savedEnrolls[idx].studentName} for ${courseCode}.`, "#86efac");
  renderAllEnrollments();
}

/* ── Admin: Course Management ─────────────────────── */

function adminAddCourse() {
  const code     = (document.getElementById("newCode")?.value     || "").trim().toUpperCase();
  const title    = (document.getElementById("newTitle")?.value    || "").trim();
  const capacity = parseInt(document.getElementById("newCapacity")?.value || "0");
  const prereq   = (document.getElementById("newPrereq")?.value   || "").trim().toUpperCase() || null;

  if (!code || !title || capacity < 1) return setMessage("Fill in code, title, and capacity (≥1).");

  // Reload latest from storage before checking
  courses = loadCourses();
  if (courses.find(c => c.code === code)) return setMessage("A course with that code already exists.");

  const newCourse = { code, title, capacity, prerequisite: prereq || null };
  courses.push(newCourse);
  saveCourses(courses);

  setMessage(`✓ Course ${code} added.`, "#86efac");
  renderAdminCourses();

  ["newCode","newTitle","newCapacity","newPrereq"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

function adminRemoveCourse(code) {
  const savedEnrolls = getEnrollments();
  const hasActive = savedEnrolls.some(e => e.courseCode === code && e.active);
  if (hasActive) { setMessage(`Cannot remove ${code}: students are currently enrolled.`); return; }

  courses = courses.filter(c => c.code !== code);
  saveCourses(courses);
  setMessage(`✓ Course ${code} removed.`, "#86efac");
  renderAdminCourses();
}

function renderAdminCourses() {
  const list = document.getElementById("adminCourseList");
  if (!list) return;
  courses = loadCourses(); // always pull fresh
  list.innerHTML = "";
  const savedEnrolls = getEnrollments();

  courses.forEach(course => {
    const activeCount = savedEnrolls.filter(e => e.courseCode === course.code && e.active).length;
    const li = document.createElement("li");
    li.className = "course-item";
    li.innerHTML = `
      <div class="course-title">${course.code} – ${course.title}</div>
      <div class="course-meta">
        Capacity: ${activeCount}/${course.capacity}
        ${course.prerequisite ? ` · Prereq: ${course.prerequisite}` : ""}
        ${activeCount >= course.capacity ? ' <span class="badge-full">FULL</span>' : ""}
      </div>
      <div class="action-row" style="margin-top:8px">
        <button class="remove-btn" onclick="adminRemoveCourse('${course.code}')">Remove Course</button>
      </div>`;
    list.appendChild(li);
  });
  renderStats();
}

/* ── Render: courses (legacy fallback, not drag UI) ── */
function renderCourses() { renderDragDrop(); }

/* ── Init ─────────────────────────────────────────── */
(function init() {
  courses = loadCourses(); // always fresh on every page load
  syncUserUI();
  renderStats();
  renderDragDrop();
  renderRequests();
  renderHistory();
  renderMyEnrollments();
  renderMyRequests();
  renderAllEnrollments();
  renderAdminCourses();
})();
