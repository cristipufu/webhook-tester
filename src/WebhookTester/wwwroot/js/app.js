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

const createSignalRConnection = (clientId) => {
    return new signalR.HubConnectionBuilder()
        .withUrl(`/hub?clientId=${clientId}`)
        .withAutomaticReconnect([0, 2000, 5000, 10000, 15000, 30000, null]) // Reconnect intervals
        .configureLogging(signalR.LogLevel.Information)
        .withHubProtocol(new signalR.protocols.msgpack.MessagePackHubProtocol())
        .build();
};

const startSignalRConnection = async (connection) => {
    try {
        await connection.start();
        console.log('Connected to SignalR');
    } catch (err) {
        console.error('SignalR Connection Error: ', err);
        setTimeout(() => startSignalRConnection(connection), 5000);
    }
};

const updateConnectionStatus = (status) => {
    const popup = document.getElementById('connection-status-popup');
    const statusText = document.getElementById('connection-status-text');
    const statusIcon = document.getElementById('connection-status-icon');

    if (popup && statusText && statusIcon) {
        statusText.textContent = status;

        popup.classList.remove('connection-status-connected', 'connection-status-reconnecting', 'connection-status-disconnected');

        switch (status) {
            case 'Connected':
                popup.classList.add('connection-status-connected');
                break;
            case 'Reconnecting...':
                popup.classList.add('connection-status-reconnecting');
                break;
            case 'Disconnected':
                popup.classList.add('connection-status-disconnected');
                break;
        }

        popup.classList.add('show');

        setTimeout(() => {
            popup.classList.remove('show');
        }, 5000);
    }
};

const init = async () => {
    await openDB();
    const clientId = getOrCreateClientId();
    const connection = createSignalRConnection(clientId);

    connection.onreconnecting(() => updateConnectionStatus('Reconnecting...'));
    connection.onreconnected(() => updateConnectionStatus('Connected'));
    connection.onclose(async (error) => {
        updateConnectionStatus('Disconnected')
        await startSignalRConnection(connection);
    });

    connection.on('ReceiveBaseUrl', async (baseUrl) => {
        console.log('Received base URL:', baseUrl);
        setBaseUrl(baseUrl);
        await initWebhooks();
    });

    connection.on('NewRequest', (webhookRequest) => {
        console.log('New Webhook Request:', webhookRequest);

        const request = {
            id: webhookRequest.Id,
            timestamp: new Date(webhookRequest.Timestamp).toISOString(),
            method: webhookRequest.HttpMethod,
            headers: webhookRequest.HttpHeaders,
            body: webhookRequest.HttpBody
        };
        addRequestToWebhook(webhookRequest.Slug, request);
    });

    await startSignalRConnection(connection);
    console.log('Connected to SignalR with clientId:', clientId);
    setSignalRConnection(connection);
    updateConnectionStatus('Connected');

    const addWebhookButton = document.getElementById('add-webhook');
    addWebhookButton.addEventListener('click', createWebhook);
};

init().catch(err => console.error('Initialization error: ', err));