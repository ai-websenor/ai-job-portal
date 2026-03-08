// ── Search-Select Component ─────────────────────

function createSearchSelect(config) {
    const container = config.containerEl;
    const hiddenInput = config.hiddenInputEl;

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = config.placeholder || 'Type to search...';
    input.className = 'w-full border rounded px-3 py-2 text-sm';
    input.autocomplete = 'off';

    const dropdown = document.createElement('div');
    dropdown.className = 'search-select-dropdown';

    const selectedDiv = document.createElement('div');
    selectedDiv.className = 'search-select-selected';
    selectedDiv.style.display = 'none';

    container.appendChild(input);
    container.appendChild(dropdown);
    container.appendChild(selectedDiv);

    let debounceTimer = null;
    let activeIndex = -1;

    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const q = input.value.trim();
        if (q.length < 2) { closeDropdown(); return; }
        debounceTimer = setTimeout(() => fetchResults(q), 300);
    });

    input.addEventListener('keydown', (e) => {
        const items = dropdown.querySelectorAll('.search-select-item');
        if (!items.length || !dropdown.classList.contains('open')) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeIndex = Math.min(activeIndex + 1, items.length - 1);
            updateActive(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeIndex = Math.max(activeIndex - 1, 0);
            updateActive(items);
        } else if (e.key === 'Enter' && activeIndex >= 0) {
            e.preventDefault();
            items[activeIndex].click();
        } else if (e.key === 'Escape') {
            closeDropdown();
        }
    });

    function updateActive(items) {
        items.forEach((el, i) => el.classList.toggle('active', i === activeIndex));
        if (activeIndex >= 0) items[activeIndex].scrollIntoView({ block: 'nearest' });
    }

    async function fetchResults(q) {
        try {
            const res = await fetch(window.BASE_PATH + config.searchUrl + '?q=' + encodeURIComponent(q));
            if (!res.ok) return;
            const items = await res.json();
            renderDropdown(items);
        } catch (_) { closeDropdown(); }
    }

    function renderDropdown(items) {
        dropdown.innerHTML = '';
        activeIndex = -1;
        if (!items.length) {
            dropdown.innerHTML = '<div class="search-select-no-results">No results found</div>';
            dropdown.classList.add('open');
            return;
        }
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'search-select-item';
            div.innerHTML = config.renderItem(item);
            div.addEventListener('click', () => selectItem(item));
            dropdown.appendChild(div);
        });
        dropdown.classList.add('open');
    }

    function selectItem(item) {
        hiddenInput.value = item.id;
        input.style.display = 'none';
        closeDropdown();

        selectedDiv.innerHTML = '';
        const label = document.createElement('span');
        label.innerHTML = config.renderSelected(item);
        const clearBtn = document.createElement('button');
        clearBtn.className = 'search-select-clear';
        clearBtn.innerHTML = '&times;';
        clearBtn.title = 'Clear selection';
        clearBtn.addEventListener('click', clearSelection);
        selectedDiv.appendChild(label);
        selectedDiv.appendChild(clearBtn);
        selectedDiv.style.display = 'flex';
        if (config.onChange) config.onChange(item.id);
    }

    function clearSelection() {
        hiddenInput.value = '';
        selectedDiv.style.display = 'none';
        input.style.display = '';
        input.value = '';
        input.focus();
        if (config.onChange) config.onChange('');
    }

    function closeDropdown() {
        dropdown.classList.remove('open');
        dropdown.innerHTML = '';
        activeIndex = -1;
    }

    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) closeDropdown();
    });

    return { clear: clearSelection };
}


// ── Chat Sounds (Web Audio API) ─────────────────

let _audioCtx = null;
function _getAudioCtx() {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    // Resume if suspended (browser autoplay policy)
    if (_audioCtx.state === 'suspended') _audioCtx.resume();
    return _audioCtx;
}

function playSendSound() {
    try {
        const ctx = _getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1174, ctx.currentTime + 0.06);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
    } catch (_) {}
}

function playReceiveSound() {
    try {
        const ctx = _getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587, ctx.currentTime);
        osc.frequency.setValueAtTime(784, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.18);
    } catch (_) {}
}


// ── Chat Session & localStorage Persistence ─────

let currentComboKey = null;
let currentSessionId = null;
let chatMessages = []; // {role: 'user'|'bot', content: string}
let lastSuggestions = [];

const INITIAL_SUGGESTIONS = [
    "Salary range?",
    "Required skills?",
    "About the company",
    "Remote work?",
    "Experience needed?",
];

function getComboKey() {
    const jobId = document.getElementById('chat-job-id').value.trim();
    const userId = document.getElementById('chat-user-id').value.trim();
    if (!jobId) return null;
    return jobId + ':' + (userId || 'anon');
}

function saveChatToStorage() {
    if (!currentComboKey) return;
    const data = { sessionId: currentSessionId, messages: chatMessages, suggestions: lastSuggestions };
    try { localStorage.setItem('chat-msgs:' + currentComboKey, JSON.stringify(data)); } catch (_) {}
}

function loadChatFromStorage(comboKey) {
    try {
        const raw = localStorage.getItem('chat-msgs:' + comboKey);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (_) { return null; }
}

function _chatTimestamp() {
    return new Date().toISOString();
}

function _formatTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
}

function _formatDateLabel(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function _dateSeparator(label) {
    return `<div class="text-center my-3"><span class="bg-white text-gray-500 text-xs px-3 py-1 rounded-full shadow-sm">${label}</span></div>`;
}

function renderChatMessages(messages) {
    const div = document.getElementById('chat-messages');
    if (!messages.length) {
        div.innerHTML = '<p class="text-gray-500 text-sm text-center mt-8">Select a job to start chatting</p>';
        return;
    }
    let html = '';
    let lastDateLabel = '';
    messages.forEach(m => {
        // Date separator
        const dateLabel = _formatDateLabel(m.time);
        if (dateLabel && dateLabel !== lastDateLabel) {
            html += _dateSeparator(dateLabel);
            lastDateLabel = dateLabel;
        }
        const timeStr = _formatTime(m.time);
        if (m.role === 'user') {
            html += `<div class="chat-user">${escapeHtml(m.content)}<div class="chat-time">${timeStr}</div></div>`;
        } else {
            const parts = Array.isArray(m.content) ? m.content : [m.content];
            parts.forEach(part => {
                html += `<div class="chat-bot">${escapeHtml(part)}<div class="chat-time">${timeStr}</div></div>`;
            });
        }
    });
    div.innerHTML = html;
    div.scrollTop = div.scrollHeight;
}

function renderSuggestions(suggestions) {
    lastSuggestions = suggestions || [];
    // Remove any existing suggestions
    const old = document.querySelector('.chat-suggestions');
    if (old) old.remove();
    if (!suggestions.length) return;

    const div = document.createElement('div');
    div.className = 'chat-suggestions';
    suggestions.forEach(text => {
        const chip = document.createElement('button');
        chip.className = 'chat-suggestion-chip';
        chip.textContent = text;
        chip.addEventListener('click', () => sendSuggestion(text));
        div.appendChild(chip);
    });
    const messagesDiv = document.getElementById('chat-messages');
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function sendSuggestion(text) {
    document.getElementById('chat-input').value = text;
    submitChatMessage();
}

function onChatComboChange() {
    const newKey = getComboKey();
    if (newKey === currentComboKey) return;

    // Save current before switching
    saveChatToStorage();

    currentComboKey = newKey;
    currentSessionId = null;
    chatMessages = [];

    if (!newKey) {
        document.getElementById('chat-messages').innerHTML =
            '<p class="text-gray-500 text-sm text-center mt-8">Select a job to start chatting</p>';
        document.getElementById('chat-header-status').textContent = 'Select a job to start';
        document.getElementById('chat-overlay').style.display = 'flex';
        return;
    }
    document.getElementById('chat-overlay').style.display = 'none';
    document.getElementById('chat-header-status').textContent = 'Online';
    _sidebarCache = { jd: { id: null, html: '' }, company: { id: null, html: '' }, candidate: { id: null, html: '' } };
    document.getElementById('info-sidebar').classList.remove('open');
    _sidebarOpenType = null;

    // Load previous chat for this combo
    const stored = loadChatFromStorage(newKey);
    if (stored) {
        currentSessionId = stored.sessionId;
        chatMessages = stored.messages || [];
        lastSuggestions = stored.suggestions || [];
    }
    renderChatMessages(chatMessages);
    renderSuggestions(chatMessages.length ? lastSuggestions : INITIAL_SUGGESTIONS);
}


// ── Init search-select instances ────────────────

const chatJobSearch = createSearchSelect({
    containerEl: document.getElementById('chat-job-search'),
    hiddenInputEl: document.getElementById('chat-job-id'),
    searchUrl: '/search/jobs',
    placeholder: 'Search jobs by title or company...',
    renderItem: (item) =>
        `<div class="font-medium">${item.title}</div>
         <div class="text-xs text-gray-500">${item.company_name}${item.location ? ' \u2022 ' + item.location : ''}</div>`,
    renderSelected: (item) =>
        `<span class="font-medium">${item.title}</span>
         <span class="text-xs text-gray-400 ml-2">${item.company_name}</span>`,
    onChange: () => onChatComboChange(),
});

const chatUserSearch = createSearchSelect({
    containerEl: document.getElementById('chat-user-search'),
    hiddenInputEl: document.getElementById('chat-user-id'),
    searchUrl: '/search/users',
    placeholder: 'Search users by name or email (optional)...',
    renderItem: (item) =>
        `<div class="font-medium">${item.name}</div>
         <div class="text-xs text-gray-500">${item.email}</div>`,
    renderSelected: (item) =>
        `<span class="font-medium">${item.name}</span>
         <span class="text-xs text-gray-400 ml-2">${item.email}</span>`,
    onChange: () => onChatComboChange(),
});

const recUserSearch = createSearchSelect({
    containerEl: document.getElementById('rec-user-search'),
    hiddenInputEl: document.getElementById('rec-user-id'),
    searchUrl: '/search/users',
    placeholder: 'Search users by name or email...',
    renderItem: (item) =>
        `<div class="font-medium">${item.name}</div>
         <div class="text-xs text-gray-500">${item.email}</div>`,
    renderSelected: (item) =>
        `<span class="font-medium">${item.name}</span>
         <span class="text-xs text-gray-400 ml-2">${item.email}</span>`,
});


// ── Tab switching ───────────────────────────────

function switchTab(tabName) {
    document.querySelectorAll('#tabs button').forEach(b => {
        b.classList.remove('tab-active');
        b.classList.add('text-gray-500');
    });
    const btn = document.querySelector(`#tabs button[data-tab="${tabName}"]`);
    if (!btn) return;
    btn.classList.add('tab-active');
    btn.classList.remove('text-gray-500');
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('panel-' + tabName).classList.add('active');
    const url = new URL(window.location);
    url.searchParams.set('tab', tabName);
    history.replaceState(null, '', url);
}

document.querySelectorAll('#tabs button').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// Restore tab from URL on load
(function() {
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (tab && document.querySelector(`#tabs button[data-tab="${tab}"]`)) switchTab(tab);
})();

// (session ID now auto-managed via combo key + backend)


// ── Resume Parser ──────────────────────────────

document.getElementById('parse-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = document.getElementById('resume-file').files[0];
    if (!file) return alert('Please select a file');

    const btn = document.getElementById('parse-btn');
    const status = document.getElementById('parse-status');
    btn.disabled = true;
    status.innerHTML = '<span class="spinner"></span> Parsing resume... (may take 30-90s)';

    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await fetch(window.BASE_PATH + '/parse', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Parse failed');
        renderParseResult(data);
        status.textContent = 'Parsed successfully!';
    } catch (err) {
        status.textContent = 'Error: ' + err.message;
        document.getElementById('parse-result').innerHTML =
            `<p class="text-red-500">${err.message}</p>`;
    } finally {
        btn.disabled = false;
    }
});

function renderParseResult(data) {
    const container = document.getElementById('parse-result');
    let html = '';

    // Personal info
    if (data.personal) {
        html += '<div class="mb-4"><h3 class="font-semibold text-gray-700 mb-2">Personal Info</h3>';
        for (const [key, val] of Object.entries(data.personal)) {
            if (val && val.value) {
                const cls = confidenceClass(val.confidence);
                html += `<div class="flex justify-between py-1 border-b border-gray-100">
                    <span class="text-gray-600">${key}</span>
                    <span>${val.value} <span class="${cls}">(${(val.confidence * 100).toFixed(0)}%)</span></span>
                </div>`;
            }
        }
        html += '</div>';
    }

    // Experience
    if (data.experience && data.experience.length) {
        html += '<div class="mb-4"><h3 class="font-semibold text-gray-700 mb-2">Experience</h3>';
        data.experience.forEach((exp, i) => {
            html += `<div class="bg-gray-50 rounded p-3 mb-2">`;
            for (const [key, val] of Object.entries(exp)) {
                if (val && val.value) {
                    const cls = confidenceClass(val.confidence);
                    html += `<div class="text-sm"><span class="text-gray-500">${key}:</span> ${val.value} <span class="${cls}">(${(val.confidence * 100).toFixed(0)}%)</span></div>`;
                }
            }
            html += '</div>';
        });
        html += '</div>';
    }

    // Education
    if (data.education && data.education.length) {
        html += '<div class="mb-4"><h3 class="font-semibold text-gray-700 mb-2">Education</h3>';
        data.education.forEach(edu => {
            html += '<div class="bg-gray-50 rounded p-3 mb-2">';
            for (const [key, val] of Object.entries(edu)) {
                if (val && val.value) {
                    const cls = confidenceClass(val.confidence);
                    html += `<div class="text-sm"><span class="text-gray-500">${key}:</span> ${val.value} <span class="${cls}">(${(val.confidence * 100).toFixed(0)}%)</span></div>`;
                }
            }
            html += '</div>';
        });
        html += '</div>';
    }

    // Skills
    if (data.skills && data.skills.length) {
        html += '<div class="mb-4"><h3 class="font-semibold text-gray-700 mb-2">Skills</h3><div class="flex flex-wrap gap-2">';
        data.skills.forEach(s => {
            if (s && s.value) {
                const cls = confidenceClass(s.confidence);
                html += `<span class="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">${s.value} <span class="${cls}">${(s.confidence * 100).toFixed(0)}%</span></span>`;
            }
        });
        html += '</div></div>';
    }

    // Certifications
    if (data.certifications && data.certifications.length) {
        html += '<div class="mb-4"><h3 class="font-semibold text-gray-700 mb-2">Certifications</h3>';
        data.certifications.forEach(cert => {
            html += '<div class="bg-gray-50 rounded p-3 mb-2">';
            for (const [key, val] of Object.entries(cert)) {
                if (val && val.value) {
                    const cls = confidenceClass(val.confidence);
                    html += `<div class="text-sm"><span class="text-gray-500">${key}:</span> ${val.value} <span class="${cls}">(${(val.confidence * 100).toFixed(0)}%)</span></div>`;
                }
            }
            html += '</div>';
        });
        html += '</div>';
    }

    // Projects
    if (data.projects && data.projects.length) {
        html += '<div class="mb-4"><h3 class="font-semibold text-gray-700 mb-2">Projects</h3>';
        data.projects.forEach(proj => {
            html += '<div class="bg-gray-50 rounded p-3 mb-2">';
            for (const [key, val] of Object.entries(proj)) {
                if (val && val.value) {
                    const cls = confidenceClass(val.confidence);
                    html += `<div class="text-sm"><span class="text-gray-500">${key}:</span> ${val.value} <span class="${cls}">(${(val.confidence * 100).toFixed(0)}%)</span></div>`;
                }
            }
            html += '</div>';
        });
        html += '</div>';
    }

    // Achievements
    if (data.achievements && data.achievements.length) {
        html += '<div class="mb-4"><h3 class="font-semibold text-gray-700 mb-2">Achievements</h3>';
        data.achievements.forEach(ach => {
            html += '<div class="bg-gray-50 rounded p-3 mb-2">';
            for (const [key, val] of Object.entries(ach)) {
                if (val && val.value) {
                    const cls = confidenceClass(val.confidence);
                    html += `<div class="text-sm"><span class="text-gray-500">${key}:</span> ${val.value} <span class="${cls}">(${(val.confidence * 100).toFixed(0)}%)</span></div>`;
                }
            }
            html += '</div>';
        });
        html += '</div>';
    }

    // Publications
    if (data.publications && data.publications.length) {
        html += '<div class="mb-4"><h3 class="font-semibold text-gray-700 mb-2">Publications</h3>';
        data.publications.forEach(pub => {
            html += '<div class="bg-gray-50 rounded p-3 mb-2">';
            for (const [key, val] of Object.entries(pub)) {
                if (val && val.value) {
                    const cls = confidenceClass(val.confidence);
                    html += `<div class="text-sm"><span class="text-gray-500">${key}:</span> ${val.value} <span class="${cls}">(${(val.confidence * 100).toFixed(0)}%)</span></div>`;
                }
            }
            html += '</div>';
        });
        html += '</div>';
    }

    // Languages
    if (data.languages && data.languages.length) {
        html += '<div class="mb-4"><h3 class="font-semibold text-gray-700 mb-2">Languages</h3><div class="flex flex-wrap gap-2">';
        data.languages.forEach(lang => {
            const name = lang.name && lang.name.value ? lang.name.value : '';
            const prof = lang.proficiency && lang.proficiency.value ? ` (${lang.proficiency.value})` : '';
            const conf = lang.name ? lang.name.confidence : 0;
            const cls = confidenceClass(conf);
            if (name) html += `<span class="bg-green-50 text-green-700 px-2 py-1 rounded text-xs">${name}${prof} <span class="${cls}">${(conf * 100).toFixed(0)}%</span></span>`;
        });
        html += '</div></div>';
    }

    // Hobbies
    if (data.hobbies && data.hobbies.length) {
        html += '<div class="mb-4"><h3 class="font-semibold text-gray-700 mb-2">Hobbies</h3><div class="flex flex-wrap gap-2">';
        data.hobbies.forEach(h => {
            if (h && h.value) {
                const cls = confidenceClass(h.confidence);
                html += `<span class="bg-orange-50 text-orange-700 px-2 py-1 rounded text-xs">${h.value} <span class="${cls}">${(h.confidence * 100).toFixed(0)}%</span></span>`;
            }
        });
        html += '</div></div>';
    }

    // Raw JSON toggle
    html += `<details class="mt-4"><summary class="text-sm text-blue-600 cursor-pointer">View Raw JSON</summary>
        <pre class="bg-gray-900 text-green-400 p-4 rounded mt-2 text-xs overflow-auto max-h-96">${JSON.stringify(data, null, 2)}</pre></details>`;

    container.innerHTML = html;
}

function confidenceClass(score) {
    if (score >= 0.8) return 'confidence-high';
    if (score >= 0.5) return 'confidence-med';
    return 'confidence-low';
}


// ── Chatbot ────────────────────────────────────

document.getElementById('chat-form').addEventListener('submit', (e) => {
    e.preventDefault();
    submitChatMessage();
});

async function submitChatMessage() {
    const jobId = document.getElementById('chat-job-id').value.trim();
    const userId = document.getElementById('chat-user-id').value.trim();
    const message = document.getElementById('chat-input').value.trim();

    if (!jobId) return alert('Select a job first');
    if (!message) return;

    // Ensure combo is tracked
    if (!currentComboKey) onChatComboChange();

    const messagesDiv = document.getElementById('chat-messages');
    const placeholder = messagesDiv.querySelector('.text-gray-500');
    if (placeholder) placeholder.remove();

    // Remove previous suggestions
    const oldSugg = messagesDiv.querySelector('.chat-suggestions');
    if (oldSugg) oldSugg.remove();

    // Add user message to DOM + memory
    const ts = _chatTimestamp();
    const userBubble = document.createElement('div');
    userBubble.className = 'chat-user';
    userBubble.innerHTML = escapeHtml(message) + `<div class="chat-time">${_formatTime(ts)}</div>`;
    messagesDiv.appendChild(userBubble);
    chatMessages.push({ role: 'user', content: message, time: ts });
    playSendSound();
    document.getElementById('chat-input').value = '';

    const btn = document.getElementById('chat-btn');
    btn.disabled = true;

    // Typing indicator
    const loadingId = 'loading-' + Date.now();
    const typingEl = document.createElement('div');
    typingEl.id = loadingId;
    typingEl.className = 'chat-bot typing-indicator';
    typingEl.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    messagesDiv.appendChild(typingEl);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    try {
        const body = { job_id: jobId, message, ...(userId && { user_id: userId }) };
        if (currentSessionId) body.session_id = currentSessionId;

        const res = await fetch(window.BASE_PATH + '/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        document.getElementById(loadingId).remove();
        if (!res.ok) throw new Error(data.detail || 'Chat failed');

        // Store backend session_id
        currentSessionId = data.session_id;

        // Staggered multi-bubble render (WhatsApp-style)
        const botMessages = data.messages && data.messages.length ? data.messages : [data.response];
        const botTs = _chatTimestamp();
        chatMessages.push({ role: 'bot', content: botMessages, time: botTs });

        for (let i = 0; i < botMessages.length; i++) {
            if (i > 0) {
                // Show typing indicator between bubbles
                const typingBetween = document.createElement('div');
                typingBetween.className = 'chat-bot typing-indicator';
                typingBetween.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
                messagesDiv.appendChild(typingBetween);
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
                await new Promise(r => setTimeout(r, 1500));
                typingBetween.remove();
            }
            const bubble = document.createElement('div');
            bubble.className = 'chat-bot bubble-enter';
            bubble.innerHTML = escapeHtml(botMessages[i]) + `<div class="chat-time">${_formatTime(botTs)}</div>`;
            messagesDiv.appendChild(bubble);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
            playReceiveSound();
        }

        // Show follow-up suggestions
        renderSuggestions(data.suggestions || []);
        saveChatToStorage();
    } catch (err) {
        document.getElementById(loadingId).remove();
        messagesDiv.innerHTML += `<div class="text-red-500 text-sm p-2">Error: ${err.message}</div>`;
    } finally {
        btn.disabled = false;
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
}

function clearChat() {
    document.getElementById('chat-messages').innerHTML =
        '<p class="text-gray-500 text-sm text-center mt-8">Select a job to start chatting</p>';
    document.getElementById('chat-header-status').textContent = 'Select a job to start';
    document.getElementById('chat-overlay').style.display = 'flex';
    document.getElementById('info-sidebar').classList.remove('open');
    _sidebarOpenType = null;
    chatMessages = [];
    currentComboKey = null;
    currentSessionId = null;
    chatJobSearch.clear();
    chatUserSearch.clear();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


// ── Info Sidebar (JD / Company / Candidate) ────

let _sidebarCache = { jd: { id: null, html: '' }, company: { id: null, html: '' }, candidate: { id: null, html: '' } };
let _sidebarOpenType = null;

function esc(s) { return escapeHtml(String(s || '')); }

function openSidebar(type, title) {
    const sidebar = document.getElementById('info-sidebar');
    // Toggle off if same type clicked again
    if (sidebar.classList.contains('open') && _sidebarOpenType === type) {
        sidebar.classList.remove('open');
        _sidebarOpenType = null;
        return 'closed';
    }
    const prev = _sidebarOpenType;
    document.getElementById('info-sidebar-title').textContent = title;
    sidebar.classList.add('open');
    _sidebarOpenType = type;
    // 'switched' if changing panels, 'opened' if fresh open
    return prev && prev !== type ? 'switched' : 'opened';
}

document.getElementById('info-sidebar-close').addEventListener('click', () => {
    document.getElementById('info-sidebar').classList.remove('open');
    _sidebarOpenType = null;
});

// ── JD sidebar toggle
document.getElementById('sidebar-jd-toggle').addEventListener('click', () => {
    const jobId = document.getElementById('chat-job-id').value.trim();
    if (!jobId) { alert('Select a job first'); return; }
    const action = openSidebar('jd', 'Job Details');
    if (action === 'closed') return;
    if (_sidebarCache.jd.id === jobId && _sidebarCache.jd.html) {
        document.getElementById('info-sidebar-body').innerHTML = _sidebarCache.jd.html;
    } else { loadSidebarJD(jobId); }
});

async function loadSidebarJD(jobId) {
    const body = document.getElementById('info-sidebar-body');
    body.innerHTML = '<p class="text-gray-400">Loading...</p>';
    try {
        const res = await fetch(window.BASE_PATH + '/job/' + jobId);
        if (!res.ok) throw new Error('Failed');
        const j = await res.json();
        let h = '';
        h += `<h4>Role</h4>`;
        h += `<p><strong>${esc(j.title)}</strong></p>`;
        h += `<p>${esc(j.company_name)}${j.location ? ' &bull; ' + esc(j.location) : ''}</p>`;
        if (j.job_type) h += `<p>Type: ${esc(j.job_type)}</p>`;
        if (j.work_mode && j.work_mode.length) h += `<p>Work mode: ${j.work_mode.map(esc).join(', ')}</p>`;
        if (j.experience_level) h += `<p>Level: ${esc(j.experience_level)} (${j.experience_min || '?'}-${j.experience_max || '?'} yrs)</p>`;
        if (j.salary_min && j.salary_max) { h += `<h4>Salary</h4><p>${j.salary_min.toLocaleString()} - ${j.salary_max.toLocaleString()}</p>`; }
        if (j.skills && j.skills.length) { h += `<h4>Skills</h4><div>${j.skills.map(s => '<span class="jd-tag">' + esc(s) + '</span>').join('')}</div>`; }
        if (j.description) { h += `<h4>Description</h4><p style="white-space:pre-line">${esc(j.description)}</p>`; }
        _sidebarCache.jd = { id: jobId, html: h };
        body.innerHTML = h;
    } catch (e) { body.innerHTML = '<p class="text-red-500">Failed to load</p>'; }
}

// ── Company sidebar toggle
document.getElementById('sidebar-company-toggle').addEventListener('click', () => {
    const jobId = document.getElementById('chat-job-id').value.trim();
    if (!jobId) { alert('Select a job first'); return; }
    const action = openSidebar('company', 'Company Info');
    if (action === 'closed') return;
    if (_sidebarCache.company.id === jobId && _sidebarCache.company.html) {
        document.getElementById('info-sidebar-body').innerHTML = _sidebarCache.company.html;
    } else { loadSidebarCompany(jobId); }
});

async function loadSidebarCompany(jobId) {
    const body = document.getElementById('info-sidebar-body');
    body.innerHTML = '<p class="text-gray-400">Loading...</p>';
    try {
        const res = await fetch(window.BASE_PATH + '/job/' + jobId);
        if (!res.ok) throw new Error('Failed');
        const j = await res.json();
        let h = '';
        h += `<h4>${esc(j.company_name || 'Company')}</h4>`;
        if (j.company_description) h += `<p>${esc(j.company_description)}</p>`;
        if (j.industry) h += `<h4>Industry</h4><p>${esc(j.industry)}</p>`;
        if (j.company_size) h += `<h4>Size</h4><p>${esc(j.company_size)}</p>`;
        if (j.headquarters) h += `<h4>Headquarters</h4><p>${esc(j.headquarters)}</p>`;
        if (j.culture) h += `<h4>Culture</h4><p>${esc(j.culture)}</p>`;
        if (j.company_benefits) h += `<h4>Benefits</h4><p>${esc(j.company_benefits)}</p>`;
        if (!j.company_description && !j.culture && !j.company_benefits) h += '<p class="text-gray-400">No company info available</p>';
        _sidebarCache.company = { id: jobId, html: h };
        body.innerHTML = h;
    } catch (e) { body.innerHTML = '<p class="text-red-500">Failed to load</p>'; }
}

// ── Candidate sidebar toggle
document.getElementById('sidebar-candidate-toggle').addEventListener('click', () => {
    const userId = document.getElementById('chat-user-id').value.trim();
    if (!userId) { alert('Select a user first'); return; }
    const action = openSidebar('candidate', 'Candidate Profile');
    if (action === 'closed') return;
    if (_sidebarCache.candidate.id === userId && _sidebarCache.candidate.html) {
        document.getElementById('info-sidebar-body').innerHTML = _sidebarCache.candidate.html;
    } else { loadSidebarCandidate(userId); }
});

async function loadSidebarCandidate(userId) {
    const body = document.getElementById('info-sidebar-body');
    body.innerHTML = '<p class="text-gray-400">Loading...</p>';
    try {
        const res = await fetch(window.BASE_PATH + '/user/' + userId);
        if (!res.ok) throw new Error('Failed');
        const u = await res.json();
        const fmtDate = d => d ? new Date(d).toLocaleDateString('en-US', {month: 'short', year: 'numeric'}) : '';
        let h = '';

        // Profile header
        h += `<h4>Profile</h4>`;
        h += `<p><strong>${esc(u.first_name || '')} ${esc(u.last_name || '')}</strong></p>`;
        if (u.headline) h += `<p style="color:#64748b;font-style:italic">${esc(u.headline)}</p>`;
        if (u.email) h += `<p>📧 ${esc(u.email)}</p>`;
        if (u.phone) h += `<p>📱 ${esc(u.phone)}</p>`;
        const loc = [u.city, u.state, u.country].filter(Boolean).join(', ');
        if (loc) h += `<p>📍 ${esc(loc)}</p>`;
        if (u.gender) h += `<p>Gender: ${esc(u.gender)}</p>`;
        if (u.total_experience_years != null) h += `<p>💼 ${u.total_experience_years} years experience</p>`;
        if (u.completion_percentage != null) h += `<p style="font-size:0.75rem;color:#64748b">Profile ${u.completion_percentage}% complete</p>`;

        // Professional summary
        if (u.professional_summary) h += `<h4>Summary</h4><p>${esc(u.professional_summary)}</p>`;

        // Skills
        if (u.skills && u.skills.length) {
            h += `<h4>Skills (${u.skills.length})</h4><div>`;
            u.skills.forEach(s => {
                h += `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #f1f5f9">`;
                h += `<span class="jd-tag">${esc(s.name)}</span>`;
                h += `<span style="font-size:0.7rem;color:#64748b">${esc(s.proficiency || '')}${s.years ? ' &bull; ' + s.years + 'y' : ''}</span>`;
                h += `</div>`;
            });
            h += `</div>`;
        }

        // Work experience
        if (u.experience && u.experience.length) {
            h += `<h4>Work Experience (${u.experience.length})</h4>`;
            u.experience.forEach(e => {
                h += `<div style="margin-bottom:10px;padding:8px;background:#f8fafc;border-radius:6px">`;
                h += `<p><strong>${esc(e.title || 'Untitled')}</strong></p>`;
                const meta = [e.company, e.location].filter(Boolean).map(esc).join(' · ');
                if (meta) h += `<p style="color:#3b82f6;font-size:0.8rem">${meta}</p>`;
                if (e.employment_type || e.designation) h += `<p style="font-size:0.75rem;color:#94a3b8">${[e.designation, e.employment_type].filter(Boolean).map(esc).join(' · ')}</p>`;
                const period = [fmtDate(e.start_date), e.is_current ? 'Present' : fmtDate(e.end_date)].filter(Boolean).join(' – ');
                if (period) h += `<p style="font-size:0.75rem;color:#64748b">${period}</p>`;
                if (e.description) h += `<p style="font-size:0.8rem;margin-top:4px">${esc(e.description)}</p>`;
                if (e.achievements) h += `<p style="font-size:0.8rem;color:#059669;margin-top:2px">🏆 ${esc(e.achievements)}</p>`;
                if (e.skills_used && e.skills_used.length) {
                    const skills = Array.isArray(e.skills_used) ? e.skills_used : [e.skills_used];
                    h += `<div style="margin-top:4px">${skills.map(s => `<span class="jd-tag" style="font-size:0.65rem">${esc(s)}</span>`).join('')}</div>`;
                }
                h += `</div>`;
            });
        }

        // Education
        if (u.education && u.education.length) {
            h += `<h4>Education</h4>`;
            u.education.forEach(e => {
                h += `<div style="margin-bottom:10px;padding:8px;background:#f8fafc;border-radius:6px">`;
                h += `<p><strong>${esc(e.degree || '')}${e.field_of_study ? ' in ' + esc(e.field_of_study) : ''}</strong></p>`;
                h += `<p style="color:#3b82f6;font-size:0.8rem">${esc(e.institution || '')}</p>`;
                const period = [fmtDate(e.start_date), e.currently_studying ? 'Present' : fmtDate(e.end_date)].filter(Boolean).join(' – ');
                if (period) h += `<p style="font-size:0.75rem;color:#64748b">${period}</p>`;
                if (e.grade) h += `<p style="font-size:0.8rem">Grade: ${esc(e.grade)}</p>`;
                h += `</div>`;
            });
        }

        // Certifications
        if (u.certifications && u.certifications.length) {
            h += `<h4>Certifications</h4>`;
            u.certifications.forEach(c => {
                h += `<div style="margin-bottom:8px;padding:8px;background:#f8fafc;border-radius:6px">`;
                h += `<p><strong>${esc(c.name || '')}</strong></p>`;
                if (c.issuing_organization) h += `<p style="font-size:0.8rem;color:#3b82f6">${esc(c.issuing_organization)}</p>`;
                const dates = [c.issue_date ? 'Issued ' + fmtDate(c.issue_date) : '', c.expiry_date ? 'Expires ' + fmtDate(c.expiry_date) : ''].filter(Boolean).join(' · ');
                if (dates) h += `<p style="font-size:0.75rem;color:#64748b">${dates}</p>`;
                if (c.credential_url) h += `<p style="font-size:0.75rem"><a href="${esc(c.credential_url)}" target="_blank" style="color:#3b82f6">View credential</a></p>`;
                h += `</div>`;
            });
        }

        // Projects
        if (u.projects && u.projects.length) {
            h += `<h4>Projects</h4>`;
            u.projects.forEach(p => {
                h += `<div style="margin-bottom:8px;padding:8px;background:#f8fafc;border-radius:6px">`;
                h += `<p><strong>${esc(p.title || '')}</strong></p>`;
                const period = [fmtDate(p.start_date), fmtDate(p.end_date)].filter(Boolean).join(' – ');
                if (period) h += `<p style="font-size:0.75rem;color:#64748b">${period}</p>`;
                if (p.description) h += `<p style="font-size:0.8rem;margin-top:4px">${esc(p.description)}</p>`;
                if (p.url) h += `<p style="font-size:0.75rem"><a href="${esc(p.url)}" target="_blank" style="color:#3b82f6">View project</a></p>`;
                h += `</div>`;
            });
        }

        // Languages
        if (u.languages && u.languages.length) {
            h += `<h4>Languages</h4><div>`;
            u.languages.forEach(l => {
                h += `<span class="jd-tag" style="margin:2px">${esc(l.name)}${l.proficiency ? ' (' + esc(l.proficiency) + ')' : ''}</span>`;
            });
            h += `</div>`;
        }

        // Resume link
        if (u.resume_url) h += `<h4>Resume</h4><p><a href="${esc(u.resume_url)}" target="_blank" style="color:#3b82f6;font-size:0.85rem">View uploaded resume</a></p>`;

        _sidebarCache.candidate = { id: userId, html: h };
        body.innerHTML = h;
    } catch (e) { body.innerHTML = '<p class="text-red-500">Failed to load profile</p>'; }
}


// ── Recommendations ────────────────────────────

async function getRecommendations() {
    const userId = document.getElementById('rec-user-id').value.trim();
    const skillsRaw = document.getElementById('rec-skills').value.trim();
    const experience = document.getElementById('rec-experience').value;
    const location = document.getElementById('rec-location').value.trim();

    if (!userId && !skillsRaw) return alert('Enter a User ID or skills');

    const btn = document.getElementById('rec-btn');
    const status = document.getElementById('rec-status');
    btn.disabled = true;
    status.innerHTML = '<span class="spinner"></span> Getting recommendations... (may take 15-30s)';

    const body = {};
    if (userId) body.user_id = userId;
    if (skillsRaw) body.skills = skillsRaw.split(',').map(s => s.trim()).filter(Boolean);
    if (experience) body.experience_years = parseFloat(experience);
    if (location) body.location = location;

    try {
        const res = await fetch(window.BASE_PATH + '/recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Recommendation failed');
        renderRecommendations(data);
        status.textContent = `Found ${data.count} recommendations`;
    } catch (err) {
        status.textContent = 'Error: ' + err.message;
        document.getElementById('rec-results').innerHTML =
            `<p class="text-red-500">${err.message}</p>`;
    } finally {
        btn.disabled = false;
    }
}

// ── Changelog ─────────────────────────────────

let changelogLoaded = false;

document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-tab="changelog"]');
    if (!btn || changelogLoaded) return;

    const container = document.getElementById('changelog-content');
    container.innerHTML = '<span class="spinner"></span> Loading changelog...';

    try {
        const res = await fetch(window.BASE_PATH + '/changelog');
        const text = await res.text();
        container.innerHTML = marked.parse(text);
        changelogLoaded = true;
    } catch (err) {
        container.innerHTML = '<p class="text-red-500">Failed to load changelog.</p>';
    }
});


function renderRecommendations(data) {
    const container = document.getElementById('rec-results');
    if (!data.recommendations || !data.recommendations.length) {
        container.innerHTML = '<p class="text-gray-400">No recommendations found.</p>';
        return;
    }

    let html = '';
    data.recommendations.forEach((rec, i) => {
        const scoreColor = rec.score >= 70 ? 'text-green-600' : rec.score >= 40 ? 'text-yellow-600' : 'text-red-600';
        const skills = (rec.skills || []).slice(0, 6).join(', ');
        html += `
        <div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div class="flex justify-between items-start">
                <div>
                    <span class="text-xs text-gray-400">#${i + 1}</span>
                    <h3 class="font-semibold text-gray-800">${escapeHtml(rec.title || 'N/A')}</h3>
                    <p class="text-sm text-gray-600">${escapeHtml(rec.company || 'N/A')} &bull; ${escapeHtml(rec.location || 'N/A')}</p>
                </div>
                <span class="text-2xl font-bold ${scoreColor}">${rec.score}</span>
            </div>
            <p class="text-sm text-gray-500 mt-2">${escapeHtml(rec.reason || '')}</p>
            ${skills ? `<div class="mt-2 flex flex-wrap gap-1">${(rec.skills || []).slice(0, 6).map(s => `<span class="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs">${escapeHtml(s)}</span>`).join('')}</div>` : ''}
        </div>`;
    });
    container.innerHTML = html;
}
