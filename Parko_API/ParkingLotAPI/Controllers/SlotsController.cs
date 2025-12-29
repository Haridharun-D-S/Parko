using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ParkingLotAPI.Data;

namespace ParkingLotAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SlotsController : ControllerBase
    {
        private readonly ParkingLotContext _context;

        public SlotsController(ParkingLotContext context)
        {
            _context = context;
        }

        /* =====================================================
           GET ALL SLOTS (FOR IOT + MAINTENANCE + DASHBOARD)
           ===================================================== */
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAllSlots()
        {
            try {
            var slots = _context.ParkingSlots
            .AsEnumerable() // 🔥 REQUIRED
            .OrderBy(s => s.SlotId[0])
            .ThenBy(s => int.Parse(s.SlotId.Substring(1)))
            .Select(s => new
            {
                s.SlotId,
                s.IsBlocked,
                s.IsOccupied,
                s.IsReserved,
                s.IsExitPending
            })
            .ToList();

            return Ok(slots);
        }

            catch (Exception ex)
            {
                Console.WriteLine("SLOTS GET ERROR: " + ex.Message);
                return StatusCode(500, "Failed to fetch slots");
            }
        }

        /* =====================================================
           IOT ENTRY WAIT → BLOCK SLOT (YELLOW)
           ===================================================== */
        [HttpPut("{slotId}/block")]
        [Authorize(Roles = "attendant,supervisor")]
        public async Task<IActionResult> BlockSlot(string slotId)
        {
            var slot = await _context.ParkingSlots
                .FirstOrDefaultAsync(s => s.SlotId == slotId);

            if (slot == null)
                return NotFound("Slot not found");

            if (slot.IsOccupied)
                return BadRequest("Cannot block an occupied slot");

            slot.IsBlocked = true;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Slot blocked (ENTRY WAIT)" });
        }

        /* =====================================================
           IOT CANCEL WAIT / EXIT DONE → UNBLOCK SLOT
           ===================================================== */
        [HttpPut("{slotId}/unblock")]
        [Authorize(Roles = "attendant,supervisor")]
        public async Task<IActionResult> UnblockSlot(string slotId)
        {
            var slot = await _context.ParkingSlots
                .FirstOrDefaultAsync(s => s.SlotId == slotId);

            if (slot == null)
                return NotFound("Slot not found");

            slot.IsBlocked = false;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Slot unblocked" });
        }
    }
}
