using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ParkingLotAPI.Data;
using ParkingLotAPI.Models;
using BCrypt.Net;

[ApiController]
[Route("api/admin/users")]
[Authorize(Roles = "admin")] // 🔐 ONLY ADMIN
public class AdminUsersController : ControllerBase
{
    private readonly ParkingLotContext _context;

    public AdminUsersController(ParkingLotContext context)
    {
        _context = context;
    }

    // 🔹 GET ALL USERS (except admin)
    [HttpGet]
    public async Task<IActionResult> GetUsers()
    {
        var users = await _context.Users
            .Where(u => u.Role != "admin")
            .Select(u => new
            {
                u.Id,
                u.Username,
                u.Role
            })
            .ToListAsync();

        return Ok(users);
    }

    // 🔹 ADD USER (attendant / supervisor)
    [HttpPost]
    public async Task<IActionResult> CreateUser(CreateUserDto dto)
    {
        if (dto.Role == "admin")
            return BadRequest("Admin role cannot be created.");

        if (await _context.Users.AnyAsync(u => u.Username == dto.Username))
            return BadRequest("Username already exists.");

        var user = new User
        {
            Username = dto.Username,
            Role = dto.Role,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password)
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return Ok();
    }

    // 🔹 UPDATE USER
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(int id, UpdateUserDto dto)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound();

        if (user.Role == "admin")
            return BadRequest("Admin cannot be modified.");

        if (dto.Role == "admin")
            return BadRequest("Admin role not allowed.");

        user.Username = dto.Username;
        user.Role = dto.Role;

        if (!string.IsNullOrEmpty(dto.Password))
        {
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
        }

        await _context.SaveChangesAsync();
        return Ok();
    }

    // 🔹 DELETE USER
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound();

        if (user.Role == "admin")
            return BadRequest("Admin cannot be deleted.");

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();

        return Ok();
    }
}
