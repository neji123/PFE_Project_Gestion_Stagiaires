using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PFE.infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class rating : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Ratings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EvaluatorId = table.Column<int>(type: "int", nullable: false),
                    EvaluatedUserId = table.Column<int>(type: "int", nullable: false),
                    Score = table.Column<decimal>(type: "decimal(3,2)", nullable: false),
                    Comment = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    Type = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(450)", nullable: false, defaultValue: "Draft"),
                    DetailedScores = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SubmittedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ApprovedByUserId = table.Column<int>(type: "int", nullable: true),
                    Response = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ResponseDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    EvaluationPeriodStart = table.Column<DateTime>(type: "datetime2", nullable: true),
                    EvaluationPeriodEnd = table.Column<DateTime>(type: "datetime2", nullable: true),
                    StageReference = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Ratings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Ratings_Users_ApprovedByUserId",
                        column: x => x.ApprovedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Ratings_Users_EvaluatedUserId",
                        column: x => x.EvaluatedUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Ratings_Users_EvaluatorId",
                        column: x => x.EvaluatorId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Rating_CreatedAt",
                table: "Ratings",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Rating_EvaluatedUserId",
                table: "Ratings",
                column: "EvaluatedUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Rating_EvaluatorId",
                table: "Ratings",
                column: "EvaluatorId");

            migrationBuilder.CreateIndex(
                name: "IX_Rating_Status",
                table: "Ratings",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Rating_Type",
                table: "Ratings",
                column: "Type");

            migrationBuilder.CreateIndex(
                name: "IX_Rating_Unique_Evaluation",
                table: "Ratings",
                columns: new[] { "EvaluatorId", "EvaluatedUserId", "Type", "EvaluationPeriodStart", "EvaluationPeriodEnd" },
                unique: true,
                filter: "[EvaluationPeriodStart] IS NOT NULL AND [EvaluationPeriodEnd] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Ratings_ApprovedByUserId",
                table: "Ratings",
                column: "ApprovedByUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Ratings");
        }
    }
}
