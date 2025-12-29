using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ParkingLotAPI.Data;

[ApiController]
[Route("api/iot")]
public class IoTController : ControllerBase
{
    private readonly ParkingLotContext _context;

    public IoTController(ParkingLotContext context)
    {
        _context = context;
    }

    [HttpPost("signal")]
    public async Task<IActionResult> Signal([FromBody] IoTSignalDto dto)
    {
        var slot = await _context.ParkingSlots
            .FirstOrDefaultAsync(s => s.SlotId == dto.SlotId);

        if (slot == null)
            return NotFound("Slot not found");

        if (slot.IsBlocked)
            return BadRequest("Slot is blocked");

        switch (dto.Signal)
        {
            case "ENTRY":
                // Vehicle physically arrived
                if (!slot.IsReserved)
                    return BadRequest("Slot not reserved for entry");

                slot.IsOccupied = true;
                slot.IsReserved = false;
                slot.IsExitPending = false;
                break;

            case "EXIT":
                // Vehicle physically left (but exit not finalized yet)
                if (!slot.IsOccupied)
                    return BadRequest("Slot is not occupied");

                slot.IsOccupied = false;
                slot.IsExitPending = true; // 🔥 EXIT WAITING
                break;

            default:
                return BadRequest("Invalid signal");
        }

        await _context.SaveChangesAsync();
        return Ok(new
        {
            slot.SlotId,
            slot.IsOccupied,
            slot.IsReserved,
            slot.IsExitPending
        });
    }
}
