import { Component, Inject } from '@angular/core';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pdf-thumbnail',
  standalone: true,
  imports: [CommonModule, PdfViewerModule],
  template: `
    <pdf-viewer
      [src]="src"
      [show-all]="false"
      [page]="1"
      [original-size]="false"
      [render-text]="false"
      style="width:200px; height:150px; border-radius:8px; border:1px solid #ccc;"
    ></pdf-viewer>
  `
})
export class PdfThumbnailComponent {
  constructor(@Inject('src') public src: string) {}
}