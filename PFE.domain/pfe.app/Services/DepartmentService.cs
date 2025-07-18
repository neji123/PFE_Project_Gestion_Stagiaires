using PFE.application.DTOs;
using PFE.application.Interfaces;
using PFE.domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PFE.application.Services
{
  public  class DepartmentService : IDepartmentService
    {
        private readonly IDepartmentRepository _departmentRepository;

        public DepartmentService(IDepartmentRepository departmentRepository)
        {
            _departmentRepository = departmentRepository;
        }

        public async Task<List<DepartmentDto>> GetAllDepartmentsAsync()
        {
            var departments = await _departmentRepository.GetAllDepartmentsAsync();
            return departments.Select(d => new DepartmentDto
            {
                Id = d.Id,
                DepartmentName = d.DepartmentName
            }).ToList();
        }

        public async Task<DepartmentDto> GetDepartmentByIdAsync(int id)
        {
            var department = await _departmentRepository.GetDepartmentByIdAsync(id);

            if (department == null)
                return null;

            return new DepartmentDto
            {
                Id = department.Id,
                DepartmentName = department.DepartmentName
            };
        }

        public async Task<DepartmentDto> CreateDepartmentAsync(DepartmentDto departmentDto)
        {
            // Check if department name already exists
            if (await _departmentRepository.DepartmentNameExistsAsync(departmentDto.DepartmentName))
                throw new Exception("Un département avec ce nom existe déjà.");

            var department = new Department
            {
                DepartmentName = departmentDto.DepartmentName
            };

            var result = await _departmentRepository.AddDepartmentAsync(department);

            return new DepartmentDto
            {
                Id = result.Id,
                DepartmentName = result.DepartmentName
            };
        }

        public async Task<DepartmentDto> UpdateDepartmentAsync(int id, DepartmentDto departmentDto)
        {
            if (id != departmentDto.Id)
                throw new Exception("Les identifiants ne correspondent pas.");

            // Check if department exists
            var existingDepartment = await _departmentRepository.GetDepartmentByIdAsync(id);
            if (existingDepartment == null)
                throw new Exception("Département non trouvé.");

            // Check if name is already used by another department
            if (existingDepartment.DepartmentName != departmentDto.DepartmentName &&
                await _departmentRepository.DepartmentNameExistsAsync(departmentDto.DepartmentName))
                throw new Exception("Un département avec ce nom existe déjà.");

            existingDepartment.DepartmentName = departmentDto.DepartmentName;

            var result = await _departmentRepository.UpdateDepartmentAsync(existingDepartment);

            return new DepartmentDto
            {
                Id = result.Id,
                DepartmentName = result.DepartmentName
            };
        }

        public async Task<bool> DeleteDepartmentAsync(int id)
        {
            return await _departmentRepository.DeleteDepartmentAsync(id);
        }
    }
}
