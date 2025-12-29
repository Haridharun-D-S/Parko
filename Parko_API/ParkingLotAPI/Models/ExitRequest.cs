namespace ParkingLotAPI.Models
{
    public class ExitRequest
    {
        public string VehicleNumber { get; set; } = string.Empty;
        public string OwnerName { get; set; } = string.Empty;
    }
}
