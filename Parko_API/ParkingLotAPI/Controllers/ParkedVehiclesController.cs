using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ParkingLotAPI.Data;
using ParkingLotAPI.Models;
using ParkingLotAPI.DTOs;

namespace ParkingLotAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ParkedVehiclesController : ControllerBase
    {
        private readonly ParkingLotContext _context;
        private static readonly TimeZoneInfo IST =
            TimeZoneInfo.FindSystemTimeZoneById("India Standard Time");

        public ParkedVehiclesController(ParkingLotContext context)
        {
            _context = context;
        }

        /* =========================
           ADMIN / SUPERVISOR
        ========================== */

        [HttpGet]
        [Authorize(Roles = "admin,supervisor")]
        public async Task<IActionResult> GetAll()
        {
            return Ok(await _context.ParkedVehicles.ToListAsync());
        }

        /* =========================
           AVAILABLE SLOTS
           (ONLY TRULY FREE)
        ========================== */

        [HttpGet("available-slots")]
        [Authorize(Roles = "supervisor,attendant")]
        public async Task<IActionResult> GetAvailableSlots()
        {
            // Step 1: let SQL do ONLY what it can
            var rawSlots = await _context.ParkingSlots
                .Where(s =>
                    !s.IsBlocked &&
                    !s.IsOccupied &&
                    !s.IsReserved &&
                    !s.IsExitPending)
                .Select(s => s.SlotId) // 🔥 only fetch SlotId from DB
                .ToListAsync();        // 🔥 materialize here

            // Step 2: do ALL string logic in memory (safe)
            var orderedSlots = rawSlots
                .OrderBy(id => id[0])
                .ThenBy(id => int.Parse(id.Substring(1)))
                .ToList();

            return Ok(orderedSlots);
        }

        /* =========================
           VEHICLE ENTRY (MODE 1)
        ========================== */

        private bool IsValidBase64Image(string base64)
        {
            if (!base64.StartsWith("data:image/")) return false;
            if (!base64.Contains(",")) return false;

            var bytes = Convert.FromBase64String(base64.Split(',')[1]);
            return bytes.Length <= 500 * 1024;
        }

        [HttpPost]
        [Authorize(Roles = "attendant")]
        public async Task<IActionResult> ParkVehicle([FromBody] ParkVehicleDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.OwnerName) ||
                string.IsNullOrWhiteSpace(dto.VehicleNumber))
            {
                return BadRequest("Owner name and vehicle number are required.");
            }

            // Prevent duplicate parking
            var alreadyParked = await _context.ParkedVehicles
                .AnyAsync(v => v.VehicleNumber == dto.VehicleNumber && v.ExitTime == null);

            if (alreadyParked)
                return BadRequest("Vehicle already parked.");

            // 🔥 Find FIRST FREE SLOT (DB-SAFE)
            var slot = (await _context.ParkingSlots
            .Where(s => !s.IsBlocked && !s.IsOccupied && !s.IsReserved && !s.IsExitPending)
            .ToListAsync())
            .OrderBy(s => s.SlotId[0])
            .ThenBy(s => int.Parse(s.SlotId.Substring(1)))
            .FirstOrDefault();


            if (slot == null)
                return BadRequest("No slots available.");

            /* ========= IMAGE SAVE ========= */
            string? imagePath = null;

            if (!string.IsNullOrEmpty(dto.ImageBase64))
            {
                if (!IsValidBase64Image(dto.ImageBase64))
                    return BadRequest("Invalid or oversized image.");

                var dir = Path.Combine("wwwroot", "vehicle-images");
                Directory.CreateDirectory(dir);

                var fileName = $"{dto.VehicleNumber}_{DateTime.UtcNow:yyyyMMddHHmmss}.jpg";
                var fullPath = Path.Combine(dir, fileName);

                var bytes = Convert.FromBase64String(dto.ImageBase64.Split(',')[1]);
                await System.IO.File.WriteAllBytesAsync(fullPath, bytes);

                imagePath = $"/vehicle-images/{fileName}";
            }

            /* ========= ENTRY WAITING ========= */
            slot.IsBlocked = false;     // RESERVED
            slot.IsOccupied = false;  // NOT YET PARKED
            slot.IsReserved = true;
            var vehicle = new ParkedVehicle
            {
                OwnerName = dto.OwnerName,
                VehicleNumber = dto.VehicleNumber,
                SlotId = slot.SlotId,
                EntryTime = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, IST),
                VehicleImagePath = imagePath
            };

            _context.ParkedVehicles.Add(vehicle);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Vehicle entry registered (waiting for arrival)",
                vehicle.VehicleId,
                vehicle.SlotId
            });
        }

        /* =========================
           VEHICLE EXIT
           (UPDATE ONLY)
        ========================== */

        [HttpPost("exit")]
        [Authorize(Roles = "attendant")]
        public async Task<IActionResult> ExitVehicle([FromBody] ExitRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.VehicleNumber) ||
                string.IsNullOrWhiteSpace(request.OwnerName))
            {
                return BadRequest("Vehicle number and owner name are required.");
            }

            // Find active record
            var vehicle = await _context.ParkedVehicles
                .FirstOrDefaultAsync(v =>
                    v.VehicleNumber == request.VehicleNumber &&
                    v.OwnerName == request.OwnerName &&
                    v.ExitTime == null);

            if (vehicle == null)
                return NotFound("Active parking record not found.");

            // Update exit info
            vehicle.ExitTime = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, IST);

            vehicle.TotalTimeInMinutes =
                Math.Max(1, (int)(vehicle.ExitTime.Value - vehicle.EntryTime).TotalMinutes);

            vehicle.ParkingFee =
                vehicle.TotalTimeInMinutes <= 180
                    ? 30
                    : 30 + (int)((vehicle.TotalTimeInMinutes - 180) * 0.1);

            // 🔥 FREE SLOT COMPLETELY
            var slot = await _context.ParkingSlots
                .FirstOrDefaultAsync(s => s.SlotId == vehicle.SlotId);

            if (slot != null)
            {
                slot.IsBlocked = false;
                slot.IsOccupied = false;
                slot.IsReserved = false;
                slot.IsExitPending = false;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                vehicle.VehicleNumber,
                vehicle.SlotId,
                vehicle.EntryTime,
                vehicle.ExitTime,
                vehicle.TotalTimeInMinutes,
                vehicle.ParkingFee
            });
        }

        /* =========================
           ADMIN DELETE
        ========================== */

        [HttpDelete("{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> DeleteVehicle(int id)
        {
            var v = await _context.ParkedVehicles.FindAsync(id);
            if (v == null) return NotFound();

            _context.ParkedVehicles.Remove(v);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }

    /* =========================
       DTOs
    ========================== */

    public class ParkVehicleDto
    {
        public string OwnerName { get; set; } = string.Empty;
        public string VehicleNumber { get; set; } = string.Empty;
        public string? ImageBase64 { get; set; }
    }

    public class ExitRequest
    {
        public string VehicleNumber { get; set; } = string.Empty;
        public string OwnerName { get; set; } = string.Empty;
    }
}
