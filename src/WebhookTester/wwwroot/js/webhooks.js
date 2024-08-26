import { saveWebhooks, getWebhooks, removeWebhook as removeWebhookFromDB } from './db.js';
import { renderWebhooks, showWebhookDetails, showWaitingForEvents } from './ui.js';

let webhooks = [];
let signalRConnection = null;
let baseUrl = null;

const setSignalRConnection = (connection) => {
    signalRConnection = connection;
};

const setBaseUrl = (url) => {
    baseUrl = url;
};

const initWebhooks = async () => {
    webhooks = await getWebhooks();
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
            await saveWebhooks(webhooks);
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
        saveWebhooks(webhooks);
        showWebhookDetails(webhooks.indexOf(webhook), webhooks);
    }
};

const removeWebhook = async (slug) => {
    webhooks = webhooks.filter(webhook => webhook.slug !== slug);
    await removeWebhookFromDB(slug);
    renderWebhooks(webhooks);
    if (webhooks.length > 0) {
        showWebhookDetails(0, webhooks);
    } else {
        showWaitingForEvents();
    }
};

export { initWebhooks, createWebhook, addRequestToWebhook, removeWebhook, setSignalRConnection, setBaseUrl };