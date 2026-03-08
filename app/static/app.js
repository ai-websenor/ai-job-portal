// ── Tab switching ───────────────────────────────

document.querySelectorAll('#tabs button').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#tabs button').forEach(b => {
            b.classList.remove('tab-active');
            b.classList.add('text-gray-500');
        });
        btn.classList.add('tab-active');
        btn.classList.remove('text-gray-500');

        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
    });
});

// Generate session ID on load
document.getElementById('chat-session-id').value = 'session-' + Math.random().toString(36).slice(2, 10);


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

document.getElementById('chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const jobId = document.getElementById('chat-job-id').value.trim();
    const sessionId = document.getElementById('chat-session-id').value.trim();
    const message = document.getElementById('chat-input').value.trim();

    if (!jobId) return alert('Enter a Job ID');
    if (!message) return;

    const messagesDiv = document.getElementById('chat-messages');
    // Clear placeholder
    if (messagesDiv.querySelector('.text-gray-400')) messagesDiv.innerHTML = '';

    // Add user message
    messagesDiv.innerHTML += `<div class="chat-user rounded p-3 text-sm"><strong>You:</strong> ${escapeHtml(message)}</div>`;
    document.getElementById('chat-input').value = '';

    const btn = document.getElementById('chat-btn');
    btn.disabled = true;

    // Loading indicator
    const loadingId = 'loading-' + Date.now();
    messagesDiv.innerHTML += `<div id="${loadingId}" class="text-sm text-gray-400"><span class="spinner"></span> Thinking...</div>`;
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    try {
        const res = await fetch(window.BASE_PATH + '/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ job_id: jobId, message, session_id: sessionId }),
        });
        const data = await res.json();
        document.getElementById(loadingId).remove();
        if (!res.ok) throw new Error(data.detail || 'Chat failed');
        messagesDiv.innerHTML += `<div class="chat-bot rounded p-3 text-sm"><strong>AI:</strong> ${escapeHtml(data.response)}</div>`;
    } catch (err) {
        document.getElementById(loadingId).remove();
        messagesDiv.innerHTML += `<div class="text-red-500 text-sm p-2">Error: ${err.message}</div>`;
    } finally {
        btn.disabled = false;
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
});

function clearChat() {
    document.getElementById('chat-messages').innerHTML =
        '<p class="text-gray-400 text-sm">Enter a Job ID and ask questions about the job listing...</p>';
    document.getElementById('chat-session-id').value = 'session-' + Math.random().toString(36).slice(2, 10);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
