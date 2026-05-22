/* =====================================================
   CourseSim – script.js  (Role-based edition)
   Roles: admin, registrar, student
   ===================================================== */

/* ── OOP Classes ──────────────────────────────────── */

class Student {
  constructor(name) {
    this.name = name;
    this.enrolledCourses = [];
  }
  enroll(course) {
    if (!this.enrolledCourses.includes(course)) {
      this.enrolledCourses.push(course);
      return true;
    }
    return false;
  }
  drop(course) {
    this.enrolledCourses = this.enrolledCourses.filter(c => c !== course);
  }
  viewCourses() { return this.enrolledCourses; }
}

class Course {
  constructor(code, title, capacity, prerequisite = null) {
    this.code        = code;
    this.title       = title;
    this.capacity    = capacity;
    this.prerequisite = prerequisite;
    this.students    = [];
  }
  isFull()          { return this.students.length >= this.capacity; }
  addStudent(s)     { if (!this.isFull() && !this.students.includes(s)) { this.students.push(s); return true; } return false; }
  removeStudent(s)  { this.students = this.students.filter(x => x !== s); }
}

class Enrollment {
  constructor(student, course) {
    this.student = student;
    this.course  = course;
    this.grade   = null;
  }
  assignGrade(g) { this.grade = g; }
}

/* ── Course catalog ───────────────────────────────── */

let courses = [
  new Course("ICT 111", "Object Oriented Programming", 3),
  new Course("ICT 112", "Operating Systems", 2),
  new Course("ICT 113", "Database Systems", 2, "ICT 111"),
  new Course("ICT 114", "Software Engineering", 3)
];

const students    = [];
const enrollments = [];

/* ── Hardcoded system accounts ────────────────────── */
const SYSTEM_ACCOUNTS = [
  { id: "ADMIN-001", password: "admin123", name: "System Admin",  role: "admin"     },
  { id: "REG-001",   password: "reg123",   name: "Registrar",     role: "registrar" }
];

/* ── localStorage keys ────────────────────────────── */
const LS_USERS    = "cs_users";
const LS_CURRENT  = "cs_currentUser";
const LS_REQUESTS = "cs_pendingRequests";
const LS_COURSES  = "cs_courses";
const LS_ENROLLS  = "cs_enrollments";

/* ── Helpers ──────────────────────────────────────── */

function togglePassword(inputId, button) {
  const input = document.getElementById(inputId);
  input.type  = input.type === "password" ? "text" : "password";
  button.textContent = input.type === "password" ? "Show" : "Hide";
}

function findStudent(name) { return students.find(s => s.name.toLowerCase() === name.toLowerCase()); }
function findCourse(code)  { return courses.find(c => c.code.toLowerCase() === code.toLowerCase()); }
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

  // Check system accounts first
  const sys = SYSTEM_ACCOUNTS.find(a => a.id === id && a.password === password);
  if (sys) {
    localStorage.setItem(LS_CURRENT, JSON.stringify(sys));
    setMessage("✓ Login successful! Redirecting…", "#86efac");
    setTimeout(() => {
      if (sys.role === "admin")      window.location.href = "admin.html";
      else if (sys.role === "registrar") window.location.href = "enrollments.html";
    }, 800);
    return;
  }

  // Check student accounts
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

/* ── Role guard ───────────────────────────────────── */

function requireRole(...roles) {
  const user = getCurrentUser();
  if (!user || !roles.includes(user.role)) {
    window.location.href = "index.html";
    return false;
  }
  return true;
}

/* ── Sidebar ──────────────────────────────────────── */

function syncUserUI() {
  const profile = getCurrentUser();
  const nameEl   = document.getElementById("sidebarName");
  const idEl     = document.getElementById("sidebarId");
  const avatarEl = document.getElementById("sidebarAvatar");
  const roleEl   = document.getElementById("sidebarRole");

  if (nameEl)   nameEl.textContent   = profile ? profile.name : "Guest";
  if (idEl)     idEl.textContent     = profile ? profile.id   : "—";
  if (avatarEl) avatarEl.textContent = initials(profile ? profile.name : "Guest");
  if (roleEl)   roleEl.textContent   = profile ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : "";

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

function getRequests() {
  return JSON.parse(localStorage.getItem(LS_REQUESTS) || "[]");
}
function saveRequests(reqs) {
  localStorage.setItem(LS_REQUESTS, JSON.stringify(reqs));
}

function submitEnrollRequest(courseCode) {
  const user = getCurrentUser();
  if (!user || user.role !== "student") return setMessage("You must be logged in as a student.");
  const course = findCourse(courseCode);
  if (!course) return setMessage("Course not found.");
  if (course.isFull()) return setMessage("Course is full.");

  // Check prereq
  const reqs = getRequests();
  const savedEnrolls = JSON.parse(localStorage.getItem(LS_ENROLLS) || "[]");
  const alreadyEnrolled = savedEnrolls.some(e => e.studentId === user.id && e.courseCode === courseCode && e.active);

  if (alreadyEnrolled) return setMessage("You are already enrolled in this course.");

  const duplicate = reqs.find(r => r.studentId === user.id && r.courseCode === courseCode && r.status === "pending");
  if (duplicate) return setMessage("You already have a pending request for this course.");

  if (course.prerequisite) {
    const hasPrereq = savedEnrolls.some(e => e.studentId === user.id && e.courseCode === course.prerequisite && e.active);
    if (!hasPrereq) return setMessage(`Prerequisite required: ${course.prerequisite}`);
  }

  reqs.push({
    id:         Date.now(),
    type:       "enroll",
    studentId:  user.id,
    studentName: user.name,
    courseCode,
    courseTitle: course.title,
    status:     "pending",
    submittedAt: new Date().toLocaleString()
  });
  saveRequests(reqs);
  renderCourses();
  setMessage(`✓ Enrollment request for ${courseCode} submitted. Awaiting registrar approval.`, "#86efac");
}

function submitDropRequest(courseCode) {
  const user = getCurrentUser();
  if (!user || user.role !== "student") return setMessage("You must be logged in as a student.");
  const course = findCourse(courseCode);
  if (!course) return setMessage("Course not found.");

  const savedEnrolls = JSON.parse(localStorage.getItem(LS_ENROLLS) || "[]");
  const enrolled = savedEnrolls.some(e => e.studentId === user.id && e.courseCode === courseCode && e.active);
  if (!enrolled) return setMessage("You are not enrolled in this course.");

  const reqs = getRequests();
  const duplicate = reqs.find(r => r.studentId === user.id && r.courseCode === courseCode && r.status === "pending" && r.type === "drop");
  if (duplicate) return setMessage("You already have a pending drop request for this course.");

  reqs.push({
    id:          Date.now(),
    type:        "drop",
    studentId:   user.id,
    studentName: user.name,
    courseCode,
    courseTitle: course.title,
    status:      "pending",
    submittedAt: new Date().toLocaleString()
  });
  saveRequests(reqs);
  setMessage(`✓ Drop request for ${courseCode} submitted. Awaiting registrar approval.`, "#86efac");
}

function approveRequest(reqId) {
  const reqs = getRequests();
  const req  = reqs.find(r => r.id === reqId);
  if (!req) return;
  req.status = "approved";
  req.reviewedAt = new Date().toLocaleString();
  saveRequests(reqs);

  const savedEnrolls = JSON.parse(localStorage.getItem(LS_ENROLLS) || "[]");

  if (req.type === "enroll") {
    savedEnrolls.push({
      studentId:   req.studentId,
      studentName: req.studentName,
      courseCode:  req.courseCode,
      courseTitle: req.courseTitle,
      active:      true,
      grade:       null,
      enrolledAt:  new Date().toLocaleString()
    });
  } else if (req.type === "drop") {
    const idx = savedEnrolls.findIndex(e => e.studentId === req.studentId && e.courseCode === req.courseCode && e.active);
    if (idx > -1) savedEnrolls[idx].active = false;
  }

  localStorage.setItem(LS_ENROLLS, JSON.stringify(savedEnrolls));
  renderRequests();
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
}

/* ── Render: Requests (Registrar view) ────────────── */

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
    const label = req.type === "enroll" ? "Enroll" : "Drop";
    li.innerHTML = `
      <div class="request-header">
        <span class="req-badge ${badge}">${label}</span>
        <span class="req-name">${req.studentName}</span>
        <span class="req-id">${req.studentId}</span>
      </div>
      <div class="req-course">${req.courseCode} – ${req.courseTitle}</div>
      <div class="req-time">Submitted: ${req.submittedAt}</div>
      <div class="req-actions">
        <button class="approve-btn" onclick="approveRequest(${req.id})">Approve</button>
        <button class="reject-btn alt" onclick="rejectRequest(${req.id})">Reject</button>
      </div>`;
    list.appendChild(li);
  });
}

function renderHistory() {
  const list = document.getElementById("historyList");
  if (!list) return;
  const reqs = getRequests().filter(r => r.status !== "pending").reverse();
  list.innerHTML = "";

  if (reqs.length === 0) {
    list.innerHTML = '<li class="empty-state">No history yet.</li>';
    return;
  }

  reqs.forEach(req => {
    const li = document.createElement("li");
    li.className = "request-item";
    const statusClass = req.status === "approved" ? "approved-badge" : "rejected-badge";
    const typeBadge = req.type === "enroll" ? "enroll-badge" : "drop-badge";
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

/* ── Render: Courses ──────────────────────────────── */

function renderCourses() {
  const list = document.getElementById("courseList");
  if (!list) return;
  list.innerHTML = "";
  const user = getCurrentUser();
  const savedEnrolls = JSON.parse(localStorage.getItem(LS_ENROLLS) || "[]");
  const reqs = getRequests();

  courses.forEach(course => {
    const li = document.createElement("li");
    li.className = "course-item";

    const enrolled = user && savedEnrolls.some(e => e.studentId === user.id && e.courseCode === course.code && e.active);
    const pendingEnroll = user && reqs.some(r => r.studentId === user.id && r.courseCode === course.code && r.status === "pending" && r.type === "enroll");
    const pendingDrop   = user && reqs.some(r => r.studentId === user.id && r.courseCode === course.code && r.status === "pending" && r.type === "drop");

    // Count active enrollments from localStorage
    const activeCount = savedEnrolls.filter(e => e.courseCode === course.code && e.active).length;

    li.innerHTML = `
      <div class="course-title">${course.code} – ${course.title}</div>
      <div class="course-meta">
        ${activeCount}/${course.capacity} students
        ${course.prerequisite ? ` · Prereq: ${course.prerequisite}` : ""}
        ${activeCount >= course.capacity ? ' <span class="badge-full">FULL</span>' : ""}
        ${enrolled ? ' <span class="badge-enrolled">ENROLLED</span>' : ""}
        ${pendingEnroll ? ' <span class="badge-pending">PENDING ENROLL</span>' : ""}
        ${pendingDrop   ? ' <span class="badge-pending">PENDING DROP</span>'   : ""}
      </div>`;

    if (user && user.role === "student") {
      const row = document.createElement("div");
      row.className = "action-row";

      const enrollBtn = document.createElement("button");
      enrollBtn.textContent = "Request Enroll";
      enrollBtn.disabled    = activeCount >= course.capacity || enrolled || pendingEnroll;
      enrollBtn.onclick     = () => submitEnrollRequest(course.code);

      const dropBtn = document.createElement("button");
      dropBtn.textContent = "Request Drop";
      dropBtn.className   = "alt";
      dropBtn.disabled    = !enrolled || pendingDrop;
      dropBtn.onclick     = () => submitDropRequest(course.code);

      row.appendChild(enrollBtn);
      row.appendChild(dropBtn);
      li.appendChild(row);
    }

    list.appendChild(li);
  });

  renderStats();
}

/* ── Render: Student's own enrollments ───────────── */

function renderMyEnrollments() {
  const list = document.getElementById("myEnrollList");
  if (!list) return;
  const user = getCurrentUser();
  if (!user) return;

  const savedEnrolls = JSON.parse(localStorage.getItem(LS_ENROLLS) || "[]");
  const mine = savedEnrolls.filter(e => e.studentId === user.id && e.active);
  list.innerHTML = "";

  if (mine.length === 0) {
    list.innerHTML = '<li class="empty-state">You are not enrolled in any courses yet.</li>';
    return;
  }

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

/* ── Render: Registrar – All Enrollments ─────────── */

function renderAllEnrollments() {
  const list = document.getElementById("allEnrollList");
  if (!list) return;
  const savedEnrolls = JSON.parse(localStorage.getItem(LS_ENROLLS) || "[]").filter(e => e.active);
  list.innerHTML = "";

  if (savedEnrolls.length === 0) {
    list.innerHTML = '<li class="empty-state">No active enrollments.</li>';
    return;
  }

  // Group by student
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
  const savedEnrolls = JSON.parse(localStorage.getItem(LS_ENROLLS) || "[]").filter(e => e.active);
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
  const studentId  = (document.getElementById("studentIdInput")?.value || "").trim();
  const courseCode = (document.getElementById("courseCodeInput")?.value || "").trim();
  const raw        = (document.getElementById("gradeInput")?.value || "").trim();
  const grade      = Number(raw);

  if (!studentId || !courseCode) return setMessage("Enter student ID and course code.");
  if (raw === "" || isNaN(grade) || grade < 0 || grade > 100) return setMessage("Enter a valid grade 0–100.");

  const savedEnrolls = JSON.parse(localStorage.getItem(LS_ENROLLS) || "[]");
  const idx = savedEnrolls.findIndex(e => e.studentId === studentId && e.courseCode.toLowerCase() === courseCode.toLowerCase() && e.active);

  if (idx === -1) return setMessage("Active enrollment not found for this student and course.");

  savedEnrolls[idx].grade = grade;
  localStorage.setItem(LS_ENROLLS, JSON.stringify(savedEnrolls));
  setMessage(`✓ Grade ${grade} assigned to ${savedEnrolls[idx].studentName} for ${courseCode}.`, "#86efac");
  renderAllEnrollments();
}

/* ── Admin: Course Management ─────────────────────── */

function adminAddCourse() {
  const code     = (document.getElementById("newCode")?.value  || "").trim().toUpperCase();
  const title    = (document.getElementById("newTitle")?.value || "").trim();
  const capacity = parseInt(document.getElementById("newCapacity")?.value || "0");
  const prereq   = (document.getElementById("newPrereq")?.value || "").trim().toUpperCase() || null;

  if (!code || !title || capacity < 1) return setMessage("Fill in code, title, and capacity (≥1).");
  if (courses.find(c => c.code === code)) return setMessage("A course with that code already exists.");

  courses.push(new Course(code, title, capacity, prereq || null));
  setMessage(`✓ Course ${code} added.`, "#86efac");
  renderAdminCourses();

  document.getElementById("newCode").value     = "";
  document.getElementById("newTitle").value    = "";
  document.getElementById("newCapacity").value = "";
  document.getElementById("newPrereq").value   = "";
}

function adminRemoveCourse(code) {
  const savedEnrolls = JSON.parse(localStorage.getItem(LS_ENROLLS) || "[]");
  const hasActive = savedEnrolls.some(e => e.courseCode === code && e.active);
  if (hasActive) {
    setMessage(`Cannot remove ${code}: students are currently enrolled.`);
    return;
  }
  courses = courses.filter(c => c.code !== code);
  setMessage(`✓ Course ${code} removed.`, "#86efac");
  renderAdminCourses();
}

function renderAdminCourses() {
  const list = document.getElementById("adminCourseList");
  if (!list) return;
  list.innerHTML = "";
  const savedEnrolls = JSON.parse(localStorage.getItem(LS_ENROLLS) || "[]");

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
        <button class="alt remove-btn" onclick="adminRemoveCourse('${course.code}')">Remove Course</button>
      </div>`;
    list.appendChild(li);
  });
  renderStats();
}

/* ── My Requests (Student view) ───────────────────── */

function renderMyRequests() {
  const list = document.getElementById("myRequestList");
  if (!list) return;
  const user = getCurrentUser();
  if (!user) return;

  const reqs = getRequests().filter(r => r.studentId === user.id).reverse();
  list.innerHTML = "";

  if (reqs.length === 0) {
    list.innerHTML = '<li class="empty-state">No requests yet.</li>';
    return;
  }

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

/* ── Init ─────────────────────────────────────────── */

(function init() {
  syncUserUI();
  renderCourses();
  renderStats();
  renderRequests();
  renderHistory();
  renderMyEnrollments();
  renderMyRequests();
  renderAllEnrollments();
  renderAdminCourses();
})();
