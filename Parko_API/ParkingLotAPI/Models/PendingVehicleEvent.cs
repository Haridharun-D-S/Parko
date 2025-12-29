public class PendingVehicleEvent
{
    public int Id { get; set; }
    public string SlotId { get; set; } = string.Empty;
    public string EventType { get; set; } = string.Empty;

    // PENDING | COMPLETED | CANCELLED
    public string Status { get; set; } = "PENDING";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
