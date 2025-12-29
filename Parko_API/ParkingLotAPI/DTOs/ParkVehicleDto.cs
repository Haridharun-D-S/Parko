namespace ParkingLotAPI.DTOs
{
    public class ParkVehicleDto
    {
        public string OwnerName { get; set; } = string.Empty;
        public string VehicleNumber { get; set; } = string.Empty;

        public string? ImageBase64 { get; set; }
    }
}
