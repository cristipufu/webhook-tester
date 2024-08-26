using System.Collections.Concurrent;

namespace WebhookTester;

public class WebhookStore
{
    // webhook, clientId
    public ConcurrentDictionary<string, Guid> Webhooks = new();

    // clientId, connectionId
    public ConcurrentDictionary<Guid, string> Connections = new();

    // clientId, webhooks
    public ConcurrentDictionary<Guid, ConcurrentBag<string>> Clients = new();
}
