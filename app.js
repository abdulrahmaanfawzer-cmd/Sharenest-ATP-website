/* Sharenest — vanilla JS application (no build step, no Node.js) */
(function () {
  'use strict';

  var storageKey = 'sharenest_demo_v1';
  var themeStorageKey = 'sharenest_color_theme_v1';

  var themes = [
    { id: 'white', name: 'Minimal White', mood: 'Clean & timeless', colors: ['#ffffff', '#f5f7fa', '#344054'] },
    { id: 'blue', name: 'Ocean Blue', mood: 'Calm & trustworthy', colors: ['#2563eb', '#dbeafe', '#0f2855'] },
    { id: 'orange', name: 'Sunset Orange', mood: 'Warm & welcoming', colors: ['#c25119', '#fff0df', '#78350f'] },
    { id: 'purple', name: 'Orchid Purple', mood: 'Creative & modern', colors: ['#7c3aed', '#f0e7ff', '#38166e'] },
    { id: 'green', name: 'Forest Green', mood: 'Friendly & grounded', colors: ['#277b56', '#e7f5ec', '#174c34'] },
    { id: 'midnight', name: 'Midnight', mood: 'Bold & focused', colors: ['#111b30', '#26365a', '#a2b8ff'] }
  ];

  var nav = [
    { id: 'home', label: 'Overview', icon: 'home' },
    { id: 'explore', label: 'Explore requests', icon: 'compass' },
    { id: 'my', label: 'My borrowing', icon: 'handshake' },
    { id: 'community', label: 'My communities', icon: 'users' },
    { id: 'admin', label: 'Community admin', icon: 'shield-check' }
  ];

  var emojiByCategory = {
    'Study essentials': '🧮',
    'Electronics': '📷',
    'Books & learning': '📚',
    'Sports & outdoors': '🏸',
    'Tools & equipment': '🧰'
  };

  var durations = ['1 day', '2 days', '3 days', '1 week', '2 weeks', 'Flexible'];
  var groups = ['Faculty of Science', 'Computing Students', 'Student Societies', 'Media Society', 'Sports Club'];

  function timeAgo(iso) {
    try {
      var diff = Date.now() - new Date(iso).getTime();
      var mins = Math.round(diff / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return mins + ' min ago';
      var hrs = Math.round(mins / 60);
      if (hrs < 24) return hrs + ' hour' + (hrs === 1 ? '' : 's') + ' ago';
      var days = Math.round(hrs / 24);
      return days + ' day' + (days === 1 ? '' : 's') + ' ago';
    } catch (e) { return 'Recently'; }
  }
  function rowToRequest(row) {
    return {
      id: row.id, title: row.title, category: row.category, description: row.description,
      duration: row.duration, date: row.date_label, location: row.location, fee: row.fee,
      group: row.group_name, emoji: row.emoji, community: row.community, by: row.created_by,
      avatar: row.avatar, color: row.color, status: row.status, offers: row.offers,
      created: timeAgo(row.created_at)
    };
  }
  function requestToRow(r) {
    return {
      title: r.title, category: r.category, description: r.description, duration: r.duration,
      date_label: r.date, location: r.location, fee: r.fee, group_name: r.group, emoji: r.emoji,
      community: r.community, created_by: r.by, avatar: r.avatar, color: r.color,
      status: r.status, offers: r.offers
    };
  }

  function readSaved() {
    try { return JSON.parse(localStorage.getItem(storageKey)); } catch (e) { return null; }
  }
  function getSavedTheme() {
    try {
      var id = localStorage.getItem(themeStorageKey);
      for (var i = 0; i < themes.length; i++) if (themes[i].id === id) return id;
      return 'green';
    } catch (e) { return 'green'; }
  }
  function esc(v) {
    return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function emptyForm() {
    return {
      title: '', category: 'Study essentials', description: '', duration: '1 day',
      date: '', location: 'Main library', fee: 'Free preferred', group: 'Faculty of Science'
    };
  }

  var saved = readSaved();
  var state = {
    theme: getSavedTheme(),
    themeMenuOpen: false,
    requests: (saved && saved.requests) || seedRequests.slice(),
    loans: (saved && saved.loans) || seedLoans.slice(),
    page: 'home',
    search: '',
    category: 'All requests',
    modal: null,
    selected: null,
    toast: '',
    mobile: false,
    alerts: false,
    liked: [],
    form: emptyForm()
  };

  var toastTimer = null;
  var root = document.getElementById('root');

  function persist() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ requests: state.requests, loans: state.loans }));
    } catch (e) {}
  }
  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    try { localStorage.setItem(themeStorageKey, state.theme); } catch (e) {}
  }
  function setToast(msg) {
    state.toast = msg;
    if (toastTimer) clearTimeout(toastTimer);
    if (msg) toastTimer = setTimeout(function () { state.toast = ''; render(); }, 3500);
  }
  function visibleRequests() {
    var q = state.search.toLowerCase();
    return state.requests.filter(function (r) {
      var inCat = state.category === 'All requests' || r.category === state.category;
      var hay = (r.title + ' ' + r.description + ' ' + r.group).toLowerCase();
      return inCat && hay.indexOf(q) !== -1;
    });
  }
  function byId(id) {
    for (var i = 0; i < state.requests.length; i++) if (String(state.requests[i].id) === String(id)) return state.requests[i];
    return null;
  }

  /* ---------- components ---------- */

  function requestCard(r, likable) {
    var liked = state.liked.indexOf(r.id) !== -1;
    return '<article class="request-card">' +
      '<div class="card-top"><div class="item-emoji">' + esc(r.emoji) + '</div>' +
      '<button class="heart ' + (liked ? 'liked' : '') + '" aria-label="Save request" ' +
      (likable === false ? '' : 'data-act="like" data-id="' + esc(r.id) + '"') + '>' +
      ic('heart', 18, '', { fill: liked ? 'currentColor' : 'none' }) + '</button></div>' +
      '<div class="card-category">' + esc(r.category) + '</div>' +
      '<h4>' + esc(r.title) + '</h4>' +
      '<p class="card-description">' + esc(r.description) + '</p>' +
      '<div class="card-tags"><span>' + ic('calendar-days', 13) + esc(r.date) + '</span>' +
      '<span>' + ic('clock-3', 13) + esc(r.duration) + '</span></div>' +
      '<div class="card-footer"><div class="card-person">' +
      '<span class="avatar" style="background:' + esc(r.color) + '">' + esc(r.avatar) + '</span>' +
      '<div><b>' + esc(r.by) + '</b><small>' + esc(r.created) + '</small></div></div>' +
      '<button class="card-arrow" data-act="open" data-id="' + esc(r.id) + '" aria-label="View ' + esc(r.title) + '">' +
      ic('arrow-up-right', 20) + '</button></div></article>';
  }

  function pageHeading(kicker, title, subtitle, withAction) {
    return '<div class="page-heading"><div><div class="eyebrow">' + esc(kicker) + '</div>' +
      '<h1>' + esc(title) + '</h1><p>' + esc(subtitle) + '</p></div>' +
      (withAction ? '<button class="btn btn-primary" data-act="create">' + ic('plus', 17) + ' Post a request</button>' : '') +
      '</div>';
  }

  function cardsGrid(list, likable) {
    return '<div class="cards-grid">' + list.map(function (r) { return requestCard(r, likable); }).join('') + '</div>';
  }

  function sidebar() {
    var openCount = state.requests.filter(function (r) { return r.status === 'Open'; }).length;
    return '<aside class="sidebar ' + (state.mobile ? 'open' : '') + '">' +
      '<div class="brand"><div class="brand-icon">' +
      '<img src="logo-mark.png" alt="Sharenest logo" width="37" height="37"/></div>' +
      '<div>Share<span>nest</span><small>NURTURING COMMUNITY</small></div></div>' +
      '<div class="workspace-label">YOUR WORKSPACE</div>' +
      '<nav class="nav">' + nav.map(function (n) {
        return '<button class="nav-item ' + (state.page === n.id ? 'active' : '') + '" data-act="nav" data-id="' + n.id + '">' +
          ic(n.icon, 19) + '<span>' + esc(n.label) + '</span>' +
          (n.id === 'explore' ? '<span class="nav-count">' + openCount + '</span>' : '') + '</button>';
      }).join('') + '</nav>' +
      '<div class="sidebar-bottom">' +
      '<div class="community-mini"><div class="uni-icon">🎓</div>' +
      '<div><b>University of Colombo</b><small>Verified member ' + ic('check-circle-2', 12) + '</small></div></div>' +
      '<div class="sidebar-tip">' + ic('sparkles', 18) + '<b>Sharing starts here</b>' +
      '<p>Something you need might already be in your community.</p>' +
      '<button data-act="create">Make a request ' + ic('arrow-right', 14) + '</button></div>' +
      '<button class="reset-btn" data-act="reset">' + ic('rotate-ccw', 14) + ' Reset demo data</button>' +
      '</div></aside>';
  }

  function themePopover() {
    return '<div class="theme-popover" id="sharenest-theme-menu">' +
      '<div class="theme-popover-top"><div class="theme-eyebrow">' + ic('sparkles', 14) + ' PERSONALIZE SHARENEST</div>' +
      '<h3>Find your color story</h3><p>Choose a palette and see the entire site change instantly.</p></div>' +
      '<div class="theme-option-grid" role="radiogroup" aria-label="Website color theme">' +
      themes.map(function (t) {
        var on = state.theme === t.id;
        return '<button type="button" role="radio" aria-checked="' + on + '" class="theme-option ' + (on ? 'chosen' : '') +
          '" data-act="theme" data-id="' + t.id + '">' +
          '<span class="theme-swatch" style="background:' + t.colors[1] + '">' +
          '<span style="background:' + t.colors[0] + '"></span><span style="background:' + t.colors[2] + '"></span></span>' +
          '<span class="theme-option-name">' + esc(t.name) + '</span>' +
          '<span class="theme-option-mood">' + esc(t.mood) + '</span>' +
          (on ? '<span class="theme-selected">' + ic('check', 12) + '</span>' : '') + '</button>';
      }).join('') + '</div>' +
      '<div class="theme-popover-foot">' + ic('check-circle-2', 15) + ' Your choice is saved on this device.</div></div>';
  }

  function topbar() {
    var current = nav.filter(function (n) { return n.id === state.page; })[0];
    var themeName = themes.filter(function (t) { return t.id === state.theme; })[0].name;
    return '<header class="topbar"><div class="top-left">' +
      '<button class="icon-button mobile-toggle" data-act="mobile-open" aria-label="Open menu">' + ic('menu', 22) + '</button>' +
      '<span class="breadcrumb">Community space</span><span class="slash">/</span><b>' + esc(current ? current.label : '') + '</b></div>' +
      '<div class="top-actions"><div class="theme-control" id="theme-control">' +
      '<button type="button" class="theme-trigger ' + (state.themeMenuOpen ? 'is-open' : '') + '" data-act="theme-menu" ' +
      'aria-haspopup="true" aria-expanded="' + state.themeMenuOpen + '" aria-controls="sharenest-theme-menu" title="Change website colors">' +
      ic('palette', 17) + '<span class="theme-trigger-label">' + esc(themeName) + '</span>' +
      ic('chevron-down', 14, state.themeMenuOpen ? 'chevron-up' : '') + '</button>' +
      (state.themeMenuOpen ? themePopover() : '') + '</div>' +
      '<span class="verified-chip">' + ic('shield-check', 14) + ' Verified community</span>' +
      '<div class="notification-wrap"><button class="icon-button notify" data-act="alerts" aria-label="Notifications">' +
      ic('bell', 19) + '<i></i></button>' +
      (state.alerts ? '<div class="notifications"><b>Notifications</b>' +
        '<p>Welcome to Sharenest! Your community is ready to share.</p>' +
        '<p>Tip: Post a request to find something you need.</p></div>' : '') + '</div>' +
      '<div class="user-avatar">AN</div></div></header>';
  }

  function homePage() {
    var steps = [
      ['01', 'Post what you need', 'Tell your community what you’re looking for.'],
      ['02', 'Get offers', 'Nearby members respond when they can help.'],
      ['03', 'Borrow with confidence', 'Agree on terms, collect and return with ease.']
    ];
    return '<section class="welcome"><div class="eyebrow"><span class="green-dot"></span> YOUR COMMUNITY, CONNECTED</div>' +
      '<h1>Good morning, Alex <span class="wave">✳</span></h1>' +
      '<p>Borrow what you need. Share what you have. Make more possible, together.</p></section>' +
      '<section class="hero"><div class="hero-copy"><div class="hero-kicker">' + ic('sparkles', 15) + ' THE POWER OF SHARING</div>' +
      '<h2>Need something?<br><em>Your community has you.</em></h2>' +
      '<p>From calculators to cameras, find what you need from people right around you. No endless listings, just real connections.</p>' +
      '<button class="btn btn-white" data-act="create">' + ic('plus', 17) + ' Post a borrowing request ' + ic('arrow-right', 17) + '</button></div>' +
      '<div class="hero-art"><div class="hero-circle c1"></div><div class="hero-circle c2"></div>' +
      '<div class="float-item item1">📷<small>Camera</small></div>' +
      '<div class="float-item item2">📚<small>Books</small></div>' +
      '<div class="float-item item3">🧮<small>Calculator</small></div>' +
      '<div class="hero-hands">🤝</div>' +
      '<div class="art-label"><span>✓</span> Shared with care</div></div></section>' +
      '<section class="stats">' +
      '<div class="stat"><div class="stat-icon mint">' + ic('clipboard-list', 20) + '</div><div><strong>' + state.requests.length + '</strong><span>Community requests</span></div></div>' +
      '<div class="stat"><div class="stat-icon lilac">' + ic('users', 20) + '</div><div><strong>248</strong><span>Verified members <sup>DEMO</sup></span></div></div>' +
      '<div class="stat"><div class="stat-icon peach">' + ic('handshake', 20) + '</div><div><strong>86</strong><span>Items shared <sup>DEMO</sup></span></div></div>' +
      '<div class="stat"><div class="stat-icon blue">' + ic('shield-check', 20) + '</div><div><strong>3</strong><span>Community groups</span></div></div>' +
      '</section>' +
      '<div class="section-head"><div><h3>Recently requested</h3><p>See what your community needs right now.</p></div>' +
      '<button class="text-link" data-act="nav" data-id="explore">View all requests ' + ic('arrow-right', 17) + '</button></div>' +
      cardsGrid(state.requests.slice(0, 3)) +
      '<section class="bottom-panels"><div class="how-panel"><h3>How Sharenest works</h3>' +
      '<p>Sharing made simple, safe and local.</p><div class="steps">' +
      steps.map(function (s) {
        return '<div class="step"><span>' + s[0] + '</span><div><b>' + esc(s[1]) + '</b><small>' + esc(s[2]) + '</small></div></div>';
      }).join('') + '</div></div>' +
      '<div class="trust-panel"><div class="trust-graphic">' + ic('shield-check', 32) + '</div><h3>Built on trust.</h3>' +
      '<p>Verified memberships, clear borrowing agreements and return tracking make sharing feel safer.</p>' +
      '<button data-act="nav" data-id="community">Explore your community ' + ic('arrow-up-right', 16) + '</button></div></section>';
  }

  function explorePage() {
    var list = visibleRequests();
    return pageHeading('DISCOVER & CONNECT', 'Explore requests', 'See what people in your communities are looking for.', true) +
      '<div class="filterbar"><div class="searchfield">' + ic('search', 18) +
      '<input id="search-input" value="' + esc(state.search) + '" placeholder="Search for an item or keyword..."></div>' +
      '<div class="filter-caption">' + ic('sliders-horizontal', 17) + ' Filter by category</div></div>' +
      '<div class="category-tabs">' + categories.map(function (c) {
        return '<button class="' + (state.category === c ? 'selected' : '') + '" data-act="category" data-id="' + esc(c) + '">' + esc(c) + '</button>';
      }).join('') + '</div>' +
      '<div id="explore-results">' + exploreResults(list) + '</div>';
  }

  function exploreResults(list) {
    return '<div class="results-line"><b>' + list.length + ' requests</b><span>in your community</span></div>' +
      cardsGrid(list) +
      (list.length === 0 ? '<div class="empty">' + ic('search', 34) + '<h3>No matching requests</h3><p>Try another search or category.</p></div>' : '');
  }

  function myPage() {
    var mine = state.requests.filter(function (r) { return r.by === 'You'; });
    return pageHeading('YOUR ACTIVITY', 'My borrowing', 'Keep track of what you\'ve borrowed and what you\'ve requested.', true) +
      '<div class="section-head"><div><h3>Active & past borrowing</h3><p>Manage handovers and returns.</p></div></div>' +
      '<div class="loan-list">' + state.loans.map(function (l) {
        return '<div class="loan"><div class="loan-emoji">' + esc(l.emoji) + '</div>' +
          '<div class="loan-info"><b>' + esc(l.title) + '</b><span>From ' + esc(l.person) + ' · ' + esc(l.detail) + '</span></div>' +
          '<div class="loan-right"><span class="pill ' + (l.status === 'Returned' ? 'pill-green' : 'pill-yellow') + '">' + esc(l.status) + '</span>' +
          '<small>' + (l.status === 'Returned' ? 'Returned' : 'Due') + ': ' + esc(l.due) + '</small></div>' +
          (l.status === 'Borrowed' ? '<button class="outline-btn" data-act="return" data-id="' + esc(l.id) + '">Mark returned</button>' : '') +
          '</div>';
      }).join('') + '</div>' +
      '<div class="section-head"><div><h3>Requests you\'ve posted</h3><p>Your items and their current status.</p></div></div>' +
      cardsGrid(mine, false) +
      (mine.length === 0 ? '<div class="empty">' + ic('package-check', 34) + '<h3>No requests yet</h3>' +
        '<p>Start by posting something you\'d like to borrow.</p>' +
        '<button class="btn btn-primary" data-act="create">' + ic('plus', 16) + ' Create request</button></div>' : '');
  }

  function communityPage() {
    var gs = [
      ['📐', 'Faculty of Science', 'Academic tools, books and lab essentials', '126 members'],
      ['💻', 'Computing Students', 'Tech gear, study resources and equipment', '84 members'],
      ['🎭', 'Student Societies', 'Events, creative gear and shared resources', '38 members']
    ];
    return pageHeading('PEOPLE & PLACES', 'My communities', 'Trusted circles where borrowing becomes easier.', true) +
      '<div class="community-banner"><div class="community-emblem">🎓</div>' +
      '<div><div class="eyebrow">PRIMARY COMMUNITY</div><h2>University of Colombo</h2>' +
      '<p>' + ic('shield-check', 15) + ' Verified member · Colombo, Sri Lanka</p></div>' +
      '<span class="pill pill-green">Active</span></div>' +
      '<div class="section-head"><div><h3>Your groups</h3><p>Requests can be shared with specific groups.</p></div></div>' +
      '<div class="group-grid">' + gs.map(function (g) {
        return '<div class="group-card"><div class="group-emoji">' + g[0] + '</div><h3>' + esc(g[1]) + '</h3>' +
          '<p>' + esc(g[2]) + '</p><div>' + ic('users', 15) + esc(g[3]) + ic('check-circle-2', 15, 'group-check') + '</div></div>';
      }).join('') + '</div>' +
      '<div class="info-note">' + ic('info', 20) + '<div><b>How verification works</b>' +
      '<p>In a production platform, authorised community administrators would verify membership before granting access. This sample uses simulated membership data.</p></div></div>';
  }

  function adminPage() {
    var approvals = [['SM', 'Sajith M.', 'Faculty of Science'], ['PR', 'Piumi R.', 'Computing Students']];
    return '<div class="admin-tag">' + ic('shield-check', 15) + ' DEMONSTRATION ONLY</div>' +
      pageHeading('COMMUNITY MANAGEMENT', 'Admin overview', 'A preview of the tools available to verified community administrators.', false) +
      '<div class="stats admin-stats">' +
      '<div class="stat"><div class="stat-icon mint">' + ic('users', 20) + '</div><div><strong>248</strong><span>Members <sup>DEMO</sup></span></div></div>' +
      '<div class="stat"><div class="stat-icon lilac">' + ic('clipboard-list', 20) + '</div><div><strong>' + state.requests.length + '</strong><span>Total requests</span></div></div>' +
      '<div class="stat"><div class="stat-icon peach">' + ic('clock-3', 20) + '</div><div><strong>2</strong><span>Pending approvals <sup>DEMO</sup></span></div></div>' +
      '<div class="stat"><div class="stat-icon blue">' + ic('shield-check', 20) + '</div><div><strong>0</strong><span>Open disputes <sup>DEMO</sup></span></div></div></div>' +
      '<div class="admin-grid"><div class="admin-panel"><h3>Recent community requests</h3><p>Overview of the latest borrowing activity.</p>' +
      state.requests.slice(0, 5).map(function (r) {
        return '<div class="admin-row"><span>' + esc(r.emoji) + '</span><div><b>' + esc(r.title) + '</b>' +
          '<small>' + esc(r.by) + ' · ' + esc(r.group) + '</small></div>' +
          '<span class="pill pill-green">' + esc(r.status) + '</span></div>';
      }).join('') + '</div>' +
      '<div class="admin-panel"><h3>Membership approvals</h3><p>Illustrative requests for verification.</p>' +
      approvals.map(function (u) {
        return '<div class="approval"><div class="small-avatar">' + u[0] + '</div>' +
          '<div><b>' + esc(u[1]) + '</b><small>' + esc(u[2]) + '</small></div>' +
          '<button data-act="approve">' + ic('check', 16) + '</button></div>';
      }).join('') +
      '<div class="info-note compact">' + ic('lock-keyhole', 18) +
      '<p>Real administration requires server-side authorization and an audit log.</p></div></div></div>';
  }

  function content() {
    if (state.page === 'home') return homePage();
    if (state.page === 'explore') return explorePage();
    if (state.page === 'my') return myPage();
    if (state.page === 'community') return communityPage();
    if (state.page === 'admin') return adminPage();
    return '';
  }

  function options(list, selectedValue) {
    return list.map(function (x) {
      return '<option' + (x === selectedValue ? ' selected' : '') + '>' + esc(x) + '</option>';
    }).join('');
  }

  function createModal() {
    var f = state.form;
    return '<div class="modal-kicker">' + ic('sparkles', 16) + ' SHARE YOUR NEED</div>' +
      '<h2>What are you looking for?</h2>' +
      '<p class="modal-sub">Post a request to your verified community. Someone nearby might have just what you need.</p>' +
      '<form class="request-form" id="request-form">' +
      '<label>Item name <span>*</span><input name="title" maxlength="90" required value="' + esc(f.title) + '" placeholder="e.g. Scientific calculator"></label>' +
      '<label>Category<select name="category">' + options(categories.slice(1), f.category) + '</select></label>' +
      '<label>Description <span>*</span><textarea name="description" required rows="3" maxlength="450" placeholder="Tell your community a little about what you need...">' + esc(f.description) + '</textarea></label>' +
      '<div class="form-row"><label>When do you need it?<input name="date" type="date" value="' + esc(f.date) + '"></label>' +
      '<label>For how long?<select name="duration">' + options(durations, f.duration) + '</select></label></div>' +
      '<div class="form-row"><label>Preferred handover<input name="location" value="' + esc(f.location) + '" placeholder="e.g. Main library"></label>' +
      '<label>Budget / fee<input name="fee" value="' + esc(f.fee) + '" placeholder="Free preferred"></label></div>' +
      '<label>Share with group<select name="group">' + options(groups, f.group) + '</select></label>' +
      '<div class="modal-actions"><button type="button" class="outline-btn" data-act="close">Cancel</button>' +
      '<button type="submit" class="btn btn-primary">' + ic('send', 16) + ' Publish request</button></div></form>';
  }

  function detailModal() {
    var s = state.selected;
    if (!s) return '';
    return '<div class="detail-icon">' + esc(s.emoji) + '</div>' +
      '<span class="pill pill-green">' + esc(s.status) + '</span>' +
      '<h2>' + esc(s.title) + '</h2>' +
      '<p class="modal-sub">' + esc(s.description) + '</p>' +
      '<div class="detail-person"><span class="avatar" style="background:' + esc(s.color) + '">' + esc(s.avatar) + '</span>' +
      '<div><b>' + esc(s.by) + '</b><small>' + ic('shield-check', 13) + ' Verified community member</small></div></div>' +
      '<div class="detail-grid">' +
      '<div>' + ic('calendar-days', 17) + '<small>Needed</small><b>' + esc(s.date) + '</b></div>' +
      '<div>' + ic('clock-3', 17) + '<small>Duration</small><b>' + esc(s.duration) + '</b></div>' +
      '<div>' + ic('map-pin', 17) + '<small>Handover</small><b>' + esc(s.location) + '</b></div>' +
      '<div>' + ic('handshake', 17) + '<small>Budget</small><b>' + esc(s.fee) + '</b></div></div>' +
      '<div class="detail-group">' + ic('users', 17) + esc(s.group) + '<span>' + s.offers + ' offer' + (s.offers !== 1 ? 's' : '') + '</span></div>' +
      '<div class="info-note compact">' + ic('info', 17) +
      '<p>This is a prototype. Sending an offer updates local demo data; no real person is contacted.</p></div>' +
      '<div class="modal-actions"><button class="outline-btn" data-act="close">Close</button>' +
      (s.by !== 'You'
        ? '<button class="btn btn-primary" data-act="offer">' + ic('handshake', 17) + ' I can lend this</button>'
        : '<button class="btn btn-primary" data-act="cancel-request">Cancel request</button>') +
      '</div>';
  }

  function modalLayer() {
    if (!state.modal) return '';
    return '<div class="modal-backdrop" id="modal-backdrop">' +
      '<div class="modal" role="dialog" aria-modal="true" aria-label="' +
      (state.modal === 'create' ? 'Create request' : 'Request details') + '">' +
      '<button class="modal-close" data-act="close" aria-label="Close">' + ic('x', 21) + '</button>' +
      (state.modal === 'create' ? createModal() : detailModal()) + '</div></div>';
  }

  function render() {
    var scrollEl = document.querySelector('.content');
    var scrollTop = scrollEl ? scrollEl.scrollTop : 0;
    root.innerHTML = '<div class="app-shell">' + sidebar() +
      (state.mobile ? '<div class="mobile-backdrop" data-act="mobile-close"></div>' : '') +
      '<div class="main-area">' + topbar() + '<main class="content">' + content() + '</main></div>' +
      modalLayer() +
      (state.toast ? '<div class="toast">' + ic('check-circle-2', 18) + esc(state.toast) + '</div>' : '') +
      '</div>';
    if (scrollEl) { var e2 = document.querySelector('.content'); if (e2) e2.scrollTop = scrollTop; }
  }

  function renderResults() {
    var holder = document.getElementById('explore-results');
    if (holder) holder.innerHTML = exploreResults(visibleRequests());
  }

  /* ---------- actions ---------- */

  function setView(id) {
    state.page = id;
    state.mobile = false;
    state.search = '';
    state.category = 'All requests';
    render();
  }

  function captureForm() {
    var form = document.getElementById('request-form');
    if (!form) return;
    var keys = ['title', 'category', 'description', 'date', 'duration', 'location', 'fee', 'group'];
    keys.forEach(function (k) { if (form.elements[k]) state.form[k] = form.elements[k].value; });
  }

  function submitRequest(e) {
    e.preventDefault();
    captureForm();
    var f = state.form;
    if (!f.title.trim() || !f.description.trim()) {
      setToast('Add an item name and a short description.');
      render();
      return;
    }
    var r = {
      id: Date.now(), title: f.title, category: f.category, description: f.description,
      duration: f.duration, date: f.date || 'Flexible', location: f.location, fee: f.fee, group: f.group,
      emoji: emojiByCategory[f.category] || '📦',
      community: 'University of Colombo', by: 'You', avatar: 'YO', color: '#d7efe5',
      status: 'Open', offers: 0, created: 'Just now'
    };
    state.requests.unshift(r);
    state.modal = null;
    state.page = 'explore';
    state.category = 'All requests';
    state.search = '';
    state.form = emptyForm();
    persist();
    setToast('Your request is live in your community!');
    render();

    if (sharenestSupabase) {
      sharenestSupabase.from('requests').insert(requestToRow(r)).select().single()
        .then(function (res) {
          if (res.error) { console.warn('Supabase insert failed, kept local copy only:', res.error.message); return; }
          var i = state.requests.findIndex(function (x) { return x.id === r.id; });
          if (i !== -1) { state.requests[i] = rowToRequest(res.data); persist(); render(); }
        });
    }
  }

  function loadFromSupabase() {
    if (!sharenestSupabase) return;
    sharenestSupabase.from('requests').select('*').order('created_at', { ascending: false })
      .then(function (res) {
        if (res.error) { console.warn('Sharenest: could not load from Supabase, showing local demo data instead.', res.error.message); return; }
        if (res.data && res.data.length) {
          state.requests = res.data.map(rowToRequest);
          persist();
          render();
        }
      });
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!el) return;
    var act = el.getAttribute('data-act');
    var id = el.getAttribute('data-id');

    if (act === 'nav') { setView(id); return; }
    if (act === 'create') { state.modal = 'create'; state.mobile = false; render(); return; }
    if (act === 'close') { captureForm(); state.modal = null; render(); return; }
    if (act === 'mobile-open') { state.mobile = true; render(); return; }
    if (act === 'mobile-close') { state.mobile = false; render(); return; }
    if (act === 'alerts') { state.alerts = !state.alerts; render(); return; }
    if (act === 'theme-menu') { state.themeMenuOpen = !state.themeMenuOpen; render(); return; }
    if (act === 'theme') { state.theme = id; state.themeMenuOpen = false; applyTheme(); render(); return; }
    if (act === 'reset') {
      state.requests = seedRequests.slice();
      state.loans = seedLoans.slice();
      persist();
      setToast('Demo data restored.');
      render();
      return;
    }
    if (act === 'category') { state.category = id; render(); return; }
    if (act === 'like') {
      var n = Number(id);
      var i = state.liked.indexOf(n);
      if (i === -1) state.liked.push(n); else state.liked.splice(i, 1);
      if (state.page === 'explore') renderResults(); else render();
      return;
    }
    if (act === 'open') {
      state.selected = byId(id);
      state.modal = 'detail';
      render();
      return;
    }
    if (act === 'offer') {
      var sel = state.selected;
      state.requests = state.requests.map(function (r) {
        if (r.id === sel.id) { r.offers = r.offers + 1; }
        return r;
      });
      state.modal = null;
      persist();
      setToast('Offer sent! The requester can now review it.');
      render();
      return;
    }
    if (act === 'cancel-request') {
      var sid = state.selected.id;
      state.requests = state.requests.map(function (r) {
        if (r.id === sid) r.status = 'Cancelled';
        return r;
      });
      state.modal = null;
      persist();
      setToast('Request cancelled.');
      render();
      return;
    }
    if (act === 'return') {
      state.loans = state.loans.map(function (l) {
        if (String(l.id) === String(id)) { l.status = 'Returned'; l.detail = 'Successfully returned'; }
        return l;
      });
      persist();
      setToast('Return marked complete (demo).');
      render();
      return;
    }
    if (act === 'approve') {
      setToast('Demo only: approval requires a real backend and administrator permissions.');
      render();
      return;
    }
  });

  document.addEventListener('submit', function (e) {
    if (e.target && e.target.id === 'request-form') submitRequest(e);
  });

  document.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'search-input') {
      state.search = e.target.value;
      renderResults();
    }
  });

  document.addEventListener('pointerdown', function (e) {
    if (state.themeMenuOpen) {
      var ctrl = document.getElementById('theme-control');
      if (ctrl && !ctrl.contains(e.target)) { state.themeMenuOpen = false; render(); return; }
    }
    if (state.modal) {
      var bd = document.getElementById('modal-backdrop');
      if (bd && e.target === bd) { captureForm(); state.modal = null; render(); }
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (state.themeMenuOpen) { state.themeMenuOpen = false; render(); return; }
    if (state.modal) { captureForm(); state.modal = null; render(); }
  });

  applyTheme();
  persist();
  render();
  loadFromSupabase();
})();
