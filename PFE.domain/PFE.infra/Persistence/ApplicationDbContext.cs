using Microsoft.EntityFrameworkCore;
using PFE.domain.Entities;

namespace PFE.infracstructure.Persistence
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        // Déclaration des DbSet pour les entités
        public DbSet<User> Users { get; set; }
        public DbSet<Project> Projects { get; set; }
        public DbSet<Sprint> Sprints { get; set; }
        public DbSet<ProjectTask> Tasks { get; set; }
        public DbSet<ProjectUser> ProjectUsers { get; set; }
        public DbSet<SprintHistory> SprintHistories { get; set; }
        public DbSet<University> Universities { get; set; }
        public DbSet<Department> Departments { get; set; }
        public DbSet<Report> Reports { get; set; }
        public DbSet<StageTimeline> StageTimelines { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<Meeting> Meetings { get; set; }
        public DbSet<MeetingParticipant> MeetingParticipants { get; set; }
        public DbSet<ReportType> ReportTypes { get; set; }
        public DbSet<Rating> Ratings { get; set; }

        public DbSet<Post> Posts { get; set; }
        public DbSet<PostAttachment> PostAttachments { get; set; }
        public DbSet<PostLike> PostLikes { get; set; }
        public DbSet<PostComment> PostComments { get; set; }
        public DbSet<JobOffer> JobOffers { get; set; }
        public DbSet<JobOfferRecommendation> JobOfferRecommendations { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configuration User
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(u => u.Id);
                entity.Property(u => u.Username).IsRequired();
            });

            // CORRECTION: Une seule configuration pour University
            modelBuilder.Entity<User>()
                .HasOne(u => u.University)
                .WithMany()
                .HasForeignKey(u => u.UniversityId)
                .IsRequired(false);

            // Configuration ProjectUser - CORRECTION: Spécifier la propriété de navigation
            modelBuilder.Entity<ProjectUser>()
                .HasKey(pu => new { pu.ProjectId, pu.UserId });

            modelBuilder.Entity<ProjectUser>()
                .HasOne(pu => pu.Project)
                .WithMany(p => p.ProjectUsers)
                .HasForeignKey(pu => pu.ProjectId);

            // CORRECTION: Spécifier la propriété ProjectUsers
            modelBuilder.Entity<ProjectUser>()
                .HasOne(pu => pu.User)
                .WithMany(u => u.ProjectUsers) // <- AJOUTÉ: spécifier la propriété de navigation
                .HasForeignKey(pu => pu.UserId);

            // Relations pour Sprint
            modelBuilder.Entity<Sprint>()
                .HasOne(s => s.Project)
                .WithMany(p => p.Sprints)
                .HasForeignKey(s => s.ProjectId);

            modelBuilder.Entity<ProjectTask>()
                .HasOne(t => t.Sprint)
                .WithMany(s => s.Tasks)
                .HasForeignKey(t => t.SprintId);

            modelBuilder.Entity<ProjectTask>()
                .HasOne(t => t.AssignedTo)
                .WithMany()
                .HasForeignKey(t => t.AssignedToId)
                .IsRequired(false);

            // Relations pour SprintHistory
            modelBuilder.Entity<SprintHistory>()
                .HasOne(sh => sh.Sprint)
                .WithMany(s => s.SprintHistories)
                .HasForeignKey(sh => sh.SprintId);

            modelBuilder.Entity<Report>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Description).HasMaxLength(1000);
                entity.Property(e => e.FeedbackComments).HasMaxLength(2000);
                entity.Property(e => e.Status).HasMaxLength(20).HasDefaultValue("Actif");
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

                // Relations
                entity.HasOne(e => e.ReportType)
                      .WithMany(rt => rt.Reports)
                      .HasForeignKey(e => e.ReportTypeId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Stagiaire)
                      .WithMany()
                      .HasForeignKey(e => e.StagiaireId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Approver)
                      .WithMany()
                      .HasForeignKey(e => e.ApproverId)
                      .OnDelete(DeleteBehavior.SetNull);
            });

            modelBuilder.Entity<StageTimeline>(entity =>
            {
                entity.HasKey(t => t.Id);

                entity.HasOne(t => t.Stagiaire)
                    .WithOne()
                    .HasForeignKey<StageTimeline>(t => t.StagiaireId)
                    .OnDelete(DeleteBehavior.NoAction);
            });

            modelBuilder.Entity<Notification>()
                .HasOne(n => n.User)
                .WithMany(u => u.Notifications)
                .HasForeignKey(n => n.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Meeting>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.Property(e => e.Title)
                      .HasMaxLength(200)
                      .IsRequired();

                entity.Property(e => e.Type)
                      .HasConversion<string>()
                      .HasMaxLength(50)
                      .IsRequired();

                entity.Property(e => e.Status)
                      .HasConversion<string>()
                      .HasMaxLength(20)
                      .IsRequired();

                entity.Property(e => e.Date)
                      .HasColumnType("date")
                      .IsRequired();

                entity.Property(e => e.Time)
                      .HasColumnType("time")
                      .IsRequired();

                entity.Property(e => e.Duration)
                      .IsRequired();

                entity.Property(e => e.Description)
                      .HasMaxLength(1000);

                entity.Property(e => e.Location)
                      .HasMaxLength(200);

                entity.Property(e => e.CreatedAt)
                      .HasColumnType("datetime2")
                      .HasDefaultValueSql("GETUTCDATE()");

                entity.Property(e => e.UpdatedAt)
                      .HasColumnType("datetime2")
                      .HasDefaultValueSql("GETUTCDATE()");

                entity.HasOne(e => e.Organizer)
                      .WithMany()
                      .HasForeignKey(e => e.OrganizerId)
                      .OnDelete(DeleteBehavior.NoAction);

                entity.HasIndex(e => e.Date);
                entity.HasIndex(e => e.OrganizerId);
                entity.HasIndex(e => new { e.Date, e.Time });
            });

            modelBuilder.Entity<MeetingParticipant>(entity =>
            {
                entity.HasKey(e => new { e.MeetingId, e.UserId });

                entity.Property(e => e.JoinedAt)
                      .HasColumnType("datetime2")
                      .HasDefaultValueSql("GETUTCDATE()");

                entity.Property(e => e.HasAccepted)
                      .HasDefaultValue(false);

                entity.HasOne(e => e.Meeting)
                      .WithMany(e => e.MeetingParticipants)
                      .HasForeignKey(e => e.MeetingId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.User)
                      .WithMany()
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.NoAction);

                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.MeetingId);
            });

            modelBuilder.Entity<ReportType>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Description).HasMaxLength(500);
                entity.Property(e => e.IconClass).HasMaxLength(50).HasDefaultValue("fa-file");
                entity.Property(e => e.Color).HasMaxLength(7).HasDefaultValue("#007bff");
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

                // Index unique sur le nom
                entity.HasIndex(e => e.Name).IsUnique();
            });

            modelBuilder.Entity<Rating>(entity =>
            {
                // Clé primaire
                entity.HasKey(e => e.Id);

                // Propriétés requises
                entity.Property(e => e.Score)
                    .IsRequired()
                    .HasColumnType("decimal(3,2)"); // Permet des valeurs comme 4.50

                entity.Property(e => e.Comment)
                    .IsRequired()
                    .HasMaxLength(1000);

                entity.Property(e => e.Type)
                    .IsRequired()
                    .HasConversion<string>(); // Stocke l'enum comme string

                entity.Property(e => e.Status)
                    .IsRequired()
                    .HasConversion<string>()
                    .HasDefaultValue(RatingStatus.Draft);

                // Propriétés optionnelles
                entity.Property(e => e.DetailedScores)
                    .HasColumnType("text"); // Pour stocker le JSON

                entity.Property(e => e.Response)
                    .HasMaxLength(500);

                entity.Property(e => e.StageReference)
                    .HasMaxLength(100);

                // Propriétés de date avec valeurs par défaut
                entity.Property(e => e.CreatedAt)
                    .IsRequired()
                    .HasDefaultValueSql("GETUTCDATE()"); // SQL Server - ajustez selon votre DB

                // Relations avec User (Evaluator)
                entity.HasOne(e => e.Evaluator)
                    .WithMany() // Un utilisateur peut avoir plusieurs évaluations qu'il a données
                    .HasForeignKey(e => e.EvaluatorId)
                    .OnDelete(DeleteBehavior.Restrict); // Empêche la suppression cascade

                // Relations avec User (EvaluatedUser)
                entity.HasOne(e => e.EvaluatedUser)
                    .WithMany() // Un utilisateur peut avoir plusieurs évaluations qu'il a reçues
                    .HasForeignKey(e => e.EvaluatedUserId)
                    .OnDelete(DeleteBehavior.Restrict); // Empêche la suppression cascade

                // Relations avec User (ApprovedByUser) - optionnelle
                entity.HasOne(e => e.ApprovedByUser)
                    .WithMany()
                    .HasForeignKey(e => e.ApprovedByUserId)
                    .OnDelete(DeleteBehavior.SetNull); // Si l'approbateur est supprimé, mettre null

                // Index pour optimiser les requêtes
                entity.HasIndex(e => e.EvaluatorId)
                    .HasDatabaseName("IX_Rating_EvaluatorId");

                entity.HasIndex(e => e.EvaluatedUserId)
                    .HasDatabaseName("IX_Rating_EvaluatedUserId");

                entity.HasIndex(e => e.Type)
                    .HasDatabaseName("IX_Rating_Type");

                entity.HasIndex(e => e.Status)
                    .HasDatabaseName("IX_Rating_Status");

                entity.HasIndex(e => e.CreatedAt)
                    .HasDatabaseName("IX_Rating_CreatedAt");

                // Index composé pour éviter les doublons d'évaluation
                entity.HasIndex(e => new { e.EvaluatorId, e.EvaluatedUserId, e.Type, e.EvaluationPeriodStart, e.EvaluationPeriodEnd })
                    .HasDatabaseName("IX_Rating_Unique_Evaluation")
                    .IsUnique();

                // Contraintes check pour valider les scores (si supporté par votre DB)
                // entity.HasCheckConstraint("CK_Rating_Score_Range", "[Score] >= 1 AND [Score] <= 5");
            });

            // Configuration Post
            modelBuilder.Entity<Post>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Content).IsRequired().HasMaxLength(2000);
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
                entity.HasOne(e => e.Author)
                      .WithMany()
                      .HasForeignKey(e => e.AuthorId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // Attachments
            modelBuilder.Entity<PostAttachment>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.FileUrl).IsRequired();
                entity.Property(e => e.FileType).HasMaxLength(20);
                entity.HasOne(e => e.Post)
                      .WithMany(p => p.Attachments)
                      .HasForeignKey(e => e.PostId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // Likes
            modelBuilder.Entity<PostLike>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.PostId, e.UserId }).IsUnique();
                entity.HasOne(e => e.Post)
                      .WithMany(p => p.Likes)
                      .HasForeignKey(e => e.PostId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.User)
                      .WithMany()
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Restrict); // <-- CORRECTION ICI
            });

            // Comments
            modelBuilder.Entity<PostComment>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Comment).IsRequired().HasMaxLength(1000);
                entity.HasOne(e => e.Post)
                      .WithMany(p => p.Comments)
                      .HasForeignKey(e => e.PostId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.User)
                      .WithMany()
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Restrict); // <-- SOLUTION
            });
            modelBuilder.Entity<JobOffer>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.Property(e => e.Title)
                      .IsRequired()
                      .HasMaxLength(200);

                entity.Property(e => e.Description)
                      .IsRequired()
                      .HasMaxLength(5000);

                entity.Property(e => e.RequiredSkills)
                      .IsRequired()
                      .HasMaxLength(2000);

                entity.Property(e => e.PublishedAt)
                      .HasDefaultValueSql("GETUTCDATE()");

                // Relations
                entity.HasOne(e => e.Department)
                      .WithMany()
                      .HasForeignKey(e => e.DepartmentId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.PublishedBy)
                      .WithMany()
                      .HasForeignKey(e => e.PublishedByUserId)
                      .OnDelete(DeleteBehavior.Restrict);

                // Index pour optimiser les requêtes
                entity.HasIndex(e => e.DepartmentId);
                entity.HasIndex(e => e.PublishedByUserId);
                entity.HasIndex(e => e.PublishedAt);

                entity.Property(e => e.Status)
                    .HasDefaultValue(JobOfferStatus.Active);

                entity.Property(e => e.RecommendationsGenerated)
                    .HasDefaultValue(false);

                entity.Property(e => e.RecommendationCount)
                    .HasDefaultValue(0);
            });
            modelBuilder.Entity<JobOfferRecommendation>(entity =>
            {
                entity.HasKey(e => e.Id);

                // ✅ CONFIGURATION DES SCORES (garder celles qui existent)
                entity.Property(e => e.CompositeScore)
                    .HasColumnType("decimal(5,4)"); // Précision pour les scores

                entity.Property(e => e.SkillSimilarity)
                    .HasColumnType("decimal(5,4)");

                entity.Property(e => e.TextSimilarity)
                    .HasColumnType("decimal(5,4)");

                // ❌ SUPPRIMER CETTE LIGNE PROBLÉMATIQUE :
                // entity.Property(e => e.RatingScore)
                //     .HasColumnType("decimal(5,4)");

                // ✅ CONFIGURATION DES PROPRIÉTÉS TEXTE
                entity.Property(e => e.StagiaireEmail)
                    .IsRequired()
                    .HasMaxLength(255);

                entity.Property(e => e.StagiaireeName)
                    .IsRequired()
                    .HasMaxLength(255);

                entity.Property(e => e.Skills)
                    .HasMaxLength(2000);

                entity.Property(e => e.Department)
                    .HasMaxLength(255);

                entity.Property(e => e.University)
                    .HasMaxLength(255);

                entity.Property(e => e.MatchReasons)
                    .HasMaxLength(1000);

                entity.Property(e => e.Notes)
                    .HasMaxLength(2000);

                // ✅ CONFIGURATION DES PROPRIÉTÉS BOOLÉENNES
                entity.Property(e => e.DepartmentMatch)
                    .HasDefaultValue(false);

                entity.Property(e => e.IsViewed)
                    .HasDefaultValue(false);

                entity.Property(e => e.IsContacted)
                    .HasDefaultValue(false);

                entity.Property(e => e.IsSelected)
                    .HasDefaultValue(false);

                entity.Property(e => e.IsActive)
                    .HasDefaultValue(true);

                // ✅ CONFIGURATION DES DATES
                entity.Property(e => e.GeneratedAt)
                    .HasDefaultValueSql("GETUTCDATE()");

                entity.Property(e => e.CreatedAt)
                    .HasDefaultValueSql("GETUTCDATE()");

                // ✅ INDEX POUR OPTIMISER LES REQUÊTES (garder ceux-ci)
                entity.HasIndex(e => e.JobOfferId)
                    .HasDatabaseName("IX_JobOfferRecommendation_JobOfferId");

                entity.HasIndex(e => e.StagiaireId)
                    .HasDatabaseName("IX_JobOfferRecommendation_StagiaireId");

                entity.HasIndex(e => new { e.JobOfferId, e.RecommendationRank })
                    .HasDatabaseName("IX_JobOfferRecommendation_JobOffer_Rank");

                entity.HasIndex(e => new { e.JobOfferId, e.IsActive })
                    .HasDatabaseName("IX_JobOfferRecommendation_JobOffer_Active");

                // ✅ RELATIONS CORRIGÉES
                entity.HasOne(e => e.JobOffer)
                    .WithMany(jo => jo.Recommendations)
                    .HasForeignKey(e => e.JobOfferId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Stagiaire)
                    .WithMany()
                    .HasForeignKey(e => e.StagiaireId)
                    .OnDelete(DeleteBehavior.Restrict); // Éviter la suppression en cascade

         
            });

        }
    }
}