// ========== GLOBALS ==========
let currentUser = null;
let tasks = [];
let currentFilter = 'all';
let searchQuery = '';
let editingId = null;

const API_BASE = 'https://task-flow-vxzr.onrender.com/api';

// ========== DOM REFS ==========
// Login
const loginPage = document.getElementById('loginPage');
const appPage = document.getElementById('appPage');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const signupName = document.getElementById('signupName');
const signupEmail = document.getElementById('signupEmail');
const signupPhone = document.getElementById('signupPhone');
const signupPassword = document.getElementById('signupPassword');
const signupConfirm = document.getElementById('signupConfirm');
const loginError = document.getElementById('loginError');
const signupError = document.getElementById('signupError');
const tabBtns = document.querySelectorAll('.tab-btn');
const userDisplay = document.getElementById('userDisplay');
const logoutBtn = document.getElementById('logoutBtn');
const authCard = document.getElementById('authCard');

// Onboarding
const onboardingPage = document.getElementById('onboardingPage');
const roleBtns = document.querySelectorAll('.role-btn');
const categoryTags = document.getElementById('categoryTags');
const newCategoryInput = document.getElementById('newCategoryInput');
const addCategoryBtn = document.getElementById('addCategoryBtn');
const finishSetupBtn = document.getElementById('finishSetupBtn');
const onboardingError = document.getElementById('onboardingError');

// App content
const appContent = document.getElementById('appContent');
const taskList = document.getElementById('taskList');
const taskInput = document.getElementById('taskInput');
const dueDateInput = document.getElementById('dueDateInput');
const categorySelect = document.getElementById('categorySelect');
const energySelect = document.getElementById('energySelect');
const addBtn = document.getElementById('addTaskBtn');
const filterContainer = document.getElementById('filterContainer');
const searchInput = document.getElementById('searchInput');
const taskCount = document.getElementById('taskCount');
const completedNum = document.getElementById('completedNum');
const ringFill = document.getElementById('ringFill');
const ringPercent = document.getElementById('ringPercent');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');
const themeToggle = document.getElementById('themeToggle');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');
const eventInfo = document.getElementById('eventInfo');

// Confirm modal
const confirmModal = document.getElementById('confirmModal');
const confirmTitle = document.getElementById('confirmTitle');
const confirmMsg = document.getElementById('confirmMsg');
const confirmCancel = document.getElementById('confirmCancel');
const confirmOk = document.getElementById('confirmOk');

// Stats Dashboard
const statsDashboard = document.getElementById('statsDashboard');
const statTotal = document.getElementById('statTotal');
const statCompleted = document.getElementById('statCompleted');
const statPending = document.getElementById('statPending');
const statOverdue = document.getElementById('statOverdue');
const statsRingFill = document.getElementById('statsRingFill');
const statsRingPercent = document.getElementById('statsRingPercent');
const streakDays = document.getElementById('streakDays');
const weeklyRate = document.getElementById('weeklyRate');
const monthlyTotal = document.getElementById('monthlyTotal');
const categoryChartCanvas = document.getElementById('categoryChart');
const energyChartCanvas = document.getElementById('energyChart');
const dailyChartCanvas = document.getElementById('dailyChart');

// Calendar
const calendarView = document.getElementById('calendarView');
const calendarGrid = document.getElementById('calendarGrid');
const calMonthYear = document.getElementById('calMonthYear');
const calPrevBtn = document.getElementById('calPrevBtn');
const calNextBtn = document.getElementById('calNextBtn');
const calDayDetail = document.getElementById('calDayDetail');
const calDayLabel = document.getElementById('calDayLabel');
const calDayTasks = document.getElementById('calDayTasks');
const calCloseDay = document.getElementById('calCloseDay');

// View buttons
const viewTasksBtn = document.getElementById('viewTasksBtn');
const viewStatsBtn = document.getElementById('viewStatsBtn');
const viewCalendarBtn = document.getElementById('viewCalendarBtn');

// View Navigation (NEW)
const viewNav = document.getElementById('viewNav');

const RING_CIRCUMFERENCE = 2 * Math.PI * 52;

// Chart instances
let categoryChart = null;
let energyChart = null;
let dailyChart = null;

// ========== ONBOARDING STATE ==========
let selectedRoles = ['general'];
let userCategories = ['Personal', 'Work', 'Health', 'Errands'];

// Role presets
const ROLE_CATEGORIES = {
    student: ['Assignments', 'Exams', 'Study', 'Social'],
    athlete: ['Practice', 'Games', 'Recovery', 'Nutrition'],
    professional: ['Projects', 'Meetings', 'Tasks', 'Networking'],
    parent: ['Kids', 'Household', 'Work', 'Self-care'],
    general: ['Personal', 'Work', 'Health', 'Errands']
};

// ========== VIEW STATE ==========
let currentView = 'tasks'; // 'tasks' | 'stats' | 'calendar'
let calDate = new Date();

// ========== AUTH HELPERS ==========
function setAuthToken(token) {
    localStorage.setItem('taskflow_token', token);
}
function getAuthToken() {
    return localStorage.getItem('taskflow_token');
}
function removeAuthToken() {
    localStorage.removeItem('taskflow_token');
}
function setStoredUser(user) {
    localStorage.setItem('taskflow_user', JSON.stringify(user));
}
function getStoredUser() {
    try {
        const raw = localStorage.getItem('taskflow_user');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}
function removeStoredUser() {
    localStorage.removeItem('taskflow_user');
}

// ========== API CALL ==========
async function apiCall(endpoint, method = 'GET', data = null) {
    const token = getAuthToken();
    const headers = {
        'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method, headers };
    if (data) options.body = JSON.stringify(data);

    let res;
    try {
        res = await fetch(`${API_BASE}${endpoint}`, options);
    } catch (networkErr) {
        throw new Error('Can\'t reach the server. Is it running?');
    }
    if (!res.ok) {
        let errMsg = 'Request failed';
        try {
            const err = await res.json();
            errMsg = err.error || errMsg;
        } catch { /* non-JSON error body */ }
        if (res.status === 401) {
            removeAuthToken();
            removeStoredUser();
        }
        throw new Error(errMsg);
    }
    return res.json();
}

// ========== BUTTON LOADING ==========
function setBtnLoading(btn, loading) {
    if (!btn) return;
    btn.classList.toggle('loading', loading);
    btn.disabled = loading;
}

// ========== AUTH FUNCTIONS ==========
async function handleLogin(e) {
    e.preventDefault();
    const email = loginEmail.value.trim();
    const password = loginPassword.value.trim();
    if (!email || !password) {
        showFieldError(loginError, 'Please fill in all fields.');
        return;
    }
    const submitBtn = loginForm.querySelector('.login-btn');
    setBtnLoading(submitBtn, true);
    try {
        const data = await apiCall('/login', 'POST', { email, password });
        setAuthToken(data.token);
        setStoredUser(data.user);
        currentUser = data.user;
        selectedRoles = currentUser.roles || ['general'];
        userCategories = currentUser.categories || ['Personal', 'Work', 'Health', 'Errands'];
        showApp();
        loginError.textContent = '';
        loginForm.reset();
    } catch (err) {
        showFieldError(loginError, err.message);
    } finally {
        setBtnLoading(submitBtn, false);
    }
}

async function handleSignup(e) {
    e.preventDefault();

    // ✅ Get all input values
    const name = signupName.value.trim();
    const email = signupEmail.value.trim();
    const phone = signupPhone.value.trim();
    const password = signupPassword.value.trim();
    const confirm = signupConfirm.value.trim();

    // ✅ Validate all fields
    if (!name || !email || !phone || !password || !confirm) {
        showFieldError(signupError, 'All fields are required.');
        return;
    }
    if (password.length < 6) {
        showFieldError(signupError, 'Password must be at least 6 characters.');
        return;
    }
    if (password !== confirm) {
        showFieldError(signupError, 'Passwords do not match.');
        return;
    }
    if (!email.includes('@') || !email.includes('.')) {
        showFieldError(signupError, 'Please enter a valid email.');
        return;
    }

    // ✅ Clear old session
    localStorage.removeItem('taskflow_user');
    localStorage.removeItem('taskflow_token');

    const submitBtn = signupForm.querySelector('.login-btn');
    setBtnLoading(submitBtn, true);

    try {
        // ✅ Log what's being sent
        console.log('Signup data:', { name, email, phone, password });

        const data = await apiCall('/signup', 'POST', { name, email, phone, password });
        setAuthToken(data.token);
        setStoredUser(data.user);
        currentUser = data.user;
        userCategories = data.user.categories || ['Personal', 'Work', 'Health', 'Errands'];

        // ✅ Update header with new user's name
        userDisplay.textContent = `👋 ${currentUser.name}`;

        // ✅ Hide navigation during onboarding
        if (viewNav) viewNav.style.display = 'none';

        // Show onboarding
        loginPage.style.display = 'none';
        appPage.style.display = 'block';
        appContent.style.display = 'none';
        statsDashboard.style.display = 'none';
        calendarView.style.display = 'none';
        onboardingPage.style.display = 'flex';

        // Reset onboarding state
        selectedRoles = ['general'];
        userCategories = [...ROLE_CATEGORIES.general];
        renderCategories();
        updateRoleButtons();
        signupError.textContent = '';
        signupForm.reset();

    } catch (err) {
        showFieldError(signupError, err.message);
    } finally {
        setBtnLoading(submitBtn, false);
    }
}
function showFieldError(el, msg) {
    el.textContent = msg;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
}

function showApp() {
    loginPage.style.display = 'none';
    appPage.style.display = 'block';
    onboardingPage.style.display = 'none';
    // Show the default view (tasks)
    switchView('tasks');
    userDisplay.textContent = `👋 ${currentUser.name}`;
    selectedRoles = currentUser.roles || ['general'];
    userCategories = currentUser.categories || ['Personal', 'Work', 'Health', 'Errands'];
    populateCategories();
    renderSkeleton();
    loadTasks();

    // ✅ Show navigation when logged in
    if (viewNav) viewNav.style.display = 'flex';
}

function logout() {
    removeAuthToken();
    removeStoredUser();
    currentUser = null;
    tasks = [];
    appPage.style.display = 'none';
    loginPage.style.display = 'block';
    loginForm.reset();
    signupForm.reset();
    loginError.textContent = '';
    signupError.textContent = '';
    switchTab('login');

    // ✅ Hide navigation on logout
    if (viewNav) viewNav.style.display = 'none';
}

// ========== ONBOARDING FUNCTIONS ==========
function renderCategories() {
    categoryTags.innerHTML = userCategories.map(cat =>
        `<span class="category-tag">
            ${cat}
            <button class="remove-tag" data-category="${cat}">&times;</button>
        </span>`
    ).join('');

    categoryTags.querySelectorAll('.remove-tag').forEach(btn => {
        btn.addEventListener('click', () => {
            const cat = btn.dataset.category;
            userCategories = userCategories.filter(c => c !== cat);
            renderCategories();
        });
    });
}

function updateRoleButtons() {
    roleBtns.forEach(btn => {
        btn.classList.toggle('active', selectedRoles.includes(btn.dataset.role));
    });
}

function mergeCategoriesFromRoles() {
    const preset = new Set();
    selectedRoles.forEach(role => {
        const cats = ROLE_CATEGORIES[role] || [];
        cats.forEach(c => preset.add(c));
    });
    const merged = [...new Set([...userCategories, ...preset])];
    userCategories = merged;
    renderCategories();
}

function addCategory() {
    const text = newCategoryInput.value.trim();
    if (!text) return;
    if (userCategories.includes(text)) {
        showToast('Category already exists!', 'error');
        return;
    }
    if (userCategories.length >= 10) {
        showToast('Maximum 10 categories', 'error');
        return;
    }
    userCategories.push(text);
    newCategoryInput.value = '';
    renderCategories();
    newCategoryInput.focus();
}

// ========== CATEGORY UI HELPERS ==========
function populateCategories() {
    if (!currentUser || !currentUser.categories) return;
    const cats = currentUser.categories;

    categorySelect.innerHTML = cats.map(c =>
        `<option value="${c}">${c}</option>`
    ).join('');

    const filterHtml = `
        <button class="active" data-filter="all">All</button>
        ${cats.map(c => `<button data-filter="${c}">${c}</button>`).join('')}
    `;
    filterContainer.innerHTML = filterHtml;

    filterContainer.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterContainer.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            render();
        });
    });
}

// ========== TASK FUNCTIONS ==========
function renderSkeleton() {
    taskList.innerHTML = Array(4).fill('<li class="skeleton-item"></li>').join('');
}

async function loadTasks() {
    try {
        tasks = await apiCall('/tasks');
        render();
    } catch (err) {
        if (!getAuthToken()) {
            logout();
            return;
        }
        showToast('Failed to load tasks: ' + err.message, 'error');
        taskList.innerHTML = '';
        render();
    }
}

async function addTask() {
    const text = taskInput.value.trim();
    if (!text) {
        showToast('Please write a task!', 'error');
        taskInput.focus();
        return;
    }
    const due = dueDateInput.value || null;
    const category = categorySelect.value;
    const energy = energySelect.value;

    setBtnLoading(addBtn, true);
    try {
        const newTask = await apiCall('/tasks', 'POST', { text, due, category, energy });
        tasks.push(newTask);
        taskInput.value = '';
        showToast(`"${text}" added to the board!`, 'success');
        render();
        taskInput.focus();
    } catch (err) {
        showToast('Failed to add task: ' + err.message, 'error');
    } finally {
        setBtnLoading(addBtn, false);
    }
}

async function toggleTask(id) {
    const task = tasks.find(t => t._id === id);
    if (!task) return;

    const nowCompleting = !task.completed;

    if (nowCompleting && task.due) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(task.due + 'T00:00:00');

        if (dueDate > today) {
            const formattedDate = formatDate(task.due);
            const confirmMsg = `This task is scheduled for ${formattedDate}. Are you sure you want to mark it as complete now?`;
            const ok = await showConfirm('Complete future task?', confirmMsg, 'Yes, complete it', false);
            if (!ok) return;
        }
    }

    try {
        const updated = await apiCall(`/tasks/${id}`, 'PUT', { completed: nowCompleting });
        task.completed = updated.completed;
        render();
        if (nowCompleting) {
            const li = taskList.querySelector(`.task-item[data-id="${id}"] .checkbox`);
            if (li) burstConfetti(li);
            showToast('Nice work — task complete! 🏆', 'success');
        } else {
            showToast('Task reopened.', 'info');
        }
    } catch (err) {
        showToast('Failed to update task: ' + err.message, 'error');
    }
}

async function deleteTask(id) {
    const task = tasks.find(t => t._id === id);
    const ok = await showConfirm('Delete this task?', task ? `"${task.text}" will be removed for good.` : 'This can\'t be undone.');
    if (!ok) return;
    const li = taskList.querySelector(`.task-item[data-id="${id}"]`);
    if (li) li.classList.add('removing');
    try {
        await apiCall(`/tasks/${id}`, 'DELETE');
        await new Promise(r => setTimeout(r, li ? 260 : 0));
        tasks = tasks.filter(t => t._id !== id);
        if (editingId === id) editingId = null;
        render();
        showToast('Task deleted.', 'info');
    } catch (err) {
        if (li) li.classList.remove('removing');
        showToast('Failed to delete task: ' + err.message, 'error');
    }
}

async function saveEdit(id) {
    const li = document.querySelector(`.task-item[data-id="${id}"]`);
    if (!li) return;
    const text = li.querySelector('.edit-text').value.trim();
    if (!text) {
        showToast('Task name cannot be empty.', 'error');
        return;
    }
    const due = li.querySelector('.edit-due').value || null;
    const category = li.querySelector('.edit-category').value;
    const energy = li.querySelector('.edit-energy').value;

    try {
        const updated = await apiCall(`/tasks/${id}`, 'PUT', { text, due, category, energy });
        const task = tasks.find(t => t._id === id);
        if (task) {
            task.text = updated.text;
            task.due = updated.due;
            task.category = updated.category;
            task.energy = updated.energy;
        }
        editingId = null;
        render();
        showToast('Task updated!', 'success');
    } catch (err) {
        showToast('Failed to update task: ' + err.message, 'error');
    }
}

async function clearCompleted() {
    const completedTasks = tasks.filter(t => t.completed);
    if (completedTasks.length === 0) {
        showToast('No completed tasks to clear.', 'info');
        return;
    }
    const ok = await showConfirm(
        `Clear ${completedTasks.length} completed task${completedTasks.length > 1 ? 's' : ''}?`,
        'This can\'t be undone.'
    );
    if (!ok) return;
    try {
        for (const task of completedTasks) {
            await apiCall(`/tasks/${task._id}`, 'DELETE');
        }
        tasks = tasks.filter(t => !t.completed);
        render();
        showToast('Cleared completed tasks.', 'info');
    } catch (err) {
        showToast('Failed to clear tasks: ' + err.message, 'error');
    }
}

// ========== CONFIRM MODAL ==========
let confirmResolver = null;
function showConfirm(title, msg, confirmText = 'Delete', isDanger = true) {
    confirmTitle.textContent = title;
    confirmMsg.textContent = msg;
    confirmOk.textContent = confirmText;

    if (isDanger) {
        confirmOk.className = 'modal-btn danger';
    } else {
        confirmOk.className = 'modal-btn primary';
    }

    confirmModal.classList.add('show');
    return new Promise(resolve => {
        confirmResolver = resolve;
    });
}
function resolveConfirm(result) {
    confirmModal.classList.remove('show');
    if (confirmResolver) {
        confirmResolver(result);
        confirmResolver = null;
    }
}
confirmCancel.addEventListener('click', () => resolveConfirm(false));
confirmOk.addEventListener('click', () => resolveConfirm(true));
confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) resolveConfirm(false);
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && confirmModal.classList.contains('show')) resolveConfirm(false);
});

// ========== CONFETTI ==========
function burstConfetti(originEl) {
    const rect = originEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const colors = ['#ff7a3d', '#2fe0c4', '#a78bfa', '#ffc24b'];
    const count = 14;
    for (let i = 0; i < count; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.background = colors[i % colors.length];
        piece.style.left = `${cx}px`;
        piece.style.top = `${cy}px`;
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const distance = 60 + Math.random() * 50;
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance;
        const rot = Math.random() * 360;
        document.body.appendChild(piece);
        piece.animate([
            { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
            { transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`, opacity: 0 }
        ], { duration: 650 + Math.random() * 250, easing: 'cubic-bezier(0.16,1,0.3,1)' })
        .onfinish = () => piece.remove();
    }
}

// ========== UI HELPERS ==========
function showToast(msg, type = 'success') {
    const icons = { success: 'fa-check-circle', error: 'fa-circle-exclamation', info: 'fa-circle-info' };
    toast.className = `toast show ${type}`;
    toast.querySelector('.toast-icon').className = `toast-icon fas ${icons[type] || icons.success}`;
    toastMessage.textContent = msg;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(dateStr) {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dateStr + 'T00:00:00');
    return due < today;
}

function daysUntil(dateStr) {
    if (!dateStr) return Infinity;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dateStr + 'T00:00:00');
    return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
}

function updateCountdown() {
    const upcoming = tasks
        .filter(t => !t.completed && t.due)
        .sort((a, b) => new Date(a.due) - new Date(b.due));
    if (upcoming.length === 0) {
        eventInfo.textContent = '✨ No upcoming deadlines';
        return;
    }
    const next = upcoming[0];
    const days = daysUntil(next.due);
    let daysText = days === 0 ? 'Today!' : days === 1 ? 'Tomorrow' : days < 0 ? 'Overdue' : `${days} days`;
    eventInfo.innerHTML = `${escapeHtml(next.text)} — <strong>${daysText}</strong>`;
}

function updateRing() {
    const total = tasks.length;
    const done = tasks.filter(t => t.completed).length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    const offset = RING_CIRCUMFERENCE * (1 - pct / 100);
    ringFill.style.strokeDasharray = RING_CIRCUMFERENCE;
    ringFill.style.strokeDashoffset = offset;
    ringFill.style.stroke = pct === 100 && total > 0 ? 'var(--teal)' : 'var(--orange)';
    ringPercent.textContent = `${pct}%`;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ========== STATS ENGINE ==========
function updateStats() {
    const total = tasks.length;
    const done = tasks.filter(t => t.completed).length;
    const pending = total - done;
    const overdue = tasks.filter(t => !t.completed && t.due && isOverdue(t.due)).length;

    statTotal.textContent = total;
    statCompleted.textContent = done;
    statPending.textContent = pending;
    statOverdue.textContent = overdue;

    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    const offset = RING_CIRCUMFERENCE * (1 - pct / 100);
    statsRingFill.style.strokeDasharray = RING_CIRCUMFERENCE;
    statsRingFill.style.strokeDashoffset = offset;
    statsRingFill.style.stroke = pct === 100 && total > 0 ? 'var(--teal)' : 'var(--orange)';
    statsRingPercent.textContent = `${pct}%`;

    updateCategoryChart();
    updateEnergyChart();
    updateDailyChart();
    updateConsistency();
}

function updateCategoryChart() {
    const categories = currentUser?.categories || ['Personal', 'Work', 'Health', 'Errands'];
    const counts = {};
    categories.forEach(c => counts[c] = 0);
    tasks.forEach(t => { if (counts[t.category] !== undefined) counts[t.category]++; });
    const labels = Object.keys(counts);
    const data = Object.values(counts);
    const colors = ['#2fe0c4', '#a78bfa', '#ff7a3d', '#ffc24b', '#ff5d73', '#6d5bd0'];

    if (categoryChart) {
        categoryChart.data.labels = labels;
        categoryChart.data.datasets[0].data = data;
        categoryChart.update();
    } else {
        categoryChart = new Chart(categoryChartCanvas, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderColor: 'var(--panel)',
                    borderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom', labels: { color: 'var(--ink)', font: { size: 11 } } },
                },
                maintainAspectRatio: true,
            }
        });
    }
}

function updateEnergyChart() {
    const counts = { high: 0, medium: 0, low: 0 };
    tasks.forEach(t => { if (counts[t.energy] !== undefined) counts[t.energy]++; });
    const labels = ['High', 'Medium', 'Low'];
    const data = [counts.high, counts.medium, counts.low];
    const colors = ['#ff5d73', '#ffc24b', '#9aa3bd'];

    if (energyChart) {
        energyChart.data.datasets[0].data = data;
        energyChart.update();
    } else {
        energyChart = new Chart(energyChartCanvas, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: 'var(--panel)',
                    borderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom', labels: { color: 'var(--ink)', font: { size: 11 } } },
                },
                maintainAspectRatio: true,
            }
        });
    }
}

function updateDailyChart() {
    const today = new Date();
    const dates = [];
    const counts = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        dates.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
        const dayTasks = tasks.filter(t => t.completed && t.completedAt && new Date(t.completedAt) >= d && new Date(t.completedAt) < new Date(d.getTime() + 86400000));
        counts.push(dayTasks.length);
    }

    if (dailyChart) {
        dailyChart.data.datasets[0].data = counts;
        dailyChart.update();
    } else {
        dailyChart = new Chart(dailyChartCanvas, {
            type: 'bar',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Completed tasks',
                    data: counts,
                    backgroundColor: 'var(--teal)',
                    borderColor: 'var(--teal-deep)',
                    borderWidth: 1,
                    borderRadius: 4,
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { color: 'var(--ink-faint)', stepSize: 1, font: { size: 10 } } },
                    x: { ticks: { color: 'var(--ink-faint)', font: { size: 10 } } }
                },
                maintainAspectRatio: false,
            }
        });
    }
}

function updateConsistency() {
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let checkDate = new Date(today);
    while (true) {
        const dayTasks = tasks.filter(t => t.completed && t.completedAt && new Date(t.completedAt) >= checkDate && new Date(t.completedAt) < new Date(checkDate.getTime() + 86400000));
        if (dayTasks.length > 0) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }
    streakDays.textContent = streak;

    let daysWithCompletion = 0;
    for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const dayTasks = tasks.filter(t => t.completed && t.completedAt && new Date(t.completedAt) >= d && new Date(t.completedAt) < new Date(d.getTime() + 86400000));
        if (dayTasks.length > 0) daysWithCompletion++;
    }
    weeklyRate.textContent = `${Math.round((daysWithCompletion / 7) * 100)}%`;

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthCompletions = tasks.filter(t => t.completed && t.completedAt && new Date(t.completedAt) >= monthStart).length;
    monthlyTotal.textContent = monthCompletions;
}

// ========== CALENDAR ENGINE ==========
function renderCalendar(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    calMonthYear.textContent = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    let html = '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Helper: create date string without timezone issues
    function makeDateStr(y, m, d) {
        return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }

    // Previous month days
    const startOffset = firstDay;
    for (let i = startOffset - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const dateStr = makeDateStr(year, month - 1, day);
        html += `<div class="cal-day other-month" data-date="${dateStr}">${day}</div>`;
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = makeDateStr(year, month, day);
        const d = new Date(year, month, day);
        const isToday = d.toDateString() === today.toDateString();
        const dayTasks = tasks.filter(t => t.due === dateStr);
        const hasTasks = dayTasks.length > 0;
        const allCompleted = hasTasks && dayTasks.every(t => t.completed);

        let classes = 'cal-day';
        if (isToday) classes += ' today';
        if (allCompleted) {
            classes += ' completed-all';
        } else if (hasTasks) {
            classes += ' incomplete';
        }

        html += `<div class="${classes}" data-date="${dateStr}" data-tasks="${dayTasks.length}">${day}</div>`;
    }

    // Next month days (fill last row)
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
    const remaining = totalCells - (startOffset + daysInMonth);
    for (let day = 1; day <= remaining; day++) {
        const dateStr = makeDateStr(year, month + 1, day);
        html += `<div class="cal-day other-month" data-date="${dateStr}">${day}</div>`;
    }

    calendarGrid.innerHTML = html;

    // Attach click events to each day
    calendarGrid.querySelectorAll('.cal-day').forEach(el => {
        el.addEventListener('click', () => {
            const dateStr = el.dataset.date;
            if (dateStr) showDayDetail(dateStr);
        });
    });
}
function showDayDetail(dateStr) {
    const dayTasks = tasks.filter(t => t.due === dateStr);
    const parts = dateStr.split('-').map(Number);
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    calDayLabel.textContent = dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
    calDayTasks.innerHTML = '';
    if (dayTasks.length === 0) {
        calDayTasks.innerHTML = '<li style="background:none;border-left-color:transparent;color:var(--ink-faint);justify-content:center;font-style:italic;">No tasks for this day.</li>';
    } else {
        dayTasks.forEach(task => {
            const li = document.createElement('li');
            li.className = task.completed ? 'completed' : '';
            li.innerHTML = `<span>${escapeHtml(task.text)}</span><span>${task.completed ? '✅ Done' : '⏳ Pending'}</span>`;
            calDayTasks.appendChild(li);
        });
    }
    calDayDetail.style.display = 'block';
    
    // Smooth scroll to the detail panel
    setTimeout(() => {
        calDayDetail.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

function closeDayDetail() {
    calDayDetail.style.display = 'none';
}

function prevMonth() {
    calDate.setMonth(calDate.getMonth() - 1);
    renderCalendar(calDate);
}
function nextMonth() {
    calDate.setMonth(calDate.getMonth() + 1);
    renderCalendar(calDate);
}

// ========== VIEW SWITCHING ==========
function switchView(view) {
    currentView = view;
    // Hide all views
    appContent.style.display = 'none';
    statsDashboard.style.display = 'none';
    calendarView.style.display = 'none';
    
    // Show selected
    if (view === 'tasks') {
        appContent.style.display = 'block';
    } else if (view === 'stats') {
        statsDashboard.style.display = 'block';
        updateStats();
    } else if (view === 'calendar') {
        calendarView.style.display = 'block';
        renderCalendar(calDate);
        closeDayDetail();
    }
    
    // Update active button states
    [viewTasksBtn, viewStatsBtn, viewCalendarBtn].forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
}

// ========== RENDER ==========
function render() {
    // Only render tasks if we are in tasks view
    if (currentView === 'tasks') {
        let filtered = tasks.filter(t => {
            const matchFilter = currentFilter === 'all' || t.category === currentFilter;
            const matchSearch = t.text.toLowerCase().includes(searchQuery.toLowerCase());
            return matchFilter && matchSearch;
        });

        filtered.sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            if (a.due && b.due) return new Date(a.due) - new Date(b.due);
            if (a.due) return -1;
            if (b.due) return 1;
            return 0;
        });

        const total = tasks.length;
        const done = tasks.filter(t => t.completed).length;
        taskCount.textContent = total;
        completedNum.textContent = done;
        updateCountdown();
        updateRing();

        if (filtered.length === 0) {
            const hasAnyTasks = tasks.length > 0;
            taskList.innerHTML = `
                <div class="empty-state">
                    <div class="es-icon">${hasAnyTasks ? '🔍' : '🚀'}</div>
                    <h3>${hasAnyTasks ? 'No matches' : 'All clear!'}</h3>
                    <p>${hasAnyTasks ? 'Try a different filter or search term.' : 'Add your first task above to get started.'}</p>
                </div>
            `;
            return;
        }

        let html = '';
        const categories = currentUser?.categories || ['Personal', 'Work', 'Health', 'Errands'];

        filtered.forEach((task, i) => {
            const isEditing = editingId === task._id;
            const dueStr = task.due ? formatDate(task.due) : 'No date';
            const overdue = task.due && isOverdue(task.due) && !task.completed;
            const catClass = `category-${task.category}`;
            const energyClass = `energy-${task.energy}`;
            const energyIcon = task.energy === 'high' ? '🔥' : task.energy === 'medium' ? '⚡' : '💤';
            const safeText = escapeHtml(task.text);

            const categoryOptions = categories.map(c =>
                `<option value="${c}" ${task.category === c ? 'selected' : ''}>${c}</option>`
            ).join('');

            html += `<li class="task-item cat-${task.category} ${task.completed ? 'completed' : ''} ${isEditing ? 'editing' : ''}" data-id="${task._id}" style="animation-delay:${Math.min(i, 8) * 0.03}s">
                <div class="checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTask('${task._id}')">
                    <i class="fas fa-check"></i>
                </div>
                <div class="task-info">
                    <span class="task-text">${safeText}</span>
                    <div class="task-meta">
                        <span class="badge ${catClass}">${task.category}</span>
                        <span class="badge ${energyClass}">${energyIcon} ${task.energy}</span>
                        <span class="due-date ${overdue ? 'overdue' : ''}">
                            <i class="far fa-calendar-alt"></i> ${dueStr} ${overdue ? '⚠️ Overdue' : ''}
                        </span>
                    </div>
                </div>
                <div class="edit-inputs">
                    <input type="text" class="edit-text" value="${safeText}" />
                    <input type="date" class="edit-due" value="${task.due || ''}" />
                    <select class="edit-category">
                        ${categoryOptions}
                    </select>
                    <select class="edit-energy">
                        <option value="high" ${task.energy === 'high' ? 'selected' : ''}>🔥 High</option>
                        <option value="medium" ${task.energy === 'medium' ? 'selected' : ''}>⚡ Medium</option>
                        <option value="low" ${task.energy === 'low' ? 'selected' : ''}>💤 Low</option>
                    </select>
                    <button class="save-edit-btn" onclick="saveEdit('${task._id}')"><i class="fas fa-save"></i> Save</button>
                </div>
                <div class="task-actions">
                    <button onclick="startEdit('${task._id}')" aria-label="Edit task"><i class="fas fa-pen"></i></button>
                    <button onclick="deleteTask('${task._id}')" class="delete-btn" aria-label="Delete task"><i class="fas fa-trash-alt"></i></button>
                </div>
            </li>`;
        });
        taskList.innerHTML = html;
    }

    // If stats view is visible, update stats
    if (currentView === 'stats') {
        updateStats();
    }

    // If calendar view is visible, re-render calendar (in case tasks changed)
    if (currentView === 'calendar') {
        renderCalendar(calDate);
    }
}

function startEdit(id) {
    if (editingId === id) {
        editingId = null;
        render();
        return;
    }
    editingId = id;
    render();
    const input = document.querySelector(`.task-item[data-id="${id}"] .edit-text`);
    if (input) input.focus();
}

function switchTab(tab) {
    tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
    if (tab === 'login') {
        loginForm.classList.add('active-form');
        signupForm.classList.remove('active-form');
        loginError.textContent = '';
        signupError.textContent = '';
    } else {
        signupForm.classList.add('active-form');
        loginForm.classList.remove('active-form');
        loginError.textContent = '';
        signupError.textContent = '';
    }
}

// ========== 3D TILT ==========
function attachTilt(el, maxTilt = 6) {
    if (!el) return;
    let raf = null;
    el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
            el.style.transform = `perspective(900px) rotateX(${(-py * maxTilt).toFixed(2)}deg) rotateY(${(px * maxTilt).toFixed(2)}deg)`;
        });
    });
    el.addEventListener('mouseleave', () => {
        if (raf) cancelAnimationFrame(raf);
        el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)';
    });
}
attachTilt(authCard, 5);

// ========== PASSWORD TOGGLES ==========
document.querySelectorAll('.pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.target);
        if (!input) return;
        const showing = input.type === 'text';
        input.type = showing ? 'password' : 'text';
        const icon = btn.querySelector('i');
        icon.classList.toggle('fa-eye', showing);
        icon.classList.toggle('fa-eye-slash', !showing);
    });
});

// ========== ONBOARDING EVENT LISTENERS ==========
roleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const role = btn.dataset.role;
        if (selectedRoles.includes(role)) {
            if (selectedRoles.length > 1) {
                selectedRoles = selectedRoles.filter(r => r !== role);
            } else {
                showToast('Keep at least one role', 'info');
                return;
            }
        } else {
            selectedRoles.push(role);
        }
        updateRoleButtons();
        mergeCategoriesFromRoles();
    });
});

addCategoryBtn.addEventListener('click', addCategory);
newCategoryInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addCategory();
});

finishSetupBtn.addEventListener('click', async () => {
    if (userCategories.length === 0) {
        showFieldError(onboardingError, 'Please add at least one category.');
        return;
    }

    setBtnLoading(finishSetupBtn, true);
    try {
        await apiCall('/user/roles', 'PUT', { roles: selectedRoles });
        await apiCall('/user/categories', 'PUT', { categories: userCategories });
        const stored = getStoredUser();
        if (stored) {
            stored.roles = selectedRoles;
            stored.categories = userCategories;
            setStoredUser(stored);
            currentUser.roles = selectedRoles;
            currentUser.categories = userCategories;
        }
        onboardingPage.style.display = 'none';
        switchView('tasks');
        userDisplay.textContent = `👋 ${currentUser.name}`;
        populateCategories();
        renderSkeleton();
        loadTasks();
        showToast('🎉 Welcome to TaskFlow!', 'success');
    } catch (err) {
        showFieldError(onboardingError, err.message);
    } finally {
        setBtnLoading(finishSetupBtn, false);
    }
});

// ========== VIEW TOGGLE EVENT LISTENERS ==========
viewTasksBtn.addEventListener('click', () => switchView('tasks'));
viewStatsBtn.addEventListener('click', () => switchView('stats'));
viewCalendarBtn.addEventListener('click', () => switchView('calendar'));

calPrevBtn.addEventListener('click', prevMonth);
calNextBtn.addEventListener('click', nextMonth);
calCloseDay.addEventListener('click', closeDayDetail);

// ========== EVENT LISTENERS ==========
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});
loginForm.addEventListener('submit', handleLogin);
signupForm.addEventListener('submit', handleSignup);
logoutBtn.addEventListener('click', logout);

addBtn.addEventListener('click', addTask);
taskInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addTask(); });
searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    render();
});
clearCompletedBtn.addEventListener('click', clearCompleted);

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const icon = themeToggle.querySelector('i');
    icon.classList.toggle('fa-moon');
    icon.classList.toggle('fa-sun');
    localStorage.setItem('taskflow_theme', document.body.classList.contains('dark') ? 'light' : 'dark');
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (appPage.style.display === 'none') return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
    if (e.key === '/') {
        e.preventDefault();
        searchInput.focus();
    } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        taskInput.focus();
    }
});

// ========== INIT ==========
if (localStorage.getItem('taskflow_theme') === 'light') {
    document.body.classList.add('dark');
    themeToggle.querySelector('i').classList.replace('fa-moon', 'fa-sun');
}

const token = getAuthToken();
const storedUser = getStoredUser();
if (token && storedUser) {
    currentUser = storedUser;
    selectedRoles = currentUser.roles || ['general'];
    userCategories = currentUser.categories || ['Personal', 'Work', 'Health', 'Errands'];
    showApp();
} else {
    loginPage.style.display = 'block';
    appPage.style.display = 'none';
    // Ensure navigation is hidden when not logged in
    if (viewNav) viewNav.style.display = 'none';
}

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
dueDateInput.value = tomorrow.toISOString().split('T')[0];