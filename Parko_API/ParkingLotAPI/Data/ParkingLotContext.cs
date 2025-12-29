using Microsoft.EntityFrameworkCore;
using ParkingLotAPI.Models;

namespace ParkingLotAPI.Data
{
    public class ParkingLotContext : DbContext
    {
        public ParkingLotContext(DbContextOptions<ParkingLotContext> options)
            : base(options)
        {
        }

        public DbSet<ParkedVehicle> ParkedVehicles { get; set; }
        public DbSet<ParkingSlots> ParkingSlots { get; set; }
        public DbSet<User> Users { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Unique username
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Username)
                .IsUnique();

            // Unique vehicle number per active parking
            modelBuilder.Entity<ParkedVehicle>()
                .HasIndex(v => new { v.VehicleNumber, v.ExitTime });

            // SlotId unique
            modelBuilder.Entity<ParkingSlots>()
                .HasIndex(s => s.SlotId)
                .IsUnique();

        }

        public DbSet<PendingVehicleEvent> PendingVehicleEvent { get; set; }

    }
}
