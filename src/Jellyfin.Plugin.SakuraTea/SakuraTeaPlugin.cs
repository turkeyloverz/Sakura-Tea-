using Jellyfin.Plugin.SakuraTea.Configuration;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;

namespace Jellyfin.Plugin.SakuraTea;

public sealed class SakuraTeaPlugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    public SakuraTeaPlugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
        : base(applicationPaths, xmlSerializer)
    {
        Instance = this;
    }

    public static SakuraTeaPlugin Instance { get; private set; } = null!;

    public override Guid Id => Guid.Parse("3bf6515b-c10a-4307-a3e8-942eaffe900d");
    public override string Name => "Sakura Tea";
    public override string Description => "A Sakura-inspired cinematic Jellyfin Web experience.";

    public IEnumerable<PluginPageInfo> GetPages()
    {
        yield return new PluginPageInfo
        {
            Name = Name,
            DisplayName = Name,
            EnableInMainMenu = true,
            MenuIcon = "local_florist",
            EmbeddedResourcePath = $"{GetType().Namespace}.Configuration.config.html"
        };
    }
}
