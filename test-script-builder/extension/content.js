// Guard against double-injection
if (window.__tsbLoaded) {
    // Already loaded — just update recording state if message arrives
} else {
    window.__tsbLoaded = true;

    let recording = false;
    const inputTimers = {};

    // Initialize recording state from storage
    chrome.storage.local.get(['recording'], (data) => {
        recording = !!data.recording;
    });

    // Listen for recording state updates from background
    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.type === 'RECORDING_STATE') recording = msg.value;
    });

    // ── Helpers ────────────────────────────────────────────────────────────

    function getElementInfo(el) {
        if (!el || !el.tagName) return { tag: 'unknown', label: '' };

        const tag  = el.tagName.toLowerCase();
        const type = (el.type || '').toLowerCase();

        // Best label: aria-label → associated <label> → placeholder → text content → title → name/id
        let label = el.getAttribute('aria-label') || '';

        if (!label && el.id) {
            const labelEl = document.querySelector(`label[for="${el.id}"]`);
            if (labelEl) label = labelEl.textContent.trim();
        }
        if (!label) label = el.placeholder || '';
        if (!label) label = (el.textContent || el.innerText || '').trim().slice(0, 80);
        if (!label) label = el.title || '';
        if (!label) label = el.name || el.id || '';

        return {
            tag,
            type,
            label: label.slice(0, 100),
            href:  el.href  || '',
            role:  el.getAttribute('role') || '',
            value: el.value || '',
        };
    }

    function sendAction(payload) {
        if (!recording) return;
        try {
            chrome.runtime.sendMessage({ type: 'ACTION', payload });
        } catch {}
    }

    // ── Event listeners ────────────────────────────────────────────────────

    // Clicks on interactive elements
    document.addEventListener('click', (e) => {
        if (!recording) return;
        const interactive = e.target.closest(
            'a, button, input[type="submit"], input[type="button"], ' +
            'input[type="checkbox"], input[type="radio"], ' +
            '[role="button"], [role="link"], [role="menuitem"], [role="tab"], [role="option"]'
        );
        if (!interactive) return;
        sendAction({
            actionType: 'click',
            element:    getElementInfo(interactive),
            url:        location.href,
            pageTitle:  document.title,
            timestamp:  Date.now(),
        });
    }, true);

    // Text input — debounced 1.5 s
    document.addEventListener('input', (e) => {
        if (!recording) return;
        const el = e.target;
        const validType = ['text', 'email', 'password', 'search', 'url', 'number', 'tel'];
        if (!validType.includes(el.type) && el.tagName.toLowerCase() !== 'textarea') return;

        const key = el.name || el.id || el.placeholder || 'field';
        clearTimeout(inputTimers[key]);
        inputTimers[key] = setTimeout(() => {
            sendAction({
                actionType:  'type',
                element:     getElementInfo(el),
                inputValue:  el.type === 'password' ? '••••••' : el.value,
                url:         location.href,
                pageTitle:   document.title,
                timestamp:   Date.now(),
            });
        }, 1500);
    }, true);

    // Select / checkbox / radio changes
    document.addEventListener('change', (e) => {
        if (!recording) return;
        const el = e.target;
        if (el.tagName.toLowerCase() !== 'select' &&
            el.type !== 'checkbox' &&
            el.type !== 'radio') return;

        const extra = el.tagName.toLowerCase() === 'select'
            ? { selectedText: el.options[el.selectedIndex]?.text || el.value }
            : { checked: el.checked };

        sendAction({
            actionType: 'change',
            element:    getElementInfo(el),
            url:        location.href,
            pageTitle:  document.title,
            timestamp:  Date.now(),
            ...extra,
        });
    }, true);

    // Form submits
    document.addEventListener('submit', (e) => {
        if (!recording) return;
        sendAction({
            actionType: 'submit',
            element:    getElementInfo(e.target),
            url:        location.href,
            pageTitle:  document.title,
            timestamp:  Date.now(),
        });
    }, true);

    // SPA / hash navigation detection
    let lastUrl = location.href;
    const navObserver = new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            sendAction({
                actionType: 'navigate',
                element:    { tag: 'browser', label: document.title },
                url:        location.href,
                pageTitle:  document.title,
                timestamp:  Date.now(),
            });
        }
    });
    navObserver.observe(document, { subtree: true, childList: true });
}
