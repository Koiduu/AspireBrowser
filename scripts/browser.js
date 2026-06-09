// ============================================
// ASPIRE BROWSER — Core Logic
// ============================================

class AspireBrowser {
  constructor() {
    this.tabs = [];
    this.activeTabId = null;
    this.settings = {};
    this.init();
  }

  async init() {
    this.settings = await window.aspire.getSettings();
    this.applyTheme();
    this.setupTitlebar();
    this.setupNavigation();
    this.setupTabs();
    this.setupSidebar();
    this.setupSettings();
    this.setupAI();
    this.setupChat();
    this.setupAutoUpdate();
    this.setupPopouts();
    this.createTab('aspire://newtab');
  }

  // ---- Theme ----
  applyTheme() {
    document.body.className = `theme-${this.settings.theme || 'dark'}`;
    if (this.settings.accentColor) {
      document.documentElement.style.setProperty('--accent', this.settings.accentColor);
      const hex = this.settings.accentColor;
      document.documentElement.style.setProperty('--accent-glow', `${hex}33`);
      document.documentElement.style.setProperty('--accent-hover', this.lightenColor(hex, 15));
    }
  }

  lightenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  }

  // ---- Title Bar ----
  setupTitlebar() {
    document.getElementById('btn-minimize').onclick = () => window.aspire.minimize();
    document.getElementById('btn-maximize').onclick = () => window.aspire.maximize();
    document.getElementById('btn-close').onclick = () => window.aspire.close();
  }

  // ---- Navigation ----
  setupNavigation() {
    document.getElementById('btn-back').onclick = () => this.goBack();
    document.getElementById('btn-forward').onclick = () => this.goForward();
    document.getElementById('btn-reload').onclick = () => this.reload();

    const urlInput = document.getElementById('url-input');
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.navigate(urlInput.value);
      }
    });

    urlInput.addEventListener('focus', () => urlInput.select());
  }

  // ---- Tabs ----
  setupTabs() {
    document.getElementById('btn-new-tab').onclick = () => this.createTab('aspire://newtab');
  }

  createTab(url = 'aspire://newtab') {
    const id = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const tab = { id, url, title: 'New Tab', loading: false };
    this.tabs.push(tab);

    if (url === 'aspire://newtab') {
      this.createNewTabPage(id);
    } else {
      this.createWebview(id, url);
    }

    this.switchToTab(id);
    this.renderTabs();
    return id;
  }

  createNewTabPage(tabId) {
    const container = document.getElementById('webview-container');
    const page = document.createElement('div');
    page.className = 'newtab-page';
    page.id = `newtab-${tabId}`;
    page.dataset.tabId = tabId;

    const greeting = this.getGreeting();
    const quickAccess = this.settings.quickAccess || [];

    page.innerHTML = `
      <img src="aspire-logo.png" class="newtab-logo" alt="Aspire">
      <h1 class="newtab-greeting">${greeting}</h1>
      <p class="newtab-subtitle">Where would you like to go?</p>
      <div class="newtab-search">
        <input type="text" placeholder="Search the web or enter URL..." id="newtab-search-${tabId}">
        <svg class="newtab-search-icon" width="18" height="18" viewBox="0 0 18 18">
          <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
          <path d="M12 12l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="newtab-quickaccess">
        ${quickAccess.map(item => `
          <div class="quickaccess-item" data-url="${item.url}">
            <div class="quickaccess-icon">${item.icon}</div>
            <span class="quickaccess-name">${item.name}</span>
          </div>
        `).join('')}
      </div>
    `;

    container.appendChild(page);

    // Search input
    const searchInput = page.querySelector(`#newtab-search-${tabId}`);
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.navigate(searchInput.value);
      }
    });

    // Quick access clicks
    page.querySelectorAll('.quickaccess-item').forEach(item => {
      item.onclick = () => this.navigate(item.dataset.url);
    });
  }

  createWebview(tabId, url) {
    const container = document.getElementById('webview-container');
    const webview = document.createElement('webview');
    webview.id = `webview-${tabId}`;
    webview.dataset.tabId = tabId;
    webview.src = url;
    webview.setAttribute('allowpopups', '');
    webview.setAttribute('partition', 'persist:aspire');
    container.appendChild(webview);

    // Events
    webview.addEventListener('did-start-loading', () => {
      this.updateTabLoading(tabId, true);
    });

    webview.addEventListener('did-stop-loading', () => {
      this.updateTabLoading(tabId, false);
    });

    webview.addEventListener('page-title-updated', (e) => {
      this.updateTabTitle(tabId, e.title);
    });

    webview.addEventListener('did-navigate', (e) => {
      this.updateTabUrl(tabId, e.url);
    });

    webview.addEventListener('did-navigate-in-page', (e) => {
      if (e.isMainFrame) this.updateTabUrl(tabId, e.url);
    });

    webview.addEventListener('new-window', (e) => {
      this.createTab(e.url);
    });

    return webview;
  }

  switchToTab(id) {
    this.activeTabId = id;

    // Hide all webviews and newtab pages
    document.querySelectorAll('#webview-container > *').forEach(el => {
      el.classList.remove('active');
    });

    // Show active
    const webview = document.getElementById(`webview-${id}`);
    const newtab = document.getElementById(`newtab-${id}`);
    if (webview) webview.classList.add('active');
    if (newtab) newtab.classList.add('active');

    // Update URL bar
    const tab = this.tabs.find(t => t.id === id);
    const urlInput = document.getElementById('url-input');
    if (tab) {
      urlInput.value = tab.url === 'aspire://newtab' ? '' : tab.url;
    }

    this.renderTabs();
    this.updateNavButtons();
  }

  closeTab(id) {
    if (this.tabs.length === 1) {
      // Last tab — create new tab first
      this.createTab('aspire://newtab');
    }

    const idx = this.tabs.findIndex(t => t.id === id);
    this.tabs.splice(idx, 1);

    // Remove DOM elements
    const webview = document.getElementById(`webview-${id}`);
    const newtab = document.getElementById(`newtab-${id}`);
    if (webview) webview.remove();
    if (newtab) newtab.remove();

    // Switch to adjacent tab
    if (this.activeTabId === id) {
      const newIdx = Math.min(idx, this.tabs.length - 1);
      this.switchToTab(this.tabs[newIdx].id);
    }

    this.renderTabs();
  }

  renderTabs() {
    const container = document.getElementById('tabs-container');
    container.innerHTML = this.tabs.map(tab => `
      <button class="tab ${tab.id === this.activeTabId ? 'active' : ''} ${tab.loading ? 'tab-loading' : ''}"
              data-id="${tab.id}">
        <span class="tab-title">${tab.title}</span>
        <span class="tab-close" data-id="${tab.id}">
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </span>
      </button>
    `).join('');

    // Tab click handlers
    container.querySelectorAll('.tab').forEach(el => {
      el.onclick = (e) => {
        if (!e.target.closest('.tab-close')) {
          this.switchToTab(el.dataset.id);
        }
      };
    });

    container.querySelectorAll('.tab-close').forEach(el => {
      el.onclick = (e) => {
        e.stopPropagation();
        this.closeTab(el.dataset.id);
      };
    });
  }

  updateTabTitle(id, title) {
    const tab = this.tabs.find(t => t.id === id);
    if (tab) {
      tab.title = title;
      this.renderTabs();
    }
  }

  updateTabUrl(id, url) {
    const tab = this.tabs.find(t => t.id === id);
    if (tab) {
      tab.url = url;
      if (id === this.activeTabId) {
        document.getElementById('url-input').value = url;
        this.updateSecureIcon(url);
      }
      this.updateNavButtons();
    }
  }

  updateTabLoading(id, loading) {
    const tab = this.tabs.find(t => t.id === id);
    if (tab) {
      tab.loading = loading;
      this.renderTabs();
    }
  }

  updateSecureIcon(url) {
    const icon = document.getElementById('url-secure');
    if (url.startsWith('https://')) {
      icon.classList.add('visible');
    } else {
      icon.classList.remove('visible');
    }
  }

  updateNavButtons() {
    const webview = document.getElementById(`webview-${this.activeTabId}`);
    const backBtn = document.getElementById('btn-back');
    const fwdBtn = document.getElementById('btn-forward');

    if (webview && webview.canGoBack) {
      backBtn.disabled = !webview.canGoBack();
      fwdBtn.disabled = !webview.canGoForward();
    } else {
      backBtn.disabled = true;
      fwdBtn.disabled = true;
    }
  }

  // ---- Navigation Actions ----
  navigate(input) {
    let url = input.trim();
    if (!url) return;

    // Check if it's a URL or search query
    if (this.isUrl(url)) {
      if (!url.match(/^https?:\/\//)) url = 'https://' + url;
    } else {
      url = (this.settings.searchEngine || 'https://www.google.com/search?q=') + encodeURIComponent(url);
    }

    const activeTab = this.tabs.find(t => t.id === this.activeTabId);

    // If on new tab page, replace with webview
    const newtab = document.getElementById(`newtab-${this.activeTabId}`);
    if (newtab) {
      newtab.remove();
      this.createWebview(this.activeTabId, url);
      const webview = document.getElementById(`webview-${this.activeTabId}`);
      webview.classList.add('active');
    } else {
      const webview = document.getElementById(`webview-${this.activeTabId}`);
      if (webview) webview.src = url;
    }

    if (activeTab) activeTab.url = url;
    document.getElementById('url-input').value = url;
  }

  isUrl(str) {
    return str.includes('.') && !str.includes(' ') ||
           str.startsWith('http://') ||
           str.startsWith('https://') ||
           str.startsWith('localhost');
  }

  goBack() {
    const webview = document.getElementById(`webview-${this.activeTabId}`);
    if (webview && webview.canGoBack()) webview.goBack();
  }

  goForward() {
    const webview = document.getElementById(`webview-${this.activeTabId}`);
    if (webview && webview.canGoForward()) webview.goForward();
  }

  reload() {
    const webview = document.getElementById(`webview-${this.activeTabId}`);
    if (webview) webview.reload();
  }

  // ---- Sidebar ----
  setupSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('btn-sidebar');

    toggleBtn.onclick = () => {
      sidebar.classList.toggle('open');
      window.aspire.setSetting('sidebarOpen', sidebar.classList.contains('open'));
    };

    // Restore state
    if (this.settings.sidebarOpen) {
      sidebar.classList.add('open');
    }

    // Tab switching
    document.querySelectorAll('.sidebar-tab').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.sidebar-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`panel-${tab.dataset.panel}`).classList.add('active');
      };
    });

    // Load bookmarks
    this.loadBookmarks();
  }

  loadBookmarks() {
    const list = document.getElementById('bookmarks-list');
    const quickAccess = this.settings.quickAccess || [];
    list.innerHTML = quickAccess.map(item => `
      <div class="bookmark-item" data-url="${item.url}">
        <span class="bookmark-icon">${item.icon}</span>
        <div>
          <div class="bookmark-name">${item.name}</div>
          <div class="bookmark-url">${item.url}</div>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.bookmark-item').forEach(item => {
      item.onclick = () => this.navigate(item.dataset.url);
    });
  }

  // ---- Settings ----
  setupSettings() {
    const overlay = document.getElementById('settings-overlay');
    document.getElementById('btn-settings').onclick = () => overlay.classList.add('open');
    document.getElementById('settings-close').onclick = () => overlay.classList.remove('open');
    overlay.onclick = (e) => { if (e.target === overlay) overlay.classList.remove('open'); };

    // Load current values
    document.getElementById('setting-theme').value = this.settings.theme || 'dark';
    document.getElementById('setting-accent').value = this.settings.accentColor || '#6c5ce7';
    document.getElementById('setting-trackers').checked = this.settings.blockedTrackers !== false;
    document.getElementById('setting-https').checked = this.settings.httpsOnly !== false;
    document.getElementById('setting-adblock').checked = this.settings.adBlock !== false;
    document.getElementById('setting-search').value = this.settings.searchEngine || 'https://www.google.com/search?q=';
    document.getElementById('setting-discord-clientid').value = this.settings.discordClientId || '';
    document.getElementById('setting-bridge-url').value = this.settings.bridgeUrl || '';
    document.getElementById('setting-apikey').value = this.settings.groqApiKey || '';
    document.getElementById('setting-personality').value = this.settings.aiPersonality || 'creative';

    // Change handlers
    document.getElementById('setting-theme').onchange = (e) => {
      this.settings.theme = e.target.value;
      window.aspire.setSetting('theme', e.target.value);
      this.applyTheme();
    };

    document.getElementById('setting-accent').oninput = (e) => {
      this.settings.accentColor = e.target.value;
      window.aspire.setSetting('accentColor', e.target.value);
      this.applyTheme();
    };

    document.getElementById('setting-trackers').onchange = (e) => {
      window.aspire.setSetting('blockedTrackers', e.target.checked);
    };

    document.getElementById('setting-https').onchange = (e) => {
      window.aspire.setSetting('httpsOnly', e.target.checked);
    };

    document.getElementById('setting-adblock').onchange = (e) => {
      window.aspire.setSetting('adBlock', e.target.checked);
    };

    document.getElementById('setting-search').onchange = (e) => {
      this.settings.searchEngine = e.target.value;
      window.aspire.setSetting('searchEngine', e.target.value);
    };

    document.getElementById('setting-discord-clientid').onchange = (e) => {
      this.settings.discordClientId = e.target.value;
      window.aspire.setSetting('discordClientId', e.target.value);
    };

    document.getElementById('setting-bridge-url').onchange = (e) => {
      this.settings.bridgeUrl = e.target.value;
      window.aspire.setSetting('bridgeUrl', e.target.value);
    };

    document.getElementById('setting-apikey').onchange = (e) => {
      window.aspire.setSetting('groqApiKey', e.target.value);
    };

    document.getElementById('setting-personality').onchange = (e) => {
      window.aspire.setSetting('aiPersonality', e.target.value);
    };
  }

  // ---- AI Assistant ----
  setupAI() {
    const input = document.getElementById('ai-input');
    const sendBtn = document.getElementById('ai-send');

    const send = () => {
      const msg = input.value.trim();
      if (!msg) return;
      this.addAIMessage(msg, 'user');
      input.value = '';
      this.getAIResponse(msg);
    };

    sendBtn.onclick = send;
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
  }

  addAIMessage(text, sender) {
    const container = document.getElementById('ai-messages');
    const div = document.createElement('div');
    div.className = `ai-message ai-${sender}`;
    div.innerHTML = `
      <div class="ai-avatar">${sender === 'user' ? '👤' : '✨'}</div>
      <div class="ai-bubble">${this.escapeHtml(text)}</div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  async getAIResponse(message) {
    const apiKey = this.settings.groqApiKey;
    if (!apiKey) {
      this.addAIMessage("I need a Groq API key to chat! Add one in Settings → AI Assistant.", 'bot');
      return;
    }

    const personalities = {
      creative: "You are Aspire AI, a creative and friendly assistant for Minecraft builders. You're enthusiastic about builds, design, and helping with creative projects. Keep responses concise and fun.",
      professional: "You are Aspire AI, a professional assistant. Provide clear, helpful answers. Be concise and direct.",
      playful: "You are Aspire AI, a playful and energetic assistant! Use casual language, occasional jokes, and be fun to talk to. Keep it short and engaging.",
      mentor: "You are Aspire AI, a patient mentor and teacher. Help users learn and grow. Explain things clearly and encourage them."
    };

    const personality = personalities[this.settings.aiPersonality || 'creative'];

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: personality },
            { role: 'user', content: message }
          ],
          max_tokens: 300,
          temperature: 0.7
        })
      });

      const data = await response.json();
      if (data.choices && data.choices[0]) {
        this.addAIMessage(data.choices[0].message.content, 'bot');
      } else {
        this.addAIMessage("Hmm, I couldn't process that. Try again?", 'bot');
      }
    } catch (err) {
      this.addAIMessage("Connection error — check your API key and internet.", 'bot');
    }
  }

  // ---- Guild Chat ----
  setupChat() {
    this.ws = null;
    this.discordUser = null;

    const signinEl = document.getElementById('chat-signin');
    const connectedEl = document.getElementById('chat-connected');
    const loginBtn = document.getElementById('discord-login-btn');
    const logoutBtn = document.getElementById('discord-logout-btn');
    const statusEl = document.getElementById('chat-status');
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send');

    const send = () => {
      const msg = input.value.trim();
      if (!msg) return;
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'chat', text: msg }));
        this.addChatMessage(this.discordUser.username, msg, this.discordUser.avatar);
      }
      input.value = '';
    };

    sendBtn.onclick = send;
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });

    loginBtn.onclick = async () => {
      loginBtn.disabled = true;
      loginBtn.textContent = 'Signing in...';
      const result = await window.aspire.discordLogin();
      if (result.success) {
        this.showChatConnected(result.user);
      } else {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M13.545 2.907a13.227 13.227 0 00-3.257-1.011.05.05 0 00-.052.025c-.141.25-.297.577-.406.833a12.19 12.19 0 00-3.658 0 8.258 8.258 0 00-.412-.833.051.051 0 00-.052-.025c-1.125.194-2.22.534-3.257 1.011a.046.046 0 00-.021.018C.356 6.024-.213 9.047.066 12.032c.001.014.01.028.021.037a13.276 13.276 0 003.995 2.02.05.05 0 00.056-.019c.308-.42.582-.863.818-1.329a.05.05 0 00-.028-.07 8.735 8.735 0 01-1.248-.595.05.05 0 01-.005-.084c.084-.063.168-.128.248-.195a.05.05 0 01.051-.007c2.619 1.196 5.454 1.196 8.041 0a.052.052 0 01.053.007c.08.066.164.132.248.195a.051.051 0 01-.004.085c-.399.233-.813.44-1.249.594a.05.05 0 00-.027.07c.24.465.515.909.817 1.329a.05.05 0 00.056.019 13.235 13.235 0 004-2.02.051.051 0 00.021-.037c.334-3.451-.559-6.449-2.366-9.106a.04.04 0 00-.02-.019z" fill="currentColor"/></svg> Sign in with Discord';
        statusEl.textContent = result.error || 'Sign-in failed';
      }
    };

    logoutBtn.onclick = async () => {
      await window.aspire.discordLogout();
      this.disconnectBridge();
      this.discordUser = null;
      signinEl.style.display = '';
      connectedEl.style.display = 'none';
      statusEl.textContent = 'Sign in to connect';
    };

    // Check if already signed in
    this.restoreDiscordSession();
  }

  async restoreDiscordSession() {
    const user = await window.aspire.getDiscordUser();
    if (user && user.accessToken) {
      this.showChatConnected(user);
    }
  }

  showChatConnected(user) {
    this.discordUser = user;
    document.getElementById('chat-signin').style.display = 'none';
    document.getElementById('chat-connected').style.display = 'flex';
    document.getElementById('chat-user-name').textContent = user.username;
    if (user.avatar) {
      document.getElementById('chat-user-avatar').src = user.avatar;
      document.getElementById('chat-user-avatar').style.display = '';
    }
    document.getElementById('chat-status').textContent = 'Connecting...';
    this.connectBridge(user);
  }

  connectBridge(user) {
    const bridgeUrl = this.settings.bridgeUrl;
    if (!bridgeUrl) {
      document.getElementById('chat-status').textContent = 'Set Bridge URL in Settings';
      this.addChatMessage('System', 'Set the Bridge URL in Settings to connect to your guild chat.');
      return;
    }

    try {
      this.ws = new WebSocket(bridgeUrl);
    } catch (err) {
      document.getElementById('chat-status').textContent = 'Connection failed';
      return;
    }

    this.ws.onopen = () => {
      this.ws.send(JSON.stringify({ type: 'auth', token: user.accessToken }));
    };

    this.ws.onmessage = (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }

      if (msg.type === 'auth_ok') {
        document.getElementById('chat-status').textContent = 'Connected to guild';
        this.addChatMessage('AspireBot', 'Connected to guild chat!');
      } else if (msg.type === 'auth_error') {
        document.getElementById('chat-status').textContent = 'Auth failed — re-sign in';
      } else if (msg.type === 'chat') {
        this.addChatMessage(msg.author, msg.text, msg.avatar);
      }
    };

    this.ws.onclose = () => {
      document.getElementById('chat-status').textContent = 'Disconnected';
      // Auto-reconnect after 5s
      setTimeout(() => {
        if (this.discordUser) this.connectBridge(this.discordUser);
      }, 5000);
    };

    this.ws.onerror = () => {
      document.getElementById('chat-status').textContent = 'Connection error';
    };
  }

  disconnectBridge() {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }

  addChatMessage(author, text, avatarUrl) {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'chat-msg';
    const avatarHtml = avatarUrl
      ? `<img class="chat-msg-avatar" src="${avatarUrl}" alt="">`
      : `<div class="chat-msg-avatar-placeholder"></div>`;
    div.innerHTML = `
      ${avatarHtml}
      <div>
        <span class="chat-msg-author">${this.escapeHtml(author)}</span>
        <span class="chat-msg-text">${this.escapeHtml(text)}</span>
      </div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  // ---- Auto Update ----
  setupAutoUpdate() {
    const banner = document.getElementById('update-banner');
    const textEl = document.getElementById('update-text');
    const actionBtn = document.getElementById('update-action');
    const dismissBtn = document.getElementById('update-dismiss');
    const progressEl = document.getElementById('update-progress');
    const progressBar = document.getElementById('update-progress-bar');

    let updateState = 'available'; // available | downloading | ready

    window.aspire.onUpdateAvailable((version) => {
      updateState = 'available';
      textEl.textContent = `Aspire v${version} is available!`;
      actionBtn.textContent = 'Download';
      progressEl.style.display = 'none';
      banner.classList.add('visible');
    });

    window.aspire.onUpdateProgress((percent) => {
      progressEl.style.display = 'block';
      progressBar.style.width = `${percent}%`;
      textEl.textContent = `Downloading update... ${percent}%`;
    });

    window.aspire.onUpdateDownloaded(() => {
      updateState = 'ready';
      textEl.textContent = 'Update ready — restart to apply';
      actionBtn.textContent = 'Restart';
      progressEl.style.display = 'none';
    });

    actionBtn.onclick = () => {
      if (updateState === 'available') {
        updateState = 'downloading';
        actionBtn.textContent = 'Downloading...';
        actionBtn.disabled = true;
        window.aspire.downloadUpdate();
      } else if (updateState === 'ready') {
        window.aspire.installUpdate();
      }
    };

    dismissBtn.onclick = () => {
      banner.classList.remove('visible');
    };
  }

  // ---- Pop-out Panels ----
  setupPopouts() {
    document.getElementById('popout-ai').onclick = () => {
      window.aspire.popoutPanel('ai');
    };

    document.getElementById('popout-chat').onclick = () => {
      window.aspire.popoutPanel('chat');
    };

    window.aspire.onPopoutClosed((panel) => {
      // Panel returned to sidebar — no special action needed
    });
  }

  // ---- Helpers ----
  getGreeting() {
    const hour = new Date().getHours();
    if (hour < 6) return 'Night owl mode';
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  window.browser = new AspireBrowser();
});
