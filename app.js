// --- Multi-User Profile State ---
let profilesList = [];
let activeProfileId = '';

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
  theme: 'midnight',
  pin: null
};

// Category Colors Map (matching CSS variables)
const CATEGORY_COLORS = {
  Food: '#f43f5e',
  Shopping: '#8b5cf6',
  Entertainment: '#ec4899',
  Transport: '#0ea5e9',
  Utilities: '#10b981',
  Other: '#64748b'
};

const CATEGORY_ICONS = {
  Food: '🍔',
  Shopping: '🛍️',
  Entertainment: '🎬',
  Transport: '🚗',
  Utilities: '⚡',
  Other: '📦'
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
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

// --- Profile List Load / Save ---
function loadProfiles() {
  const localList = localStorage.getItem('apex_profiles_list');
  const activeId = localStorage.getItem('apex_active_profile_id');
  
  if (localList && activeId) {
    try {
      profilesList = JSON.parse(localList);
      activeProfileId = activeId;
    } catch (e) {
      console.error('Error loading profiles list', e);
      setupDefaultProfiles();
    }
  } else {
    // Migration check: check if legacy state exists
    setupDefaultProfiles();
    const legacyData = localStorage.getItem('apex_finance_state');
    if (legacyData) {
      // Migrate legacy state to default profile key
      localStorage.setItem(`apex_profile_state_p-default`, legacyData);
      localStorage.removeItem('apex_finance_state');
    }
  }
}

function setupDefaultProfiles() {
  profilesList = [
    { id: 'p-default', name: 'Veera M.', color: '#6366f1' }
  ];
  activeProfileId = 'p-default';
  saveProfiles();
}

function saveProfiles() {
  localStorage.setItem('apex_profiles_list', JSON.stringify(profilesList));
  localStorage.setItem('apex_active_profile_id', activeProfileId);
}

// --- Active Profile State Management ---
function loadActiveProfileState() {
  const key = `apex_profile_state_${activeProfileId}`;
  const localData = localStorage.getItem(key);
  if (localData) {
    try {
      state = JSON.parse(localData);
      if (!state.transactions) state.transactions = [];
      if (!state.budgets) state.budgets = getDefaultBudgets();
      if (!state.theme) state.theme = 'midnight';
      if (state.pin === undefined) state.pin = null;
    } catch (e) {
      console.error('Error parsing profile state data', e);
      resetProfileStateToZero();
    }
  } else {
    resetProfileStateToZero();
  }
}

function saveActiveProfileState() {
  const key = `apex_profile_state_${activeProfileId}`;
  localStorage.setItem(key, JSON.stringify(state));
}

function resetProfileStateToZero() {
  state.transactions = []; // start fresh
  state.budgets = getDefaultBudgets();
  state.theme = 'midnight';
  state.pin = null;
  saveActiveProfileState();
}

// Wrapper for Clear All button
function resetToDefaultState() {
  resetProfileStateToZero();
}

function saveState() {
  saveActiveProfileState();
}

function loadState() {
  loadActiveProfileState();
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
    avatarEl.parentNode.style.background = `linear-gradient(135deg, ${activeProfile.color}, var(--color-balance))`;
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
  
  profilesList.forEach(p => {
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

function switchProfile(profileId) {
  closeProfileDrawer();
  activeProfileId = profileId;
  saveProfiles();
  
  // Load State
  loadActiveProfileState();
  
  // Force Lock screen verification immediately
  initLockScreen();
  
  // Load target theme
  const currentTheme = state.theme || 'midnight';
  document.body.className = `theme-${currentTheme}`;
  document.querySelectorAll('.theme-dot').forEach(d => {
    d.classList.toggle('active', d.classList.contains(currentTheme));
  });

  // Redraw dashboard and update header profile info
  updateProfileUI();
  renderDashboard();
  
  // Redirect back to dashboard panel
  showScreen('dashboard');
}

function createNewProfile(name) {
  const id = 'p-' + Date.now();
  const colors = ['#6366f1', '#10b981', '#d946ef', '#0ea5e9', '#f59e0b', '#ec4899', '#8b5cf6'];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  
  const newProfile = {
    id: id,
    name: name,
    color: randomColor
  };
  
  profilesList.push(newProfile);
  activeProfileId = id;
  saveProfiles();
  
  // Instantiate empty profile slate
  resetProfileStateToZero();
  
  closeProfileDrawer();
  updateProfileUI();
  
  // Secure lock immediately to setup PIN code
  initLockScreen();
  
  // Reset visual view to dashboard
  showScreen('dashboard');
}

// --- Multi-Theme Manager ---
function setAppTheme(themeName) {
  state.theme = themeName;
  saveState();
  
  document.body.className = `theme-${themeName}`;
  
  const dots = document.querySelectorAll('.theme-dot');
  dots.forEach(dot => {
    dot.classList.toggle('active', dot.classList.contains(themeName));
  });

  showToast(`Switched theme to ${themeName.charAt(0).toUpperCase() + themeName.slice(1)}`);
}
window.setAppTheme = setAppTheme;

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
    const color = CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other;
    
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

function renderWeeklyChart() {
  const chartSvg = document.getElementById('weekly-bar-chart');
  const labelTotal = document.getElementById('weekly-chart-total');
  
  if (!chartSvg) return;
  
  // Calculate relative dates for last 7 days (today down to 6 days ago)
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const last7Days = [];
  
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = daysOfWeek[d.getDay()];
    last7Days.push({ date: dateStr, dayName: dayName, amount: 0 });
  }

  // Sum expense transactions mapped to these dates
  state.transactions.forEach(tx => {
    if (tx.type === 'expense') {
      const match = last7Days.find(d => d.date === tx.date);
      if (match) {
        match.amount += tx.amount;
      }
    }
  });

  const weeklySum = last7Days.reduce((sum, d) => sum + d.amount, 0);
  currentWeeklyTotal = weeklySum;
  labelTotal.textContent = formatCurrency(weeklySum);

  const maxAmount = Math.max(...last7Days.map(d => d.amount), 20);

  // Build SVG Canvas
  let svgContent = `
    <!-- Gridlines -->
    <line x1="15" y1="20" x2="305" y2="20" stroke="rgba(255,255,255,0.03)" stroke-width="1" />
    <line x1="15" y1="65" x2="305" y2="65" stroke="rgba(255,255,255,0.03)" stroke-width="1" />
    <line x1="15" y1="110" x2="305" y2="110" stroke="rgba(255,255,255,0.06)" stroke-width="1.5" />
  `;

  const barWidth = 24;
  const chartHeight = 90;
  const chartBottom = 110;
  const totalWidth = 320;
  const colWidth = totalWidth / 7;

  last7Days.forEach((day, index) => {
    const barHeight = (day.amount / maxAmount) * chartHeight;
    const x = index * colWidth + (colWidth - barWidth) / 2;
    const y = chartBottom - barHeight;
    
    svgContent += `
      <rect class="chart-bar-rect" 
            x="${x}" 
            y="${chartBottom - 2}" 
            width="${barWidth}" 
            height="2"
            data-amount="${day.amount}" 
            data-day="${day.dayName}" 
            data-date="${day.date}"
            onmouseover="hoverWeeklyBar(this)" 
            onmouseout="unhoverWeeklyBar()" />
      <text class="chart-bar-label" x="${x + barWidth/2}" y="126">${day.dayName}</text>
    `;
  });

  chartSvg.innerHTML = svgContent;

  setTimeout(() => {
    const rects = chartSvg.querySelectorAll('.chart-bar-rect');
    rects.forEach((rect) => {
      const amount = parseFloat(rect.getAttribute('data-amount'));
      const barHeight = Math.max(2, (amount / maxAmount) * chartHeight);
      const targetY = chartBottom - barHeight;
      
      rect.setAttribute('y', targetY.toString());
      rect.setAttribute('height', barHeight.toString());
    });
  }, 100);
}

// Global mouse-hover functions for weekly bar chart
function hoverWeeklyBar(rect) {
  const amount = parseFloat(rect.getAttribute('data-amount'));
  const day = rect.getAttribute('data-day');
  const dateVal = rect.getAttribute('data-date');
  
  const txDate = new Date(dateVal + 'T00:00:00');
  const options = { month: 'short', day: 'numeric' };
  const dateStr = txDate.toLocaleDateString('en-US', options);

  const labelTotal = document.getElementById('weekly-chart-total');
  if (labelTotal) {
    labelTotal.textContent = `${day} (${dateStr}): ${formatCurrency(amount)}`;
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
    const color = CATEGORY_COLORS[cat];
    const icon = CATEGORY_ICONS[cat];
    
    let fillStyle = `background-color: ${color}`;
    let warningLabel = '';
    
    if (spent > limit) {
      fillStyle = 'background-color: var(--color-expense); box-shadow: 0 0 8px var(--color-expense-glow)';
      warningLabel = `<span style="color: var(--color-expense); font-size: 10px; font-weight: 700; margin-left: 6px;">OVER BUDGET</span>`;
    } else if (spent >= limit * 0.8) {
      fillStyle = 'background-color: var(--color-warning); box-shadow: 0 0 8px var(--color-warning-glow)';
      warningLabel = `<span style="color: var(--color-warning); font-size: 10px; font-weight: 700; margin-left: 6px;">80% REACHED</span>`;
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
          <strong style="color: white;">${formatCurrency(spent)}</strong> of ${formatCurrency(limit)}
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
        <span style="color: var(--color-text-secondary); font-size: 14px; font-weight: 700;">$</span>
        <input type="number" class="budget-setting-input" value="${limit}" data-cat="${cat}" min="0" step="10">
      </div>
    `;

    const input = card.querySelector('.budget-setting-input');
    
    input.addEventListener('input', (e) => {
      const newLimit = parseFloat(e.target.value);
      const category = e.target.getAttribute('data-cat');
      
      if (!isNaN(newLimit) && newLimit >= 0) {
        state.budgets[category] = newLimit;
        saveState();
      }
    });

    input.addEventListener('change', (e) => {
      const newLimit = parseFloat(e.target.value);
      const category = e.target.getAttribute('data-cat');
      
      if (!isNaN(newLimit) && newLimit >= 0) {
        state.budgets[category] = newLimit;
        saveState();
        showToast(`${category} budget updated to ${formatCurrency(newLimit)}`);
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
    const icon = CATEGORY_ICONS[tx.category] || '📦';
    const bgIcon = CATEGORY_COLORS[tx.category] || 'var(--color-primary)';
    
    const txDate = new Date(tx.date + 'T00:00:00');
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    const dateStr = txDate.toLocaleDateString('en-US', options);

    const row = document.createElement('div');
    row.className = 'transaction-item';
    row.innerHTML = `
      <div class="transaction-meta">
        <div class="transaction-icon-box" style="background-color: ${isIncome ? 'var(--color-income)' : bgIcon}">
          ${isIncome ? '💰' : icon}
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

function deleteTransaction(id) {
  const index = state.transactions.findIndex(tx => tx.id === id);
  if (index !== -1) {
    const desc = state.transactions[index].desc;
    state.transactions.splice(index, 1);
    saveState();
    renderTransactionsList();
    showToast(`Deleted "${desc}"`);
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
  const title = document.getElementById('lock-title');
  const status = document.getElementById('lock-status');
  const okBtn = document.getElementById('lock-ok-btn');
  const logo = document.getElementById('lock-logo-icon');
  
  if (!lockScreen) return;
  enteredPinCode = '';
  updateLockDots();
  
  const activeProfile = profilesList.find(p => p.id === activeProfileId);
  const profileName = activeProfile ? activeProfile.name : '';
  
  if (!state.pin) {
    lockScreenMode = 'setup';
    title.textContent = 'Setup PIN';
    status.textContent = `Set a 4-digit code for ${profileName}`;
    logo.textContent = '⚙️';
    okBtn.textContent = 'Next';
    lockScreen.classList.remove('hidden');
  } else {
    lockScreenMode = 'unlock';
    title.textContent = 'Enter PIN';
    status.textContent = `Enter security PIN for ${profileName}`;
    logo.textContent = '🔒';
    okBtn.textContent = 'OK';
    lockScreen.classList.remove('hidden');
  }
}

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
    setTimeout(() => {
      const activeProfile = profilesList.find(p => p.id === activeProfileId);
      const name = activeProfile ? activeProfile.name : '';
      
      if (lockScreenMode === 'setup') {
        tempSetupPin = enteredPinCode;
        enteredPinCode = '';
        updateLockDots();
        lockScreenMode = 'confirm';
        title.textContent = 'Confirm PIN';
        status.textContent = `Re-enter ${name}'s PIN to confirm`;
        logo.textContent = '🔑';
        document.getElementById('lock-ok-btn').textContent = 'Confirm';
      } 
      else if (lockScreenMode === 'confirm') {
        if (enteredPinCode === tempSetupPin) {
          state.pin = enteredPinCode;
          saveState();
          showToast('Security PIN set successfully!');
          lockScreen.classList.add('hidden');
          renderDashboard();
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
            logo.textContent = '⚙️';
            document.getElementById('lock-ok-btn').textContent = 'Next';
          }, 600);
        }
      }
      else if (lockScreenMode === 'unlock') {
        if (enteredPinCode === state.pin) {
          lockScreen.classList.add('hidden');
          renderDashboard();
          showToast(`Access Granted to ${name}`);
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
      }
    }, 150);
  }
}
window.pressLockKey = pressLockKey;

// --- Event Listeners and Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  // Load Profiles List
  loadProfiles();
  
  // Load Active Profile State
  loadActiveProfileState();

  // Load cached theme
  const cachedTheme = state.theme || 'midnight';
  document.body.className = `theme-${cachedTheme}`;
  
  // Set theme selector active dots
  const dots = document.querySelectorAll('.theme-dot');
  dots.forEach(dot => {
    dot.classList.toggle('active', dot.classList.contains(cachedTheme));
  });

  // Render headers and dashboard
  updateProfileUI();
  renderDashboard();

  // Screen lock initialization
  initLockScreen();

  // Profile Drawer triggers
  document.getElementById('user-avatar-btn').addEventListener('click', openProfileDrawer);
  document.getElementById('close-profile-btn').addEventListener('click', closeProfileDrawer);
  
  // New user profile creation submission
  document.getElementById('new-profile-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('new-profile-name');
    const nameVal = nameInput.value.trim();
    if (nameVal) {
      createNewProfile(nameVal);
    }
  });

  // Drawer triggers
  document.getElementById('open-drawer-btn').addEventListener('click', openTransactionDrawer);
  document.getElementById('close-drawer-btn').addEventListener('click', closeTransactionDrawer);
  overlay.addEventListener('click', () => {
    closeTransactionDrawer();
    closeProfileDrawer();
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
  document.getElementById('tx-form').addEventListener('submit', (e) => {
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

    state.transactions.push(newTx);
    saveState();
    
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
    if (confirm('Are you sure you want to delete all transactions and reset the application to zero? This cannot be undone.')) {
      resetToDefaultState();
      loadState();
      
      // Reset theme visual representation
      const currentTheme = state.theme || 'midnight';
      document.body.className = `theme-${currentTheme}`;
      document.querySelectorAll('.theme-dot').forEach(d => {
        d.classList.toggle('active', d.classList.contains(currentTheme));
      });

      renderDashboard();
      showToast('All transaction records cleared');
    }
  });

  // Notification button click interaction
  document.getElementById('noti-btn').addEventListener('click', () => {
    const tips = [
      "AI Insight: You spent 15% less on Food this week! Excellent.",
      "Apex Tip: Direct 20% of your earnings straight to savings.",
      "Budget Alert: Shopping has reached 80% of its budget limit.",
      "Reminder: Categorize transactions regularly for precise charts."
    ];
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    showToast(randomTip);
  });
});
