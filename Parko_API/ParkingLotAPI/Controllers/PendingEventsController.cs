using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ParkingLotAPI.Data;

[ApiController]
[Route("api/pending-events")]
[Authorize(Roles = "attendant,supervisor")]
public class PendingEventsController : ControllerBase
{
    private readonly ParkingLotContext _context;

    public PendingEventsController(ParkingLotContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetPendingEvents()
    {
        var events = await _context.PendingVehicleEvent
            .Where(e => e.Status == "PENDING")
            .OrderBy(e => e.CreatedAt)
            .ToListAsync();

        return Ok(events);
    }
}
