/* =========================================================
   Cooperative Society - Loan Repayment Register
   Pure HTML/CSS/JS app. Uses localStorage as the "database"
   so it runs standalone with no backend server required.
========================================================= */

const STORAGE_KEY = "loanRegisterRecords";

/* ---------- Sample seed dataset (20 records, incl. special cases) ---------- */
function getSeedData() {
  return [
    { entry_id: 1,  member_id: "M001", member_name: "Ramesh",  loan_amount: 50000,  repayment: 50000, due_date: "2026-05-10" },
    { entry_id: 2,  member_id: "M002", member_name: "Priya",   loan_amount: 30000,  repayment: 15000, due_date: "2026-08-15" },
    { entry_id: 3,  member_id: "M003", member_name: "Suresh",  loan_amount: 100000, repayment: 40000, due_date: "2026-06-01" },
    { entry_id: 4,  member_id: "M004", member_name: "Lakshmi", loan_amount: 25000,  repayment: 25000, due_date: "2026-04-20" },
    { entry_id: 5,  member_id: "M005", member_name: "Kumar",   loan_amount: 60000,  repayment: 10000, due_date: "2026-07-01" },
    { entry_id: 6,  member_id: "M006", member_name: "Ramesh",  loan_amount: 45000,  repayment: 20000, due_date: "2026-07-05" }, // duplicate name (special case)
    { entry_id: 7,  member_id: "M007", member_name: "Anitha",  loan_amount: 35000,  repayment: 35000, due_date: "2026-03-15" },
    { entry_id: 8,  member_id: "M008", member_name: null,      loan_amount: 40000,  repayment: 5000,  due_date: "2026-07-10" }, // missing name (special case)
    { entry_id: 9,  member_id: "M009", member_name: "Vijay",   loan_amount: 70000,  repayment: 20000, due_date: "2023-11-20" }, // very old due date (special case)
    { entry_id: 10, member_id: "M010", member_name: "Meena",   loan_amount: 20000,  repayment: 8000,  due_date: "2026-09-01" },
    { entry_id: 11, member_id: "M011", member_name: "Karthik", loan_amount: 55000,  repayment: 55000, due_date: "2026-02-28" },
    { entry_id: 12, member_id: "M012", member_name: "Divya",   loan_amount: 32000,  repayment: 12000, due_date: "2026-06-25" },
    { entry_id: 13, member_id: "M013", member_name: "Manoj",   loan_amount: 80000,  repayment: 30000, due_date: "2026-08-30" },
    { entry_id: 14, member_id: "M014", member_name: "Sowmya",  loan_amount: 27000,  repayment: 27000, due_date: "2026-01-15" },
    { entry_id: 15, member_id: "M015", member_name: "Arjun",   loan_amount: 90000,  repayment: 45000, due_date: "2026-05-30" },
    { entry_id: 16, member_id: "M016", member_name: "Deepa",   loan_amount: 15000,  repayment: 4000,  due_date: "2026-07-20" },
    { entry_id: 17, member_id: "M017", member_name: "Ganesh",  loan_amount: 62000,  repayment: 62000, due_date: "2026-03-01" },
    { entry_id: 18, member_id: "M018", member_name: "Revathi", loan_amount: 48000,  repayment: 18000, due_date: "2026-06-10" },
    { entry_id: 19, member_id: "M019", member_name: "Naveen",  loan_amount: 33000,  repayment: 33000, due_date: "2026-04-05" },
    { entry_id: 20, member_id: "M020", member_name: "Sathya",  loan_amount: 52000,  repayment: 22000, due_date: "2026-09-15" }
  ];
}

/* ---------- State ---------- */
let records = [];
let editingId = null;

/* ---------- DOM refs ---------- */
const tableBody      = document.getElementById("tableBody");
const statusMessage  = document.getElementById("statusMessage");
const searchBox      = document.getElementById("searchBox");
const statusFilter   = document.getElementById("statusFilter");
const addRecordBtn   = document.getElementById("addRecordBtn");
const resetDataBtn   = document.getElementById("resetDataBtn");

const modal        = document.getElementById("recordModal");
const modalTitle    = document.getElementById("modalTitle");
const recordForm    = document.getElementById("recordForm");
const cancelBtn     = document.getElementById("cancelBtn");

const totalMembersEl = document.getElementById("totalMembers");
const totalLoansEl   = document.getElementById("totalLoans");
const totalBalanceEl = document.getElementById("totalBalance");
const overdueCountEl = document.getElementById("overdueCount");

/* ---------- Derived calculations ---------- */
function computeDerived(rec) {
  const loan = Number(rec.loan_amount) || 0;
  const paid = Number(rec.repayment) || 0;
  const balance = Math.max(loan - paid, 0);

  let days_overdue = 0;
  let status = "Pending";

  if (balance <= 0) {
    status = "Paid";
  } else if (rec.due_date) {
    const due = new Date(rec.due_date + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - due) / (1000 * 60 * 60 * 24));
    if (diffDays > 0) {
      days_overdue = diffDays;
      status = "Overdue";
    } else {
      status = "Pending";
    }
  }

  return { ...rec, loan_amount: loan, repayment: paid, balance, days_overdue, status };
}

function withDerived(list) {
  return list.map(computeDerived);
}

/* ---------- Storage (acts as the database) ---------- */
function loadRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      records = getSeedData();
      saveRecords();
    } else {
      records = JSON.parse(raw);
    }
  } catch (e) {
    console.error("Failed to load records:", e);
    showMessage("⚠️ Unable to Load Records. Try Again.", "error");
    records = [];
  }
}

function saveRecords() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch (e) {
    console.error("Save failed:", e);
    showMessage("⚠️ Unable to Save. Try Again.", "error");
    return false;
  }
}

/* ---------- Rendering ---------- */
function showMessage(text, type) {
  statusMessage.textContent = text;
  statusMessage.className = "status-message" + (type ? " " + type : "");
  statusMessage.classList.remove("hidden");
}

function hideMessage() {
  statusMessage.classList.add("hidden");
}

function formatCurrency(n) {
  return "₹" + Number(n).toLocaleString("en-IN");
}

function formatDate(d) {
  if (!d) return "-";
  const parts = d.split("-");
  if (parts.length !== 3) return d;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function getFilteredRecords() {
  const term = searchBox.value.trim().toLowerCase();
  const filter = statusFilter.value;

  return withDerived(records).filter((r) => {
    const name = (r.member_name || "").toLowerCase();
    const matchesSearch = term === "" || name.includes(term);
    const matchesFilter = filter === "All" || r.status === filter;
    return matchesSearch && matchesFilter;
  });
}

function renderTable() {
  hideMessage();

  if (records.length === 0) {
    tableBody.innerHTML = "";
    showMessage("No Records Found", "");
    updateSummary([]);
    return;
  }

  const filtered = getFilteredRecords();
  updateSummary(withDerived(records));

  if (filtered.length === 0) {
    tableBody.innerHTML = "";
    showMessage("Record Not Found", "");
    return;
  }

  tableBody.innerHTML = filtered
    .map((r) => {
      const nameDisplay = r.member_name
        ? r.member_name
        : `<span class="name-missing">Missing Name</span>`;
      return `
        <tr data-id="${r.entry_id}">
          <td>${r.entry_id}</td>
          <td>${r.member_id}</td>
          <td>${nameDisplay}</td>
          <td>${formatCurrency(r.loan_amount)}</td>
          <td>${formatCurrency(r.repayment)}</td>
          <td>${formatCurrency(r.balance)}</td>
          <td>${formatDate(r.due_date)}</td>
          <td>${r.days_overdue > 0 ? r.days_overdue + " days" : "-"}</td>
          <td><span class="status-pill status-${r.status}">${r.status}</span></td>
          <td>
            <button class="btn btn-secondary btn-small edit-btn" data-id="${r.entry_id}">Edit</button>
            <button class="btn btn-secondary btn-small delete-btn" data-id="${r.entry_id}" style="color:#dc2626;">Delete</button>
          </td>
        </tr>
      `;
    })
    .join("");

  document.querySelectorAll(".edit-btn").forEach((btn) =>
    btn.addEventListener("click", () => openModal(Number(btn.dataset.id)))
  );
  document.querySelectorAll(".delete-btn").forEach((btn) =>
    btn.addEventListener("click", () => deleteRecord(Number(btn.dataset.id)))
  );
}

function updateSummary(list) {
  totalMembersEl.textContent = list.length;
  totalLoansEl.textContent = formatCurrency(list.reduce((s, r) => s + r.loan_amount, 0));
  totalBalanceEl.textContent = formatCurrency(list.reduce((s, r) => s + r.balance, 0));
  overdueCountEl.textContent = list.filter((r) => r.status === "Overdue").length;
}

/* ---------- Modal / Form ---------- */
function openModal(id = null) {
  editingId = id;
  clearFormErrors();
  recordForm.reset();

  if (id) {
    const rec = records.find((r) => r.entry_id === id);
    modalTitle.textContent = "Update Record";
    document.getElementById("entryId").value = rec.entry_id;
    document.getElementById("memberId").value = rec.member_id || "";
    document.getElementById("memberName").value = rec.member_name || "";
    document.getElementById("loanAmount").value = rec.loan_amount;
    document.getElementById("repayment").value = rec.repayment;
    document.getElementById("dueDate").value = rec.due_date || "";
  } else {
    modalTitle.textContent = "Add New Record";
    document.getElementById("entryId").value = "";
  }

  updatePreview();
  modal.classList.remove("hidden");
}

function closeModal() {
  modal.classList.add("hidden");
  editingId = null;
}

function clearFormErrors() {
  document.querySelectorAll(".error-text").forEach((el) => (el.textContent = ""));
}

function updatePreview() {
  const loan = Number(document.getElementById("loanAmount").value) || 0;
  const paid = Number(document.getElementById("repayment").value) || 0;
  const balance = Math.max(loan - paid, 0);
  document.getElementById("previewBalance").textContent = formatCurrency(balance);

  const dueVal = document.getElementById("dueDate").value;
  const temp = computeDerived({ loan_amount: loan, repayment: paid, due_date: dueVal });
  document.getElementById("previewStatus").textContent = temp.status;
}

["loanAmount", "repayment", "dueDate"].forEach((id) => {
  document.getElementById(id).addEventListener("input", updatePreview);
});

function validateForm() {
  clearFormErrors();
  let valid = true;

  const memberId = document.getElementById("memberId").value.trim();
  const memberName = document.getElementById("memberName").value.trim();
  const loanAmount = document.getElementById("loanAmount").value;
  const repayment = document.getElementById("repayment").value;
  const dueDate = document.getElementById("dueDate").value;

  if (!memberId) {
    document.getElementById("err-memberId").textContent = "Member ID is required.";
    valid = false;
  }
  if (!memberName) {
    document.getElementById("err-memberName").textContent = "Name cannot be empty.";
    valid = false;
  }
  if (loanAmount === "" || Number(loanAmount) <= 0) {
    document.getElementById("err-loanAmount").textContent = "Loan amount must be greater than 0.";
    valid = false;
  }
  if (repayment === "" || Number(repayment) < 0) {
    document.getElementById("err-repayment").textContent = "Repayment cannot be negative.";
    valid = false;
  }
  if (Number(repayment) > Number(loanAmount)) {
    document.getElementById("err-repayment").textContent = "Repayment cannot exceed loan amount.";
    valid = false;
  }
  if (!dueDate) {
    document.getElementById("err-dueDate").textContent = "Due date is required.";
    valid = false;
  }

  return valid;
}

function handleFormSubmit(e) {
  e.preventDefault();
  if (!validateForm()) return;

  const data = {
    member_id: document.getElementById("memberId").value.trim(),
    member_name: document.getElementById("memberName").value.trim(),
    loan_amount: Number(document.getElementById("loanAmount").value),
    repayment: Number(document.getElementById("repayment").value),
    due_date: document.getElementById("dueDate").value
  };

  if (editingId) {
    const idx = records.findIndex((r) => r.entry_id === editingId);
    records[idx] = { ...records[idx], ...data };
  } else {
    const nextId = records.length ? Math.max(...records.map((r) => r.entry_id)) + 1 : 1;
    records.push({ entry_id: nextId, ...data });
  }

  const ok = saveRecords();
  if (ok) {
    closeModal();
    renderTable();
  }
}

function deleteRecord(id) {
  if (!confirm("Delete this record?")) return;
  records = records.filter((r) => r.entry_id !== id);
  saveRecords();
  renderTable();
}

/* ---------- Event bindings ---------- */
addRecordBtn.addEventListener("click", () => openModal(null));
cancelBtn.addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});
recordForm.addEventListener("submit", handleFormSubmit);

searchBox.addEventListener("input", renderTable);
statusFilter.addEventListener("change", renderTable);

resetDataBtn.addEventListener("click", () => {
  if (!confirm("Reset to original 20 sample records? Your changes will be lost.")) return;
  records = getSeedData();
  saveRecords();
  renderTable();
});

/* ---------- Init (simulate loading state) ---------- */
function init() {
  showMessage("Loading...", "");
  tableBody.innerHTML = "";
  setTimeout(() => {
    loadRecords();
    renderTable();
  }, 400);
}

document.addEventListener("DOMContentLoaded", init);


document.querySelector("form").addEventListener("submit",function(e){

e.preventDefault();

let memberId=document.querySelector('input[type="text"]').value;

let password=document.querySelector('input[type="password"]').value;

if(memberId==="M001" && password==="12345"){

alert("Login Successful!");

window.location.href="member-dashboard.html";

}
else{

alert("Invalid Member ID or Password");

}

});