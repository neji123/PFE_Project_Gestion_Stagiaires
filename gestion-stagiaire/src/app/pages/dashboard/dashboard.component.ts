import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import 'animate.css';
import { NavbarComponent } from '../../components/layout/navbar/navbar.component';
import { SidebarComponent } from '../../components/layout/sidebar/sidebar.component';
import { FooterComponent } from '../../components/layout/footer/footer.component';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../Auth/auth-service.service'; 
import { Router } from '@angular/router';
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, FooterComponent, SidebarComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  isAuthenticated = false;
  userRole: string | null = null;
  dashboardUrl: string = '/dashboard';

  constructor(@Inject(PLATFORM_ID) private platformId: Object,
  private authService: AuthService,
private router: Router) {}
  
  ngOnInit(): void {
    
    if (isPlatformBrowser(this.platformId)) {
      // Vérifier l'authentification
      this.isAuthenticated = this.authService.isAuthenticated();
      
      // Si authentifié, récupérer le rôle et définir l'URL
      if (this.isAuthenticated) {
        const currentUser = this.authService.currentUserValue;
        if (currentUser && currentUser.role) {
          this.userRole = currentUser.role;
          
          // Définir l'URL en fonction du rôle
          switch (this.userRole) {
            case 'Stagiaire':
              this.dashboardUrl = '/mes-projets';
              break;
            case 'Tuteur':
              this.dashboardUrl = '/mes-stagiaires';
              break;
            case 'RHs':
              this.dashboardUrl = '/stagiaires';
              break;
            default:
              this.dashboardUrl = '/dashboard';
          }
        }
      }

    
      this.initObserver();
      this.initTabFunctionality();
      this.initTestimonialSlider();
    }
  }
  
  private initObserver(): void {
    const observerOptions = {
      threshold: 0.2,
      rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target as HTMLElement;
          
          if (element.classList.contains('feature-card')) {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
          } else if (element.classList.contains('testimonial-card')) {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
          } else if (element.classList.contains('timeline-item')) {
            element.style.opacity = '1';
            element.style.transform = 'translateX(0)';
          } else if (element.classList.contains('section-header')) {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
          }
        }
      });
    }, observerOptions);

    // Apply initial styling and observe elements
    const elementsToAnimate = document.querySelectorAll('.feature-card, .testimonial-card, .timeline-item, .section-header');
    
    elementsToAnimate.forEach(element => {
      const el = element as HTMLElement;
      
      if (element.classList.contains('feature-card')) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.6s ease-out';
      } else if (element.classList.contains('testimonial-card')) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.5s ease-out';
      } else if (element.classList.contains('timeline-item')) {
        if (element.classList.contains('timeline-item:nth-child(odd)')) {
          el.style.transform = 'translateX(-30px)';
        } else {
          el.style.transform = 'translateX(30px)';
        }
        el.style.opacity = '0';
        el.style.transition = 'all 0.7s ease-out';
      } else if (element.classList.contains('section-header')) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'all 0.5s ease-out';
      }
      
      observer.observe(element);
    });
  }
  
  private initTabFunctionality(): void {
    const tabButtons = document.querySelectorAll('.tab-button');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Remove active class from all buttons and panes
        document.querySelectorAll('.tab-button').forEach(btn => {
          btn.classList.remove('active');
        });
        
        document.querySelectorAll('.tab-pane').forEach(pane => {
          pane.classList.remove('active');
        });
        
        // Add active class to clicked button
        button.classList.add('active');
        
        // Get target and activate corresponding pane
        const target = button.getAttribute('data-target');
        if (target) {
          const targetPane = document.getElementById(target);
          if (targetPane) {
            targetPane.classList.add('active');
          }
        }
      });
    });
  }
  
  private initTestimonialSlider(): void {
    const indicators = document.querySelectorAll('.testimonial-indicators .indicator');
    const testimonials = document.querySelectorAll('.testimonial-card');
    let currentTestimonial = 0;
    
    // Function to show specific testimonial
    const showTestimonial = (index: number) => {
      // Update indicators
      indicators.forEach((indicator, i) => {
        if (i === index) {
          indicator.classList.add('active');
        } else {
          indicator.classList.remove('active');
        }
      });
      
      // On mobile, show only the active testimonial
      if (window.innerWidth <= 992) {
        testimonials.forEach((testimonial, i) => {
          const element = testimonial as HTMLElement;
          if (i === index) {
            element.style.display = 'block';
          } else {
            element.style.display = 'none';
          }
        });
      }
    };
    
    // Add click event to indicators
    indicators.forEach((indicator, index) => {
      indicator.addEventListener('click', () => {
        currentTestimonial = index;
        showTestimonial(currentTestimonial);
      });
    });
    
    // Auto-rotate testimonials
    setInterval(() => {
      currentTestimonial = (currentTestimonial + 1) % testimonials.length;
      showTestimonial(currentTestimonial);
    }, 5000);
    
    // Initial setup for mobile view
    if (window.innerWidth <= 992) {
      testimonials.forEach((testimonial, i) => {
        const element = testimonial as HTMLElement;
        if (i !== 0) {
          element.style.display = 'none';
        }
      });
    }
    
    // Update on window resize
    window.addEventListener('resize', () => {
      if (window.innerWidth <= 992) {
        testimonials.forEach((testimonial, i) => {
          const element = testimonial as HTMLElement;
          if (i !== currentTestimonial) {
            element.style.display = 'none';
          } else {
            element.style.display = 'block';
          }
        });
      } else {
        testimonials.forEach(testimonial => {
          const element = testimonial as HTMLElement;
          element.style.display = 'block';
        });
      }
    });
  }

  shouldShowHeader(): boolean {
    const hiddenRoutes = ['/dashboard', '/login', '/log'];
    const currentPath = this.router.url.split('?')[0];
    return !hiddenRoutes.includes(currentPath);
  }
}