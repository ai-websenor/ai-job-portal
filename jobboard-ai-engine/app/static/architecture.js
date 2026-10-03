// Architecture - Model Details & EC2 Cost
// Lazy-loaded when user clicks the "Architecture" tab.

function escArch(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Sidebar ───────────────────────────────────────

const ARCH_SECTIONS = [
    { id: 'model', label: 'Model Details' },
    { id: 'serving', label: 'Serving Config' },
    { id: 'pipeline', label: 'How It Works' },
    { id: 'current-cost', label: 'Current Cost' },
];

function renderArchSidebar() {
    const sidebar = document.getElementById('arch-sidebar');
    let html = '<div class="docs-group">Architecture</div>';
    ARCH_SECTIONS.forEach(s => {
        html += `<a href="#arch-${s.id}" data-arch-link="${s.id}">${escArch(s.label)}</a>`;
    });
    sidebar.innerHTML = html;

    sidebar.addEventListener('click', (e) => {
        const link = e.target.closest('a[data-arch-link]');
        if (!link) return;
        e.preventDefault();
        const target = document.getElementById(link.getAttribute('href').slice(1));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}

// ── Helpers ───────────────────────────────────────

function archTable(rows) {
    let html = '<table class="arch-table">';
    rows.forEach(([k, v]) => {
        html += `<tr><td>${escArch(k)}</td><td>${escArch(v)}</td></tr>`;
    });
    html += '</table>';
    return html;
}

function archCard(title, bgColor, iconText, content) {
    return `<div class="arch-card">
        <div class="arch-card-title">
            <div class="arch-card-icon" style="background:${bgColor};color:white;">${iconText}</div>
            ${escArch(title)}
        </div>
        ${content}
    </div>`;
}

// ── Sections ──────────────────────────────────────

function renderModel() {
    return `<div id="arch-model" class="arch-section">
        <div class="arch-section-title">Model Details</div>

        ${archCard('Qwen2.5 3B Instruct', '#8b5cf6', 'Q', `
            ${archTable([
                ['Model ID', 'Qwen/Qwen2.5-3B-Instruct'],
                ['Provider', 'Qwen via HuggingFace'],
                ['Parameters', '~3 Billion'],
                ['Serving Runtime', 'vLLM OpenAI-compatible API'],
                ['Configured Context Length', '8,192 tokens'],
                ['Instruction Tuned', 'Yes'],
                ['License', 'Apache-2.0'],
            ])}
        `)}

        ${archCard('What This Model Does', '#3b82f6', 'U', `
            <table class="arch-table">
                <tr><td style="font-weight:700;color:#64748b;">Feature</td><td style="font-weight:700;color:#64748b;">How Model Is Used</td><td style="font-weight:700;color:#64748b;">Max Tokens</td></tr>
                <tr><td>Resume Parsing</td><td style="font-family:normal;color:#374151;">Extracts flat structured JSON from raw resume text.</td><td style="font-family:monospace;">4,096</td></tr>
                <tr><td>Chatbot</td><td style="font-family:normal;color:#374151;">Answers candidate questions about job listings using job/company context. Multi-turn via session history.</td><td style="font-family:monospace;">2,048</td></tr>
                <tr><td>Recommendations</td><td style="font-family:normal;color:#374151;">Scores and ranks jobs for a candidate. Weights: 60% skill, 20% experience, 10% location, 10% role.</td><td style="font-family:monospace;">2,048</td></tr>
            </table>
            <p style="font-size:0.78rem; color:#94a3b8; margin-top:10px;">All features use temperature 0.1 (near-deterministic) for consistent, reproducible output.</p>
        `)}

        ${archCard('Why Qwen2.5 3B?', '#059669', 'W', `
            <ul style="font-size:0.82rem; color:#374151; line-height:1.8; padding-left:20px; margin:0;">
                <li><strong>Cost control</strong> — Runs on one g4dn.xlarge instead of SageMaker real-time endpoint pricing</li>
                <li><strong>Memory fit</strong> — Text-only 3B model is safer on a T4 16GB GPU than multimodal 4B or 7B full precision</li>
                <li><strong>JSON extraction</strong> — Instruction model can return structured resume/job outputs</li>
                <li><strong>Private serving</strong> — ECS reaches the model only through VPC security groups</li>
                <li><strong>OpenAI-compatible API</strong> — App transport stays simple HTTP</li>
            </ul>
        `)}
    </div>`;
}

function renderServing() {
    return `<div id="arch-serving" class="arch-section">
        <div class="arch-section-title">Serving Configuration</div>

        ${archCard('Private EC2 vLLM Endpoint', '#ea580c', 'EC2', archTable([
            ['Endpoint URL', 'http://qwen-model.ai-job-portal.internal:8000/v1'],
            ['Status', 'Private VPC only'],
            ['Instance Type', 'g4dn.xlarge'],
            ['Instance Count', '1'],
            ['Traffic', 'Dev + staging ECS ai-service'],
        ]))}

        ${archCard('Current Instance — g4dn.xlarge', '#dc2626', 'G', archTable([
            ['GPU', '1x NVIDIA T4'],
            ['GPU Memory (VRAM)', '16 GB'],
            ['vCPUs', '4'],
            ['RAM', '16 GB'],
            ['Storage', '100 GB gp3 EBS + 125 GB NVMe'],
            ['Cost', '$0.579/hr (~$423/mo)'],
        ]))}

        ${archCard('vLLM Serving Config', '#0891b2', 'V', `
            ${archTable([
                ['Serving Image', 'vllm/vllm-openai:latest'],
                ['Inference Engine', 'vLLM (continuous batching)'],
                ['Model', 'Qwen/Qwen2.5-3B-Instruct'],
                ['Max Model Length', '8,192 tokens'],
                ['API Format', 'OpenAI chat completions'],
                ['Network', 'Private security group only'],
            ])}
            <p style="font-size:0.78rem; color:#94a3b8; margin-top:10px;">
                vLLM enables continuous batching — multiple requests are processed in parallel,
                improving throughput without needing additional instances.
            </p>
        `)}

        ${archCard('Timeouts & Health', '#6366f1', 'T', archTable([
            ['Read Timeout', '600 seconds'],
            ['Connect Timeout', '10 seconds'],
            ['Max Retries', '3 on 429/5xx'],
            ['Health Check', 'GET /v1/models'],
            ['Container Restart', 'systemd / Docker restart unless-stopped'],
            ['Response Streaming', 'No (OpenAI-compatible non-stream response)'],
        ]))}
    </div>`;
}

function renderPipeline() {
    return `<div id="arch-pipeline" class="arch-section">
        <div class="arch-section-title">How Python + EC2 vLLM Work Together</div>

        <div class="arch-flow">Python FastAPI (ECS Fargate)                    Private EC2 vLLM (g4dn.xlarge)
─────────────────────────────                    ─────────────────────────────────
                                                 ┌───────────────────────────────┐
1. Receive request (file/JSON)                   │  Qwen2.5 3B via vLLM          │
         │                                       │                               │
2. Extract text / fetch data from DB             │  • vLLM OpenAI server          │
         │                                       │  • Continuous batching         │
3. Build prompt (app/parser/prompt.py)           │  • Private SG ingress only     │
         │                                       │  • T4 GPU (16GB VRAM)          │
4. POST /v1/chat/completions ───────────────────►│                               │
         │                                       │  Process prompt -> Generate    │
5. JSON response ◄───────────────────────────────│  JSON/text output              │
         │                                       └───────────────────────────────┘
6. Parse JSON → Pydantic model
         │
7. Return structured response</div>

        ${archCard('The Flow in Detail', '#3b82f6', 'F', `
            <div style="font-size:0.82rem; color:#374151; line-height:1.8;">
                <p><strong>Step 1-3: Python side (app/parser/llm.py)</strong></p>
                <ul style="padding-left:20px; margin:4px 0 12px;">
                    <li>FastAPI receives request → extracts text from PDF</li>
                    <li>Builds a structured prompt with extraction rules and output JSON schema</li>
                    <li>Creates OpenAI-compatible payload: <code>{"model": "...", "messages": [...], "max_tokens": ...}</code></li>
                </ul>
                <p><strong>Step 4-5: EC2 model side</strong></p>
                <ul style="padding-left:20px; margin:4px 0 12px;">
                    <li>HTTP client calls private <code>/v1/chat/completions</code></li>
                    <li>vLLM processes the prompt through Qwen2.5 3B</li>
                    <li>Response returns as OpenAI-compatible JSON</li>
                </ul>
                <p><strong>Step 6-7: Python side (response handling)</strong></p>
                <ul style="padding-left:20px; margin:4px 0;">
                    <li><code>choices[0].message.content</code> is extracted from the model response</li>
                    <li>JSON parsed → validated against Pydantic models (ResumeOutput, ChatResponse, etc.)</li>
                    <li>JSON repair attempted if response is truncated (common with large resumes)</li>
                </ul>
            </div>
        `)}
    </div>`;
}

function renderCurrentCost() {
    return `<div id="arch-current-cost" class="arch-section">
        <div class="arch-section-title">Current Cost — EC2 g4dn.xlarge</div>

        ${archCard('Monthly Breakdown (24/7 On-Demand, ap-south-1)', '#dc2626', '$', `
            <div class="arch-cost-row arch-cost-header">
                <div>Item</div><div>Spec</div><div>$/hr</div><div>Monthly</div>
            </div>
            <div class="arch-cost-row">
                <div><strong>EC2 Model Server</strong></div><div>g4dn.xlarge × 1</div><div>$0.579</div><div><strong>~$423</strong></div>
            </div>
            <div class="arch-cost-row" style="color:#94a3b8; font-size:0.75rem;">
                <div colspan="4" style="grid-column:1/-1;">Instance runs while EC2 is on. EBS, logs, and data transfer are extra.</div>
            </div>
        `)}

        ${archCard('Estimated Per-Request Cost (based on invocation time)', '#8b5cf6', 'R', `
            <table class="arch-table">
                <tr><td style="font-weight:700;color:#64748b;">Feature</td><td style="font-weight:700;color:#64748b;">Avg Latency</td><td style="font-weight:700;color:#64748b;">Effective Cost/Request</td></tr>
                <tr><td>Resume Parsing</td><td style="font-family:monospace;">TBD smoke test</td><td style="font-family:monospace;">Fixed hourly</td></tr>
                <tr><td>Chatbot</td><td style="font-family:monospace;">TBD smoke test</td><td style="font-family:monospace;">Fixed hourly</td></tr>
                <tr><td>Recommendations</td><td style="font-family:monospace;">TBD smoke test</td><td style="font-family:monospace;">Fixed hourly</td></tr>
            </table>
            <p style="font-size:0.75rem; color:#94a3b8; margin-top:8px;">
                Effective cost depends on utilization. With vLLM batching, throughput improves under concurrent load.
            </p>
        `)}
    </div>`;
}

// ── Scroll Spy ────────────────────────────────────

function setupArchScrollSpy() {
    const sidebar = document.getElementById('arch-sidebar');
    const sections = document.querySelectorAll('.arch-section');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id.replace('arch-', '');
                sidebar.querySelectorAll('a').forEach(a => a.classList.remove('active'));
                const link = sidebar.querySelector(`a[data-arch-link="${id}"]`);
                if (link) link.classList.add('active');
            }
        });
    }, {
        root: document.getElementById('arch-main'),
        rootMargin: '-10% 0px -80% 0px',
        threshold: 0
    });
    sections.forEach(section => observer.observe(section));
}

// ── Init ──────────────────────────────────────────

(function init() {
    renderArchSidebar();
    document.getElementById('arch-main').innerHTML = [
        renderModel(),
        renderServing(),
        renderPipeline(),
        renderCurrentCost(),
    ].join('');
    setupArchScrollSpy();
    const firstLink = document.querySelector('#arch-sidebar a');
    if (firstLink) firstLink.classList.add('active');
})();
