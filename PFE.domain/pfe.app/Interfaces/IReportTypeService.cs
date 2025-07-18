using PFE.Application.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PFE.application.Interfaces
{
  public  interface IReportTypeService
    {
        Task<ReportTypeDto> GetByIdAsync(int id);
        Task<IEnumerable<ReportTypeDto>> GetAllAsync();
        Task<IEnumerable<ReportTypeDto>> GetActiveAsync();
        Task<ReportTypeDto> CreateAsync(CreateReportTypeDto createDto);
        Task<ReportTypeDto> UpdateAsync(int id, UpdateReportTypeDto updateDto);
        Task<bool> DeleteAsync(int id);
        Task<bool> ReorderAsync(int id, int newDisplayOrder);
        Task InitializeDefaultReportTypesAsync();
    }
}
