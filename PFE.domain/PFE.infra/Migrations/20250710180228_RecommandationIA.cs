using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PFE.infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RecommandationIA : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "LastRecommendationGeneratedAt",
                table: "JobOffers",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RecommendationCount",
                table: "JobOffers",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "RecommendationsGenerated",
                table: "JobOffers",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "Status",
                table: "JobOffers",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.CreateTable(
                name: "JobOfferRecommendations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    JobOfferId = table.Column<int>(type: "int", nullable: false),
                    StagiaireId = table.Column<int>(type: "int", nullable: false),
                    CompositeScore = table.Column<decimal>(type: "decimal(5,4)", nullable: false),
                    SkillSimilarity = table.Column<decimal>(type: "decimal(5,4)", nullable: false),
                    TextSimilarity = table.Column<decimal>(type: "decimal(5,4)", nullable: false),
                    DepartmentMatch = table.Column<bool>(type: "bit", nullable: false),
                    RatingScore = table.Column<decimal>(type: "decimal(5,4)", nullable: false),
                    RecommendationRank = table.Column<int>(type: "int", nullable: false),
                    MatchReasons = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    GeneratedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    GeneratedByUserId = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    ViewedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ContactedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsSelected = table.Column<bool>(type: "bit", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JobOfferRecommendations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JobOfferRecommendations_JobOffers_JobOfferId",
                        column: x => x.JobOfferId,
                        principalTable: "JobOffers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_JobOfferRecommendations_Users_GeneratedByUserId",
                        column: x => x.GeneratedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_JobOfferRecommendations_Users_StagiaireId",
                        column: x => x.StagiaireId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_JobOfferRecommendation_JobOffer_Active",
                table: "JobOfferRecommendations",
                columns: new[] { "JobOfferId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_JobOfferRecommendation_JobOffer_Rank",
                table: "JobOfferRecommendations",
                columns: new[] { "JobOfferId", "RecommendationRank" });

            migrationBuilder.CreateIndex(
                name: "IX_JobOfferRecommendation_JobOfferId",
                table: "JobOfferRecommendations",
                column: "JobOfferId");

            migrationBuilder.CreateIndex(
                name: "IX_JobOfferRecommendation_StagiaireId",
                table: "JobOfferRecommendations",
                column: "StagiaireId");

            migrationBuilder.CreateIndex(
                name: "IX_JobOfferRecommendations_GeneratedByUserId",
                table: "JobOfferRecommendations",
                column: "GeneratedByUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "JobOfferRecommendations");

            migrationBuilder.DropColumn(
                name: "LastRecommendationGeneratedAt",
                table: "JobOffers");

            migrationBuilder.DropColumn(
                name: "RecommendationCount",
                table: "JobOffers");

            migrationBuilder.DropColumn(
                name: "RecommendationsGenerated",
                table: "JobOffers");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "JobOffers");
        }
    }
}
