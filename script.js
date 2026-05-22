/* =====================================================
   CourseSim – script.js (with localStorage Database)
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
  viewCourses() {
    return this.enrolledCourses;
  }
}

class Course {
  constructor(code, title, capacity, prerequisite = null) {
    this.code = code;
    this.title = title;
    this.capacity = capacity;
    this.prerequisite = prerequisite;
    this.students = [];
  }
  isFull() {
    return this.students.length >= this.capacity;
  }
  addStudent(student) {
    if (!this.isFull() && !this.students.includes(student)) {
      this.students.push(student);
      return true;
    }
    return false;
  }
  removeStudent(student) {
    this.students = this.students.filter(s => s !== student);
  }
}

class Enrollment {
  constructor(student, course) {
    this.student = student;
    this.course = course;
    this.grade = null;
  }
  assignGrade(grade) {
    this.grade = grade;
  }
}

/* ── Course catalog ───────────────────────────────── */

const courses = [
  new Course("ICT 111", "Object Oriented Programming", 3),
  new Course("ICT 112", "Operating Systems", 2),
  new Course("ICT 113", "Database Systems", 2, "ICT 111"),
  new Course("ICT 114", "Software Engineering", 3)
];

const students   = [];
const enrollments = [];

/* ── LocalStorage Database Functions ───────────────── */

function saveToDatabase() {
  try {
    // Save students with their course codes (not object references)
    const studentsData = students.map(s => ({
      name: s.name,
      enrolledCourses: s.enrolledCourses.map(c => c.code)
    }));

    // Save enrollments with student names and course codes
    const enrollmentsData = enrollments.map(e => ({
      studentName: e.student.name,
      courseCode: e.course.code,
      grade: e.grade
    }));

    localStorage.setItem("cs_students", JSON.stringify(studentsData));
    localStorage.setItem("cs_enrollments", JSON.stringify(enrollmentsData));
    
    console.log("✓ Data saved to localStorage");
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }
}

function loadFromDatabase() {
  try {
    // Load students
    const studentsData = JSON.parse(localStorage.getItem("cs_students") || "[]");
    
    studentsData.forEach(data => {
      const student = new Student(data.name);
      
      // Re-link course objects
      data.enrolledCourses.forEach(courseCode => {
        const course = findCourse(courseCode);
        if (course) {
          student.enrolledCourses.push(course);
          if (!course.students.includes(student)) {
            course.students.push(student);
          }
        }
      });
      
      students.push(student);
    });

    // Load enrollments
    const enrollmentsData = JSON.parse(localStorage.getItem("cs_enrollments") || "[]");
    
    enrollmentsData.forEach(data => {
      const student = findStudent(data.studentName);
      const course = findCourse(data.courseCode);
      
      if (student && course) {
        const enrollment = new Enrollment(student, course);
        enrollment.grade = data.grade;
        enrollments.push(enrollment);
      }
    });

    console.log("✓ Data loaded from localStorage");
    console.log(`  Students: ${students.length}`);
    console.log(`  Enrollments: ${enrollments.length}`);
  } catch (error) {
    console.error("Error loading from localStorage:", error);
  }
}

/* ── Helpers ──────────────────────────────────────── */

function togglePassword(inputId, button) {
  const input = document.getElementById(inputId);
  if (input.type === "password") {
    input.type = "text";
    button.textContent = "Hide";
  } else {
    input.type = "password";
    button.textContent = "Show";
  }
}

function findStudent(name) {
  return students.find(s => s.name.toLowerCase() === name.toLowerCase());
}
function findCourse(code) {
  return courses.find(c => c.code.toLowerCase() === code.toLowerCase());
}
function findEnrollment(student, course) {
  return enrollments.find(e => e.student === student && e.course === course);
}
function setMessage(text, color) {
  const el = document.getElementById("message") || document.getElementById("authMessage");
  if (!el) return;
  el.textContent = text;
  el.style.color = color || "#bfdbfe";
}

/* ── Auth helpers ─────────────────────────────────── */

function getCurrentUser() {
  return JSON.parse(localStorage.getItem("cs_currentUser") || "null");
}

/**
 * Auto-generate a student ID in the format YYYY-NNNN-X
 *  YYYY = current year
 *  NNNN = zero-padded sequential number based on existing accounts
 *  X    = random uppercase letter A-Z
 */
function generateStudentId() {
  const year  = new Date().getFullYear();
  const users = JSON.parse(localStorage.getItem("cs_users") || "[]");
  const seq   = String(users.length + 1).padStart(4, "0");
  const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const letter = alpha[Math.floor(Math.random() * alpha.length)];
  return `${year}-${seq}-${letter}`;
}

/* ── Sidebar UI ───────────────────────────────────── */

function initials(name) {
  return (name || "?")
    .split(" ")
    .map(n => n[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function syncUserUI() {
  const profile = getCurrentUser();

  const nameEl   = document.getElementById("sidebarName");
  const idEl     = document.getElementById("sidebarId");
  const avatarEl = document.getElementById("sidebarAvatar");

  if (nameEl)   nameEl.textContent   = profile ? profile.name : "Guest";
  if (idEl)     idEl.textContent     = profile ? profile.id   : "—";
  if (avatarEl) avatarEl.textContent = initials(profile ? profile.name : "Guest");

  /* Swap "Login" nav link to "Logout" when a user is logged in */
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

function logout() {
  localStorage.removeItem("cs_currentUser");
  window.location.href = "index.html";
}

/* ── Stats & Renders ──────────────────────────────── */

function renderStats() {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set("studentCount", students.length);
  set("courseCount",  courses.length);
  set("enrollCount",  enrollments.length);
  set("fullCount",    courses.filter(c => c.isFull()).length);
}

function renderCourses() {
  const list = document.getElementById("courseList");
  if (!list) return;
  list.innerHTML = "";

  courses.forEach(course => {
    const li = document.createElement("li");
    li.className = "course-item";
    li.innerHTML = `
      <div class="course-title">${course.code} – ${course.title}</div>
      <div class="course-meta">
        ${course.students.length}/${course.capacity} students
        ${course.prerequisite ? ` · Prereq: ${course.prerequisite}` : ""}
        ${course.isFull() ? ' <span class="badge-full">FULL</span>' : ""}
      </div>`;

    const row = document.createElement("div");
    row.className = "action-row";

    const enrollBtn = document.createElement("button");
    enrollBtn.textContent = "Enroll";
    enrollBtn.disabled = course.isFull();
    enrollBtn.onclick  = () => quickEnroll(course.code);

    const dropBtn = document.createElement("button");
    dropBtn.textContent = "Drop";
    dropBtn.className   = "alt";
    dropBtn.onclick     = () => quickDrop(course.code);

    row.appendChild(enrollBtn);
    row.appendChild(dropBtn);
    li.appendChild(row);
    list.appendChild(li);
  });

  renderStats();
}

function renderStudents() {
  const list = document.getElementById("studentList");
  if (!list) return;
  list.innerHTML = "";

  if (students.length === 0) {
    list.innerHTML = '<li class="empty-state">No students enrolled yet.</li>';
    return;
  }

  students.forEach(student => {
    const li = document.createElement("li");
    li.className = "student-item";
    const rows = student.viewCourses().map(course => {
      const enr = findEnrollment(student, course);
      const gradeText = (enr && enr.grade !== null) ? ` · Grade: ${enr.grade}` : "";
      return `${course.code}${gradeText}`;
    }).join(", ") || "No enrolled courses";

    li.innerHTML = `
      <div class="student-title">${student.name}</div>
      <div class="student-meta">${rows}</div>`;
    list.appendChild(li);
  });
}

/* ── Enrollment Actions ───────────────────────────── */

function getStudentInput() {
  const el = document.getElementById("studentName");
  return el ? el.value.trim() : "";
}
function getCourseInput() {
  const el = document.getElementById("courseCode");
  return el ? el.value.trim() : "";
}

function quickEnroll(courseCode) {
  const c = document.getElementById("courseCode");
  if (c) c.value = courseCode;
  enrollStudent();
}
function quickDrop(courseCode) {
  const c = document.getElementById("courseCode");
  if (c) c.value = courseCode;
  dropStudent();
}

function enrollStudent() {
  const studentName = getStudentInput();
  const courseCode  = getCourseInput();
  const course      = findCourse(courseCode);

  if (!studentName || !courseCode) return setMessage("Please enter student name and course code.");
  if (!course)                     return setMessage("Course not found.");
  if (course.isFull())             return setMessage("Enrollment failed: course is already full.");

  let student = findStudent(studentName);
  if (!student) {
    student = new Student(studentName);
    students.push(student);
  }

  if (course.prerequisite) {
    const prereqDone = student.viewCourses().some(
      c => c.code.toLowerCase() === course.prerequisite.toLowerCase()
    );
    if (!prereqDone) return setMessage(`Prerequisite required: ${course.prerequisite}.`);
  }

  if (!student.enroll(course)) return setMessage("Student is already enrolled in this course.");

  course.addStudent(student);
  enrollments.push(new Enrollment(student, course));
  
  saveToDatabase(); // Save to localStorage
  
  setMessage(`✓ ${student.name} enrolled in ${course.code}.`, "#86efac");
  renderCourses();
  renderStudents();
}

function dropStudent() {
  const studentName = getStudentInput();
  const courseCode  = getCourseInput();
  const course      = findCourse(courseCode);
  const student     = findStudent(studentName);

  if (!studentName || !courseCode) return setMessage("Enter student name and course code to drop.");
  if (!student || !course)         return setMessage("Student or course not found.");

  const enrollment = findEnrollment(student, course);
  if (!enrollment) return setMessage("This student is not enrolled in that course.");

  student.drop(course);
  course.removeStudent(student);
  const index = enrollments.indexOf(enrollment);
  if (index > -1) enrollments.splice(index, 1);

  saveToDatabase(); // Save to localStorage

  setMessage(`✓ ${student.name} dropped from ${course.code}.`, "#86efac");
  renderCourses();
  renderStudents();
}

/* ── Grade Assignment ─────────────────────────────── */

function assignGrade() {
  const studentName = getStudentInput();
  const courseCode  = getCourseInput();
  const gradeEl     = document.getElementById("gradeInput");
  const raw         = gradeEl ? gradeEl.value.trim() : "";
  const grade       = Number(raw);

  if (!studentName || !courseCode) return setMessage("Enter student name and course code first.");

  const student = findStudent(studentName);
  const course  = findCourse(courseCode);

  if (!student || !course) return setMessage("Student or course not found.");

  const enrollment = findEnrollment(student, course);
  if (!enrollment)         return setMessage("Enrollment not found.");
  if (raw === "" || isNaN(grade) || grade < 0 || grade > 100)
    return setMessage("Enter a valid grade from 0 to 100.");

  enrollment.assignGrade(grade);
  
  saveToDatabase(); // Save to localStorage
  
  setMessage(`✓ Grade ${grade} assigned to ${student.name} for ${course.code}.`, "#86efac");
  renderStudents();
}

/* ── Auth ─────────────────────────────────────────── */

function registerAccount() {
  const nameEl  = document.getElementById("regName");
  const passEl  = document.getElementById("regPassword");
  const idDisp  = document.getElementById("generatedId");

  const name     = nameEl  ? nameEl.value.trim()  : "";
  const password = passEl  ? passEl.value.trim()  : "";

  if (!name || !password) return setMessage("Please fill in all fields.");
  if (password.length < 6) return setMessage("Password must be at least 6 characters.");

  const users = JSON.parse(localStorage.getItem("cs_users") || "[]");

  /* Generate a unique ID */
  let id;
  let attempts = 0;
  do {
    id = generateStudentId();
    attempts++;
  } while (users.some(u => u.id === id) && attempts < 20);

  users.push({ name, id, password });
  localStorage.setItem("cs_users", JSON.stringify(users));

  /* Show generated ID to student */
  if (idDisp) {
    idDisp.textContent = `Your Student ID: ${id}`;
    idDisp.style.display = "block";
  }

  setMessage("✓ Registration successful! Please save your ID above, then click 'Login here' below when ready.", "#86efac");
}

function login() {
  const id       = document.getElementById("loginId").value.trim();
  const password = document.getElementById("loginPassword").value.trim();
  const users    = JSON.parse(localStorage.getItem("cs_users") || "[]");
  const user     = users.find(u => u.id === id && u.password === password);

  if (!user) return setMessage("Invalid ID or password. Please try again.");

  localStorage.setItem("cs_currentUser", JSON.stringify(user));
  setMessage("✓ Login successful! Redirecting…", "#86efac");
  setTimeout(() => { window.location.href = "courses.html"; }, 800);
}

/* ── Init ─────────────────────────────────────────── */

(function init() {
  loadFromDatabase();  // Load data from localStorage first
  syncUserUI();
  renderCourses();
  renderStudents();
  renderStats();
})();
