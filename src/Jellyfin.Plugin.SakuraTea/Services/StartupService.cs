using System.Reflection;
using System.Runtime.Loader;
using Jellyfin.Plugin.SakuraTea.Helpers;
using MediaBrowser.Model.Tasks;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json.Linq;

namespace Jellyfin.Plugin.SakuraTea.Services;

public sealed class StartupService : IScheduledTask
{
    private static readonly Guid IndexHtmlTransformationId = Guid.Parse("24e569f2-ab5f-4b8b-be96-423297697410");
    private readonly ILogger<StartupService> _logger;

    public StartupService(ILogger<StartupService> logger) => _logger = logger;

    public string Name => "Sakura Tea Startup";
    public string Key => "Jellyfin.Plugin.SakuraTea.Startup";
    public string Description => "Registers Sakura Tea frontend assets with Jellyfin Web.";
    public string Category => "Startup Services";

    public Task ExecuteAsync(IProgress<double> progress, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        try
        {
            Assembly? ft = AssemblyLoadContext.All
                .SelectMany(context => context.Assemblies)
                .FirstOrDefault(a => a.GetName().Name?.Contains(".FileTransformation", StringComparison.Ordinal) == true);

            if (ft is null)
            {
                _logger.LogWarning("Sakura Tea requires File Transformation to inject frontend assets.");
                return Task.CompletedTask;
            }

            Type? interfaceType = ft.GetType("Jellyfin.Plugin.FileTransformation.PluginInterface");
            MethodInfo? register = interfaceType?.GetMethod(
                "RegisterTransformation",
                BindingFlags.Public | BindingFlags.Static,
                binder: null,
                types: [typeof(JObject)],
                modifiers: null);

            if (register is null || register.ReturnType != typeof(void))
            {
                _logger.LogWarning("Sakura Tea could not find the supported File Transformation registration contract.");
                return Task.CompletedTask;
            }

            var registration = new JObject
            {
                ["id"] = IndexHtmlTransformationId,
                ["fileNamePattern"] = "index.html",
                ["callbackAssembly"] = GetType().Assembly.FullName,
                ["callbackClass"] = typeof(TransformationPatches).FullName,
                ["callbackMethod"] = nameof(TransformationPatches.IndexHtml)
            };

            register.Invoke(null, [registration]);
            _logger.LogInformation("Sakura Tea registered its Jellyfin Web transformation.");
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "Sakura Tea could not register with File Transformation.");
        }

        return Task.CompletedTask;
    }

    public IEnumerable<TaskTriggerInfo> GetDefaultTriggers()
    {
        yield return new TaskTriggerInfo { Type = TaskTriggerInfoType.StartupTrigger };
    }
}
