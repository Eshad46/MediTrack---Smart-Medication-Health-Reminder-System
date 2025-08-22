/* active.js
   - Initializes the Owl carousel on pages that include it
   - Simple front-end auth (localStorage): signup, login, logout
   - Session guard for protected pages
   - Dashboard: tips + reminder CRUD (localStorage per user)
   NOTE: This is for demo/front-end only. Do NOT store real passwords like this in production.
*/

/* ------------------ Helpers ------------------ */

const STORAGE_KEYS = {
  USERS: 'smhr_users',             // { [email]: {name, email, password, age, role, notes?} }
  CURRENT: 'smhr_currentUser',     // string email
  REMINDERS: (email) => `smhr_reminders_${email}` // Array of reminder objects
};

function getUsers() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || {}; }
  catch { return {}; }
}

function saveUsers(obj) {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(obj));
}

function getCurrentEmail() {
  return localStorage.getItem(STORAGE_KEYS.CURRENT);
}

function setCurrentEmail(email) {
  if (email) localStorage.setItem(STORAGE_KEYS.CURRENT, email);
  else localStorage.removeItem(STORAGE_KEYS.CURRENT);
}

function getCurrentUser() {
  const email = getCurrentEmail();
  if (!email) return null;
  const users = getUsers();
  return users[email] || null;
}

function getReminders(email) {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.REMINDERS(email))) || []; }
  catch { return []; }
}

function saveReminders(email, arr) {
  localStorage.setItem(STORAGE_KEYS.REMINDERS(email), JSON.stringify(arr));
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/* ------------------ UI state: nav ------------------ */

function refreshNavAuthState() {
  const loggedIn = !!getCurrentEmail();
  document.querySelectorAll('[data-auth="logged-in"]').forEach(el => {
    el.style.display = loggedIn ? '' : 'none';
  });
  document.querySelectorAll('[data-auth="logged-out"]').forEach(el => {
    el.style.display = loggedIn ? 'none' : '';
  });
  const logout = document.getElementById('logoutLink');
  if (logout) {
    logout.addEventListener('click', (e) => {
      e.preventDefault();
      setCurrentEmail(null);
      window.location.href = 'login.html';
    });
  }
}

/* ------------------ Auth flows ------------------ */

function requireAuthOrRedirect() {
  if (!getCurrentEmail()) {
    // Only gate pages that should require auth (home, profile)
    const path = location.pathname.toLowerCase();
    if (path.endsWith('/index.html') || path.endsWith('/') || path.endsWith('/profile.html')) {
      window.location.href = 'login.html';
    }
  }
}

function attachSignupHandler() {
  const form = document.getElementById('signupForm');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    const email = form.email.value.trim().toLowerCase();
    const password = form.password.value;
    const age = form.age.value ? Number(form.age.value) : null;
    const role = form.role.value || 'other';

    const users = getUsers();
    if (users[email]) {
      alert('An account with this email already exists. Please log in.');
      window.location.href = 'login.html';
      return;
    }
    users[email] = { name, email, password, age, role, notes: '' };
    saveUsers(users);
    alert('Account created! Please log in.');
    window.location.href = 'login.html';
  });
}

function attachLoginHandler() {
  const form = document.getElementById('loginForm');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = form.email.value.trim().toLowerCase();
    const password = form.password.value;
    const users = getUsers();
    const user = users[email];
    if (!user) {
      alert('No account found. Please sign up first.');
      window.location.href = 'signup.html';
      return;
    }
    if (user.password !== password) {
      alert('Incorrect password. Try again.');
      return;
    }
    setCurrentEmail(email);
    window.location.href = 'index.html';
  });
}

function hydrateProfileForm() {
  const form = document.getElementById('profileForm');
  if (!form) return;
  const user = getCurrentUser();
  if (!user) return;

  form.name.value = user.name || '';
  form.age.value = user.age || '';
  form.email.value = user.email || '';
  form.role.value = user.role || 'other';
  form.notes.value = user.notes || '';

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const users = getUsers();
    const u = users[user.email];
    if (!u) return;
    u.name = form.name.value.trim();
    u.age = form.age.value ? Number(form.age.value) : null;
    u.role = form.role.value || 'other';
    u.notes = form.notes.value;
    saveUsers(users);
    alert('Profile updated.');
  });

  // Password change
  const pwForm = document.getElementById('passwordForm');
  if (pwForm) {
    pwForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const current = pwForm.currentPassword.value;
      const next = pwForm.newPassword.value;
      const users = getUsers();
      const u2 = users[user.email];
      if (!u2) return;
      if (u2.password !== current) {
        alert('Current password is incorrect.');
        return;
      }
      u2.password = next;
      saveUsers(users);
      pwForm.reset();
      alert('Password updated.');
    });
  }
}

/* ------------------ Owl Carousel init ------------------ */
function initCarouselIfPresent() {
  if (typeof $ === 'undefined' || !$('.slider-active').length) return;
  try {
    $('.slider-active').owlCarousel({
      items: 1,
      loop: true,
      autoplay: true,
      autoplayTimeout: 4000,
      autoplayHoverPause: true,
      dots: true
    });
  } catch (err) {
    // silently ignore if Owl isn't loaded on this page
  }
}

/* ------------------ Tips ------------------ */
const TIPS = {
  generic: [
    'Set your reminders around daily habits (e.g., after breakfast) to make them stick.',
    'Keep a simple log of doses taken — it prevents double-dosing and missed doses.',
    'Store medicines in a dry, cool place away from direct sunlight unless instructed otherwise.',
    'Use a pill organizer if you have more than one daily medication.'
  ],
  student: [
    'Pack a small pill case in your backpack so you never miss a campus dose.',
    'If you pull an all-nighter, move morning doses with care — do not double up without a doctor’s advice.',
    'Hydration matters: drink water with meds unless told otherwise.'
  ],
  elderly: [
    'Link meds to routine events (morning tea, nightly news). Consistency beats willpower.',
    'Ask a family member to be a backup reminder for critical meds.',
    'Check expiry dates every few months; discard safely.'
  ]
};

function pickTipFor(user) {
  const pool = [
    ...TIPS.generic,
    ...(user?.role === 'student' ? TIPS.student : []),
    ...(user?.role === 'elderly' ? TIPS.elderly : [])
  ];
  const idx = Math.floor(Math.random() * pool.length);
  const audience = user?.role ? user.role[0].toUpperCase() + user.role.slice(1) : 'All';
  return { text: pool[idx], audience };
}

function initTipsBox() {
  const tipText = document.getElementById('tipText');
  const tipAudience = document.getElementById('tipAudience');
  const btn = document.getElementById('nextTipBtn');
  if (!tipText || !btn) return;
  const user = getCurrentUser();

  function refresh() {
    const { text, audience } = pickTipFor(user);
    tipText.textContent = text;
    tipAudience.textContent = audience;
  }
  btn.addEventListener('click', refresh);
  refresh();
}

/* ------------------ Reminders (CRUD) ------------------ */

function initReminderForm() {
  const form = document.getElementById('addReminderForm');
  if (!form) return;
  const user = getCurrentUser();
  if (!user) return;

  const repeatSel = form.querySelector('#repeat');
  const customDays = document.getElementById('customDays');
  repeatSel.addEventListener('change', () => {
    customDays.style.display = (repeatSel.value === 'custom') ? '' : 'none';
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const medName = form.medName.value.trim();
    const dosage = form.dosage.value.trim();
    const time = form.time.value; // "HH:MM"
    const repeat = form.repeat.value;
    let days = [];
    if (repeat === 'custom') {
      days = Array.from(customDays.querySelectorAll('input[type="checkbox"]:checked')).map(c => c.value);
      if (!days.length) {
        alert('Select at least one day for custom repeat.');
        return;
      }
    }
    const notes = form.notes.value.trim();
    const reminders = getReminders(user.email);
    reminders.push({
      id: uid(),
      medName, dosage, time, repeat, days,
      notes,
      active: true,
      createdAt: Date.now()
    });
    saveReminders(user.email, reminders);
    form.reset();
    customDays.style.display = 'none';
    renderReminders(); // refresh list
  });
}

function formatRepeat(r) {
  if (r.repeat === 'daily') return 'Daily';
  if (r.repeat === 'weekdays') return 'Weekdays';
  if (r.repeat === 'custom') return `Custom: ${r.days.join(', ')}`;
  return '—';
}

function renderReminders() {
  const user = getCurrentUser();
  const list = document.getElementById('remindersList');
  const empty = document.getElementById('emptyState');
  if (!user || !list) return;
  const reminders = getReminders(user.email);
  list.innerHTML = '';

  if (!reminders.length) {
    if (empty) empty.style.display = '';
    return;
  } else if (empty) {
    empty.style.display = 'none';
  }

  reminders
    .sort((a,b) => a.time.localeCompare(b.time))
    .forEach(r => {
      const row = document.createElement('div');
      row.className = 'reminder';
      row.innerHTML = `
        <div class="meta">
          <div>
            <div class="name">${escapeHtml(r.medName)} <span class="pill">${escapeHtml(r.time)}</span></div>
            <div class="muted">${escapeHtml(r.dosage || '')} &nbsp;•&nbsp; ${formatRepeat(r)}</div>
            ${r.notes ? `<div class="muted">Notes: ${escapeHtml(r.notes)}</div>` : ''}
          </div>
        </div>
        <div class="actions">
          <button class="btn toggle" data-id="${r.id}" style="background:${r.active ? '#1aa35f' : '#9aa3b2'}">${r.active ? 'On' : 'Off'}</button>
          <button class="btn danger delete" data-id="${r.id}">Delete</button>
        </div>
      `;
      list.appendChild(row);
    });

  list.querySelectorAll('.toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const reminders = getReminders(user.email);
      const target = reminders.find(x => x.id === id);
      if (!target) return;
      target.active = !target.active;
      saveReminders(user.email, reminders);
      renderReminders();
    });
  });

  list.querySelectorAll('.delete').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('Delete this reminder?')) return;
      const id = btn.getAttribute('data-id');
      let reminders = getReminders(user.email);
      reminders = reminders.filter(x => x.id !== id);
      saveReminders(user.email, reminders);
      renderReminders();
    });
  });
}

/* Basic HTML escape to avoid injecting raw values into DOM */
function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, (m) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[m]));
}

/* ------------------ Page boot ------------------ */

document.addEventListener('DOMContentLoaded', () => {
  refreshNavAuthState();
  requireAuthOrRedirect();
  attachSignupHandler();
  attachLoginHandler();
  hydrateProfileForm();
  initCarouselIfPresent();
  initTipsBox();
  initReminderForm();
  renderReminders();
});
