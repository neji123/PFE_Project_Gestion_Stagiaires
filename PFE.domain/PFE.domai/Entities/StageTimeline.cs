using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PFE.domain.Entities
{
    public class StageTimeline
    {
        [Key]
        public int Id { get; set; }

        public int StagiaireId { get; set; }

        [ForeignKey("StagiaireId")]
        public User Stagiaire { get; set; }

        // Dates des différentes étapes
        public DateTime LancementStage { get; set; }
        public DateTime DemandeConvention { get; set; }
        public DateTime RemisePlanTravail { get; set; }
        public DateTime DepotJournalBord { get; set; }
        public DateTime DepotBilanV1 { get; set; }
        public DateTime Restitution { get; set; }
        public DateTime VisiteMiParcours { get; set; }
        public DateTime DepotBilanV2 { get; set; }
        public DateTime DepotRapportFinal { get; set; }

        // Navigation property vers les rapports associés
        public ICollection<Report> Reports { get; set; } = new List<Report>();
    }
}
