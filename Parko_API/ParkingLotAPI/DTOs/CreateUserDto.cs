using System.ComponentModel.DataAnnotations;

public class CreateUserDto
{
    [Required]public string Username { get; set; }
    [Required]public string Password { get; set; }
    [Required]public string Role { get; set; }
}
