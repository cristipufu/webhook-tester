import { removeWebhook } from './webhooks.js';

const webhookList = document.getElementById('webhook-list');
const requestList = document.getElementById('request-list');
const requestHeadersTable = document.getElementById('request-headers');
const requestBodyPre = document.getElementById('request-body-raw');
const waitingForEvents = document.getElementById('waiting-for-events');
const requestsContainer = document.getElementById('requests-container');
const copyPopup = document.getElementById('copy-popup');
const curlExample = document.getElementById('curl-example');
const powershellExample = document.getElementById('powershell-example');
const copyExampleButton = document.getElementById('copy-example');
const copyActiveWebhookUrlButton = document.getElementById('copy-active-webhook-url');
const activeWebhookUrl = document.getElementById('active-webhook-url');
const copyBodyButton = document.getElementById('copy-body');

const renderWebhooks = (webhooks) => {
    webhookList.innerHTML = '';
    webhooks.forEach((webhook, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span class="webhook-url">${webhook.slug}</span>
            <button class="remove-btn" data-url="${webhook.url}" aria-label="Remove webhook">&times;</button>
        `;
        li.onclick = () => showWebhookDetails(index, webhooks);
        li.querySelector('.remove-btn').onclick = (event) => {
            event.stopPropagation();
            removeWebhook(webhook.slug);
        };
        webhookList.appendChild(li);
    });
};

const showWebhookDetails = (index, webhooks) => {
    const selectedWebhook = webhooks[index];
    updateExampleCommands(selectedWebhook.url);
    activeWebhookUrl.textContent = selectedWebhook.url;

    if (selectedWebhook.requests.length === 0) {
        showWaitingForEvents();
    } else {
        showRequests(selectedWebhook);
        showRequestDetails(selectedWebhook.requests[selectedWebhook.requests.length - 1]);
    }
};

const showWaitingForEvents = () => {
    waitingForEvents.style.display = 'flex';
    requestsContainer.style.display = 'none';
};

const showRequests = (webhook) => {
    waitingForEvents.style.display = 'none';
    requestsContainer.style.display = 'flex';

    requestList.innerHTML = '';
    webhook.requests.forEach((request, index) => {
        const li = document.createElement('li');
        const date = new Date(request.timestamp);
        const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        const formattedTime = date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        li.innerHTML = `
            <span class="request-method ${request.method.toLowerCase()}">${request.method}</span>
            <span class="request-timestamp">
                <span class="request-date">${formattedDate}</span>
                <span class="request-time">${formattedTime}</span>
            </span>
        `;
        li.onclick = () => showRequestDetails(request);
        requestList.appendChild(li);
    });
};

const showRequestDetails = (request) => {
    renderHeadersTable(request.headers);

    const rawBody = request.body;
    const rawTab = document.getElementById('request-body-raw');
    const jsonTab = document.getElementById('request-body-json');
    const jsonTabButton = document.querySelector('.body-tabs .tab-btn[data-tab="json"]');

    rawTab.textContent = rawBody;

    try {
        const jsonBody = JSON.parse(rawBody);
        jsonTab.innerHTML = formatJSON(jsonBody);
        jsonTabButton.style.display = 'inline-block';
    } catch (e) {
        jsonTab.innerHTML = '<p>Not valid JSON</p>';
        jsonTabButton.style.display = 'none';
    }

    // Set up tab switching for body content
    const bodyTabs = document.querySelectorAll('.body-tabs .tab-btn');
    const bodyContents = document.querySelectorAll('.body-tab-content .code-example');

    bodyTabs.forEach(viewerTab => {
        viewerTab.addEventListener('click', () => {
            bodyTabs.forEach(t => t.classList.remove('active'));
            bodyContents.forEach(c => c.classList.remove('active'));
            viewerTab.classList.add('active');
            document.querySelector(`.body-tab-content .code-example#request-body-${viewerTab.dataset.tab}`).classList.add('active');
        });
    });
};

const formatJSON = (obj) => {
    return JSON.stringify(obj, null, 2)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, match => {
            let cls = 'number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'key';
                } else {
                    cls = 'string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'boolean';
            } else if (/null/.test(match)) {
                cls = 'null';
            }
            return `<span class="${cls}">${match}</span>`;
        });
};

const renderHeadersTable = (headers) => {
    requestHeadersTable.innerHTML = `
        <thead>
            <tr>
                <th>Header</th>
                <th>Value</th>
            </tr>
        </thead>
        <tbody>
            ${Object.entries(headers)
            .map(([key, value]) => `
                    <tr>
                        <td><span class="header-key">${escapeHtml(key)}</span></td>
                        <td><span class="header-value">${escapeHtml(value)}</span></td>
                    </tr>
                `)
            .join('')}
        </tbody>
    `;
};

const escapeHtml = (unsafe) => {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
        showCopyPopup();
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
};

const showCopyPopup = () => {
    copyPopup.classList.add('show');
    setTimeout(() => {
        copyPopup.classList.remove('show');
    }, 2000);
};

const updateExampleCommands = (webhookUrl) => {
    const exampleData = JSON.stringify({
        name: "Test event",
        data: {
            id: 1,
            name: "Tester McTestFace",
            by: "Webhook Tester",
            at: new Date().toISOString()
        },
        user: {
            email: "tester@example.com"
        },
        ts: Date.now()
    });

    curlExample.textContent = `curl ${webhookUrl} -X POST -H "Content-Type: application/json" -d '${exampleData}'`;

    powershellExample.textContent = `$body = '${exampleData}'
Invoke-WebRequest -Uri "${webhookUrl}" -Method POST -Body $body -ContentType "application/json"`;
};

const tabButtons = document.querySelectorAll('.tabs .tab-btn');
const tabContents = document.querySelectorAll('.tab-content .code-example');

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tab = button.dataset.tab;
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        button.classList.add('active');
        document.getElementById(`${tab}-example`).classList.add('active');
    });
});

copyExampleButton.addEventListener('click', () => {
    const activeTab = document.querySelector('.tabs .tab-btn.active').dataset.tab;
    const exampleText = document.getElementById(`${activeTab}-example`).textContent;
    copyToClipboard(exampleText);
});

copyActiveWebhookUrlButton.addEventListener('click', () => {
    copyToClipboard(activeWebhookUrl.textContent);
});

copyBodyButton.addEventListener('click', () => {
    copyToClipboard(requestBodyPre.textContent);
});

export { renderWebhooks, showWebhookDetails, updateExampleCommands, showWaitingForEvents };