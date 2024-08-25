using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using WebhookTester;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<WebhookStore>();

builder.ConfigureSignalR();

var app = builder.Build();

app.UseHttpsRedirection();

app.UseStaticFiles();

app.UseFavicon();

app.UseIndex();

var supportedMethods = new[] { "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD" };

app.MapMethods(
    pattern: "/webhooks/{slug}",
    httpMethods: supportedMethods,
    handler: async (HttpContext context, [FromRoute] string slug, WebhookStore webhookStore, IHubContext<WebhookHub> hubContext, ILogger<Program> logger) =>
    {
        if (!webhookStore.Webhooks.TryGetValue(slug, out var clientId))
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }

        if (!webhookStore.Connections.TryGetValue(clientId, out var connectionId))
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }

        string body;
        using var reader = new StreamReader(context.Request.Body);
        body = await reader.ReadToEndAsync();

        await hubContext.Clients.Client(connectionId).SendAsync("NewRequest", new
        {
            Id = Guid.NewGuid(),
            Slug = slug,
            Timestamp = DateTime.UtcNow,
            HttpMethod = context.Request.Method,
            HttpHeaders = context.Request.Headers.ToDictionary(h => h.Key, h => h.Value.ToString()),
            HttpBody = body,
        });

        context.Response.StatusCode = StatusCodes.Status200OK;
        await context.Response.WriteAsync("Ok!");
    });

app.MapHub<WebhookHub>("/hub");

app.Run();
