'use strict';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const MODEL         = 'claude-sonnet-4-6';

// ── Message router ────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    (async () => {
        try {
            switch (msg.type) {
                case 'ACTION':
                    await handleAction(msg.payload, sender);
                    sendResponse({ ok: true });
                    break;
                case 'START_RECORDING':
                    await startRecording();
                    sendResponse({ ok: true });
                    break;
                case 'STOP_RECORDING':
                    await stopRecording();
                    sendResponse({ ok: true });
                    break;
                case 'PROCESS':
                    processSteps().catch(console.error); // fire-and-forget; progress via storage
                    sendResponse({ ok: true });
                    break;
                case 'DELETE_STEP':
                    await deleteStep(msg.stepId);
                    sendResponse({ ok: true });
                    break;
                case 'UPDATE_STEP':
                    await updateStep(msg.stepId, msg.data);
                    sendResponse({ ok: true });
                    break;
                case 'CLEAR':
                    await clearAll();
                    sendResponse({ ok: true });
                    break;
                default:
                    sendResponse({ ok: true });
            }
        } catch (err) {
            sendResponse({ error: err.message });
        }
    })();
    return true; // keep message channel open for async sendResponse
});

// ── Recording ─────────────────────────────────────────────────────────────────

async function startRecording() {
    // Inject content script into already-open tabs (handles pre-existing tabs)
    const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
    for (const tab of tabs) {
        try {
            await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
        } catch {}
    }

    await chrome.storage.local.set({
        recording: true, actions: [], steps: [],
        processing: false, processingProgress: null, processingError: null,
    });

    await broadcastToTabs({ type: 'RECORDING_STATE', value: true });
}

async function stopRecording() {
    await chrome.storage.local.set({ recording: false });
    await broadcastToTabs({ type: 'RECORDING_STATE', value: false });
}

async function broadcastToTabs(msg) {
    const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
    for (const tab of tabs) {
        try { await chrome.tabs.sendMessage(tab.id, msg); } catch {}
    }
}

// ── Action capture ────────────────────────────────────────────────────────────

async function handleAction(payload, sender) {
    const { recording } = await chrome.storage.local.get('recording');
    if (!recording) return;

    // Wait briefly for the page to react (e.g., modal opens, navigation starts)
    await sleep(350);

    let screenshot = null;
    try {
        screenshot = await chrome.tabs.captureVisibleTab(sender.tab.windowId, {
            format: 'jpeg', quality: 60,
        });
    } catch {}

    const { actions = [] } = await chrome.storage.local.get('actions');

    // Deduplicate: skip if same action type + element within 800 ms
    const last = actions[actions.length - 1];
    if (last &&
        last.actionType === payload.actionType &&
        last.element?.label === payload.element?.label &&
        payload.timestamp - last.timestamp < 800) return;

    actions.push({ ...payload, screenshot, id: Date.now() });
    await chrome.storage.local.set({ actions });
}

// ── AI Processing ─────────────────────────────────────────────────────────────

async function processSteps() {
    const { actions = [], apiKey } = await chrome.storage.local.get(['actions', 'apiKey']);

    if (!apiKey) {
        await chrome.storage.local.set({ processingError: 'API key not set. Click ⚙ to add your Claude API key.' });
        return;
    }
    if (!actions.length) {
        await chrome.storage.local.set({ processingError: 'No actions recorded yet.' });
        return;
    }

    await chrome.storage.local.set({
        processing: true,
        steps: [],
        processingError: null,
        processingProgress: { current: 0, total: actions.length },
    });

    const steps = [];

    for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        await chrome.storage.local.set({ processingProgress: { current: i + 1, total: actions.length } });

        try {
            const result = await callClaude(action, steps, apiKey);
            steps.push({
                id:             action.id,
                stepNumber:     i + 1,
                stepDetail:     result.stepDetail,
                expectedResult: result.expectedResult,
                url:            action.url,
                screenshot:     action.screenshot,
            });
        } catch (err) {
            steps.push({
                id:             action.id,
                stepNumber:     i + 1,
                stepDetail:     describeAction(action),
                expectedResult: `[AI error: ${err.message}]`,
                url:            action.url,
            });
        }

        await chrome.storage.local.set({ steps: [...steps] });
    }

    await chrome.storage.local.set({ processing: false });
}

function describeAction(action) {
    const el    = action.element || {};
    const label = el.label || el.tag || '';
    switch (action.actionType) {
        case 'click':    return `Click "${label}"`;
        case 'type':     return `Type "${action.inputValue}" into "${label}"`;
        case 'change':   return action.selectedText ? `Select "${action.selectedText}" in "${label}"` : `Toggle "${label}"`;
        case 'submit':   return `Submit form`;
        case 'navigate': return `Navigate to ${action.url}`;
        default:         return `${action.actionType} on "${label}"`;
    }
}

function buildPrompt(action, previousSteps) {
    const el    = action.element || {};
    const label = el.label || el.placeholder || el.tag || 'element';

    let actionText = '';
    switch (action.actionType) {
        case 'click':
            actionText = `Clicked on "${label}"${el.href ? ` (link to ${el.href})` : ''}`;
            break;
        case 'type':
            actionText = `Typed "${action.inputValue}" into the "${label}" field`;
            break;
        case 'change':
            actionText = action.selectedText
                ? `Selected "${action.selectedText}" from the "${label}" dropdown`
                : `${action.checked ? 'Checked' : 'Unchecked'} the "${label}" checkbox/radio`;
            break;
        case 'submit':
            actionText = `Submitted a form`;
            break;
        case 'navigate':
            actionText = `Navigated to a new page`;
            break;
        default:
            actionText = `Performed "${action.actionType}" on "${label}"`;
    }

    const prevContext = previousSteps.length > 0
        ? `Previous steps (for context):\n${previousSteps.slice(-3).map((s, i) =>
            `${previousSteps.length - Math.min(3, previousSteps.length) + i + 1}. ${s.stepDetail}`
          ).join('\n')}\n\n`
        : '';

    return `${prevContext}You are writing a software test script step.

Page: "${action.pageTitle || ''}" — ${action.url || ''}
Action: ${actionText}

Using the screenshot and action details above, respond with ONLY this JSON:
{"stepDetail":"...","expectedResult":"..."}

Rules:
- stepDetail: Imperative tester instruction, specific and concise (e.g., "Click the 'Login' button")
- expectedResult: What the tester should see/verify after the action (e.g., "The user is redirected to the dashboard")
- 1–2 sentences each, no fluff`;
}

async function callClaude(action, previousSteps, apiKey) {
    const content = [];

    if (action.screenshot) {
        content.push({
            type: 'image',
            source: {
                type:       'base64',
                media_type: 'image/jpeg',
                data:       action.screenshot.replace(/^data:image\/jpeg;base64,/, ''),
            },
        });
    }

    content.push({ type: 'text', text: buildPrompt(action, previousSteps) });

    const res = await fetch(ANTHROPIC_API, {
        method: 'POST',
        headers: {
            'x-api-key':                            apiKey,
            'anthropic-version':                    '2023-06-01',
            'content-type':                         'application/json',
            'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
            model:      MODEL,
            max_tokens: 300,
            messages:   [{ role: 'user', content }],
        }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    const match = text.match(/\{[\s\S]*?\}/);
    if (!match) throw new Error('No JSON in response');

    const parsed = JSON.parse(match[0]);
    if (!parsed.stepDetail) throw new Error('Missing stepDetail');
    return parsed;
}

// ── Step management ───────────────────────────────────────────────────────────

async function deleteStep(stepId) {
    const { steps = [] } = await chrome.storage.local.get('steps');
    const updated = steps
        .filter(s => s.id !== stepId)
        .map((s, i) => ({ ...s, stepNumber: i + 1 }));
    await chrome.storage.local.set({ steps: updated });
}

async function updateStep(stepId, data) {
    const { steps = [] } = await chrome.storage.local.get('steps');
    await chrome.storage.local.set({
        steps: steps.map(s => s.id === stepId ? { ...s, ...data } : s),
    });
}

async function clearAll() {
    await chrome.storage.local.set({
        actions: [], steps: [],
        processing: false, processingProgress: null, processingError: null,
    });
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
