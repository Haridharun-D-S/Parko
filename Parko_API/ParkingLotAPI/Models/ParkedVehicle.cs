using System;
using System.ComponentModel.DataAnnotations;

namespace ParkingLotAPI.Models
{
    public class ParkedVehicle
    {
        [Key]
        public int VehicleId { get; set; }

        [Required]
        public string VehicleNumber { get; set; }

        [Required]
        public string OwnerName { get; set; }
        public string? VehicleImagePath { get; set; }


        public string? SlotId { get; set; } // links to ParkingSlots.SlotId
        public DateTime EntryTime { get; set; } = DateTime.Now;
        public DateTime? ExitTime { get; set; }

        public int? TotalTimeInMinutes { get; set; }
        public decimal? ParkingFee { get; set; }
    }
}
