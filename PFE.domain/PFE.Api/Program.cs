using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using PFE.infracstructure.Persistence;
using PFE.Application.Interfaces;
using PFE.Application.Services;
using PFE.infracstructure.Repositories;
using System.Text.Json.Serialization;
using PFE.application.Interfaces;
using PFE.infrastructure.Repositories;
using PFE.application.Services;
using Microsoft.AspNetCore.Identity;
using PFE.domain.Entities;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.Extensions.FileProviders;
using Microsoft.AspNetCore.SignalR;
using PFE.Infrastructure.Repositories;
using Polly;
using Polly.Extensions.Http;

var builder = WebApplication.CreateBuilder(args);

// 1. Ajout des contrôleurs
builder.Services.AddControllers()
 .AddJsonOptions(options =>
 {
     options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
     options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
 });

// 2. Configuration CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", builder =>
    {
        builder.WithOrigins("http://localhost:4200")
               .AllowAnyMethod()
               .AllowAnyHeader()
               .AllowCredentials()
               .WithExposedHeaders("Content-Disposition");
    });
});

// 3. Configuration de la base de données
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// 4. Enregistrement des dépendances
// Repositories existants
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IProjectRepository, ProjectRepository>();
builder.Services.AddScoped<ISprintRepository, SprintRepository>();
builder.Services.AddScoped<ITaskRepository, TaskRepository>();
builder.Services.AddScoped<ISprintHistoryRepository, SprintHistoryRepository>();
builder.Services.AddScoped<IUniversityRepository, UniversityRepository>();
builder.Services.AddScoped<IDepartmentRepository, DepartmentRepository>();
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddScoped<IReportRepository, ReportRepository>();
builder.Services.AddScoped<INotificationRepository, NotificationRepository>();
builder.Services.AddScoped<IMeetingRepository, MeetingRepository>();
builder.Services.AddScoped<IReportTypeRepository, ReportTypeRepository>();
builder.Services.AddScoped<IRatingRepository, RatingRepository>();
builder.Services.AddScoped<IPostRepository, PostRepository>();
builder.Services.AddScoped<IJobOfferRepository, JobOfferRepository>();

// ✨ NOUVEAUX REPOSITORIES POUR LES RECOMMANDATIONS
builder.Services.AddScoped<IJobOfferRecommendationRepository, JobOfferRecommendationRepository>();

// Services existants
builder.Services.AddHttpClient<LatexAttestationService>();

// Enregistrement de IUserService via une fonction de fabrique
builder.Services.AddScoped<IUserService>(provider =>
{
    var userRepository = provider.GetRequiredService<IUserRepository>();
    var projectRepository = provider.GetRequiredService<IProjectRepository>();
    var configuration = provider.GetRequiredService<IConfiguration>();
    var emailService = provider.GetRequiredService<IEmailService>();

    var jwtSecret = configuration["Jwt:Secret"];
    var jwtLifespan = int.Parse(configuration["Jwt:LifespanMinutes"] ?? "60");
    var passwordHasher = provider.GetRequiredService<IPasswordHasher<User>>();
    var notificationService = provider.GetRequiredService<INotificationService>();
    var hubContext = provider.GetRequiredService<IHubContext<NotificationHub>>();
    return new UserService(
        userRepository,
        jwtSecret,
        jwtLifespan,
        projectRepository,
        passwordHasher,
        configuration,
        emailService,
        notificationService,
        hubContext);
});

// Services existants
builder.Services.AddScoped<IProjectService, ProjectService>();
builder.Services.AddScoped<ISprintService, SprintService>();
builder.Services.AddScoped<ITaskService, TaskService>();
builder.Services.AddScoped<IUniversityService, UniversityService>();
builder.Services.AddScoped<IDepartmentService, DepartmentService>();
builder.Services.AddScoped<IEmailService, SmtpEmailService>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<LatexAttestationService>();
builder.Services.AddLogging();
builder.Services.AddScoped<IMeetingService, MeetingService>();
builder.Services.AddTransient<SprintReportService>();
builder.Services.AddScoped<IReportTypeService, ReportTypeService>();
builder.Services.AddScoped<IRatingService, RatingService>();
builder.Services.AddScoped<IPostService, PostService>();
builder.Services.AddScoped<IJobOfferService, JobOfferService>();
builder.Services.AddScoped<IRecommendationService,RecommendationService>();
// ✨ NOUVEAUX SERVICES POUR LES RECOMMANDATIONS
builder.Services.AddScoped<IJobOfferRecommendationService, JobOfferRecommendationService>();

// ✨ HTTP CLIENT POUR LE SERVICE PYTHON IA
builder.Services.AddHttpClient<RecommendationService>(client =>
{
  //  client.BaseAddress = new Uri(builder.Configuration["RecommendationAPI:BaseUrl"] ?? "http://localhost:5000");
    client.Timeout = TimeSpan.FromSeconds(
        builder.Configuration.GetValue<int>("RecommendationAPI:TimeoutSeconds", 120)
    );
    client.DefaultRequestHeaders.Add("User-Agent", "PFE-RecommendationSystem/1.0");
})
.AddPolicyHandler(GetRetryPolicy());

// 5. Configuration de l'authentification JWT
var key = Encoding.ASCII.GetBytes(builder.Configuration["Jwt:Secret"]);
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false,
        ClockSkew = TimeSpan.Zero
    };
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/api/notificationHub"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
})
.AddGoogle(options =>
{
    options.ClientId = builder.Configuration["Authentication:Google:ClientId"];
    options.ClientSecret = builder.Configuration["Authentication:Google:ClientSecret"];
});

// 6. Configuration Swagger/OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 7. SignalR
builder.Services.AddSignalR();

// ✨ MÉTHODE HELPER POUR LA POLITIQUE DE RETRY
static IAsyncPolicy<HttpResponseMessage> GetRetryPolicy()
{
    return HttpPolicyExtensions
        .HandleTransientHttpError()
        .OrResult(msg => !msg.IsSuccessStatusCode)
        .WaitAndRetryAsync(
            retryCount: 3,
            sleepDurationProvider: retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
            onRetry: (outcome, timespan, retryCount, context) =>
            {
                Console.WriteLine($"🔄 Retry {retryCount} pour le service de recommandation dans {timespan}s");
            });
}

// Création de l'application
var app = builder.Build();

// ✅ INITIALISATION DES TYPES DE RAPPORTS
using (var scope = app.Services.CreateScope())
{
    try
    {
        var reportTypeService = scope.ServiceProvider.GetRequiredService<IReportTypeService>();
        await reportTypeService.InitializeDefaultReportTypesAsync();
        Console.WriteLine("✅ Types de rapports par défaut initialisés avec succès.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ Erreur lors de l'initialisation des types de rapports: {ex.Message}");
    }
}

// Configuration du pipeline HTTP
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Middleware de debugging (en développement)
if (app.Environment.IsDevelopment())
{
    app.Use(async (context, next) =>
    {
        var requestBody = string.Empty;
        if (context.Request.ContentLength > 0)
        {
            context.Request.EnableBuffering();
            using (var reader = new StreamReader(context.Request.Body, leaveOpen: true))
            {
                requestBody = await reader.ReadToEndAsync();
                context.Request.Body.Position = 0;
            }
        }

        Console.WriteLine($"[REQUEST] {context.Request.Method} {context.Request.Path}");
        if (!string.IsNullOrEmpty(requestBody))
            Console.WriteLine($"[REQUEST BODY] {requestBody}");

        var originalBodyStream = context.Response.Body;
        using (var responseBodyStream = new MemoryStream())
        {
            context.Response.Body = responseBodyStream;
            await next.Invoke();

            responseBodyStream.Seek(0, SeekOrigin.Begin);
            var responseBody = await new StreamReader(responseBodyStream).ReadToEndAsync();
            Console.WriteLine($"[RESPONSE] Status: {context.Response.StatusCode}");
            if (!string.IsNullOrEmpty(responseBody))
                Console.WriteLine($"[RESPONSE BODY] {responseBody}");

            responseBodyStream.Seek(0, SeekOrigin.Begin);
            await responseBodyStream.CopyToAsync(originalBodyStream);
            context.Response.Body = originalBodyStream;
        }
    });
}

// Static files
app.UseStaticFiles();
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(
        Path.Combine(Directory.GetCurrentDirectory(), "wwwroot")),
    RequestPath = ""
});

// CORS
app.UseCors("AllowAngular");

// HTTPS redirection
app.UseHttpsRedirection();

// Authentication & Authorization
app.UseAuthentication();
app.UseAuthorization();

// SignalR Hub
app.MapHub<NotificationHub>("/api/notificationHub");

// Controllers
app.MapControllers();

// Démarrage de l'application
app.Run();