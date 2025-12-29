using Microsoft.EntityFrameworkCore;
using ParkingLotAPI.Models;

namespace ParkingLotManagementAPI.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
        public DbSet<Admin> Admins { get; set; }

        public DbSet<ParkingAttendant> ParkingAttendants { get; set; }
        public DbSet<Supervisor> Supervisors { get; set; }
        public DbSet<Vehicle> ParkedVehicles { get; set; }
    }
}
