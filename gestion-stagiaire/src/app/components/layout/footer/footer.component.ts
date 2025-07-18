import { Component, OnInit} from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent implements OnInit{
  currentYear: number = new Date().getFullYear();
  
  ngOnInit(): void {
    // Any initialization logic can go here
  }

}
