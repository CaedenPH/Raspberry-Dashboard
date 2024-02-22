import {
  Component,
  Input,
  ViewChild,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { BaseChartDirective, NgChartsModule } from 'ng2-charts';
import {  Chart, ChartConfiguration, ChartType, Filler } from 'chart.js';
@Component({
  selector: 'app-graph-card',
  standalone: true,
  imports: [NgChartsModule],
  templateUrl: './graph-card.component.html',
  styleUrl: './graph-card.component.css',
})
export class GraphCardComponent {
  @Input() newLabel? = 'New label';
  @Input() description: string = 'something';
  @Input() color: string = '#fff';
  @Input() heading: string = "usage";


  constructor() {
    Chart.register(Filler);
  }

  @Input() lineChartData: ChartConfiguration['data'] = {
    datasets: [
      {
        data: [],
      },
    ],
    labels: [],
  };

  @Input() lineChartOptions: ChartConfiguration['options'] = {
    elements: {
      line: {
        tension: 0.3,
        borderWidth: 3,
      },
    },
    scales: {
      // We use this empty structure as a placeholder for dynamic theming.
      y: {
        position: 'left',
        ticks: {
          textStrokeColor: '#fff',
          major: {
            enabled: true
          }
        }
      },
      x: {
      	ticks: {
        	autoSkip: false
        }
      },
      
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
    plugins: {
      legend: { display: false },
    },
  };

  @Input() lineChartType: ChartType = 'line';

  ngOnChanges(changes: SimpleChanges): void {
    this.chart?.update();
  }

  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;
}
