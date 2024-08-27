import { saveWebhooksInDb, getWebhooksFromDb, removeWebhookFromDb } from './db.js';

let webhooks = [];
let signalRConnection = null;
let baseUrl = null;

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

const setSignalRConnection = (connection) => {
    signalRConnection = connection;
};

const setBaseUrl = (url) => {
    baseUrl = url;
};

const initWebhooks = async () => {
    webhooks = await getWebhooksFromDb();
    if (webhooks.length === 0) {
        await createWebhook();
    } else {
        // send existing webhooks to the server
        if (signalRConnection) {
            await signalRConnection.invoke('CreateWebhooksAsync', webhooks.map(w => w.slug));
        }
    }
    renderWebhooks(webhooks);
    showWebhookDetails(0, webhooks);
};

const createWebhook = async () => {
    const slug = generateWebhookSlug();
    const url = `${baseUrl}/webhooks/${slug}`;
    const newWebhook = { url, slug, requests: [] };

    if (signalRConnection) {
        try {
            await signalRConnection.invoke('CreateWebhooksAsync', [slug]);
            webhooks.push(newWebhook);
            await saveWebhooksInDb(webhooks);
            renderWebhooks(webhooks);
            showWebhookDetails(webhooks.length - 1, webhooks);
        } catch (error) {
            console.error('Failed to create webhook on server:', error);
            alert('Failed to create webhook. Please try again.');
        }
    } else {
        console.error('SignalR connection not available');
        alert('Cannot create webhook. Connection to server not available.');
    }
};

const generateWebhookSlug = () => {
    const colors = [
        'red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'grey', 'white',
        'black', 'brown', 'cyan', 'magenta', 'lime', 'teal', 'indigo', 'violet', 'gold',
        'silver', 'bronze', 'maroon', 'navy', 'olive', 'aqua', 'turquoise', 'lavender'
    ];

    const animals = [
        'dog', 'hawk', 'tiger', 'wolf', 'panther', 'dragon', 'falcon', 'panda', 'cat',
        'bear', 'fox', 'mouse', 'rat', 'bird', 'pig', 'chicken', 'duck', 'elephant',
        'lion', 'giraffe', 'zebra', 'koala', 'rhino', 'hippo', 'monkey', 'gorilla',
        'penguin', 'dolphin', 'whale', 'shark', 'octopus', 'eagle', 'owl', 'bat',
        'squirrel', 'rabbit', 'deer', 'moose', 'bison', 'coyote', 'leopard', 'jaguar'
    ];

    const number = Math.floor(Math.random() * 1000000); // 6-digit number (0 to 999999)
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const randomAnimal = animals[Math.floor(Math.random() * animals.length)];

    return `${randomColor}-${randomAnimal}-${number.toString().padStart(6, '0')}`;
};

const addRequestToWebhook = (slug, request) => {
    const webhook = webhooks.find(w => w.slug === slug);
    if (webhook) {
        webhook.requests.push(request);
        saveWebhooksInDb(webhooks);
        showWebhookDetails(webhooks.indexOf(webhook), webhooks);
    }
};

const removeWebhook = async (slug) => {
    webhooks = webhooks.filter(webhook => webhook.slug !== slug);
    await removeWebhookFromDb(slug);
    renderWebhooks(webhooks);
    if (webhooks.length > 0) {
        showWebhookDetails(0, webhooks);
    } else {
        showWaitingForEvents();
    }
};

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
    const getHeader = (headers, name) => {
        const lowercaseName = name.toLowerCase();
        const header = Object.keys(headers).find(h => h.toLowerCase() === lowercaseName);
        return header ? headers[header] : null;
    };
    const contentType = (getHeader(request.headers, 'content-type') || '').toLowerCase();
    const rawTab = document.getElementById('request-body-raw');
    const formattedTab = document.getElementById('request-body-formatted');
    const rawTabButton = document.querySelector('.body-tabs .tab-btn[data-tab="raw"]');
    const formattedTabButton = document.querySelector('.body-tabs .tab-btn[data-tab="formatted"]');
    rawTab.textContent = rawBody;
    let formattedContent = '';
    let displayFormatted = true;
    let tabName = 'Formatted';
    if (/^application\/json\b/.test(contentType)) {
        try {
            const jsonBody = JSON.parse(rawBody);
            formattedContent = formatJSON(jsonBody);
            tabName = 'JSON';
        } catch (e) {
            formattedContent = '<p>Invalid JSON</p>';
            tabName = 'Invalid JSON';
        }
    } else if (/^(application|text)\/xml\b/.test(contentType)) {
        formattedContent = formatXML(rawBody);
        tabName = 'XML';
    } else if (/^application\/x-www-form-urlencoded\b/.test(contentType)) {
        formattedContent = formatFormData(rawBody);
        tabName = 'Form Data';
    } else if (/^text\/plain\b/.test(contentType)) {
        formattedContent = `<pre>${escapeHTML(rawBody)}</pre>`;
        tabName = 'Plain Text';
    } else {
        displayFormatted = false;
    }
    formattedTab.innerHTML = formattedContent;
    formattedTabButton.textContent = tabName;
    formattedTabButton.style.display = displayFormatted ? 'inline-block' : 'none';

    const isFormattedTabActive = formattedTabButton.classList.contains('active');
    if (!displayFormatted && isFormattedTabActive) {
        rawTabButton.click();
    }

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

const formatXML = (xml) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, "text/xml");
    const serializer = new XMLSerializer();
    let formatted = '';
    let indent = 0;

    const format = (node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
            const nodeName = node.nodeName;
            const attributes = Array.from(node.attributes)
                .map(attr => `<span class="xml-attribute">${attr.name}</span>="<span class="xml-attribute-value">${attr.value}</span>"`)
                .join(' ');

            formatted += '  '.repeat(indent);
            formatted += `&lt;<span class="xml-tag">${nodeName}</span>${attributes ? ' ' + attributes : ''}>`;

            if (node.childNodes.length === 1 && node.childNodes[0].nodeType === Node.TEXT_NODE) {
                formatted += `<span class="xml-text">${node.textContent}</span>`;
                formatted += `&lt;/<span class="xml-tag">${nodeName}</span>&gt;\n`;
            } else {
                formatted += '\n';
                indent++;
                Array.from(node.childNodes).forEach(format);
                indent--;
                formatted += '  '.repeat(indent);
                formatted += `&lt;/<span class="xml-tag">${nodeName}</span>&gt;\n`;
            }
        } else if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
            formatted += '  '.repeat(indent);
            formatted += `<span class="xml-text">${node.textContent.trim()}</span>\n`;
        }
    };

    format(xmlDoc.documentElement);
    return `<div class="xml-viewer">${formatted}</div>`;
};

const formatFormData = (formData) => {
    const params = new URLSearchParams(formData);
    let formatted = '<div class="form-data-viewer">';
    for (const [key, value] of params) {
        formatted += `<div class="form-data-item">`;
        formatted += `<span class="form-data-key">${escapeHTML(key)}</span>: `;
        formatted += `<span class="form-data-value">${escapeHTML(value)}</span>`;
        formatted += `</div>`;
    }
    formatted += '</div>';
    return formatted;
};

const escapeHTML = (str) => {
    return str.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

const formatJSON = (obj) => {
    return '<div class="json-viewer">' + JSON.stringify(obj, null, 2)
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
        }) + '</div>';
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
};

const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
        showCopyPopup();
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
};

const hideLoadingScreen = () => {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
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

export {
    initWebhooks,
    createWebhook,
    addRequestToWebhook,
    removeWebhook,
    setSignalRConnection,
    setBaseUrl,
    renderWebhooks,
    showWebhookDetails,
    updateExampleCommands,
    showWaitingForEvents,
    hideLoadingScreen
};