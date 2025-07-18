using PFE.domain.Entities;
using PFE.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Text;
using System.Text.Json;
using PFE.application.Interfaces;

namespace PFE.Application.Services
{
    public class RecommendationService : IRecommendationService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ILogger<RecommendationService> _logger;
        private readonly string _pythonApiUrl;

        public RecommendationService(
            HttpClient httpClient,
            IConfiguration configuration,

            ILogger<RecommendationService> logger)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _logger = logger;
            _pythonApiUrl = _configuration["RecommendationAPI:BaseUrl"] ?? "http://localhost:5000";
            // ✅ Configuration du HttpClient
            if (_httpClient.BaseAddress == null)
            {
                _httpClient.BaseAddress = new Uri(_pythonApiUrl);
            }

            _logger.LogInformation($"🔧 Service de recommandation configuré: {_pythonApiUrl}");
        }

        public async Task<RecommendationResponse> GetRecommendationsAsync(RecommendationRequest request)
        {
            try
            {
                var jsonContent = JsonSerializer.Serialize(request, new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                });

                var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

                _logger.LogInformation("🔍 Appel au service IA Python pour: {Title}", request.Title);

                var response = await _httpClient.PostAsync("/api/recommendations", content);

                if (response.IsSuccessStatusCode)
                {
                    var responseContent = await response.Content.ReadAsStringAsync();
                    var result = JsonSerializer.Deserialize<RecommendationResponse>(responseContent, new JsonSerializerOptions
                    {
                        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                    });

                    _logger.LogInformation("✅ Recommandations reçues: {Count} candidats", result?.TotalFound ?? 0);
                    return result ?? new RecommendationResponse { Success = false, Error = "Réponse vide" };
                }
                else
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError("❌ Erreur service IA: {StatusCode} - {Error}",
                        response.StatusCode, errorContent);

                    return new RecommendationResponse
                    {
                        Success = false,
                        Error = $"Erreur du service IA: {response.StatusCode}"
                    };
                }
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "❌ Service IA indisponible - Vérifiez que le service Python est démarré");
                return new RecommendationResponse
                {
                    Success = false,
                    Error = "Service de recommandation indisponible. Vérifiez que le service Python est démarré sur le port 5000."
                };
            }
            catch (TaskCanceledException ex)
            {
                _logger.LogError(ex, "❌ Timeout du service IA");
                return new RecommendationResponse
                {
                    Success = false,
                    Error = "Le service IA met trop de temps à répondre. Veuillez réessayer."
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Erreur inattendue lors de l'appel au service IA");
                return new RecommendationResponse
                {
                    Success = false,
                    Error = "Erreur interne du service de recommandation"
                };
            }
        }

        public async Task<bool> IsRecommendationServiceHealthyAsync()
        {
            try
            {
                var response = await _httpClient.GetAsync("/api/health");
                bool isHealthy = response.IsSuccessStatusCode;

                _logger.LogInformation(isHealthy ?
                    "✅ Service IA disponible" :
                    "❌ Service IA indisponible (Status: {StatusCode})", response.StatusCode);

                return isHealthy;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "❌ Impossible de contacter le service IA");
                return false;
            }
        }
    }
}