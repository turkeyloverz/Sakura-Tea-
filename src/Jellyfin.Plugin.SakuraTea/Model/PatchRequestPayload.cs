using System.Text.Json.Serialization;

namespace Jellyfin.Plugin.SakuraTea.Model;

public sealed class PatchRequestPayload
{
    [JsonPropertyName("contents")]
    public string? Contents { get; set; }
}
