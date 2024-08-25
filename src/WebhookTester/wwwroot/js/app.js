import { openDB } from './db.js';
import { initWebhooks, createWebhook, addRequestToWebhook, setSignalRConnection, setBaseUrl } from './webhooks.js';

const generateGuid = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const getOrCreateClientId = () => {
    let clientId = localStorage.getItem('clientId');
    if (!clientId) {
        clientId = generateGuid();
        localStorage.setItem('clientId', clientId);
    }
    return clientId;
};

const init = async () => {
    await openDB();
    const clientId = getOrCreateClientId();

    const connection = new signalR.HubConnectionBuilder()
        .withUrl(`/hub?clientId=${clientId}`)
        .build();

    connection.on('ReceiveBaseUrl', async (baseUrl) => {
        console.log('Received base URL:', baseUrl);
        setBaseUrl(baseUrl);
        await initWebhooks();
    });

    connection.on('NewRequest', (webhookRequest) => {
        console.log('New Webhook Request:', webhookRequest);
        const request = {
            id: webhookRequest.id,
            timestamp: new Date(webhookRequest.timestamp).toISOString(),
            method: webhookRequest.httpMethod,
            headers: webhookRequest.httpHeaders,
            body: webhookRequest.httpBody
        };
        addRequestToWebhook(webhookRequest.slug, request);
    });

    await connection.start();
    console.log('Connected to SignalR with clientId:', clientId);

    setSignalRConnection(connection);

    const addWebhookButton = document.getElementById('add-webhook');
    addWebhookButton.addEventListener('click', createWebhook);
};

init().catch(err => console.error('Initialization error: ', err));