'use strict';

// ── State ─────────────────────────────────────────────────────────────────────

let state = {
    recording:          false,
    actions:            [],
    steps:              [],
    processing:         false,
    processingProgress: null,
    processingError:    null,
    apiKey:             '',
};

// ── DOM refs ──────────────────────────────────────────────────────────────────

const recordBtn      = document.getElementById('recordBtn');
const processBtn     = document.getElementById('processBtn');
const exportBtn      = document.getElementById('exportBtn');
const clearBtn       = document.getElementById('clearBtn');
const statusBar      = document.getElementById('statusBar');
const stepsBody      = document.getElementById('stepsBody');
const progressWrap   = document.getElementById('progressWrap');
const progressFill   = document.getElementById('progressFill');
const progressLabel  = document.getElementById('progressLabel');
const settingsToggle = document.getElementById('settingsToggle');
const settingsPanel  = document.getElementById('settingsPanel');
const apiKeyInput    = document.getElementById('apiKeyInput');
const saveKeyBtn     = document.getElementById('saveKeyBtn');

// ── Init ──────────────────────────────────────────────────────────────────────

chrome.storage.local.get(
    ['recording', 'actions', 'steps', 'processing', 'processingProgress', 'processingError', 'apiKey'],
    (data) => { Object.assign(state, data); render(); }
);

// Reactively update when background changes storage
chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    for (const [key, { newValue }] of Object.entries(changes)) {
        state[key] = newValue;
    }
    render();
});

// ── Settings ──────────────────────────────────────────────────────────────────

settingsToggle.addEventListener('click', () => {
    const open = settingsPanel.style.display !== 'block';
    settingsPanel.style.display = open ? 'block' : 'none';
    if (open && state.apiKey) apiKeyInput.value = state.apiKey;
});

saveKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (!key) return;
    chrome.storage.local.set({ apiKey: key }, () => {
        state.apiKey = key;
        settingsPanel.style.display = 'none';
        setStatus('API key saved ✓');
    });
});

// ── Controls ──────────────────────────────────────────────────────────────────

recordBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: state.recording ? 'STOP_RECORDING' : 'START_RECORDING' });
});

processBtn.addEventListener('click', () => {
    if (!state.apiKey) {
        settingsPanel.style.display = 'block';
        if (state.apiKey) apiKeyInput.value = state.apiKey;
        apiKeyInput.focus();
        setStatus('⚠ Set your Claude API key first (click ⚙)');
        return;
    }
    chrome.runtime.sendMessage({ type: 'PROCESS' });
});

exportBtn.addEventListener('click', () => {
    exportToCSV(state.steps || []);
});

clearBtn.addEventListener('click', () => {
    const count = (state.steps?.length || 0) + (state.actions?.length || 0);
    if (!count || confirm('Clear all recorded actions and steps?')) {
        chrome.runtime.sendMessage({ type: 'CLEAR' });
    }
});

// ── Render ────────────────────────────────────────────────────────────────────

function render() {
    const recording   = !!state.recording;
    const processing  = !!state.processing;
    const actionCount = state.actions?.length || 0;
    const stepCount   = state.steps?.length   || 0;
    const progress    = state.processingProgress;
    const errMsg      = state.processingError;

    // Record button
    recordBtn.textContent = recording ? '■ Stop Recording' : '● Start Recording';
    recordBtn.classList.toggle('is-recording', recording);

    // Process button
    processBtn.disabled = processing || recording || actionCount === 0;

    // Export button
    exportBtn.disabled = processing || stepCount === 0;

    // Progress bar
    if (processing && progress) {
        progressWrap.style.display = 'flex';
        progressFill.style.width   = `${Math.round((progress.current / progress.total) * 100)}%`;
        progressLabel.textContent  = `${progress.current} / ${progress.total}`;
    } else {
        progressWrap.style.display = 'none';
    }

    // Status bar
    if (errMsg) {
        statusBar.innerHTML = `<span class="error-text">⚠ ${esc(errMsg)}</span>`;
    } else if (processing && progress) {
        statusBar.textContent = `Generating step ${progress.current} of ${progress.total}…`;
    } else if (recording) {
        statusBar.textContent = `🔴 Recording — ${actionCount} action${actionCount !== 1 ? 's' : ''} captured. Click Stop when done.`;
    } else if (stepCount > 0) {
        statusBar.textContent = `✓ ${stepCount} step${stepCount !== 1 ? 's' : ''} generated. You can edit inline, then export.`;
    } else if (actionCount > 0) {
        statusBar.textContent = `${actionCount} action${actionCount !== 1 ? 's' : ''} recorded. Click Generate Steps to process with AI.`;
    } else {
        statusBar.textContent = 'Ready — click Start Recording to begin.';
    }

    renderSteps();
}

function renderSteps() {
    // Don't disturb an active inline edit
    if (document.activeElement?.getAttribute('contenteditable') === 'true') return;

    const steps = state.steps || [];

    if (!steps.length) {
        stepsBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="4">No steps yet — record your actions, then click Generate Steps.</td>
            </tr>`;
        return;
    }

    stepsBody.innerHTML = steps.map(s => `
        <tr data-id="${s.id}">
            <td class="step-num">${s.stepNumber}</td>
            <td class="editable" contenteditable="true" data-field="stepDetail">${esc(s.stepDetail)}</td>
            <td class="editable" contenteditable="true" data-field="expectedResult">${esc(s.expectedResult)}</td>
            <td><button class="delete-btn" title="Delete step">✕</button></td>
        </tr>`
    ).join('');

    // Delete
    stepsBody.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = idOf(btn);
            chrome.runtime.sendMessage({ type: 'DELETE_STEP', stepId: id });
        });
    });

    // Inline edit — save on blur
    stepsBody.querySelectorAll('[contenteditable]').forEach(cell => {
        cell.addEventListener('blur', () => {
            const row   = cell.closest('tr');
            const id    = parseFloat(row.dataset.id);
            const field = cell.dataset.field;
            const text  = cell.innerText.trim();
            chrome.runtime.sendMessage({ type: 'UPDATE_STEP', stepId: id, data: { [field]: text } });
        });
        // Prevent newlines with Enter; allow Shift+Enter
        cell.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); cell.blur(); }
        });
    });
}

function idOf(el) {
    return parseFloat(el.closest('tr').dataset.id);
}

// ── Export ────────────────────────────────────────────────────────────────────

function exportToCSV(steps) {
    if (!steps.length) return;

    const header = ['Step #', 'Step Detail', 'Expected Result'];
    const rows   = steps.map(s => [
        s.stepNumber,
        csvCell(s.stepDetail),
        csvCell(s.expectedResult),
    ]);

    const csv  = '\ufeff' + [header.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
        href:     url,
        download: `test-script-${today()}.csv`,
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function csvCell(val) {
    return `"${(val || '').replace(/"/g, '""')}"`;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function esc(str) {
    return (str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function today() {
    return new Date().toISOString().slice(0, 10);
}

function setStatus(msg) {
    statusBar.textContent = msg;
}
