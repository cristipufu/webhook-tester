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
                opt.ApplicationName = "WebhooksTester";
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

    public static IDictionary<string, string> ToFiltered(this IHeaderDictionary headers)
    {
        return headers
            .Where(kvp => !ExcludedHeaders.Contains(kvp.Key))
            .ToDictionary(h => h.Key, h => h.Value.ToString());
    }

    private static readonly HashSet<string> ExcludedHeaders = new(StringComparer.OrdinalIgnoreCase)
    {
        "Expect",
        "Max-Forwards",
        "X-ARR-LOG-ID",
        "CLIENT-IP",
        "DISGUISED-HOST",
        "X-SITE-DEPLOYMENT-ID",
        "WAS-DEFAULT-HOSTNAME",
        "X-AppService-Proto",
        "X-ARR-SSL",
        "X-Forwarded-TlsVersion",
        "X-Original-Proto",
        "X-Original-URL",
        "X-WAWS-Unencoded-URL",
        "X-Client-Port",
        "X-Original-For"
    };
}