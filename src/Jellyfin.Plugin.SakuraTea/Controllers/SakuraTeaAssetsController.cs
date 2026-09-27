using Jellyfin.Plugin.SakuraTea.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.SakuraTea.Controllers;

[ApiController]
[Route("SakuraTea")]
public sealed class SakuraTeaAssetsController : ControllerBase
{
    // Visual settings are readable by signed-in viewers, not just administrators.
    [HttpGet("Settings")]
    [Authorize]
    public ActionResult GetSettings()
    {
        Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
        return Ok(SakuraTeaPlugin.Instance.Configuration);
    }

    [HttpGet("{assetFileName}")]
    [AllowAnonymous]
    public ActionResult GetAsset(string assetFileName)
    {
        if (!FrontendAssets.ByFileName.TryGetValue(assetFileName, out FrontendAssets.Asset? asset))
            return NotFound();

        Stream? stream = typeof(SakuraTeaPlugin).Assembly.GetManifestResourceStream(asset.ResourceName);
        if (stream is null) return NotFound();

        Response.Headers.CacheControl = "public, max-age=3600";
        return File(stream, asset.ContentType);
    }
}
