using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;

namespace WebhookTester;

public class WebhookHub(WebhookStore webhookStore, IConfiguration configuration) : Hub
{
    private readonly WebhookStore _webhookStore = webhookStore;
    private readonly IConfiguration _configuration = configuration;

    public override async Task OnConnectedAsync()
    {
        var clientId = GetClientId(Context);

        _webhookStore.Connections.AddOrUpdate(clientId, Context.ConnectionId, (key, oldValue) => Context.ConnectionId);

        var baseUrl = _configuration["BaseUrl"];

        if (string.IsNullOrEmpty(baseUrl))
        {
            var httpContext = Context.GetHttpContext();

            baseUrl = $"{httpContext!.Request.Scheme}://{httpContext.Request.Host}";
        }

        await Clients.Caller.SendAsync("ReceiveBaseUrl", baseUrl);

        await base.OnConnectedAsync();
    }

    public Task CreateWebhooksAsync(IEnumerable<string> webhooks)
    {
        var clientId = GetClientId(Context);

        _webhookStore.Clients.AddOrUpdate(
            clientId,
            _ => new ConcurrentBag<string>(webhooks),
            (_, slugs) =>
            {
                foreach (var webhook in webhooks)
                {
                    slugs.Add(webhook);
                }
                return slugs;
            });

        foreach (var webhook in webhooks)
        {
            _webhookStore.Webhooks.TryAdd(webhook, clientId);
        }

        return Task.CompletedTask;
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var clientId = GetClientId(Context);

        if (_webhookStore.Clients.TryRemove(clientId, out var webhooks))
        {
            foreach (var webhook in webhooks)
            {
                _webhookStore.Webhooks.TryRemove(webhook, out var _);
            }
        }

        _webhookStore.Connections.TryRemove(clientId, out var _);

        await base.OnDisconnectedAsync(exception);
    }

    private static Guid GetClientId(HubCallerContext context)
    {
        return Guid.Parse(context.GetHttpContext()!.Request.Query["clientId"].ToString());
    }
}