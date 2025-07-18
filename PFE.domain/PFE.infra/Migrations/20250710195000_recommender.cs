using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PFE.infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class recommender : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_JobOfferRecommendations_Users_GeneratedByUserId",
                table: "JobOfferRecommendations");

            migrationBuilder.DropIndex(
                name: "IX_JobOfferRecommendations_GeneratedByUserId",
                table: "JobOfferRecommendations");

            migrationBuilder.DropColumn(
                name: "ContactedAt",
                table: "JobOfferRecommendations");

            migrationBuilder.DropColumn(
                name: "GeneratedByUserId",
                table: "JobOfferRecommendations");

            migrationBuilder.DropColumn(
                name: "RatingScore",
                table: "JobOfferRecommendations");

            migrationBuilder.RenameColumn(
                name: "ViewedAt",
                table: "JobOfferRecommendations",
                newName: "UpdatedAt");

            migrationBuilder.AlterColumn<string>(
                name: "Notes",
                table: "JobOfferRecommendations",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(2000)",
                oldMaxLength: 2000);

            migrationBuilder.AlterColumn<bool>(
                name: "IsSelected",
                table: "JobOfferRecommendations",
                type: "bit",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "bit");

            migrationBuilder.AlterColumn<bool>(
                name: "IsActive",
                table: "JobOfferRecommendations",
                type: "bit",
                nullable: false,
                defaultValue: true,
                oldClrType: typeof(bool),
                oldType: "bit");

            migrationBuilder.AlterColumn<DateTime>(
                name: "GeneratedAt",
                table: "JobOfferRecommendations",
                type: "datetime2",
                nullable: false,
                defaultValueSql: "GETUTCDATE()",
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AlterColumn<bool>(
                name: "DepartmentMatch",
                table: "JobOfferRecommendations",
                type: "bit",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "bit");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "JobOfferRecommendations",
                type: "datetime2",
                nullable: false,
                defaultValueSql: "GETUTCDATE()");

            migrationBuilder.AddColumn<string>(
                name: "Department",
                table: "JobOfferRecommendations",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "IsContacted",
                table: "JobOfferRecommendations",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsViewed",
                table: "JobOfferRecommendations",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Skills",
                table: "JobOfferRecommendations",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "StagiaireEmail",
                table: "JobOfferRecommendations",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "StagiaireeName",
                table: "JobOfferRecommendations",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "University",
                table: "JobOfferRecommendations",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "JobOfferRecommendations");

            migrationBuilder.DropColumn(
                name: "Department",
                table: "JobOfferRecommendations");

            migrationBuilder.DropColumn(
                name: "IsContacted",
                table: "JobOfferRecommendations");

            migrationBuilder.DropColumn(
                name: "IsViewed",
                table: "JobOfferRecommendations");

            migrationBuilder.DropColumn(
                name: "Skills",
                table: "JobOfferRecommendations");

            migrationBuilder.DropColumn(
                name: "StagiaireEmail",
                table: "JobOfferRecommendations");

            migrationBuilder.DropColumn(
                name: "StagiaireeName",
                table: "JobOfferRecommendations");

            migrationBuilder.DropColumn(
                name: "University",
                table: "JobOfferRecommendations");

            migrationBuilder.RenameColumn(
                name: "UpdatedAt",
                table: "JobOfferRecommendations",
                newName: "ViewedAt");

            migrationBuilder.AlterColumn<string>(
                name: "Notes",
                table: "JobOfferRecommendations",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(2000)",
                oldMaxLength: 2000,
                oldNullable: true);

            migrationBuilder.AlterColumn<bool>(
                name: "IsSelected",
                table: "JobOfferRecommendations",
                type: "bit",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "bit",
                oldDefaultValue: false);

            migrationBuilder.AlterColumn<bool>(
                name: "IsActive",
                table: "JobOfferRecommendations",
                type: "bit",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "bit",
                oldDefaultValue: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "GeneratedAt",
                table: "JobOfferRecommendations",
                type: "datetime2",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldDefaultValueSql: "GETUTCDATE()");

            migrationBuilder.AlterColumn<bool>(
                name: "DepartmentMatch",
                table: "JobOfferRecommendations",
                type: "bit",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "bit",
                oldDefaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "ContactedAt",
                table: "JobOfferRecommendations",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "GeneratedByUserId",
                table: "JobOfferRecommendations",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "RatingScore",
                table: "JobOfferRecommendations",
                type: "decimal(5,4)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateIndex(
                name: "IX_JobOfferRecommendations_GeneratedByUserId",
                table: "JobOfferRecommendations",
                column: "GeneratedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_JobOfferRecommendations_Users_GeneratedByUserId",
                table: "JobOfferRecommendations",
                column: "GeneratedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
