﻿using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PFE.infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddIsRejectedToReports : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsRejected",
                table: "Reports",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsRejected",
                table: "Reports");
        }
    }
}
