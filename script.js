/* =====================================================
   CourseSim – script.js
   Roles: admin, registrar, student
   Features: drag-and-drop, school year/sem, grade history
   ===================================================== */

/* ── OOP Classes ──────────────────────────────────── */
class Student {
  constructor(name) { this.name = name; this.enrolledCourses = []; }
  enroll(course) {
    if (!this.enrolledCourses.includes(course)) { this.enrolledCourses.push(course); return true; }
    return false;
  }
  drop(course)  { this.enrolledCourses = this.enrolledCourses.filter(c => c !== course); }
  viewCourses() { return this.enrolledCourses; }
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
const LS_ACAD     = "cs_acadPeriod";   // { schoolYear: "2024-2025", semester: "1st" }

const PASSING_GRADE = 75;

/* ── Hardcoded system accounts ────────────────────── */
const SYSTEM_ACCOUNTS = [
  { id: "ADMIN-001", password: "admin123", name: "System Admin", role: "admin"     },
  { id: "REG-001",   password: "reg123",   name: "Registrar",    role: "registrar" }
];

/* ── Default course catalog ───────────────────────── */
const DEFAULT_COURSES = [
  { code: "ICT 111", title: "Object Oriented Programming", capacity: 3, prerequisite: null },
  { code: "ICT 112", title: "Operating Systems",           capacity: 2, prerequisite: null },
  { code: "ICT 113", title: "Database Systems",            capacity: 2, prerequisite: "ICT 111" },
  { code: "ICT 114", title: "Software Engineering",        capacity: 3, prerequisite: null }
];

/* ── Course helpers ───────────────────────────────── */
function loadCourses() {
  const stored = localStorage.getItem(LS_COURSES);
  if (stored) { try { const p = JSON.parse(stored); if (Array.isArray(p) && p.length) return p; } catch(e){} }
  localStorage.setItem(LS_COURSES, JSON.stringify(DEFAULT_COURSES));
  return DEFAULT_COURSES.map(c => ({...c}));
}
function saveCourses(list) { localStorage.setItem(LS_COURSES, JSON.stringify(list)); }
let courses = loadCourses();

/* ── Academic period helpers ──────────────────────── */
function getAcadPeriod() {
  const stored = localStorage.getItem(LS_ACAD);
  if (stored) { try { return JSON.parse(stored); } catch(e){} }
  const year = new Date().getFullYear();
  return { schoolYear: `${year}-${year+1}`, semester: "1st" };
}
function saveAcadPeriod(obj) { localStorage.setItem(LS_ACAD, JSON.stringify(obj)); }
function acadLabel(enr) {
  return enr.schoolYear && enr.semester
    ? `${enr.schoolYear} – ${enr.semester} Semester`
    : "Unknown Period";
}

/* ── Enrollment/request helpers ───────────────────── */
function getRequests()        { return JSON.parse(localStorage.getItem(LS_REQUESTS) || "[]"); }
function saveRequests(r)      { localStorage.setItem(LS_REQUESTS, JSON.stringify(r)); }
function getEnrollments()     { return JSON.parse(localStorage.getItem(LS_ENROLLS)  || "[]"); }
function saveEnrollments(a)   { localStorage.setItem(LS_ENROLLS,  JSON.stringify(a)); }

/* ── User helpers ─────────────────────────────────── */
function getUsers()  { return JSON.parse(localStorage.getItem(LS_USERS) || "[]"); }
function saveUsers(u){ localStorage.setItem(LS_USERS, JSON.stringify(u)); }

/* ── Misc helpers ─────────────────────────────────── */
function togglePassword(inputId, btn) {
  const el = document.getElementById(inputId);
  el.type = el.type === "password" ? "text" : "password";
  btn.textContent = el.type === "password" ? "Show" : "Hide";
}
function findCourse(code)  { return courses.find(c => c.code.toLowerCase() === code.toLowerCase()); }
function setMessage(text, color) {
  const el = document.getElementById("message") || document.getElementById("authMessage");
  if (!el) return;
  el.textContent = text;
  el.style.color = color || "#bfdbfe";
}
function initials(name) {
  return (name||"?").split(" ").map(n=>n[0]||"").join("").slice(0,2).toUpperCase();
}
function gradeStatus(grade) {
  if (grade === null || grade === undefined) return { label: "Pending", cls: "gs-pending" };
  if (grade >= PASSING_GRADE) return { label: "Passed", cls: "gs-passed" };
  return { label: "Failed", cls: "gs-failed" };
}

/* ── Auth ─────────────────────────────────────────── */
function getCurrentUser() { return JSON.parse(localStorage.getItem(LS_CURRENT) || "null"); }

function generateStudentId() {
  const year = new Date().getFullYear();
  const users = getUsers();
  const seq   = String(users.length + 1).padStart(4, "0");
  const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return `${year}-${seq}-${alpha[Math.floor(Math.random()*26)]}`;
}

function registerAccount() {
  const name     = (document.getElementById("regName")?.value     || "").trim();
  const password = (document.getElementById("regPassword")?.value || "").trim();
  const yearLvl  = (document.getElementById("regYear")?.value     || "").trim();
  const idDisp   = document.getElementById("generatedId");

  if (!name || !password || !yearLvl) return setMessage("Please fill in all fields.");
  if (password.length < 6)            return setMessage("Password must be at least 6 characters.");

  const users = getUsers();
  let id, attempts = 0;
  do { id = generateStudentId(); attempts++; }
  while (users.some(u => u.id === id) && attempts < 20);

  users.push({ name, id, password, role: "student", yearLevel: yearLvl });
  saveUsers(users);

  if (idDisp) { idDisp.textContent = `Your Student ID: ${id}`; idDisp.style.display = "block"; }
  setMessage("✓ Registration successful! Save your ID above, then log in.", "#86efac");
}

function login() {
  const id       = (document.getElementById("loginId")?.value       || "").trim();
  const password = (document.getElementById("loginPassword")?.value || "").trim();

  const sys = SYSTEM_ACCOUNTS.find(a => a.id === id && a.password === password);
  if (sys) {
    localStorage.setItem(LS_CURRENT, JSON.stringify(sys));
    setMessage("✓ Login successful! Redirecting…", "#86efac");
    setTimeout(() => { window.location.href = sys.role === "admin" ? "admin.html" : "enrollments.html"; }, 800);
    return;
  }
  const user = getUsers().find(u => u.id === id && u.password === password);
  if (!user) return setMessage("Invalid ID or password. Please try again.");
  localStorage.setItem(LS_CURRENT, JSON.stringify(user));
  setMessage("✓ Login successful! Redirecting…", "#86efac");
  setTimeout(() => { window.location.href = "courses.html"; }, 800);
}

function logout() { localStorage.removeItem(LS_CURRENT); window.location.href = "index.html"; }

/* ── Sidebar ──────────────────────────────────────── */
function syncUserUI() {
  const p = getCurrentUser();
  const set = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
  set("sidebarName", p ? p.name : "Guest");
  set("sidebarId",   p ? p.id   : "—");
  const av = document.getElementById("sidebarAvatar");
  if (av) av.textContent = initials(p ? p.name : "Guest");
  const rp = document.getElementById("sidebarRole");
  if (rp) { rp.textContent = p ? p.role.charAt(0).toUpperCase()+p.role.slice(1) : ""; rp.className = "role-pill "+(p?p.role:""); }
  const ll = document.getElementById("navLogout");
  if (ll) {
    if (p) { ll.textContent="Logout"; ll.href="#"; ll.onclick=(e)=>{e.preventDefault();logout();}; }
    else   { ll.textContent="Login";  ll.href="index.html"; ll.onclick=null; }
  }
}

/* ── Drag & Drop ──────────────────────────────────── */
let draggedCourseCode = null;

function renderDragDrop() {
  const availableList = document.getElementById("availableCourses");
  const enrolledList  = document.getElementById("enrolledCourses");
  if (!availableList || !enrolledList) return;

  courses = loadCourses();
  const user         = getCurrentUser();
  const savedEnrolls = getEnrollments();
  const reqs         = getRequests();
  const period       = getAcadPeriod();

  const myActive      = savedEnrolls.filter(e=>e.studentId===user.id&&e.active&&e.schoolYear===period.schoolYear&&e.semester===period.semester).map(e=>e.courseCode);
  const myPending     = reqs.filter(r=>r.studentId===user.id&&r.status==="pending"&&r.type==="enroll").map(r=>r.courseCode);
  const myDropPending = reqs.filter(r=>r.studentId===user.id&&r.status==="pending"&&r.type==="drop").map(r=>r.courseCode);

  // ── Available column ──
  availableList.innerHTML = "";
  courses.forEach(course => {
    if (myActive.includes(course.code) || myPending.includes(course.code)) return;

    const activeCount = savedEnrolls.filter(e=>e.courseCode===course.code&&e.active).length;
    const isFull      = activeCount >= course.capacity;
    const hasPrereq   = !course.prerequisite ||
      savedEnrolls.some(e=>e.studentId===user.id&&e.courseCode===course.prerequisite&&e.active&&e.grade>=PASSING_GRADE);
    const isLocked    = !hasPrereq || isFull;

    const card = document.createElement("div");
    card.className = "course-card" + (isLocked ? " locked" : " draggable");
    card.dataset.code = course.code;

    if (!isLocked) {
      card.draggable = true;
      card.addEventListener("dragstart", e => { draggedCourseCode=course.code; card.classList.add("dragging"); e.dataTransfer.effectAllowed="move"; });
      card.addEventListener("dragend",   () => { draggedCourseCode=null; card.classList.remove("dragging"); });
    }

    let lockReason = isFull ? "Course full" : `Needs: ${course.prerequisite}`;
    card.innerHTML = `
      <div class="cc-header">
        <span class="cc-code">${course.code}</span>
        <span class="cc-cap ${isFull?"cap-full":""}">${activeCount}/${course.capacity}</span>
      </div>
      <div class="cc-title">${course.title}</div>
      ${course.prerequisite ? `<div class="cc-prereq">Prereq: ${course.prerequisite}</div>` : ""}
      ${isLocked ? `<div class="cc-lock">🔒 ${lockReason}</div>` : ""}`;
    availableList.appendChild(card);
  });

  if (!availableList.children.length)
    availableList.innerHTML = '<div class="dd-empty">No courses available to enroll in.</div>';

  // ── Enrolled / Pending column ──
  enrolledList.innerHTML = "";

  myActive.forEach(code => {
    const course = findCourse(code);
    if (!course) return;
    const isPendingDrop = myDropPending.includes(code);
    const enr = savedEnrolls.find(e=>e.studentId===user.id&&e.courseCode===code&&e.active);
    const gradeText = enr?.grade !== null && enr?.grade !== undefined ? `Grade: ${enr.grade}` : "Grade: pending";
    const card = document.createElement("div");
    card.className = "course-card enrolled" + (isPendingDrop?" pending-drop":"");
    card.innerHTML = `
      <div class="cc-header">
        <span class="cc-code">${course.code}</span>
        <span class="cc-status ${isPendingDrop?"status-drop":"status-enrolled"}">${isPendingDrop?"Drop pending":"Enrolled"}</span>
      </div>
      <div class="cc-title">${course.title}</div>
      <div class="cc-grade">${gradeText}</div>
      ${!isPendingDrop?`<button class="drop-btn" onclick="submitDropRequest('${code}')">Request Drop</button>`:""}`;
    enrolledList.appendChild(card);
  });

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
      <button class="cancel-btn" onclick="cancelEnrollRequest('${code}')">✕ Cancel Request</button>`;
    enrolledList.appendChild(card);
  });

  if (!enrolledList.children.length)
    enrolledList.innerHTML = '<div class="dd-empty">Drag courses here to enroll.</div>';

  const dropZone = document.getElementById("enrolledZone");
  if (dropZone) {
    dropZone.ondragover  = e => { e.preventDefault(); dropZone.classList.add("drop-active"); };
    dropZone.ondragleave = () => dropZone.classList.remove("drop-active");
    dropZone.ondrop      = e => { e.preventDefault(); dropZone.classList.remove("drop-active"); if(draggedCourseCode){submitEnrollRequest(draggedCourseCode);draggedCourseCode=null;} };
  }
  renderStats();
}

/* ── Request actions ──────────────────────────────── */
function submitEnrollRequest(courseCode) {
  const user   = getCurrentUser();
  const course = findCourse(courseCode);
  const period = getAcadPeriod();
  if (!user||user.role!=="student") return setMessage("Must be logged in as student.");
  if (!course) return setMessage("Course not found.");

  const savedEnrolls = getEnrollments();
  const activeCount  = savedEnrolls.filter(e=>e.courseCode===courseCode&&e.active).length;
  if (activeCount>=course.capacity) return setMessage("Course is full.");
  if (savedEnrolls.some(e=>e.studentId===user.id&&e.courseCode===courseCode&&e.active))
    return setMessage("Already enrolled.");

  const reqs = getRequests();
  if (reqs.find(r=>r.studentId===user.id&&r.courseCode===courseCode&&r.status==="pending"&&r.type==="enroll"))
    return setMessage("Pending request already exists.");

  if (course.prerequisite) {
    const hasPrereq = savedEnrolls.some(e=>e.studentId===user.id&&e.courseCode===course.prerequisite&&e.active&&e.grade>=PASSING_GRADE);
    if (!hasPrereq) return setMessage(`Prerequisite required: ${course.prerequisite}`);
  }

  reqs.push({ id:Date.now(), type:"enroll", studentId:user.id, studentName:user.name,
    courseCode, courseTitle:course.title, status:"pending",
    schoolYear:period.schoolYear, semester:period.semester,
    submittedAt:new Date().toLocaleString() });
  saveRequests(reqs);
  renderDragDrop();
  setMessage(`✓ Enroll request for ${courseCode} submitted.`, "#86efac");
}

function submitDropRequest(courseCode) {
  const user   = getCurrentUser();
  const course = findCourse(courseCode);
  if (!user||user.role!=="student") return setMessage("Must be logged in as student.");
  const savedEnrolls = getEnrollments();
  if (!savedEnrolls.some(e=>e.studentId===user.id&&e.courseCode===courseCode&&e.active))
    return setMessage("Not enrolled in this course.");
  const reqs = getRequests();
  if (reqs.find(r=>r.studentId===user.id&&r.courseCode===courseCode&&r.status==="pending"&&r.type==="drop"))
    return setMessage("Drop request already pending.");
  reqs.push({ id:Date.now(), type:"drop", studentId:user.id, studentName:user.name,
    courseCode, courseTitle:course?.title||courseCode, status:"pending",
    submittedAt:new Date().toLocaleString() });
  saveRequests(reqs);
  renderDragDrop();
  setMessage(`✓ Drop request for ${courseCode} submitted.`, "#86efac");
}

function cancelEnrollRequest(courseCode) {
  const user = getCurrentUser();
  if (!user) return;
  const reqs = getRequests();
  const idx  = reqs.findIndex(r=>r.studentId===user.id&&r.courseCode===courseCode&&r.status==="pending"&&r.type==="enroll");
  if (idx>-1) { reqs.splice(idx,1); saveRequests(reqs); }
  renderDragDrop();
  setMessage(`Request for ${courseCode} cancelled.`, "#fde047");
}

function approveRequest(reqId) {
  const reqs = getRequests();
  const req  = reqs.find(r=>r.id===reqId);
  if (!req) return;
  req.status="approved"; req.reviewedAt=new Date().toLocaleString();
  saveRequests(reqs);
  const savedEnrolls = getEnrollments();
  if (req.type==="enroll") {
    savedEnrolls.push({ studentId:req.studentId, studentName:req.studentName,
      courseCode:req.courseCode, courseTitle:req.courseTitle,
      active:true, grade:null,
      schoolYear:req.schoolYear||getAcadPeriod().schoolYear,
      semester:req.semester||getAcadPeriod().semester,
      enrolledAt:new Date().toLocaleString() });
  } else if (req.type==="drop") {
    const idx = savedEnrolls.findIndex(e=>e.studentId===req.studentId&&e.courseCode===req.courseCode&&e.active);
    if (idx>-1) savedEnrolls[idx].active=false;
  }
  saveEnrollments(savedEnrolls);
  renderRequests(); renderHistory(); renderAllEnrollments(); renderStats();
}

function rejectRequest(reqId) {
  const reqs = getRequests();
  const req  = reqs.find(r=>r.id===reqId);
  if (!req) return;
  req.status="rejected"; req.reviewedAt=new Date().toLocaleString();
  saveRequests(reqs);
  renderRequests(); renderHistory();
}

/* ── Registrar renders ────────────────────────────── */
function renderRequests() {
  const list = document.getElementById("requestList");
  if (!list) return;
  const reqs = getRequests().filter(r=>r.status==="pending");
  list.innerHTML = reqs.length ? "" : '<li class="empty-state">No pending requests.</li>';
  reqs.forEach(req => {
    const li = document.createElement("li");
    li.className = "request-item";
    li.innerHTML = `
      <div class="request-header">
        <span class="req-badge ${req.type==="enroll"?"enroll-badge":"drop-badge"}">${req.type}</span>
        <span class="req-name">${req.studentName}</span>
        <span class="req-id">${req.studentId}</span>
      </div>
      <div class="req-course">${req.courseCode} – ${req.courseTitle}</div>
      ${req.schoolYear?`<div class="req-time">Period: ${req.schoolYear} – ${req.semester} Sem</div>`:""}
      <div class="req-time">Submitted: ${req.submittedAt}</div>
      <div class="req-actions">
        <button class="approve-btn" onclick="approveRequest(${req.id})">Approve</button>
        <button class="reject-btn"  onclick="rejectRequest(${req.id})">Reject</button>
      </div>`;
    list.appendChild(li);
  });
}

function renderHistory() {
  const list = document.getElementById("historyList");
  if (!list) return;
  const reqs = getRequests().filter(r=>r.status!=="pending").reverse();
  list.innerHTML = reqs.length ? "" : '<li class="empty-state">No history yet.</li>';
  reqs.forEach(req => {
    const li = document.createElement("li");
    li.className = "request-item";
    li.innerHTML = `
      <div class="request-header">
        <span class="req-badge ${req.type==="enroll"?"enroll-badge":"drop-badge"}">${req.type}</span>
        <span class="req-badge ${req.status==="approved"?"approved-badge":"rejected-badge"}">${req.status}</span>
        <span class="req-name">${req.studentName}</span>
      </div>
      <div class="req-course">${req.courseCode} – ${req.courseTitle}</div>
      <div class="req-time">Reviewed: ${req.reviewedAt||"—"}</div>`;
    list.appendChild(li);
  });
}

function renderAllEnrollments() {
  const list = document.getElementById("allEnrollList");
  if (!list) return;
  const active = getEnrollments().filter(e=>e.active);
  list.innerHTML = active.length ? "" : '<li class="empty-state">No active enrollments.</li>';
  const byStudent = {};
  active.forEach(e => {
    if (!byStudent[e.studentId]) byStudent[e.studentId]={name:e.studentName,id:e.studentId,courses:[]};
    byStudent[e.studentId].courses.push(e);
  });
  Object.values(byStudent).forEach(s => {
    const li = document.createElement("li"); li.className="student-item";
    const rows = s.courses.map(c=>`${c.courseCode}${c.grade!==null?` (${c.grade})`:"(pending)"}`).join(", ");
    li.innerHTML=`<div class="student-title">${s.name} <span style="font-size:.78rem;opacity:.6">${s.id}</span></div><div class="student-meta">${rows}</div>`;
    list.appendChild(li);
  });
}

/* ── Academic History (Student) ───────────────────── */
function renderAcadHistory() {
  const container = document.getElementById("acadHistory");
  if (!container) return;
  const user = getCurrentUser();
  if (!user) return;

  const allEnrolls = getEnrollments().filter(e=>e.studentId===user.id);
  if (!allEnrolls.length) {
    container.innerHTML = '<p class="empty-state">No enrollment history yet.</p>';
    return;
  }

  // Group by schoolYear + semester
  const grouped = {};
  allEnrolls.forEach(e => {
    const key = `${e.schoolYear||"Unknown"}|||${e.semester||"Unknown"}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });

  // Sort keys: newest first
  const sortedKeys = Object.keys(grouped).sort((a,b) => {
    const [ayA] = a.split("|||"); const [ayB] = b.split("|||");
    return ayB.localeCompare(ayA);
  });

  container.innerHTML = "";
  sortedKeys.forEach(key => {
    const [sy, sem] = key.split("|||");
    const enrolls   = grouped[key];
    const section   = document.createElement("div");
    section.className = "hist-section";

    const passed   = enrolls.filter(e=>e.grade!==null&&e.grade>=PASSING_GRADE).length;
    const failed   = enrolls.filter(e=>e.grade!==null&&e.grade<PASSING_GRADE).length;
    const pending  = enrolls.filter(e=>e.grade===null).length;

    section.innerHTML = `
      <div class="hist-header">
        <div>
          <span class="hist-year">${sy}</span>
          <span class="hist-sem">${sem} Semester</span>
        </div>
        <div class="hist-summary">
          <span class="hs-item hs-pass">✓ ${passed} Passed</span>
          ${failed  ? `<span class="hs-item hs-fail">✗ ${failed} Failed</span>` : ""}
          ${pending ? `<span class="hs-item hs-pend">⏳ ${pending} Pending</span>` : ""}
        </div>
      </div>
      <table class="hist-table">
        <thead><tr><th>Code</th><th>Course</th><th>Status</th><th>Grade</th><th>Result</th></tr></thead>
        <tbody>
          ${enrolls.map(e => {
            const st = gradeStatus(e.grade);
            const activeLabel = e.active ? "" : ' <span class="dropped-tag">Dropped</span>';
            return `<tr>
              <td class="ht-code">${e.courseCode}${activeLabel}</td>
              <td>${e.courseTitle||e.courseCode}</td>
              <td>${e.active?"Enrolled":"Dropped"}</td>
              <td class="ht-grade">${e.grade!==null?e.grade:"—"}</td>
              <td><span class="grade-status ${st.cls}">${e.active?(e.grade!==null?st.label:"Pending"):"Dropped"}</span></td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>`;
    container.appendChild(section);
  });
}

/* ── My Enrollments (current period) ─────────────── */
function renderMyEnrollments() {
  const list = document.getElementById("myEnrollList");
  if (!list) return;
  const user   = getCurrentUser();
  const period = getAcadPeriod();
  const mine   = getEnrollments().filter(e=>e.studentId===user.id&&e.active&&e.schoolYear===period.schoolYear&&e.semester===period.semester);
  list.innerHTML = mine.length ? "" : '<li class="empty-state">No active enrollments this period.</li>';
  mine.forEach(e => {
    const st = gradeStatus(e.grade);
    const li = document.createElement("li"); li.className="student-item";
    li.innerHTML=`
      <div class="student-title">${e.courseCode} – ${e.courseTitle}</div>
      <div class="student-meta">
        ${e.enrolledAt} &nbsp;·&nbsp;
        Grade: <strong>${e.grade!==null?e.grade:"pending"}</strong> &nbsp;
        <span class="grade-status ${st.cls}">${e.grade!==null?st.label:"Pending"}</span>
      </div>`;
    list.appendChild(li);
  });
}

function renderMyRequests() {
  const list = document.getElementById("myRequestList");
  if (!list) return;
  const user = getCurrentUser();
  const reqs = getRequests().filter(r=>r.studentId===user.id).reverse();
  list.innerHTML = reqs.length ? "" : '<li class="empty-state">No requests yet.</li>';
  reqs.forEach(req => {
    const li = document.createElement("li"); li.className="request-item";
    li.innerHTML=`
      <div class="request-header">
        <span class="req-badge ${req.type==="enroll"?"enroll-badge":"drop-badge"}">${req.type}</span>
        <span class="req-badge ${req.status==="approved"?"approved-badge":req.status==="rejected"?"rejected-badge":"pending-badge"}">${req.status}</span>
      </div>
      <div class="req-course">${req.courseCode} – ${req.courseTitle}</div>
      <div class="req-time">Submitted: ${req.submittedAt}</div>`;
    list.appendChild(li);
  });
}

/* ── Stats ────────────────────────────────────────── */
function renderStats() {
  courses = loadCourses();
  const savedEnrolls   = getEnrollments().filter(e=>e.active);
  const uniqueStudents = [...new Set(savedEnrolls.map(e=>e.studentId))].length;
  const pendingCount   = getRequests().filter(r=>r.status==="pending").length;
  const fullCount      = courses.filter(c=>savedEnrolls.filter(e=>e.courseCode===c.code).length>=c.capacity).length;
  const set = (id,val)=>{ const el=document.getElementById(id); if(el) el.textContent=val; };
  set("studentCount", uniqueStudents);
  set("courseCount",  courses.length);
  set("enrollCount",  savedEnrolls.length);
  set("fullCount",    fullCount);
  set("pendingCount", pendingCount);
}

/* ── Grade Assignment ─────────────────────────────── */
function assignGrade() {
  const studentId  = (document.getElementById("studentIdInput")?.value  ||"").trim();
  const courseCode = (document.getElementById("courseCodeInput")?.value ||"").trim();
  const raw        = (document.getElementById("gradeInput")?.value      ||"").trim();
  const grade      = Number(raw);
  if (!studentId||!courseCode) return setMessage("Enter student ID and course code.");
  if (raw===""||isNaN(grade)||grade<0||grade>100) return setMessage("Enter a valid grade 0–100.");
  const arr = getEnrollments();
  const idx = arr.findIndex(e=>e.studentId===studentId&&e.courseCode.toLowerCase()===courseCode.toLowerCase()&&e.active);
  if (idx===-1) return setMessage("Active enrollment not found.");
  arr[idx].grade = grade;
  saveEnrollments(arr);
  setMessage(`✓ Grade ${grade} assigned to ${arr[idx].studentName} for ${courseCode}.`, "#86efac");
  renderAllEnrollments();
}

/* ── Admin: Academic Period ───────────────────────── */
function renderAcadPeriodAdmin() {
  const p = getAcadPeriod();
  const sy = document.getElementById("acadYear"); if(sy) sy.value=p.schoolYear;
  const ss = document.getElementById("acadSem");  if(ss) ss.value=p.semester;
  const lb = document.getElementById("currentPeriodLabel");
  if(lb) lb.textContent=`${p.schoolYear} – ${p.semester} Semester`;
}

function saveAcadPeriodAdmin() {
  const sy = (document.getElementById("acadYear")?.value||"").trim();
  const ss = (document.getElementById("acadSem")?.value ||"").trim();
  if(!sy||!ss) return setMessage("Fill in both school year and semester.");
  saveAcadPeriod({ schoolYear:sy, semester:ss });
  setMessage(`✓ Academic period set to ${sy} – ${ss} Semester.`, "#86efac");
  renderAcadPeriodAdmin();
}

/* ── Admin: Course Management ─────────────────────── */
function adminAddCourse() {
  const code     = (document.getElementById("newCode")?.value     ||"").trim().toUpperCase();
  const title    = (document.getElementById("newTitle")?.value    ||"").trim();
  const capacity = parseInt(document.getElementById("newCapacity")?.value||"0");
  const prereq   = (document.getElementById("newPrereq")?.value   ||"").trim().toUpperCase()||null;
  if(!code||!title||capacity<1) return setMessage("Fill in code, title, and capacity (≥1).");
  courses = loadCourses();
  if(courses.find(c=>c.code===code)) return setMessage("Course code already exists.");
  courses.push({ code, title, capacity, prerequisite:prereq||null });
  saveCourses(courses);
  setMessage(`✓ Course ${code} added.`, "#86efac");
  renderAdminCourses();
  ["newCode","newTitle","newCapacity","newPrereq"].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=""; });
}

function adminRemoveCourse(code) {
  if(getEnrollments().some(e=>e.courseCode===code&&e.active)){ setMessage(`Cannot remove ${code}: students are enrolled.`); return; }
  courses = courses.filter(c=>c.code!==code);
  saveCourses(courses);
  setMessage(`✓ Course ${code} removed.`, "#86efac");
  renderAdminCourses();
}

function renderAdminCourses() {
  const list = document.getElementById("adminCourseList");
  if (!list) return;
  courses = loadCourses();
  list.innerHTML="";
  const saved = getEnrollments();
  courses.forEach(course=>{
    const cnt = saved.filter(e=>e.courseCode===course.code&&e.active).length;
    const li  = document.createElement("li"); li.className="course-item";
    li.innerHTML=`
      <div class="course-title">${course.code} – ${course.title}</div>
      <div class="course-meta">Capacity: ${cnt}/${course.capacity}${course.prerequisite?` · Prereq: ${course.prerequisite}`:""}${cnt>=course.capacity?' <span class="badge-full">FULL</span>':""}</div>
      <div class="action-row" style="margin-top:8px">
        <button class="remove-btn" onclick="adminRemoveCourse('${course.code}')">Remove Course</button>
      </div>`;
    list.appendChild(li);
  });
  renderStats();
}

/* ── Admin: User Management ───────────────────────── */
function renderAdminUsers() {
  const list = document.getElementById("adminUserList");
  if (!list) return;
  const users = getUsers();
  list.innerHTML = users.length ? "" : '<li class="empty-state">No student accounts yet.</li>';
  users.forEach(u => {
    const enrollCount = getEnrollments().filter(e=>e.studentId===u.id&&e.active).length;
    const li = document.createElement("li"); li.className="student-item user-item";
    li.innerHTML=`
      <div class="user-item-header">
        <div class="user-avatar-sm">${initials(u.name)}</div>
        <div class="user-info">
          <div class="student-title">${u.name}</div>
          <div class="student-meta">${u.id} &nbsp;·&nbsp; ${u.yearLevel||"—"} Year &nbsp;·&nbsp; ${enrollCount} active enrollment${enrollCount!==1?"s":""}</div>
        </div>
        <button class="remove-btn user-remove-btn" onclick="adminRemoveUser('${u.id}')">Remove</button>
      </div>`;
    list.appendChild(li);
  });
}

function adminRemoveUser(userId) {
  if (!confirm(`Remove user ${userId}? This will also remove all their enrollment records.`)) return;
  const users = getUsers().filter(u=>u.id!==userId);
  saveUsers(users);
  const enrolls = getEnrollments().filter(e=>e.studentId!==userId);
  saveEnrollments(enrolls);
  const reqs = getRequests().filter(r=>r.studentId!==userId);
  saveRequests(reqs);
  // If this user was logged in, log them out
  const cur = getCurrentUser();
  if (cur && cur.id===userId) logout();
  setMessage(`✓ User ${userId} removed.`, "#86efac");
  renderAdminUsers();
  renderStats();
}

/* ── Init ─────────────────────────────────────────── */
(function init() {
  courses = loadCourses();
  syncUserUI();
  renderStats();
  renderDragDrop();
  renderRequests();
  renderHistory();
  renderMyEnrollments();
  renderMyRequests();
  renderAllEnrollments();
  renderAdminCourses();
  renderAdminUsers();
  renderAcadPeriodAdmin();
  renderAcadHistory();

  const loginId   = document.getElementById("loginId");
  const loginPass = document.getElementById("loginPassword");
  const regName = document.getElementById("regName");
  const regPass = document.getElementById("regPassword");

  function handleLoginEnter(e) {
    if (e.key === "Enter") login();
  }
  function handleRegisterEnter(e) {
  if (e.key === "Enter") registerAccount();
  }

  if (loginId)   loginId.addEventListener("keydown",   handleLoginEnter);
  if (loginPass) loginPass.addEventListener("keydown", handleLoginEnter);
  if (regName) regName.addEventListener("keydown", handleRegisterEnter);
  if (regPass) regPass.addEventListener("keydown", handleRegisterEnter);
})();
