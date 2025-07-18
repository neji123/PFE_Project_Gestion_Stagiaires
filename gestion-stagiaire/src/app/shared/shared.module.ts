import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';


@NgModule({
  declarations: [],
  imports: [CommonModule, MatToolbarModule, MatSidenavModule, MatIconModule, MatButtonModule,BrowserAnimationsModule],
  exports: [MatToolbarModule, MatSidenavModule, MatIconModule, MatButtonModule]
  
})
export class SharedModule { }
