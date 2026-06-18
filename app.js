// --- Multi-User Profile State ---
let profilesList = [];
let activeProfileId = '';
let selectedType = 'expense';
let selectedCategory = 'Food';

let state = {
  transactions: [],
  budgets: {
    Food: 400,
    Shopping: 250,
    Entertainment: 150,
    Transport: 200,
    Utilities: 150,
    Other: 200
  },
  theme: 'dark',
  pin: null
};

// Dynamic Category Colors Map (matching Monochromatic CSS themes)
function getCategoryColor(cat) {
  const colors = {
    Food: 'var(--cat-food)',
    Shopping: 'var(--cat-shopping)',
    Entertainment: 'var(--cat-entertainment)',
    Transport: 'var(--cat-transport)',
    Utilities: 'var(--cat-utilities)',
    Other: 'var(--cat-other)'
  };
  return colors[cat] || colors.Other;
}

const CATEGORY_ICONS = {
  Food: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v4"/><path d="M5 2v4"/><path d="M9 2v4"/><path d="M19 2v14h-3v7h-2v-7H11V2c1.9 0 3.8.7 5 2V2z"/></svg>`,
  Shopping: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
  Entertainment: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;"><rect x="2" y="2" width="20" height="20" rx="2" ry="2"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>`,
  Transport: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  Utilities: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  Other: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`
};

// Default budgets helper
function getDefaultBudgets() {
  return {
    Food: 400,
    Shopping: 250,
    Entertainment: 150,
    Transport: 200,
    Utilities: 150,
    Other: 200
  };
}

// Format numbers as currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount);
}

// --- Safe Storage Fallback Wrapper ---
const storage = {
  memoryStore: {},
  getItem(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return this.memoryStore[key] || null;
    }
  },
  setItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      this.memoryStore[key] = String(value);
    }
  },
  removeItem(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      delete this.memoryStore[key];
    }
  }
};

// --- Local profiles tracking on device ---
function getLocalProfiles() {
  try {
    const local = localStorage.getItem('trackora_local_profiles');
    return local ? JSON.parse(local) : [];
  } catch (e) {
    return [];
  }
}

function addLocalProfile(profileId) {
  if (!profileId) return;
  const local = getLocalProfiles();
  if (!local.includes(profileId)) {
    local.push(profileId);
    try {
      localStorage.setItem('trackora_local_profiles', JSON.stringify(local));
    } catch (e) {
      console.error(e);
    }
  }
}

function removeLocalProfile(profileId) {
  if (!profileId) return;
  let local = getLocalProfiles();
  local = local.filter(id => id !== profileId);
  try {
    localStorage.setItem('trackora_local_profiles', JSON.stringify(local));
  } catch (e) {
    console.error(e);
  }
}

// --- // --- Profile List Load / Save ---
async function loadProfiles() {
  try {
    const res = await fetch('/api/profiles');
    if (res.ok) {
      profilesList = await res.json();
    }
  } catch (e) {
    console.error('Error loading profiles list from backend', e);
  }
  
  // Local session cache for active user identification
  activeProfileId = localStorage.getItem('apex_active_profile_id') || '';
  
  if (activeProfileId) {
    addLocalProfile(activeProfileId);
  }
}

function saveProfiles() {
  localStorage.setItem('apex_active_profile_id', activeProfileId);
}

// --- Active Profile State Management ---
async function loadActiveProfileState() {
  if (!activeProfileId) {
    resetProfileStateToZeroInMemory();
    return;
  }
  try {
    const res = await fetch(`/api/profile/${activeProfileId}/state`);
    if (res.ok) {
      state = await res.json();
      if (!state.transactions) state.transactions = [];
      if (!state.budgets) state.budgets = getDefaultBudgets();
      if (!state.theme || state.theme === 'midnight') state.theme = 'dark';
      if (!state.colorTheme) state.colorTheme = 'midnight';
    } else {
      resetProfileStateToZeroInMemory();
    }
  } catch (e) {
    console.error('Error fetching profile state from server', e);
    resetProfileStateToZeroInMemory();
  }
}

async function saveActiveProfileState() {
  if (!activeProfileId) return;
  try {
    await fetch(`/api/profile/${activeProfileId}/theme`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        theme: state.theme || 'dark',
        colorTheme: state.colorTheme || 'midnight'
      })
    });
  } catch (e) {
    console.error('Error syncing theme preferences with server', e);
  }
}

function resetProfileStateToZeroInMemory() {
  state = {
    transactions: [],
    budgets: getDefaultBudgets(),
    theme: 'dark',
    colorTheme: 'midnight'
  };
}

async function resetProfileStateToZero() {
  resetProfileStateToZeroInMemory();
  if (!activeProfileId) return;
  try {
    await fetch(`/api/profile/${activeProfileId}/reset`, { method: 'POST' });
    await saveActiveProfileState(); // sync default themes
  } catch (e) {
    console.error(e);
  }
}

// Wrapper for Clear All button
async function resetToDefaultState() {
  await resetProfileStateToZero();
}

function saveState() {
  saveActiveProfileState();
}

async function loadState() {
  await loadActiveProfileState();
}

// --- UI Header Updater ---
function updateProfileUI() {
  const activeProfile = profilesList.find(p => p.id === activeProfileId);
  if (!activeProfile) return;
  
  const nameEl = document.getElementById('user-profile-name');
  const avatarEl = document.getElementById('user-avatar-initials');
  
  if (nameEl) nameEl.textContent = activeProfile.name;
  
  // Extract initials (e.g. "Veera M." -> "VM")
  const initials = activeProfile.name
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
    
  if (avatarEl) {
    avatarEl.textContent = initials;
    // Set custom visual identifier avatar background
    avatarEl.parentNode.style.background = activeProfile.color;
  }
}

// --- Profile Switching Drawer Logic ---
const profileDrawer = document.getElementById('profile-drawer');
const overlay = document.getElementById('drawer-overlay');

function openProfileDrawer() {
  renderProfilesList();
  overlay.classList.add('show');
  profileDrawer.classList.add('show');
}
window.openProfileDrawer = openProfileDrawer;

function closeProfileDrawer() {
  overlay.classList.remove('show');
  profileDrawer.classList.remove('show');
  document.getElementById('new-profile-name').value = '';
}
window.closeProfileDrawer = closeProfileDrawer;

function renderProfilesList() {
  const container = document.getElementById('profiles-list-container');
  if (!container) return;
  container.innerHTML = '';
  
  const localProfileIds = getLocalProfiles();
  const localProfiles = profilesList.filter(p => localProfileIds.includes(p.id));
  
  localProfiles.forEach(p => {
    const isActive = p.id === activeProfileId;
    const initials = p.name
      .split(' ')
      .filter(w => w.length > 0)
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    
    const div = document.createElement('div');
    div.className = `profile-item ${isActive ? 'active' : ''}`;
    div.innerHTML = `
      <div class="profile-info">
        <div class="profile-avatar" style="background-color: ${p.color};">
          ${initials}
        </div>
        <span class="profile-name">${p.name}</span>
      </div>
      ${isActive ? `
        <div class="profile-active-indicator">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width: 100%; height: 100%;">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
      ` : ''}
    `;
    
    div.addEventListener('click', () => {
      if (!isActive) {
        switchProfile(p.id);
      }
    });
    
    container.appendChild(div);
  });
}

async function switchProfile(profileId) {
  closeProfileDrawer();
  const lockScreen = document.getElementById('lock-screen');
  if (lockScreen) {
    lockScreen.classList.remove('hidden');
  }
  await selectProfileToUnlock(profileId);
}

async function createNewProfile(name, email, phone, securityQuestion, securityAnswer) {
  try {
    const res = await fetch('/api/profiles/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, security_question: securityQuestion, security_answer: securityAnswer })
    });
    
    if (res.ok) {
      const newProfile = await res.json();
      addLocalProfile(newProfile.id);
      await loadProfiles();
      activeProfileId = newProfile.id;
      saveProfiles();
      
      await loadActiveProfileState();
      
      closeProfileDrawer();
      updateProfileUI();
      
      // Transition to PIN setup
      lockScreenMode = 'setup';
      enteredPinCode = '';
      tempSetupPin = '';
      updateLockDots();
      
      const lockScreen = document.getElementById('lock-screen');
      if (lockScreen) {
        lockScreen.classList.remove('hidden');
        document.getElementById('lock-auth-view').classList.add('hidden');
        document.getElementById('lock-keypad-view').classList.remove('hidden');
        
        document.getElementById('lock-title').textContent = 'Setup PIN';
        document.getElementById('lock-status').textContent = `Set a 4-digit PIN for ${name}`;
        document.getElementById('lock-logo-icon').innerHTML = LOGO_SVGS.setup;
        document.getElementById('lock-ok-btn').textContent = 'Next';
      }
    } else {
      const err = await res.json();
      showToast(err.error || 'Failed to create profile', false);
    }
  } catch (e) {
    console.error('Error creating profile', e);
    showToast('Network error, please try again', false);
  }
}

// --- Multi-Theme Manager ---
function setAppTheme(themeName) {
  state.theme = themeName;
  saveState();
  
  const colorTheme = state.colorTheme || 'midnight';
  document.body.className = `theme-${themeName} color-${colorTheme}`;
  updateThemeToggleIcon(themeName);
  
  // Re-render dashboard charts since they dynamically query light/dark colors
  renderDashboard();

  showToast(`Switched to ${themeName.charAt(0).toUpperCase() + themeName.slice(1)} Mode`);
}
window.setAppTheme = setAppTheme;

function toggleTheme() {
  const currentTheme = state.theme || 'dark';
  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setAppTheme(nextTheme);
}
window.toggleTheme = toggleTheme;

function updateThemeToggleIcon(theme) {
  const iconEl = document.getElementById('theme-toggle-icon');
  if (!iconEl) return;
  if (theme === 'light') {
    iconEl.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
  } else {
    iconEl.innerHTML = `
      <circle cx="12" cy="12" r="5"></circle>
      <line x1="12" y1="1" x2="12" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="23"></line>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
      <line x1="1" y1="12" x2="3" y2="12"></line>
      <line x1="21" y1="12" x2="23" y2="12"></line>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    `;
  }
}

// Dynamic greeting based on time of day
function renderGreeting() {
  const hour = new Date().getHours();
  const greetingEl = document.getElementById('greeting-hello');
  let greetStr = 'Welcome back,';
  
  if (hour < 12) {
    greetStr = 'Good morning,';
  } else if (hour < 17) {
    greetStr = 'Good afternoon,';
  } else {
    greetStr = 'Good evening,';
  }
  
  if (greetingEl) {
    greetingEl.textContent = greetStr;
  }
}

// --- App Navigation ---
function showScreen(screenId) {
  // Hide all screens
  document.querySelectorAll('.app-screen').forEach(screen => {
    screen.classList.remove('active');
  });

  // Show selected screen
  const targetScreen = document.getElementById(`screen-${screenId}`);
  if (targetScreen) {
    targetScreen.classList.add('active');
  }

  // Update nav item active states
  document.querySelectorAll('.nav-item').forEach(navItem => {
    if (navItem.getAttribute('data-tab') === screenId) {
      navItem.classList.add('active');
    } else {
      navItem.classList.remove('active');
    }
  });

  // Perform specific screen renders
  if (screenId === 'dashboard') {
    renderDashboard();
  } else if (screenId === 'goals') {
    renderBudgetSettings();
  } else if (screenId === 'transactions') {
    renderTransactionsList();
  } else if (screenId === 'themes') {
    renderThemesList();
  }
}
window.showScreen = showScreen;

// --- Toast Messages ---
function showToast(message, isSuccess = true) {
  const toast = document.getElementById('toast-message');
  const toastText = document.getElementById('toast-text');
  const toastIcon = document.getElementById('toast-icon');
  
  if (!toast) return;
  toastText.textContent = message;
  
  if (isSuccess) {
    toastIcon.className = 'toast-icon success';
    toastIcon.innerHTML = `<polyline points="20 6 9 17 4 12"></polyline>`;
  } else {
    toastIcon.className = 'toast-icon error';
    toastIcon.innerHTML = `
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    `;
  }
  
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

function showCustomConfirm(message, onConfirm) {
  const modal = document.getElementById('confirm-modal');
  const msgEl = document.getElementById('confirm-modal-message');
  const okBtn = document.getElementById('confirm-modal-ok-btn');
  const cancelBtn = document.getElementById('confirm-modal-cancel-btn');
  
  if (!modal || !msgEl || !okBtn || !cancelBtn) {
    if (confirm(message)) {
      onConfirm();
    }
    return;
  }
  
  msgEl.textContent = message;
  modal.classList.remove('hidden');
  
  const newOkBtn = okBtn.cloneNode(true);
  const newCancelBtn = cancelBtn.cloneNode(true);
  okBtn.parentNode.replaceChild(newOkBtn, okBtn);
  cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
  
  newCancelBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
  });
  
  newOkBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    onConfirm();
  });
}
window.showCustomConfirm = showCustomConfirm;

// --- Dashboard Render Logic ---
function renderDashboard() {
  renderGreeting();
  
  let totalIncome = 0;
  let totalExpense = 0;

  state.transactions.forEach(tx => {
    if (tx.type === 'income') {
      totalIncome += tx.amount;
    } else {
      totalExpense += tx.amount;
    }
  });

  const netBalance = totalIncome - totalExpense;

  const balEl = document.getElementById('dashboard-balance');
  const incEl = document.getElementById('dashboard-income');
  const expEl = document.getElementById('dashboard-expense');

  if (balEl) balEl.textContent = formatCurrency(netBalance);
  if (incEl) incEl.textContent = formatCurrency(totalIncome);
  if (expEl) expEl.textContent = formatCurrency(totalExpense);

  if (balEl) {
    if (netBalance < 0) {
      balEl.style.color = 'var(--color-expense)';
    } else {
      balEl.style.color = 'var(--color-text-primary)';
    }
  }

  // Draw Charts
  renderDonutChart(totalExpense);
  renderWeeklyChart();

  // Render Budget Progress Cards
  renderDashboardBudgets();
}

// SVG Interactive Donut Chart Builder
function renderDonutChart(totalExpense) {
  const segmentsGroup = document.getElementById('donut-segments-group');
  const legendContainer = document.getElementById('chart-legend-container');
  const donutTotal = document.getElementById('donut-total');
  
  if (!segmentsGroup) return;
  
  segmentsGroup.innerHTML = '';
  legendContainer.innerHTML = '';
  
  donutTotal.textContent = formatCurrency(totalExpense);

  // Consolidate expenses by category
  const expenseByCategory = {};
  Object.keys(state.budgets).forEach(cat => {
    expenseByCategory[cat] = 0;
  });

  state.transactions.forEach(tx => {
    if (tx.type === 'expense') {
      const cat = tx.category || 'Other';
      expenseByCategory[cat] = (expenseByCategory[cat] || 0) + tx.amount;
    }
  });

  const activeExpenses = Object.entries(expenseByCategory)
    .filter(([_, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1]);

  if (totalExpense === 0 || activeExpenses.length === 0) {
    segmentsGroup.innerHTML = `
      <circle cx="100" cy="100" r="70" fill="none" stroke="var(--border-color)" stroke-width="12"></circle>
    `;
    legendContainer.innerHTML = `
      <div style="grid-column: span 2; text-align: center; font-size: 13px; color: var(--color-text-secondary); padding: 10px;">
        No expense data logged yet.
      </div>
    `;
    return;
  }

  const r = 70;
  const circumference = 2 * Math.PI * r;
  let currentAngle = -90;

  activeExpenses.forEach(([cat, amount]) => {
    const percent = amount / totalExpense;
    const strokeDashoffset = circumference - (percent * circumference);
    const color = getCategoryColor(cat);
    
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '100');
    circle.setAttribute('cy', '100');
    circle.setAttribute('r', r.toString());
    circle.setAttribute('class', 'donut-segment');
    circle.setAttribute('stroke', color);
    circle.setAttribute('stroke-dasharray', circumference.toString());
    circle.setAttribute('stroke-dashoffset', strokeDashoffset.toString());
    
    circle.style.transform = `rotate(${currentAngle}deg)`;
    circle.style.transformOrigin = 'center';
    
    circle.addEventListener('mouseover', () => {
      donutTotal.textContent = formatCurrency(amount);
      donutTotal.style.color = color;
      document.getElementById('donut-total').nextElementSibling.textContent = cat;
    });
    
    circle.addEventListener('mouseout', () => {
      donutTotal.textContent = formatCurrency(totalExpense);
      donutTotal.style.color = 'var(--color-text-primary)';
      document.getElementById('donut-total').nextElementSibling.textContent = 'Total Spent';
    });

    circle.addEventListener('click', () => {
      currentFilterCategory = cat;
      const pills = document.querySelectorAll('.filter-pill');
      pills.forEach(pill => {
        pill.classList.toggle('active', pill.getAttribute('data-category') === cat);
      });
      showScreen('transactions');
    });

    segmentsGroup.appendChild(circle);
    currentAngle += percent * 360;

    // Create Legend Item
    const legendPercent = Math.round(percent * 100);
    const legendItem = document.createElement('div');
    legendItem.className = 'legend-item';
    legendItem.innerHTML = `
      <div class="legend-label-box">
        <span class="legend-color-dot" style="background-color: ${color}"></span>
        <span class="legend-name">${cat}</span>
      </div>
      <span class="legend-percent">${legendPercent}%</span>
    `;

    legendItem.addEventListener('mouseenter', () => {
      donutTotal.textContent = formatCurrency(amount);
      donutTotal.style.color = color;
      document.getElementById('donut-total').nextElementSibling.textContent = cat;
    });

    legendItem.addEventListener('mouseleave', () => {
      donutTotal.textContent = formatCurrency(totalExpense);
      donutTotal.style.color = 'var(--color-text-primary)';
      document.getElementById('donut-total').nextElementSibling.textContent = 'Total Spent';
    });

    legendItem.addEventListener('click', () => {
      currentFilterCategory = cat;
      document.querySelectorAll('.filter-pill').forEach(p => {
        p.classList.toggle('active', p.getAttribute('data-category') === cat);
      });
      showScreen('transactions');
    });

    legendContainer.appendChild(legendItem);
  });
}

// SVG Vertical Bar Chart for Weekly Activity
let currentWeeklyTotal = 0;
let activeChartRange = 'week';

function setChartInterval(range) {
  activeChartRange = range;
  
  // Update header text based on range
  const titleEl = document.getElementById('activity-chart-title');
  if (titleEl) {
    titleEl.textContent = range === 'week' ? 'Weekly Activity' : (range === 'month' ? 'Monthly Activity' : 'Yearly Activity');
  }
  
  // Update active state of button tabs
  document.querySelectorAll('.chart-tab').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-range') === range);
  });
  
  renderWeeklyChart();
}
window.setChartInterval = setChartInterval;

function renderWeeklyChart() {
  const chartSvg = document.getElementById('weekly-bar-chart');
  const labelTotal = document.getElementById('weekly-chart-total');
  
  if (!chartSvg) return;
  
  const today = new Date();
  let dataPoints = [];
  
  if (activeChartRange === 'week') {
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = daysOfWeek[d.getDay()];
      dataPoints.push({ key: dateStr, label: dayName, subLabel: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), amount: 0 });
    }
    
    // Sum expense transactions
    state.transactions.forEach(tx => {
      if (tx.type === 'expense') {
        const match = dataPoints.find(dp => dp.key === tx.date);
        if (match) {
          match.amount += tx.amount;
        }
      }
    });
  } 
  else if (activeChartRange === 'month') {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(today.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth();
      const labelStr = monthNames[month];
      const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
      dataPoints.push({ key: prefix, label: labelStr, subLabel: String(year), amount: 0 });
    }
    
    // Sum expense transactions (prefix matching YYYY-MM)
    state.transactions.forEach(tx => {
      if (tx.type === 'expense' && tx.date) {
        const txPrefix = tx.date.substring(0, 7); // YYYY-MM
        const match = dataPoints.find(dp => dp.key === txPrefix);
        if (match) {
          match.amount += tx.amount;
        }
      }
    });
  } 
  else if (activeChartRange === 'year') {
    const currentYear = today.getFullYear();
    for (let i = 4; i >= 0; i--) {
      const year = currentYear - i;
      dataPoints.push({ key: String(year), label: String(year), subLabel: 'Yearly Total', amount: 0 });
    }
    
    // Sum expense transactions (prefix matching YYYY)
    state.transactions.forEach(tx => {
      if (tx.type === 'expense' && tx.date) {
        const txYear = tx.date.substring(0, 4); // YYYY
        const match = dataPoints.find(dp => dp.key === txYear);
        if (match) {
          match.amount += tx.amount;
        }
      }
    });
  }
  
  const totalSum = dataPoints.reduce((sum, dp) => sum + dp.amount, 0);
  currentWeeklyTotal = totalSum;
  labelTotal.textContent = formatCurrency(totalSum);
  
  const maxAmount = Math.max(...dataPoints.map(dp => dp.amount), 20);
  
  // Calculate coordinates
  const chartWidth = 320;
  const chartHeight = 80;
  const chartBottom = 110;
  const paddingLeft = 25;
  const paddingRight = 25;
  const availableWidth = chartWidth - paddingLeft - paddingRight;
  const colWidth = availableWidth / (dataPoints.length - 1 || 1);
  
  const points = dataPoints.map((dp, index) => {
    const x = paddingLeft + index * colWidth;
    const y = chartBottom - (dp.amount / maxAmount) * chartHeight;
    return { x, y, label: dp.label, subLabel: dp.subLabel, amount: dp.amount, index };
  });
  
  // Generate cubic spline path
  const splinePath = getSplinePath(points);
  const areaPath = splinePath ? `${splinePath} L ${points[points.length-1].x} ${chartBottom} L ${points[0].x} ${chartBottom} Z` : '';
  
  let svgContent = `
    <defs>
      <linearGradient id="wave-gradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--color-primary)" stop-opacity="0.4" />
        <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0.0" />
      </linearGradient>
    </defs>
    
    <!-- Gridlines -->
    <line x1="15" y1="30" x2="305" y2="30" stroke="rgba(255,255,255,0.03)" stroke-width="1" />
    <line x1="15" y1="70" x2="305" y2="70" stroke="rgba(255,255,255,0.03)" stroke-width="1" />
    <line x1="15" y1="110" x2="305" y2="110" stroke="rgba(255,255,255,0.06)" stroke-width="1.5" />
  `;
  
  if (splinePath) {
    svgContent += `
      <!-- Glowing Filled Area -->
      <path class="chart-wave-area" d="${areaPath}"></path>
      <!-- Spline Stroke Line -->
      <path class="chart-wave-line" d="${splinePath}"></path>
    `;
  }
  
  // Render dots and text
  points.forEach((pt) => {
    const dotRadius = 4;
    
    svgContent += `
      <!-- Interactive coordinates dot -->
      <circle class="chart-wave-dot-shadow" cx="${pt.x}" cy="${pt.y}" r="${dotRadius + 2}" />
      <circle class="chart-wave-dot" 
              cx="${pt.x}" 
              cy="${pt.y}" 
              r="${dotRadius}"
              data-amount="${pt.amount}" 
              data-label="${pt.label}" 
              data-sublabel="${pt.subLabel}"
              onmouseover="hoverWeeklyBar(this)" 
              onmouseout="unhoverWeeklyBar()" />
    `;
    
    svgContent += `<text class="chart-bar-label" x="${pt.x}" y="126">${pt.label}</text>`;
  });
  
  chartSvg.innerHTML = svgContent;
}

// Global mouse-hover functions for weekly/monthly/yearly activity chart
function hoverWeeklyBar(rect) {
  const amount = parseFloat(rect.getAttribute('data-amount'));
  const label = rect.getAttribute('data-label');
  const sublabel = rect.getAttribute('data-sublabel');

  const labelTotal = document.getElementById('weekly-chart-total');
  if (labelTotal) {
    labelTotal.textContent = `${label} (${sublabel}): ${formatCurrency(amount)}`;
    labelTotal.style.color = 'var(--color-primary)';
  }
}
window.hoverWeeklyBar = hoverWeeklyBar;

function unhoverWeeklyBar() {
  const labelTotal = document.getElementById('weekly-chart-total');
  if (labelTotal) {
    labelTotal.textContent = formatCurrency(currentWeeklyTotal);
    labelTotal.style.color = 'var(--color-balance)';
  }
}
window.unhoverWeeklyBar = unhoverWeeklyBar;

// Render Dashboard Budget Status Progress Bars
function renderDashboardBudgets() {
  const container = document.getElementById('dashboard-budgets');
  if (!container) return;
  container.innerHTML = '';

  const expenseByCategory = {};
  state.transactions.forEach(tx => {
    if (tx.type === 'expense') {
      const cat = tx.category || 'Other';
      expenseByCategory[cat] = (expenseByCategory[cat] || 0) + tx.amount;
    }
  });

  Object.entries(state.budgets).forEach(([cat, limit]) => {
    const spent = expenseByCategory[cat] || 0;
    const progress = Math.min(100, Math.round((spent / limit) * 100));
    const color = getCategoryColor(cat);
    const icon = CATEGORY_ICONS[cat];
    
    let fillStyle = `background-color: ${color}`;
    let warningLabel = '';
    
    if (spent > limit) {
      warningLabel = `<span style="color: var(--color-text-primary); font-size: 10px; font-weight: 700; margin-left: 6px; letter-spacing: 0.5px;">OVER BUDGET</span>`;
    } else if (spent >= limit * 0.8) {
      warningLabel = `<span style="color: var(--color-text-secondary); font-size: 10px; font-weight: 700; margin-left: 6px; letter-spacing: 0.5px;">80% REACHED</span>`;
    }

    const item = document.createElement('div');
    item.className = 'budget-progress-item';
    item.innerHTML = `
      <div class="budget-label-row">
        <div class="budget-category-info">
          <span>${icon}</span>
          <span>${cat}</span>
          ${warningLabel}
        </div>
        <div class="budget-limit-text">
          <strong style="color: var(--color-text-primary);">${formatCurrency(spent)}</strong> of ${formatCurrency(limit)}
        </div>
      </div>
      <div class="budget-bar-track">
        <div class="budget-bar-fill" style="width: 0%; ${fillStyle}" id="bar-${cat}"></div>
      </div>
    `;

    container.appendChild(item);

    setTimeout(() => {
      const bar = document.getElementById(`bar-${cat}`);
      if (bar) bar.style.width = `${progress}%`;
    }, 100);
  });
}

// --- Budget Goals Configurator Screen ---
function renderBudgetSettings() {
  const listContainer = document.getElementById('budget-settings-list');
  if (!listContainer) return;
  listContainer.innerHTML = '';

  Object.entries(state.budgets).forEach(([cat, limit]) => {
    const icon = CATEGORY_ICONS[cat];
    const card = document.createElement('div');
    card.className = 'budget-setting-item';
    card.innerHTML = `
      <div class="budget-setting-info">
        <span style="font-size: 20px;">${icon}</span>
        <div style="display: flex; flex-direction: column;">
          <strong style="font-size: 14px;">${cat} Limit</strong>
          <span style="font-size: 11px; color: var(--color-text-secondary);">Monthly limit</span>
        </div>
      </div>
      <div class="budget-setting-input-wrapper">
        <span style="color: var(--color-text-secondary); font-size: 14px; font-weight: 700;">₹</span>
        <input type="number" class="budget-setting-input" value="${limit}" data-cat="${cat}" min="0" step="10">
      </div>
    `;

    const input = card.querySelector('.budget-setting-input');
    
    input.addEventListener('input', (e) => {
      const newLimit = parseFloat(e.target.value);
      const category = e.target.getAttribute('data-cat');
      
      if (!isNaN(newLimit) && newLimit >= 0) {
        state.budgets[category] = newLimit;
      }
    });

    input.addEventListener('change', async (e) => {
      const newLimit = parseFloat(e.target.value);
      const category = e.target.getAttribute('data-cat');
      
      if (!isNaN(newLimit) && newLimit >= 0) {
        state.budgets[category] = newLimit;
        
        try {
          const res = await fetch(`/api/profile/${activeProfileId}/budgets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state.budgets)
          });
          if (res.ok) {
            showToast(`${category} budget updated to ${formatCurrency(newLimit)}`);
          } else {
            showToast('Failed to sync budgets with server', false);
          }
        } catch (e) {
          console.error(e);
          showToast('Network error updating budget', false);
        }
      } else {
        e.target.value = state.budgets[category];
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.target.blur();
      }
    });

    listContainer.appendChild(card);
  });
}

// --- UI Themes Configurator Screen ---
const UI_THEMES = [
  { id: 'midnight', name: 'Midnight Indigo', desc: 'Deep indigo accent with twilight blue balance card.', color: '#6366f1' },
  { id: 'cyberpunk', name: 'Cyberpunk Neon', desc: 'Electric magenta accent with synthwave purple card.', color: '#d946ef' },
  { id: 'emerald', name: 'Emerald Forest', desc: 'Fresh mint accent with deep evergreen card.', color: '#10b981' },
  { id: 'sunset', name: 'Sunset Glow', desc: 'Warm amber accent with dark bronze card.', color: '#f59e0b' },
  { id: 'ocean', name: 'Ocean Breeze', desc: 'Vibrant sky blue accent with deep sea card.', color: '#0ea5e9' },
  { id: 'monochrome', name: 'Minimalist Monochrome', desc: 'Premium black-and-white theme with gray card.', color: '#ffffff' }
];

function renderThemesList() {
  const container = document.getElementById('themes-grid-container');
  if (!container) return;
  container.innerHTML = '';

  const activeColorTheme = state.colorTheme || 'midnight';

  UI_THEMES.forEach(t => {
    const isActive = t.id === activeColorTheme;
    const card = document.createElement('div');
    card.className = `theme-select-card ${isActive ? 'active' : ''}`;
    
    // Customize preview dot for monochrome in light mode
    let dotColor = t.color;
    if (t.id === 'monochrome' && document.body.classList.contains('theme-light')) {
      dotColor = '#000000';
    }

    card.innerHTML = `
      <div class="theme-select-header">
        <div class="theme-select-color" style="background-color: ${dotColor};"></div>
        <div class="theme-select-text">
          <strong class="theme-select-name">${t.name}</strong>
          <span class="theme-select-desc">${t.desc}</span>
        </div>
      </div>
      <div class="theme-select-indicator">
        ${isActive ? `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; color: var(--color-primary);">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        ` : ''}
      </div>
    `;

    card.addEventListener('click', () => {
      setColorTheme(t.id);
    });

    container.appendChild(card);
  });
}
window.renderThemesList = renderThemesList;

function setColorTheme(themeName) {
  state.colorTheme = themeName;
  saveState();
  
  const currentTheme = state.theme || 'dark';
  document.body.className = `theme-${currentTheme} color-${themeName}`;
  
  renderThemesList();
  renderDashboard();
  
  showToast(`Applied ${themeName.charAt(0).toUpperCase() + themeName.slice(1)} Theme`);
}
window.setColorTheme = setColorTheme;

// --- Settings Drawer Action Handlers ---
function openSettingsDrawer() {
  const activeProfile = profilesList.find(p => p.id === activeProfileId);
  if (activeProfile) {
    const initials = activeProfile.name
      .split(' ')
      .filter(w => w.length > 0)
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
      
    document.getElementById('settings-profile-avatar').textContent = initials;
    document.getElementById('settings-profile-avatar').style.backgroundColor = activeProfile.color;
    document.getElementById('settings-profile-name').textContent = activeProfile.name;
    document.getElementById('settings-profile-phone').textContent = activeProfile.phone ? `+91 ${activeProfile.phone}` : 'No phone linked';
    
  }
  
  document.getElementById('drawer-overlay').classList.add('show');
  document.getElementById('settings-drawer').classList.add('show');
}
window.openSettingsDrawer = openSettingsDrawer;

function closeSettingsDrawer() {
  document.getElementById('drawer-overlay').classList.remove('show');
  document.getElementById('settings-drawer').classList.remove('show');
}
window.closeSettingsDrawer = closeSettingsDrawer;

function handleSettingsChangePin() {
  closeSettingsDrawer();
  
  enteredPinCode = '';
  tempSetupPin = '';
  lockScreenMode = 'setup';
  
  const activeProfile = profilesList.find(p => p.id === activeProfileId);
  const name = activeProfile ? activeProfile.name : '';
  
  document.getElementById('lock-title').textContent = 'Setup PIN';
  document.getElementById('lock-status').textContent = `Set a new 4-digit code for ${name}`;
  document.getElementById('lock-logo-icon').innerHTML = LOGO_SVGS.setup;
  document.getElementById('lock-ok-btn').textContent = 'Next';
  updateLockDots();
  
  document.getElementById('lock-auth-view').classList.add('hidden');
  document.getElementById('lock-keypad-view').classList.remove('hidden');
  document.getElementById('lock-screen').classList.remove('hidden');
}
window.handleSettingsChangePin = handleSettingsChangePin;

function handleSettingsSwitchProfile() {
  closeSettingsDrawer();
  openProfileDrawer();
}
window.handleSettingsSwitchProfile = handleSettingsSwitchProfile;

async function handleSettingsRemoveAccount() {
  const activeProfile = profilesList.find(p => p.id === activeProfileId);
  if (!activeProfile) return;
  
  closeSettingsDrawer();
  
  enteredPinCode = '';
  updateLockDots();
  
  lockScreenMode = 'delete_verify';
  
  document.getElementById('lock-auth-view').classList.add('hidden');
  document.getElementById('lock-keypad-view').classList.remove('hidden');
  document.getElementById('lock-reset-view').classList.add('hidden');
  document.getElementById('lock-screen').classList.remove('hidden');
  
  document.getElementById('lock-title').textContent = 'Verify Identity';
  document.getElementById('lock-status').textContent = `Enter your PIN to delete the profile "${activeProfile.name}"`;
  document.getElementById('lock-logo-icon').innerHTML = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-expense)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.4));"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
  document.getElementById('lock-ok-btn').textContent = 'Confirm';
  
  const forgotBtn = document.getElementById('lock-forgot-btn');
  if (forgotBtn) forgotBtn.classList.add('hidden');
}
window.handleSettingsRemoveAccount = handleSettingsRemoveAccount;

async function handleSettingsResetData() {
  showCustomConfirm('Are you sure you want to delete all transactions and reset this profile to zero? This cannot be undone.', async () => {
    await resetToDefaultState();
    await loadState();
    
    const currentTheme = state.theme || 'dark';
    const colorTheme = state.colorTheme || 'midnight';
    document.body.className = `theme-${currentTheme} color-${colorTheme}`;
    updateThemeToggleIcon(currentTheme);

    renderDashboard();
    closeSettingsDrawer();
    showToast('Transaction records cleared for this profile');
  });
}
window.handleSettingsResetData = handleSettingsResetData;

function handleSettingsSignOut() {
  closeSettingsDrawer();
  signOutActiveProfile();
}
window.handleSettingsSignOut = handleSettingsSignOut;

function handleSettingsPhoneSignIn() {
  closeSettingsDrawer();
  initLockScreen();
}
window.handleSettingsPhoneSignIn = handleSettingsPhoneSignIn;

// --- Transactions List Screen Logic ---
let currentFilterCategory = 'all';
let currentSearchQuery = '';

function renderTransactionsList() {
  const container = document.getElementById('full-transaction-list');
  if (!container) return;
  container.innerHTML = '';

  let filtered = state.transactions;

  if (currentFilterCategory !== 'all') {
    filtered = filtered.filter(tx => tx.category === currentFilterCategory);
  }

  if (currentSearchQuery.trim() !== '') {
    const q = currentSearchQuery.toLowerCase();
    filtered = filtered.filter(tx => 
      tx.desc.toLowerCase().includes(q) || 
      tx.category.toLowerCase().includes(q) ||
      tx.amount.toString().includes(q)
    );
  }

  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="no-transactions">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>No matching transactions found.</span>
      </div>
    `;
    return;
  }

  filtered.forEach(tx => {
    const isIncome = tx.type === 'income';
    const sign = isIncome ? '+' : '-';
    const colorClass = isIncome ? 'income-style' : 'expense-style';
    const displayAmount = isIncome ? formatCurrency(tx.amount) : `-${formatCurrency(tx.amount)}`;
    const icon = CATEGORY_ICONS[tx.category] || CATEGORY_ICONS.Other;
    const iconBg = isIncome ? 'var(--color-income)' : getCategoryColor(tx.category);
    const incomeIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`;
    
    const txDate = new Date(tx.date + 'T00:00:00');
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    const dateStr = txDate.toLocaleDateString('en-US', options);

    const row = document.createElement('div');
    row.className = 'transaction-item';
    row.innerHTML = `
      <div class="transaction-meta">
        <div class="transaction-icon-box" style="background-color: ${iconBg}; color: var(--bg-primary);">
          ${isIncome ? incomeIcon : icon}
        </div>
        <div class="transaction-details">
          <span class="transaction-title">${tx.desc}</span>
          <span class="transaction-date">${dateStr} • ${tx.category}</span>
        </div>
      </div>
      <div class="transaction-amount-wrapper">
        <span class="transaction-value ${colorClass}">${sign}${formatCurrency(tx.amount)}</span>
        <button class="delete-tx-btn" data-id="${tx.id}" aria-label="Delete transaction">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      </div>
    `;

    row.querySelector('.delete-tx-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTransaction(tx.id);
    });

    container.appendChild(row);
  });
}

async function deleteTransaction(id) {
  const index = state.transactions.findIndex(tx => tx.id === id);
  if (index !== -1) {
    const desc = state.transactions[index].desc;
    try {
      const res = await fetch(`/api/profile/${activeProfileId}/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        state.transactions.splice(index, 1);
        renderTransactionsList();
        showToast(`Deleted "${desc}"`);
      } else {
        showToast('Failed to delete transaction on server', false);
      }
    } catch (e) {
      console.error(e);
      showToast('Network error deleting transaction', false);
    }
  }
}

// --- Drawer UI Interactions ---
const drawer = document.getElementById('add-drawer');

function openTransactionDrawer() {
  document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
  overlay.classList.add('show');
  drawer.classList.add('show');
}

function closeTransactionDrawer() {
  overlay.classList.remove('show');
  drawer.classList.remove('show');
  document.getElementById('tx-amount').value = '';
  document.getElementById('tx-desc').value = '';
}

function setupCategoryPicker() {
  const grid = document.getElementById('category-picker-grid');
  grid.querySelectorAll('.cat-picker-item').forEach(item => {
    item.addEventListener('click', () => {
      grid.querySelectorAll('.cat-picker-item').forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');
      selectedCategory = item.getAttribute('data-cat');
    });
  });
}

// --- Screen Lock State & Logic ---
let enteredPinCode = '';
let tempSetupPin = '';
let lockScreenMode = 'unlock'; // 'setup', 'confirm', 'unlock'

function initLockScreen() {
  const lockScreen = document.getElementById('lock-screen');
  if (!lockScreen) return;
  
  enteredPinCode = '';
  updateLockDots();
  lockScreen.classList.remove('hidden');
  
  showAuthView();
}

function showAuthView() {
  activeProfileId = '';
  saveProfiles();
  
  document.getElementById('lock-auth-view').classList.remove('hidden');
  document.getElementById('lock-keypad-view').classList.add('hidden');
  document.getElementById('lock-reset-view').classList.add('hidden');
  
  // Reset fields
  document.getElementById('signin-identifier').value = '';
  document.getElementById('signup-name').value = '';
  document.getElementById('signup-email').value = '';
  document.getElementById('signup-phone').value = '';
  switchAuthTab('signin');
}
window.showAuthView = showAuthView;

function handleLockBack() {
  if (lockScreenMode === 'delete_verify') {
    const lockScreen = document.getElementById('lock-screen');
    if (lockScreen) {
      lockScreen.classList.add('hidden');
    }
    openSettingsDrawer();
  } else {
    showAuthView();
  }
}
window.handleLockBack = handleLockBack;

function switchAuthTab(mode) {
  const tabSignin = document.getElementById('tab-signin');
  const tabSignup = document.getElementById('tab-signup');
  const panelSignin = document.getElementById('panel-signin');
  const panelSignup = document.getElementById('panel-signup');
  
  if (mode === 'signin') {
    tabSignin.classList.add('active');
    tabSignin.style.background = 'var(--color-primary)';
    tabSignin.style.color = 'white';
    tabSignin.style.fontWeight = '700';
    
    tabSignup.classList.remove('active');
    tabSignup.style.background = 'transparent';
    tabSignup.style.color = 'var(--color-text-secondary)';
    tabSignup.style.fontWeight = '600';
    
    panelSignin.classList.remove('hidden');
    panelSignup.classList.add('hidden');
  } else {
    tabSignup.classList.add('active');
    tabSignup.style.background = 'var(--color-primary)';
    tabSignup.style.color = 'white';
    tabSignup.style.fontWeight = '700';
    
    tabSignin.classList.remove('active');
    tabSignin.style.background = 'transparent';
    tabSignin.style.color = 'var(--color-text-secondary)';
    tabSignin.style.fontWeight = '600';
    
    panelSignup.classList.remove('hidden');
    panelSignin.classList.add('hidden');
  }
}
window.switchAuthTab = switchAuthTab;

const LOGO_SVGS = {
  setup: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 8px var(--color-primary-glow));"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  confirm: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 8px var(--color-primary-glow));"><path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 1.5 1.5M15.5 7.5 14 6"/></svg>`,
  unlock: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 8px var(--color-primary-glow));"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`
};

async function selectProfileToUnlock(profileId) {
  activeProfileId = profileId;
  saveProfiles();
  
  await loadActiveProfileState();
  updateProfileUI();
  
  const currentTheme = state.theme || 'dark';
  const colorTheme = state.colorTheme || 'midnight';
  document.body.className = `theme-${currentTheme} color-${colorTheme}`;
  updateThemeToggleIcon(currentTheme);
  
  const lockScreen = document.getElementById('lock-screen');
  if (lockScreen) {
    enteredPinCode = '';
    updateLockDots();
    
    const profileObj = profilesList.find(p => p.id === profileId);
    const hasPin = profileObj ? !!profileObj.has_pin : false;
    
    
    if (hasPin) {
      // Prompt to unlock
      lockScreenMode = 'unlock';
      document.getElementById('lock-auth-view').classList.add('hidden');
      document.getElementById('lock-keypad-view').classList.remove('hidden');
      document.getElementById('lock-reset-view').classList.add('hidden');
      document.getElementById('lock-title').textContent = 'Enter PIN';
      document.getElementById('lock-status').textContent = `Enter your 4-digit code to unlock`;
      document.getElementById('lock-logo-icon').innerHTML = LOGO_SVGS.unlock;
      document.getElementById('lock-ok-btn').textContent = 'OK';
      
      const forgotBtn = document.getElementById('lock-forgot-btn');
      if (forgotBtn) forgotBtn.classList.remove('hidden');
    } else {
      // Prompt to setup PIN
      lockScreenMode = 'setup';
      document.getElementById('lock-auth-view').classList.add('hidden');
      document.getElementById('lock-keypad-view').classList.remove('hidden');
      document.getElementById('lock-reset-view').classList.add('hidden');
      document.getElementById('lock-title').textContent = 'Setup PIN';
      document.getElementById('lock-status').textContent = `Set a 4-digit PIN for ${profilesList.find(p => p.id === profileId).name}`;
      document.getElementById('lock-logo-icon').innerHTML = LOGO_SVGS.setup;
      document.getElementById('lock-ok-btn').textContent = 'Next';
      
      const forgotBtn = document.getElementById('lock-forgot-btn');
      if (forgotBtn) forgotBtn.classList.add('hidden');
    }
  }
  
  renderDashboard();
}

async function showResetPinView() {
  document.getElementById('lock-keypad-view').classList.add('hidden');
  document.getElementById('lock-reset-view').classList.remove('hidden');
  document.getElementById('reset-answer').value = '';
  
  const questionEl = document.getElementById('lock-reset-question');
  if (questionEl) {
    questionEl.textContent = 'Loading security question...';
  }
  
  try {
    const res = await fetch(`/api/profile/${activeProfileId}/security-question`);
    if (res.ok) {
      const data = await res.json();
      if (data.security_question) {
        questionEl.textContent = data.security_question;
        document.getElementById('reset-answer').placeholder = 'Your Answer';
        document.getElementById('reset-answer').setAttribute('data-mode', 'answer');
      } else {
        // Fallback for older profiles without security question configured
        questionEl.textContent = 'Verify by entering your registered Email or Mobile Number:';
        document.getElementById('reset-answer').placeholder = 'Email or Mobile Number';
        document.getElementById('reset-answer').setAttribute('data-mode', 'identifier');
      }
    } else {
      questionEl.textContent = 'Failed to load security question. Use Email/Mobile Number:';
      document.getElementById('reset-answer').placeholder = 'Email or Mobile Number';
      document.getElementById('reset-answer').setAttribute('data-mode', 'identifier');
    }
  } catch (e) {
    console.error(e);
    questionEl.textContent = 'Network error. Verify using Email/Mobile Number:';
    document.getElementById('reset-answer').placeholder = 'Email or Mobile Number';
    document.getElementById('reset-answer').setAttribute('data-mode', 'identifier');
  }
}
window.showResetPinView = showResetPinView;

function cancelResetPin() {
  document.getElementById('lock-reset-view').classList.add('hidden');
  document.getElementById('lock-keypad-view').classList.remove('hidden');
}
window.cancelResetPin = cancelResetPin;

function signOutActiveProfile() {
  activeProfileId = '';
  saveProfiles();
  initLockScreen();
  showToast('Signed out successfully');
}
window.signOutActiveProfile = signOutActiveProfile;

function updateLockDots() {
  const dots = document.querySelectorAll('.lock-dot');
  dots.forEach((dot, index) => {
    dot.classList.toggle('active', index < enteredPinCode.length);
  });
}

function pressLockKey(key) {
  const lockScreen = document.getElementById('lock-screen');
  const title = document.getElementById('lock-title');
  const status = document.getElementById('lock-status');
  const dotsContainer = document.getElementById('lock-dots-indicator');
  const logo = document.getElementById('lock-logo-icon');

  if (key === 'clear') {
    if (enteredPinCode.length > 0) {
      enteredPinCode = enteredPinCode.slice(0, -1);
      updateLockDots();
    }
    return;
  }
  
  if (key === 'ok') {
    if (enteredPinCode.length < 4) {
      showToast('Please enter exactly 4 digits', false);
      return;
    }
  }

  // Append digit
  if (enteredPinCode.length < 4 && !isNaN(key)) {
    enteredPinCode += key;
    updateLockDots();
  }

  // Process PIN when length reaches 4
  if (enteredPinCode.length === 4) {
    setTimeout(async () => {
      const activeProfile = profilesList.find(p => p.id === activeProfileId);
      const name = activeProfile ? activeProfile.name : '';
      
      if (lockScreenMode === 'setup') {
        tempSetupPin = enteredPinCode;
        enteredPinCode = '';
        updateLockDots();
        lockScreenMode = 'confirm';
        title.textContent = 'Confirm PIN';
        status.textContent = `Re-enter ${name}'s PIN to confirm`;
        logo.innerHTML = LOGO_SVGS.confirm;
        document.getElementById('lock-ok-btn').textContent = 'Confirm';
      } 
      else if (lockScreenMode === 'confirm') {
        if (enteredPinCode === tempSetupPin) {
          try {
            const res = await fetch('/api/profiles/setup-pin', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ profile_id: activeProfileId, pin: enteredPinCode })
            });
            if (res.ok) {
              await loadProfiles();
              await loadActiveProfileState();
              showToast('Security PIN set successfully!');
              lockScreen.classList.add('hidden');
              renderDashboard();
              checkAndStartTour();
            } else {
              showToast('Failed to save PIN on server', false);
            }
          } catch (e) {
            console.error(e);
            showToast('Network error setting PIN', false);
          }
        } else {
          // Play shake error animation
          dotsContainer.classList.add('error-shake');
          showToast('PINs do not match. Restarting setup...', false);
          setTimeout(() => {
            dotsContainer.classList.remove('error-shake');
            enteredPinCode = '';
            tempSetupPin = '';
            updateLockDots();
            lockScreenMode = 'setup';
            title.textContent = 'Setup PIN';
            status.textContent = `Set a 4-digit code for ${name}`;
            logo.innerHTML = LOGO_SVGS.setup;
            document.getElementById('lock-ok-btn').textContent = 'Next';
          }, 600);
        }
      }
      else if (lockScreenMode === 'unlock') {
        try {
          const res = await fetch('/api/profiles/verify-pin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profile_id: activeProfileId, pin: enteredPinCode })
          });
          if (res.ok) {
            addLocalProfile(activeProfileId);
            lockScreen.classList.add('hidden');
            renderDashboard();
            showToast(`Access Granted to ${name}`);
            checkAndStartTour();
          } else {
            // Play shake error animation
            dotsContainer.classList.add('error-shake');
            showToast('Wrong PIN code!', false);
            setTimeout(() => {
              dotsContainer.classList.remove('error-shake');
              enteredPinCode = '';
              updateLockDots();
            }, 600);
          }
        } catch (e) {
          console.error(e);
          showToast('Network error verifying PIN', false);
        }
      }
      else if (lockScreenMode === 'delete_verify') {
        try {
          const res = await fetch('/api/profiles/verify-pin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profile_id: activeProfileId, pin: enteredPinCode })
          });
          if (res.ok) {
            try {
              const resDelete = await fetch(`/api/profile/${activeProfileId}`, { method: 'DELETE' });
              if (resDelete.ok) {
                showToast(`Deleted profile "${name}"`);
                removeLocalProfile(activeProfileId);
                await loadProfiles();
                if (profilesList.length === 0) {
                  activeProfileId = '';
                  saveProfiles();
                } else {
                  activeProfileId = profilesList[0].id;
                  saveProfiles();
                }
                initLockScreen();
              } else {
                showToast('Failed to delete profile on server', false);
                dotsContainer.classList.add('error-shake');
                setTimeout(() => {
                  dotsContainer.classList.remove('error-shake');
                  enteredPinCode = '';
                  updateLockDots();
                }, 600);
              }
            } catch (e) {
              console.error(e);
              showToast('Network error deleting profile', false);
              dotsContainer.classList.add('error-shake');
              setTimeout(() => {
                dotsContainer.classList.remove('error-shake');
                enteredPinCode = '';
                updateLockDots();
              }, 600);
            }
          } else {
            // Play shake error animation
            dotsContainer.classList.add('error-shake');
            showToast('Wrong PIN code!', false);
            setTimeout(() => {
              dotsContainer.classList.remove('error-shake');
              enteredPinCode = '';
              updateLockDots();
            }, 600);
          }
        } catch (e) {
          console.error(e);
          showToast('Network error verifying PIN', false);
        }
      }
    }, 150);
  }
}
window.pressLockKey = pressLockKey;



// --- Confetti particle engine ---
class ConfettiManager {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.animationId = null;
    this.colors = ['#ffffff', '#eeeeee', '#cccccc', '#999999', '#777777', '#444444', '#111111'];
    
    window.addEventListener('resize', () => this.resizeCanvas());
    this.resizeCanvas();
  }
  
  resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }
  
  burst(count = 100) {
    this.resizeCanvas();
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: width / 2,
        y: height * 0.4,
        size: Math.random() * 6 + 4,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        speedX: (Math.random() - 0.5) * 12,
        speedY: -Math.random() * 10 - 5,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        opacity: 1,
        gravity: 0.25,
        decay: Math.random() * 0.015 + 0.01
      });
    }
    
    if (!this.animationId) {
      this.animate();
    }
  }
  
  animate() {
    if (this.particles.length === 0) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.animationId = null;
      return;
    }
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.speedY += p.gravity;
      p.x += p.speedX;
      p.y += p.speedY;
      p.rotation += p.rotationSpeed;
      p.opacity -= p.decay;
      
      if (p.opacity <= 0 || p.y > this.canvas.height) {
        this.particles.splice(i, 1);
        continue;
      }
      
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.globalAlpha = p.opacity;
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      this.ctx.restore();
    }
    
    this.animationId = requestAnimationFrame(() => this.animate());
  }
}

// Global confetti instance reference
let confettiInstance = null;

// --- Cubic Spline Path Calculation ---
function getSplinePath(points) {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i+1];
    const p0 = points[i - 1] || p1;
    const p3 = points[i + 2] || p2;
    
    const cp1x = p1.x + 0.18 * (p2.x - p0.x);
    const cp1y = p1.y + 0.18 * (p2.y - p0.y);
    const cp2x = p2.x - 0.18 * (p3.x - p1.x);
    const cp2y = p2.y - 0.18 * (p3.y - p1.y);
    
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

// --- Dynamic Button Touch Ripples ---
function createRipple(e) {
  const button = e.currentTarget;
  const existingRipples = button.querySelectorAll('.ripple-effect');
  existingRipples.forEach(r => r.remove());
  
  const ripple = document.createElement('span');
  ripple.className = 'ripple-effect';
  
  const diameter = Math.max(button.clientWidth, button.clientHeight);
  const radius = diameter / 2;
  
  const rect = button.getBoundingClientRect();
  const clientX = e.clientX;
  const clientY = e.clientY;
  
  if (clientX !== undefined && clientY !== undefined) {
    ripple.style.width = ripple.style.height = `${diameter}px`;
    ripple.style.left = `${clientX - rect.left - radius}px`;
    ripple.style.top = `${clientY - rect.top - radius}px`;
  } else {
    ripple.style.width = ripple.style.height = `${diameter}px`;
    ripple.style.left = `${button.clientWidth / 2 - radius}px`;
    ripple.style.top = `${button.clientHeight / 2 - radius}px`;
  }
  
  button.appendChild(ripple);
  ripple.addEventListener('animationend', () => {
    ripple.remove();
  });
}



// --- Event Listeners and Initialization ---
document.addEventListener('DOMContentLoaded', async () => {

  // Register Service Worker for PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('Service Worker Registered'))
      .catch(err => console.log('Service Worker Registration Failed', err));
  }

  // Initialize Confetti manager
  confettiInstance = new ConfettiManager('confetti-canvas');

  // Touch Ripple Delegator
  document.body.addEventListener('pointerdown', (e) => {
    const target = e.target.closest('.keypad-btn, .submit-btn, .nav-item, .stat-box, .cat-picker-item, .theme-dot, .add-main-btn, .legend-item, .profile-item, .add-profile-btn, .lock-profile-card');
    if (target) {
      const style = window.getComputedStyle(target);
      if (style.position === 'static') {
        target.style.position = 'relative';
      }
      createRipple({
        currentTarget: target,
        clientX: e.clientX,
        clientY: e.clientY
      });
    }
  });

  // Load Profiles List
  await loadProfiles();
  
  // Load Active Profile State
  await loadActiveProfileState();

  // Load cached theme
  let cachedTheme = state.theme || 'dark';
  if (cachedTheme === 'midnight') cachedTheme = 'dark';
  let cachedColor = state.colorTheme || 'midnight';
  document.body.className = `theme-${cachedTheme} color-${cachedColor}`;
  updateThemeToggleIcon(cachedTheme);

  // Render headers and dashboard
  updateProfileUI();
  renderDashboard();

  // Screen lock initialization
  const localProfileIds = getLocalProfiles();
  if (activeProfileId && localProfileIds.includes(activeProfileId) && profilesList.some(p => p.id === activeProfileId)) {
    await selectProfileToUnlock(activeProfileId);
  } else {
    initLockScreen();
  }

  // Unified Sign In form listener
  const signinForm = document.getElementById('auth-signin-form');
  if (signinForm) {
    signinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const identifier = document.getElementById('signin-identifier').value.trim().toLowerCase();
      if (identifier) {
        try {
          const res = await fetch('/api/profiles/signin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: identifier })
          });
          
          if (res.ok) {
            const matched = await res.json();
            // Refresh local profiles list to sync any server changes
            addLocalProfile(matched.id);
            await loadProfiles();
            await selectProfileToUnlock(matched.id);
            showToast(`Account found: ${matched.name}. Loading...`);
          } else {
            showToast('No profile found with this email or mobile number', false);
          }
        } catch (err) {
          console.error(err);
          showToast('Network error, please try again', false);
        }
      }
    });
  }

  // Unified Sign Up form listener
  const signupForm = document.getElementById('auth-signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameVal = document.getElementById('signup-name').value.trim();
      const emailVal = document.getElementById('signup-email').value.trim().toLowerCase();
      const phoneVal = document.getElementById('signup-phone').value.trim();
      const questionVal = document.getElementById('signup-question').value;
      const answerVal = document.getElementById('signup-answer').value.trim();
      
      if (nameVal && emailVal && phoneVal && questionVal && answerVal) {
        // Uniqueness check
        const exists = profilesList.some(p => 
          (p.email && p.email.toLowerCase() === emailVal) || 
          (p.phone && p.phone === phoneVal)
        );
        if (exists) {
          showToast('An account with this email or phone already exists', false);
          return;
        }
        
        createNewProfile(nameVal, emailVal, phoneVal, questionVal, answerVal);
        showToast('Account created! Let\'s setup your security PIN.');
      }
    });
  }

  // Identity verification reset form listener
  const resetForm = document.getElementById('lock-reset-form');
  if (resetForm) {
    resetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const inputVal = document.getElementById('reset-answer').value.trim();
      if (!inputVal || !activeProfileId) return;
      
      const mode = document.getElementById('reset-answer').getAttribute('data-mode') || 'answer';
      const payload = { profile_id: activeProfileId };
      if (mode === 'answer') {
        payload.answer = inputVal;
      } else {
        payload.identifier = inputVal;
      }
      
      try {
        const res = await fetch('/api/profiles/verify-identity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (res.ok) {
          showToast('Identity verified! Please set a new 4-digit PIN.');
          
          // Switch to setup PIN mode in keypad view
          lockScreenMode = 'setup';
          enteredPinCode = '';
          tempSetupPin = '';
          updateLockDots();
          
          const activeProfile = profilesList.find(p => p.id === activeProfileId);
          const name = activeProfile ? activeProfile.name : '';
          
          document.getElementById('lock-reset-view').classList.add('hidden');
          document.getElementById('lock-keypad-view').classList.remove('hidden');
          document.getElementById('lock-title').textContent = 'Setup PIN';
          document.getElementById('lock-status').textContent = `Set a 4-digit PIN for ${name}`;
          document.getElementById('lock-logo-icon').innerHTML = LOGO_SVGS.setup;
          document.getElementById('lock-ok-btn').textContent = 'Next';
          
          // Hide forgot button during setup
          const forgotBtn = document.getElementById('lock-forgot-btn');
          if (forgotBtn) forgotBtn.classList.add('hidden');
        } else {
          const errMsg = mode === 'answer' ? 'Incorrect security answer.' : 'Incorrect email or mobile number.';
          showToast('Verification failed. ' + errMsg, false);
        }
      } catch (err) {
        console.error(err);
        showToast('Network error, please try again', false);
      }
    });
  }

  // Profile Drawer triggers
  document.getElementById('user-avatar-btn').addEventListener('click', openProfileDrawer);
  document.getElementById('close-profile-btn').addEventListener('click', closeProfileDrawer);
  
  // New user profile creation submission
  document.getElementById('new-profile-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const nameVal = document.getElementById('new-profile-name').value.trim();
    const emailVal = document.getElementById('new-profile-email').value.trim();
    const phoneVal = document.getElementById('new-profile-phone').value.trim();
    const questionVal = document.getElementById('new-profile-question').value;
    const answerVal = document.getElementById('new-profile-answer').value.trim();
    
    if (nameVal && emailVal && phoneVal && questionVal && answerVal) {
      createNewProfile(nameVal, emailVal, phoneVal, questionVal, answerVal);
    }
  });

  // Drawer triggers
  document.getElementById('open-drawer-btn').addEventListener('click', openTransactionDrawer);
  document.getElementById('close-drawer-btn').addEventListener('click', closeTransactionDrawer);
  overlay.addEventListener('click', () => {
    closeTransactionDrawer();
    closeProfileDrawer();
    closeSettingsDrawer();
  });

  const typeExpense = document.getElementById('type-expense-btn');
  const typeIncome = document.getElementById('type-income-btn');
  const catSection = document.getElementById('category-picker-section');

  typeExpense.addEventListener('click', () => {
    typeExpense.classList.add('active');
    typeIncome.classList.remove('active');
    selectedType = 'expense';
    catSection.style.display = 'block';
  });

  typeIncome.addEventListener('click', () => {
    typeIncome.classList.add('active');
    typeExpense.classList.remove('active');
    selectedType = 'income';
    selectedCategory = 'Other';
    catSection.style.display = 'none';
  });

  setupCategoryPicker();

  // Form submission
  document.getElementById('tx-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const amountVal = parseFloat(document.getElementById('tx-amount').value);
    const descVal = document.getElementById('tx-desc').value.trim();
    const dateVal = document.getElementById('tx-date').value;

    if (isNaN(amountVal) || amountVal <= 0 || !descVal || !dateVal) {
      showToast('Please enter valid details', false);
      return;
    }

    const newTx = {
      id: 'tx-' + Date.now(),
      desc: descVal,
      amount: amountVal,
      type: selectedType,
      category: selectedCategory,
      date: dateVal
    };

    try {
      const res = await fetch(`/api/profile/${activeProfileId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTx)
      });
      if (res.ok) {
        state.transactions.push(newTx);

        if (newTx.type === 'income' && confettiInstance) {
          confettiInstance.burst(120);
        }
        
        closeTransactionDrawer();
        
        const activeNav = document.querySelector('.nav-item.active');
        const tabName = activeNav ? activeNav.getAttribute('data-tab') : 'dashboard';
        showScreen(tabName);
        
        typeExpense.click();
        const gridItems = document.querySelectorAll('.cat-picker-item');
        gridItems.forEach(i => i.classList.remove('selected'));
        gridItems[0].classList.add('selected');
        selectedCategory = 'Food';

        showToast(`Logged "${descVal}" successfully`);
      } else {
        showToast('Failed to save transaction on server', false);
      }
    } catch (e) {
      console.error(e);
      showToast('Network error saving transaction', false);
    }
  });

  // Filter pills events
  const pills = document.querySelectorAll('.filter-pill');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilterCategory = pill.getAttribute('data-category');
      renderTransactionsList();
    });
  });

  // Search input events
  document.getElementById('search-tx').addEventListener('input', (e) => {
    currentSearchQuery = e.target.value;
    renderTransactionsList();
  });

  // Reset/Clear Data button event
  document.getElementById('reset-data-btn').addEventListener('click', () => {
    showCustomConfirm('Are you sure you want to delete all transactions and reset the application to zero? This cannot be undone.', () => {
      resetToDefaultState();
      loadState();
      
      // Reset theme visual representation
      const currentTheme = state.theme || 'dark';
      document.body.className = `theme-${currentTheme}`;
      updateThemeToggleIcon(currentTheme);

      renderDashboard();
      showToast('All transaction records cleared');
    });
  });



});

// --- INTERACTIVE ONBOARDING TOUR ---
let currentTourStep = 0;
const tourSteps = [
  {
    element: '#user-avatar-btn',
    text: 'Tap here to switch user profiles, lock your session, or manage profile security.'
  },
  {
    element: '.balance-card',
    text: 'View your net balance, total income, and total expenses at a single glance.'
  },
  {
    element: '.quick-stats-row',
    text: 'Use these quick shortcuts to jump to Budgets, view History, or Clear all transaction records.'
  },
  {
    element: '.svg-donut-chart',
    text: 'Track your spending distribution dynamically. Tap segments to see individual category details.'
  },
  {
    element: '#dashboard-budgets',
    text: 'Stay on top of your budgets! This section shows how close you are to your limits.'
  },
  {
    element: '#open-drawer-btn',
    text: 'Tap the Add button to log a new transaction, specify type (Income/Expense), category, and amount.'
  },
  {
    element: '.bottom-nav',
    text: 'Navigate between the Dashboard, Category Budgets, History, and Color Themes screens here.'
  }
];

function startAppTour() {
  closeTransactionDrawer();
  closeProfileDrawer();
  closeSettingsDrawer();

  showScreen('dashboard');
  currentTourStep = 0;
  
  const tooltip = document.getElementById('tour-tooltip');
  if (tooltip) {
    tooltip.classList.remove('hidden');
  }
  executeTourStep();
}

function executeTourStep() {
  document.querySelectorAll('.tour-highlight').forEach(el => {
    el.classList.remove('tour-highlight');
  });

  const step = tourSteps[currentTourStep];
  if (!step) {
    endAppTour();
    return;
  }

  const indicator = document.getElementById('tour-step-indicator');
  if (indicator) {
    indicator.textContent = `Step ${currentTourStep + 1} of ${tourSteps.length}`;
  }

  const textEl = document.getElementById('tour-tooltip-text');
  if (textEl) {
    textEl.textContent = step.text;
  }

  const nextBtn = document.getElementById('tour-next-btn');
  if (nextBtn) {
    nextBtn.textContent = currentTourStep === tourSteps.length - 1 ? 'Finish' : 'Next';
  }

  let target = document.querySelector(step.element);
  if (step.element === '.svg-donut-chart' || step.element === '#dashboard-budgets') {
    if (target) {
      const card = target.closest('.glass-card');
      if (card) target = card;
    }
  }

  if (target) {
    target.scrollIntoView({ behavior: 'auto', block: 'nearest' });
    target.classList.add('tour-highlight');

    setTimeout(() => {
      positionTooltip(target);
    }, 50);
  } else {
    nextTourStep();
  }
}

function nextTourStep() {
  currentTourStep++;
  if (currentTourStep >= tourSteps.length) {
    endAppTour();
  } else {
    executeTourStep();
  }
}

function endAppTour() {
  document.querySelectorAll('.tour-highlight').forEach(el => {
    el.classList.remove('tour-highlight');
  });

  const tooltip = document.getElementById('tour-tooltip');
  if (tooltip) {
    tooltip.classList.add('hidden');
  }

  if (activeProfileId) {
    localStorage.setItem('trackora_tour_completed_' + activeProfileId, 'true');
  }
  showToast('Tour completed! Welcome to Trackora.');
}

function positionTooltip(target) {
  const tooltip = document.getElementById('tour-tooltip');
  const container = document.querySelector('.app-container');
  if (!tooltip || !container || !target) return;

  const targetRect = target.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  const targetTopInContainer = targetRect.top - containerRect.top;
  const targetLeftInContainer = targetRect.left - containerRect.left;

  const tooltipWidth = tooltip.offsetWidth || 240;
  const tooltipHeight = tooltip.offsetHeight || 120;

  // Horizontal position
  let left = targetLeftInContainer + (targetRect.width / 2) - (tooltipWidth / 2);
  const minLeft = 12;
  const maxLeft = containerRect.width - tooltipWidth - 12;
  left = Math.max(minLeft, Math.min(maxLeft, left));

  // Vertical position
  let top;
  if (targetTopInContainer > containerRect.height / 2) {
    top = targetTopInContainer - tooltipHeight - 12;
  } else {
    top = targetTopInContainer + targetRect.height + 12;
  }

  const minTop = 60;
  const maxTop = containerRect.height - tooltipHeight - 65;
  top = Math.max(minTop, Math.min(maxTop, top));

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function checkAndStartTour() {
  if (!activeProfileId) return;
  const tourCompleted = localStorage.getItem('trackora_tour_completed_' + activeProfileId);
  if (!tourCompleted) {
    setTimeout(() => {
      startAppTour();
    }, 800);
  }
}

window.startAppTour = startAppTour;
window.endAppTour = endAppTour;
window.nextTourStep = nextTourStep;

window.addEventListener('resize', () => {
  const tooltip = document.getElementById('tour-tooltip');
  if (tooltip && !tooltip.classList.contains('hidden')) {
    const activeStep = tourSteps[currentTourStep];
    if (activeStep) {
      let target = document.querySelector(activeStep.element);
      if (activeStep.element === '.svg-donut-chart' || activeStep.element === '#dashboard-budgets') {
        if (target) {
          const card = target.closest('.glass-card');
          if (card) target = card;
        }
      }
      if (target) {
        positionTooltip(target);
      }
    }
  }
});

