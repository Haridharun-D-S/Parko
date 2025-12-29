/*parking lot attendant*/
CREATE TABLE Supervisors (
    SupervisorID INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(100),
    Username NVARCHAR(50) UNIQUE,
    PasswordHash NVARCHAR(255)
);
