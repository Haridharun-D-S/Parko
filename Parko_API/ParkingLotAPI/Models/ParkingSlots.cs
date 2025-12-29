using System.ComponentModel.DataAnnotations;

namespace ParkingLotAPI.Models
{
    public class ParkingSlots
    {
        [Key]
        public int Id { get; set; }  // primary key for EF

        [Required]
        public string SlotId { get; set; } = string.Empty; // example: A1, A2 ...
        public bool IsBlocked { get; set; } 

        public bool IsOccupied { get; set; }
        public bool IsReserved { get; set; }
        public bool IsExitPending { get; set; }

    }
}
