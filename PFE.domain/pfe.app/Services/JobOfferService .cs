using PFE.application.Interfaces;
using PFE.Application.DTOs;
using PFE.Application.Interfaces;
using PFE.domain.Entities;

namespace PFE.Application.Services
{
    public class JobOfferService : IJobOfferService
    {
        private readonly IJobOfferRepository _jobOfferRepository;
        private readonly IUserRepository _userRepository;
        private readonly IDepartmentRepository _departmentRepository;

        public JobOfferService(
            IJobOfferRepository jobOfferRepository,
            IUserRepository userRepository,
            IDepartmentRepository departmentRepository)
        {
            _jobOfferRepository = jobOfferRepository;
            _userRepository = userRepository;
            _departmentRepository = departmentRepository;
        }

        public async Task<JobOfferDto> GetJobOfferByIdAsync(int id)
        {
            var jobOffer = await _jobOfferRepository.GetByIdAsync(id);
            if (jobOffer == null)
            {
                throw new Exception("Offre d'emploi non trouvée.");
            }

            return MapToJobOfferDto(jobOffer);
        }

        public async Task<IEnumerable<JobOfferDto>> GetAllJobOffersAsync()
        {
            var jobOffers = await _jobOfferRepository.GetAllAsync();
            return jobOffers.Select(MapToJobOfferDto);
        }

        public async Task<IEnumerable<JobOfferDto>> GetJobOffersByDepartmentAsync(int departmentId)
        {
            var jobOffers = await _jobOfferRepository.GetByDepartmentAsync(departmentId);
            return jobOffers.Select(MapToJobOfferDto);
        }

        public async Task<IEnumerable<JobOfferDto>> GetJobOffersByPublisherAsync(int publisherId)
        {
            var jobOffers = await _jobOfferRepository.GetByPublisherAsync(publisherId);
            return jobOffers.Select(MapToJobOfferDto);
        }

        public async Task<IEnumerable<JobOfferSimpleDto>> GetRecentJobOffersAsync(int count = 10)
        {
            var jobOffers = await _jobOfferRepository.GetRecentAsync(count);
            return jobOffers.Select(MapToJobOfferSimpleDto);
        }

        public async Task<JobOfferDto> CreateJobOfferAsync(CreateJobOfferDto createDto, int publisherId)
        {
            // Vérifier que l'utilisateur existe et est RH
            var publisher = await _userRepository.GetByIdAsync(publisherId);
            if (publisher == null || publisher.Role != UserRole.RHs)
            {
                throw new Exception("Seuls les utilisateurs RH peuvent publier des offres d'emploi.");
            }

            // Vérifier que le département existe
            var department = await _departmentRepository.GetDepartmentByIdAsync(createDto.DepartmentId);
            if (department == null)
            {
                throw new Exception("Département non trouvé.");
            }

            var jobOffer = new JobOffer
            {
                Title = createDto.Title,
                Description = createDto.Description,
                RequiredSkills = createDto.RequiredSkills,
                DepartmentId = createDto.DepartmentId,
                PublishedByUserId = publisherId,
                PublishedAt = DateTime.UtcNow
            };

            var createdJobOffer = await _jobOfferRepository.AddAsync(jobOffer);
            return MapToJobOfferDto(createdJobOffer);
        }

        public async Task<JobOfferDto> UpdateJobOfferAsync(int id, UpdateJobOfferDto updateDto, int currentUserId)
        {
            var existingJobOffer = await _jobOfferRepository.GetByIdAsync(id);
            if (existingJobOffer == null)
            {
                throw new Exception("Offre d'emploi non trouvée.");
            }

            // Vérifier que l'utilisateur peut modifier cette offre (soit l'auteur, soit un admin)
            var currentUser = await _userRepository.GetByIdAsync(currentUserId);
            if (currentUser == null)
            {
                throw new Exception("Utilisateur non trouvé.");
            }

            if (existingJobOffer.PublishedByUserId != currentUserId && currentUser.Role != UserRole.Admin)
            {
                throw new Exception("Vous n'êtes pas autorisé à modifier cette offre d'emploi.");
            }

            // Vérifier que le département existe
            var department = await _departmentRepository.GetDepartmentByIdAsync(updateDto.DepartmentId);
            if (department == null)
            {
                throw new Exception("Département non trouvé.");
            }

            // Mettre à jour les propriétés
            existingJobOffer.Title = updateDto.Title;
            existingJobOffer.Description = updateDto.Description;
            existingJobOffer.RequiredSkills = updateDto.RequiredSkills;
            existingJobOffer.DepartmentId = updateDto.DepartmentId;

            var updatedJobOffer = await _jobOfferRepository.UpdateAsync(existingJobOffer);
            return MapToJobOfferDto(updatedJobOffer);
        }

        public async Task<bool> DeleteJobOfferAsync(int id, int currentUserId)
        {
            var existingJobOffer = await _jobOfferRepository.GetByIdAsync(id);
            if (existingJobOffer == null)
            {
                throw new Exception("Offre d'emploi non trouvée.");
            }

            // Vérifier que l'utilisateur peut supprimer cette offre (soit l'auteur, soit un admin)
            var currentUser = await _userRepository.GetByIdAsync(currentUserId);
            if (currentUser == null)
            {
                throw new Exception("Utilisateur non trouvé.");
            }

            if (existingJobOffer.PublishedByUserId != currentUserId && currentUser.Role != UserRole.Admin)
            {
                throw new Exception("Vous n'êtes pas autorisé à supprimer cette offre d'emploi.");
            }

            return await _jobOfferRepository.DeleteAsync(id);
        }

        // Méthodes de mapping privées
        private JobOfferDto MapToJobOfferDto(JobOffer jobOffer)
        {
            return new JobOfferDto
            {
                Id = jobOffer.Id,
                Title = jobOffer.Title,
                Description = jobOffer.Description,
                RequiredSkills = jobOffer.RequiredSkills,
                DepartmentId = jobOffer.DepartmentId,
                DepartmentName = jobOffer.Department?.DepartmentName ?? "Non spécifié",
                PublishedByUserId = jobOffer.PublishedByUserId,
                PublishedByName = jobOffer.PublishedBy != null ?
                    $"{jobOffer.PublishedBy.FirstName} {jobOffer.PublishedBy.LastName}" : "Non spécifié",
                PublishedAt = jobOffer.PublishedAt
            };
        }

        private JobOfferSimpleDto MapToJobOfferSimpleDto(JobOffer jobOffer)
        {
            return new JobOfferSimpleDto
            {
                Id = jobOffer.Id,
                Title = jobOffer.Title,
                DepartmentName = jobOffer.Department?.DepartmentName ?? "Non spécifié",
                PublishedByName = jobOffer.PublishedBy != null ?
                    $"{jobOffer.PublishedBy.FirstName} {jobOffer.PublishedBy.LastName}" : "Non spécifié",
                PublishedAt = jobOffer.PublishedAt
            };
        }
    }
}