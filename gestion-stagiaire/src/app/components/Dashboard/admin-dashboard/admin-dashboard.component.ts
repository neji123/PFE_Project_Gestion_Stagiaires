// admin-dashboard.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';

// Shared components imports
import { StatCardComponent } from '../stat-card/stat-card.component';
import { ChartComponent } from '../chart/chart.component';
import { RecentActivityComponent } from '../recent-activity/recent-activity.component';
import { UserCardComponent } from '../user-card/user-card.component';

// Service imports
import { UserService } from '../../../services/User/user.service';
import { StatisticsService } from '../../../services/Dashboard/statistics.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    BaseChartDirective,
    StatCardComponent,
    ChartComponent,
    RecentActivityComponent,
    UserCardComponent
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  // Dashboard statistics
  userStats = {
    totalUsers: 0,
    tuteurs: 0,
    stagiaires: 0,
    newRequests: 0
  };

  // Department distribution data for pie chart
  departmentDistribution: any = {};
  
  // Stage statistics data for bar chart
  stageStats: any = {};
  
  // Recent users and activities
  recentUsers: any[] = [];
  pendingRequests: any[] = [];
  recentActivities: any[] = [];

  // Loading states
  isLoading = true;
  hasError = false;
  errorMessage = '';

  // Chart configurations
  pieChartOptions: ChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'right' }
    }
  };

  barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    scales: {
      x: { stacked: false },
      y: { stacked: false }
    }
  };

  // Inject services
  private userService = inject(UserService);
  private statsService = inject(StatisticsService);

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoading = true;
    
    // Méthode alternative: utiliser getDashboardStatistics pour toutes les statistiques
    this.statsService.getDashboardStatistics('admin').subscribe({
      next: (stats) => {
        this.userStats = stats;
      },
      error: (error) => {
        console.error('Error fetching dashboard statistics:', error);
        this.hasError = true;
        this.errorMessage = 'Erreur lors du chargement des statistiques';
      }
    });

    // Fetch department distribution
    this.statsService.getDepartmentDistribution().subscribe({
      next: (data) => {
        this.departmentDistribution = {
          labels: data.map(item => item.name),
          datasets: [{
            data: data.map(item => item.value),
            backgroundColor: ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']
          }]
        };
      },
      error: (error) => {
        console.error('Error fetching department distribution:', error);
      }
    });

    // Fetch stage statistics
    this.statsService.getStageStatistics().subscribe({
      next: (data) => {
        this.stageStats = {
          labels: data.map(item => item.name),
          datasets: [
            {
              label: 'Terminés',
              data: data.map(item => item.completed),
              backgroundColor: '#4CAF50'
            },
            {
              label: 'En cours',
              data: data.map(item => item.pending),
              backgroundColor: '#2196F3'
            }
          ]
        };
      },
      error: (error) => {
        console.error('Error fetching stage statistics:', error);
      }
    });

    // Fetch recent users
    this.userService.getRecentUsers(5).subscribe({
      next: (users) => {
        this.recentUsers = users;
      },
      error: (error) => {
        console.error('Error fetching recent users:', error);
      }
    });

    // Fetch pending requests
    this.userService.getPendingRequests().subscribe({
      next: (requests) => {
        this.pendingRequests = requests;
      },
      error: (error) => {
        console.error('Error fetching pending requests:', error);
      }
    });

    // Fetch recent activities
    this.statsService.getRecentActivities().subscribe({
      next: (activities) => {
        this.recentActivities = activities;
      },
      error: (error) => {
        console.error('Error fetching recent activities:', error);
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  approveRequest(requestId: number): void {
    this.userService.approveRequest(requestId).subscribe({
      next: () => {
        // Remove from pending requests
        this.pendingRequests = this.pendingRequests.filter(req => req.id !== requestId);
        // Update counters
        this.userStats.newRequests--;
      },
      error: (error) => {
        console.error('Error approving request:', error);
      }
    });
  }

  rejectRequest(requestId: number): void {
    this.userService.rejectRequest(requestId).subscribe({
      next: () => {
        // Remove from pending requests
        this.pendingRequests = this.pendingRequests.filter(req => req.id !== requestId);
        // Update counters
        this.userStats.newRequests--;
      },
      error: (error) => {
        console.error('Error rejecting request:', error);
      }
    });
  }
}