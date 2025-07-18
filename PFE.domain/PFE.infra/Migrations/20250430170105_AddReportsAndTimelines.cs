using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PFE.infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddReportsAndTimelines : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "StageTimelines",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StagiaireId = table.Column<int>(type: "int", nullable: false),
                    LancementStage = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DemandeConvention = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RemisePlanTravail = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DepotJournalBord = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DepotBilanV1 = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Restitution = table.Column<DateTime>(type: "datetime2", nullable: false),
                    VisiteMiParcours = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DepotBilanV2 = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DepotRapportFinal = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StageTimelines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StageTimelines_Users_StagiaireId",
                        column: x => x.StagiaireId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Reports",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FilePath = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SubmissionDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DueDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsSubmitted = table.Column<bool>(type: "bit", nullable: false),
                    IsApproved = table.Column<bool>(type: "bit", nullable: false),
                    FeedbackComments = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ReportType = table.Column<int>(type: "int", nullable: false),
                    StagiaireId = table.Column<int>(type: "int", nullable: false),
                    ApproverId = table.Column<int>(type: "int", nullable: true),
                    StageTimelineId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Reports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Reports_StageTimelines_StageTimelineId",
                        column: x => x.StageTimelineId,
                        principalTable: "StageTimelines",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Reports_Users_ApproverId",
                        column: x => x.ApproverId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Reports_Users_StagiaireId",
                        column: x => x.StagiaireId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Reports_ApproverId",
                table: "Reports",
                column: "ApproverId");

            migrationBuilder.CreateIndex(
                name: "IX_Reports_StageTimelineId",
                table: "Reports",
                column: "StageTimelineId");

            migrationBuilder.CreateIndex(
                name: "IX_Reports_StagiaireId",
                table: "Reports",
                column: "StagiaireId");

            migrationBuilder.CreateIndex(
                name: "IX_StageTimelines_StagiaireId",
                table: "StageTimelines",
                column: "StagiaireId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Reports");

            migrationBuilder.DropTable(
                name: "StageTimelines");
        }
    }
}
