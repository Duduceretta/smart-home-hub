using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartHomeHub.Domain.Entities;

namespace SmartHomeHub.Infrastructure.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.HasKey(user => user.Id);

        builder.Property(user => user.Name).IsRequired().HasMaxLength(100);
        builder.Property(user => user.Email).IsRequired().HasMaxLength(150);

        builder.Property(user => user.ExternalAuthUid).IsRequired().HasMaxLength(128);
        builder.HasIndex(user => user.ExternalAuthUid).IsUnique();
    }
}
