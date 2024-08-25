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
}