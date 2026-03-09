// ── Architecture — Model Details & SageMaker Cost ──
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
    // { id: 'instance-compare', label: 'Instance Comparison' },
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

        ${archCard('Mistral 14B — Ministral-3-14B-Instruct-2512', '#8b5cf6', 'M', `
            ${archTable([
                ['Model ID', 'mistralai/Ministral-3-14B-Instruct-2512'],
                ['Provider', 'Mistral AI (via HuggingFace)'],
                ['Parameters', '~14 Billion'],
                ['Architecture', 'Decoder-only Transformer'],
                ['Max Context Length', '32,768 tokens'],
                ['Instruction Tuned', 'Yes (Instruct variant)'],
                ['License', 'Mistral Research License'],
            ])}
        `)}

        ${archCard('What This Model Does', '#3b82f6', 'U', `
            <table class="arch-table">
                <tr><td style="font-weight:700;color:#64748b;">Feature</td><td style="font-weight:700;color:#64748b;">How Model Is Used</td><td style="font-weight:700;color:#64748b;">Max Tokens</td></tr>
                <tr><td>Resume Parsing</td><td style="font-family:normal;color:#374151;">Extracts structured JSON from raw resume text. Each field gets a confidence score (0.0-1.0).</td><td style="font-family:monospace;">6,000</td></tr>
                <tr><td>Chatbot</td><td style="font-family:normal;color:#374151;">Answers candidate questions about job listings using job/company context. Multi-turn via session history.</td><td style="font-family:monospace;">2,048</td></tr>
                <tr><td>Recommendations</td><td style="font-family:normal;color:#374151;">Scores and ranks jobs for a candidate. Weights: 60% skill, 20% experience, 10% location, 10% role.</td><td style="font-family:monospace;">2,048</td></tr>
            </table>
            <p style="font-size:0.78rem; color:#94a3b8; margin-top:10px;">All features use temperature 0.1 (near-deterministic) for consistent, reproducible output.</p>
        `)}

        ${archCard('Why Mistral 14B?', '#059669', 'W', `
            <ul style="font-size:0.82rem; color:#374151; line-height:1.8; padding-left:20px; margin:0;">
                <li><strong>Size/quality sweet spot</strong> — 14B params fits on a single A10G GPU (24GB VRAM) while delivering GPT-3.5-level quality</li>
                <li><strong>JSON extraction</strong> — Instruction-tuned variant reliably outputs structured JSON with confidence scores</li>
                <li><strong>Cost efficient</strong> — Runs on ml.g5.2xlarge (~$1.82/hr) vs larger models needing multi-GPU setups ($8-25+/hr)</li>
                <li><strong>32K context</strong> — Handles long resumes and multi-turn chat history without truncation</li>
                <li><strong>Fast inference</strong> — With vLLM continuous batching, response times are 3-30 seconds depending on task</li>
            </ul>
        `)}
    </div>`;
}

function renderServing() {
    return `<div id="arch-serving" class="arch-section">
        <div class="arch-section-title">Serving Configuration</div>

        ${archCard('SageMaker Endpoint', '#ea580c', 'SM', archTable([
            ['Endpoint Name', 'resume-parser-mistral'],
            ['Status', 'InService'],
            ['Instance Type', 'ml.g5.2xlarge'],
            ['Instance Count', '1'],
            ['Variant', 'AllTraffic (100% traffic)'],
        ]))}

        ${archCard('Current Instance — ml.g5.2xlarge', '#dc2626', 'G', archTable([
            ['GPU', '1x NVIDIA A10G'],
            ['GPU Memory (VRAM)', '22.35 GB'],
            ['vCPUs', '4'],
            ['RAM', '32 GB'],
            ['Storage', '450 GB NVMe SSD'],
            ['Cost', '$1.819/hr ($1,328/mo)'],
        ]))}

        ${archCard('vLLM / DJL Serving Config', '#0891b2', 'V', `
            ${archTable([
                ['Serving Image', 'djl-inference:0.36.0-lmi21.0.0-cu129'],
                ['Inference Engine', 'vLLM (continuous batching)'],
                ['Tensor Parallel Degree', '1 (single GPU)'],
                ['Max Model Length', '32,768 tokens'],
                ['Tokenizer Mode', 'mistral'],
                ['Config Format', 'mistral'],
                ['Rolling Batch', 'vLLM'],
            ])}
            <p style="font-size:0.78rem; color:#94a3b8; margin-top:10px;">
                vLLM enables continuous batching — multiple requests are processed in parallel,
                improving throughput without needing additional instances.
            </p>
        `)}

        ${archCard('Timeouts & Health', '#6366f1', 'T', archTable([
            ['Read Timeout', '120 seconds'],
            ['Connect Timeout', '10 seconds'],
            ['Max Retries', '1'],
            ['Prediction Timeout', '300 seconds'],
            ['Model Download Timeout', '600 seconds'],
            ['Container Startup Health Check', '900 seconds (15 min)'],
            ['Response Streaming', 'Yes (invoke_endpoint_with_response_stream)'],
        ]))}
    </div>`;
}

function renderPipeline() {
    return `<div id="arch-pipeline" class="arch-section">
        <div class="arch-section-title">How Python + SageMaker Work Together</div>

        <div class="arch-flow">Python FastAPI (ECS Fargate)                    AWS SageMaker (ml.g5.2xlarge)
─────────────────────────────                    ─────────────────────────────────
                                                 ┌───────────────────────────────┐
1. Receive request (file/JSON)                   │  Mistral 14B via vLLM         │
         │                                       │                               │
2. Extract text / fetch data from DB             │  • DJL inference container     │
         │                                       │  • Continuous batching         │
3. Build prompt (app/parser/prompt.py)           │  • Streaming response          │
         │                                       │  • A10G GPU (24GB VRAM)        │
4. invoke_endpoint_with_response_stream() ──────►│                               │
         │                                       │  Process prompt → Generate     │
5. Stream response chunks ◄──────────────────────│  JSON tokens                   │
         │                                       └───────────────────────────────┘
6. Parse JSON → Pydantic model
         │
7. Return structured response</div>

        ${archCard('The Flow in Detail', '#3b82f6', 'F', `
            <div style="font-size:0.82rem; color:#374151; line-height:1.8;">
                <p><strong>Step 1-3: Python side (app/parser/sagemaker.py)</strong></p>
                <ul style="padding-left:20px; margin:4px 0 12px;">
                    <li>FastAPI receives request → extracts text from PDF/DOCX (pdfplumber/python-docx)</li>
                    <li>Builds a structured prompt with extraction rules, confidence scoring guidelines, and output JSON schema</li>
                    <li>Creates SageMaker payload: <code>{"inputs": prompt, "parameters": {max_new_tokens, temperature, do_sample}}</code></li>
                </ul>
                <p><strong>Step 4-5: SageMaker side</strong></p>
                <ul style="padding-left:20px; margin:4px 0 12px;">
                    <li>boto3 calls <code>invoke_endpoint_with_response_stream()</code> → SageMaker streams response</li>
                    <li>vLLM processes the prompt through Mistral 14B, generates tokens incrementally</li>
                    <li>Response streams back as chunked JSON via HTTP</li>
                </ul>
                <p><strong>Step 6-7: Python side (response handling)</strong></p>
                <ul style="padding-left:20px; margin:4px 0;">
                    <li>Chunks are concatenated → <code>generated_text</code> extracted from DJL response format</li>
                    <li>JSON parsed → validated against Pydantic models (ResumeOutput, ChatResponse, etc.)</li>
                    <li>JSON repair attempted if response is truncated (common with large resumes)</li>
                </ul>
            </div>
        `)}
    </div>`;
}

function renderCurrentCost() {
    return `<div id="arch-current-cost" class="arch-section">
        <div class="arch-section-title">Current Cost — ml.g5.2xlarge</div>

        ${archCard('Monthly Breakdown (24/7 On-Demand, ap-south-1)', '#dc2626', '$', `
            <div class="arch-cost-row arch-cost-header">
                <div>Item</div><div>Spec</div><div>$/hr</div><div>Monthly</div>
            </div>
            <div class="arch-cost-row">
                <div><strong>SageMaker Endpoint</strong></div><div>ml.g5.2xlarge × 1</div><div>$1.819</div><div><strong>$1,328</strong></div>
            </div>
            <div class="arch-cost-row" style="color:#94a3b8; font-size:0.75rem;">
                <div colspan="4" style="grid-column:1/-1;">Instance runs 24/7 regardless of request volume. Cost is fixed, not per-request.</div>
            </div>
        `)}

        ${archCard('Estimated Per-Request Cost (based on invocation time)', '#8b5cf6', 'R', `
            <table class="arch-table">
                <tr><td style="font-weight:700;color:#64748b;">Feature</td><td style="font-weight:700;color:#64748b;">Avg Latency</td><td style="font-weight:700;color:#64748b;">Effective Cost/Request</td></tr>
                <tr><td>Resume Parsing</td><td style="font-family:monospace;">10-30 sec</td><td style="font-family:monospace;">~$0.005 - $0.015</td></tr>
                <tr><td>Chatbot</td><td style="font-family:monospace;">3-10 sec</td><td style="font-family:monospace;">~$0.002 - $0.005</td></tr>
                <tr><td>Recommendations</td><td style="font-family:monospace;">5-15 sec</td><td style="font-family:monospace;">~$0.003 - $0.008</td></tr>
            </table>
            <p style="font-size:0.75rem; color:#94a3b8; margin-top:8px;">
                Effective cost = hourly rate &div; requests processed per hour. Actual cost is fixed (always-on).
                With vLLM batching, throughput increases under concurrent load.
            </p>
        `)}
    </div>`;
}

function renderInstanceCompare() {
    return `<div id="arch-instance-compare" class="arch-section">
        <div class="arch-section-title">SageMaker Instance Comparison — Mistral 14B</div>

        <p style="font-size:0.85rem; color:#4b5563; line-height:1.6; margin-bottom:16px;">
            Mistral 14B (~14B parameters) needs <strong>~28 GB GPU memory</strong> in FP16, or <strong>~14 GB</strong> in INT8/AWQ quantized.
            Below are SageMaker GPU instances that can run this model, with real ap-south-1 (Mumbai) pricing.
        </p>

        ${archCard('GPU Instances — Can Run Mistral 14B', '#16a34a', 'G', `
            <div style="overflow-x:auto;">
            <table class="arch-table" style="min-width:700px;">
                <tr>
                    <td style="font-weight:700;color:#64748b;">Instance</td>
                    <td style="font-weight:700;color:#64748b;">GPU</td>
                    <td style="font-weight:700;color:#64748b;">VRAM</td>
                    <td style="font-weight:700;color:#64748b;">vCPU</td>
                    <td style="font-weight:700;color:#64748b;">RAM</td>
                    <td style="font-weight:700;color:#64748b;">$/hr</td>
                    <td style="font-weight:700;color:#64748b;">$/mo</td>
                    <td style="font-weight:700;color:#64748b;">Notes</td>
                </tr>
                <tr>
                    <td><strong>ml.g5.xlarge</strong></td>
                    <td>1× A10G</td>
                    <td>22 GB</td>
                    <td>2</td>
                    <td>16 GB</td>
                    <td style="font-family:monospace;">$1.691</td>
                    <td style="font-family:monospace;">$1,234</td>
                    <td style="font-family:normal;color:#94a3b8;font-size:0.75rem;">Needs INT8 quantization. Tight on VRAM.</td>
                </tr>
                <tr style="background:#eff6ff;">
                    <td><strong>ml.g5.2xlarge</strong> <span class="arch-badge arch-badge-blue">CURRENT</span></td>
                    <td>1× A10G</td>
                    <td>22 GB</td>
                    <td>4</td>
                    <td>32 GB</td>
                    <td style="font-family:monospace;">$1.819</td>
                    <td style="font-family:monospace;">$1,328</td>
                    <td style="font-family:normal;color:#374151;font-size:0.75rem;">Current setup. Works with INT8/AWQ. Good balance.</td>
                </tr>
                <tr>
                    <td><strong>ml.g5.4xlarge</strong></td>
                    <td>1× A10G</td>
                    <td>22 GB</td>
                    <td>8</td>
                    <td>64 GB</td>
                    <td style="font-family:monospace;">$2.438</td>
                    <td style="font-family:monospace;">$1,780</td>
                    <td style="font-family:normal;color:#94a3b8;font-size:0.75rem;">Same GPU, more CPU/RAM. No VRAM benefit.</td>
                </tr>
                <tr>
                    <td><strong>ml.g6.2xlarge</strong></td>
                    <td>1× L4</td>
                    <td>22 GB</td>
                    <td>4</td>
                    <td>32 GB</td>
                    <td style="font-family:monospace;">$1.467</td>
                    <td style="font-family:monospace;">$1,071</td>
                    <td style="font-family:normal;color:#16a34a;font-size:0.75rem;font-weight:600;">19% cheaper. L4 is newer gen. Worth testing.</td>
                </tr>
                <tr>
                    <td><strong>ml.g5.12xlarge</strong></td>
                    <td>4× A10G</td>
                    <td>89 GB</td>
                    <td>24</td>
                    <td>192 GB</td>
                    <td style="font-family:monospace;">$8.514</td>
                    <td style="font-family:monospace;">$6,215</td>
                    <td style="font-family:normal;color:#94a3b8;font-size:0.75rem;">Full FP16 with room. Overkill for single model.</td>
                </tr>
                <tr>
                    <td><strong>ml.p3.2xlarge</strong></td>
                    <td>1× V100</td>
                    <td>16 GB</td>
                    <td>4</td>
                    <td>61 GB</td>
                    <td style="font-family:monospace;">~$3.83</td>
                    <td style="font-family:monospace;">~$2,796</td>
                    <td style="font-family:normal;color:#dc2626;font-size:0.75rem;">V100 too small (16GB). Cannot fit 14B even quantized.</td>
                </tr>
                <tr>
                    <td><strong>ml.inf2.xlarge</strong></td>
                    <td>1× Inferentia2</td>
                    <td>—</td>
                    <td>2</td>
                    <td>16 GB</td>
                    <td style="font-family:monospace;">$1.134</td>
                    <td style="font-family:monospace;">$828</td>
                    <td style="font-family:normal;color:#ea580c;font-size:0.75rem;">Cheapest. Needs model compilation (Neuron SDK). Different stack.</td>
                </tr>
            </table>
            </div>
            <p style="font-size:0.75rem; color:#94a3b8; margin-top:10px;">
                All prices: SageMaker Real-Time Inference On-Demand, ap-south-1 (Mumbai). 24/7 = $/hr × 730.
            </p>
        `)}

        ${archCard('Recommendation', '#3b82f6', 'R', `
            <div style="font-size:0.85rem; color:#374151; line-height:1.7;">
                <p><strong style="color:#16a34a;">Best value upgrade: ml.g6.2xlarge</strong></p>
                <ul style="padding-left:20px; margin:6px 0;">
                    <li>NVIDIA L4 is newer gen (Ada Lovelace) — better perf/watt than A10G</li>
                    <li>Same 22 GB VRAM, 4 vCPU, 32 GB RAM as current g5.2xlarge</li>
                    <li><strong>Saves ~$257/mo</strong> ($1,328 → $1,071) — 19% reduction</li>
                    <li>Requires testing — verify vLLM + Mistral 14B works on L4</li>
                </ul>
                <p style="margin-top:12px;"><strong style="color:#ea580c;">Cheapest option: ml.inf2.xlarge</strong></p>
                <ul style="padding-left:20px; margin:6px 0;">
                    <li>AWS Inferentia2 custom chip — $828/mo (38% cheaper)</li>
                    <li>Needs model recompilation with Neuron SDK (different serving stack)</li>
                    <li>Not a drop-in replacement — significant engineering effort</li>
                </ul>
                <p style="margin-top:12px;"><strong style="color:#6366f1;">Stay put: ml.g5.2xlarge (current)</strong></p>
                <ul style="padding-left:20px; margin:6px 0;">
                    <li>Battle-tested, works reliably with current DJL/vLLM stack</li>
                    <li>Good balance of cost ($1,328/mo) and performance</li>
                    <li>If budget is fine, no reason to change</li>
                </ul>
            </div>
        `)}

        ${archCard('Savings Plans & Spot', '#059669', 'S', `
            <div style="overflow-x:auto;">
            <table class="arch-table" style="min-width:500px;">
                <tr>
                    <td style="font-weight:700;color:#64748b;">Strategy</td>
                    <td style="font-weight:700;color:#64748b;">Saving</td>
                    <td style="font-weight:700;color:#64748b;">Monthly (g5.2xl)</td>
                    <td style="font-weight:700;color:#64748b;">Trade-off</td>
                </tr>
                <tr>
                    <td><span class="arch-badge arch-badge-orange">Current</span> On-Demand</td>
                    <td>—</td>
                    <td style="font-family:monospace;">$1,328</td>
                    <td style="font-family:normal;color:#374151;">Full flexibility, no commitment</td>
                </tr>
                <tr>
                    <td><span class="arch-badge arch-badge-blue">Savings Plan</span> 1-year</td>
                    <td>~30-40%</td>
                    <td style="font-family:monospace;">~$800-930</td>
                    <td style="font-family:normal;color:#374151;">Commit $/hr for 1 year. Applies automatically.</td>
                </tr>
                <tr>
                    <td><span class="arch-badge arch-badge-green">Spot</span> Managed</td>
                    <td>~60-70%</td>
                    <td style="font-family:monospace;">~$400-530</td>
                    <td style="font-family:normal;color:#374151;">Can be interrupted. Auto-restart. Good for non-critical.</td>
                </tr>
                <tr>
                    <td><span class="arch-badge arch-badge-purple">Serverless</span></td>
                    <td>Pay per use</td>
                    <td style="font-family:monospace;">Variable</td>
                    <td style="font-family:normal;color:#374151;">Cold starts (30-60s). Best for &lt;100 requests/day.</td>
                </tr>
            </table>
            </div>
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
        // renderInstanceCompare(),
    ].join('');
    setupArchScrollSpy();
    const firstLink = document.querySelector('#arch-sidebar a');
    if (firstLink) firstLink.classList.add('active');
})();
