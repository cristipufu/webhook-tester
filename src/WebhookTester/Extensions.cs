namespace WebhookTester;

public static class Extensions
{
    public static void ConfigureSignalR(this WebApplicationBuilder builder)
    {
        var signalRConnectionString = builder.Configuration.GetConnectionString("AzureSignalR");

        var signalRBuilder = builder.Services.AddSignalR(hubOptions =>
        {
            hubOptions.EnableDetailedErrors = true;
        }).AddMessagePackProtocol();

        if (!string.IsNullOrEmpty(signalRConnectionString))
        {
            signalRBuilder.AddAzureSignalR(opt =>
            {
                opt.ConnectionString = signalRConnectionString;
            });
        }
    }

    public static void UseFavicon(this WebApplication app)
    {
        app.MapGet("/favicon.ico", async context =>
        {
            context.Response.ContentType = "image/x-icon";
            await context.Response.SendFileAsync("wwwroot/favicon.ico");
        });
    }

    public static void UseIndex(this WebApplication app)
    {
        app.MapGet("/", async (HttpContext context, ILogger<Program> logger) =>
        {
            var filePath = Path.Combine(app.Environment.WebRootPath, "index.html");

            if (File.Exists(filePath))
            {
                context.Response.ContentType = "text/html";
                await context.Response.SendFileAsync(filePath);
            }
            else
            {
                context.Response.StatusCode = StatusCodes.Status404NotFound;
                await context.Response.WriteAsync("Index page not found");
            }
        });
    }
}