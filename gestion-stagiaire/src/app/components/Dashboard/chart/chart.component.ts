import { Component, Input, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartConfiguration, ChartOptions, ChartType } from 'chart.js';
// Importer directement les directives
import { BaseChartDirective } from 'ng2-charts';

@Component({
  selector: 'app-chart',
  standalone: true,
  // Utiliser la directive directement dans les imports
  imports: [CommonModule, BaseChartDirective],
  template: `
    <div [style.height]="height">
      <canvas baseChart
        [data]="data"
        [options]="options"
        [type]="type">
      </canvas>
    </div>
  `
})
export class ChartComponent implements OnChanges {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;
  
  @Input() type: ChartType = 'bar';
  @Input() data: any = { labels: [], datasets: [] };
  @Input() options: ChartOptions = {};
  @Input() height: string = '300px';

  constructor() { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.chart) {
      this.chart.update();
    }
  }
}