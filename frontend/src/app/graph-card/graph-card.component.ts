import { Component, Input, ViewChild } from '@angular/core';
import { BaseChartDirective, NgChartsModule } from 'ng2-charts';
import {ChartConfiguration, ChartType} from 'chart.js';


@Component({
  selector: 'app-graph-card',
  standalone: true,
  imports: [NgChartsModule],
  templateUrl: './graph-card.component.html',
  styleUrl: './graph-card.component.css'
})
export class GraphCardComponent {
  @Input() newLabel? = 'New label';
  @Input() description: string = "something";

  constructor() {
  }

  @Input() lineChartData: ChartConfiguration['data'] = {
    datasets: [
      {
        data: [65, 59, 80, 81, 56, 55, 40],
        borderColor: '#fff'
      }
    ],
    labels: [1, 2, 3 ,4 ,5 ,6],
  };

  @Input() lineChartOptions: ChartConfiguration['options'] = {
    elements: {
      line: {
        tension: 0.5,
      },
    },
    scales: {
      // We use this empty structure as a placeholder for dynamic theming.
      y: {
        position: 'left',
      },
      y1: {
        position: 'right',
        grid: {
          color: 'rgba(255,0,0,0.3)',
        },
        ticks: {
          color: 'red',
        },
      },
    },

    plugins: {
      legend: { display: false },
      },
  }

  update() {
    this.chart?.update();
  }

  set add_data(data: Array<number>) {
    this.chart?.datasets?.forEach((x, i) => {
      x.data.push(data[i])
    })

    this.chart?.update();
  }

  set add_label(label: string) {
    this.chart?.labels?.push(label);
    this.chart?.update();
  }

  set set_data(data: Array<Array<number> >){
    this.chart?.datasets?.forEach((x, i) => {
      x.data = data[i];
    })

    this.chart?.update();
  }

  set set_label(labels: Array<string> ) {
    this.chart!.labels = labels;

    this.chart?.update();
  }

  @Input() lineChartType: ChartType = 'line';

  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

}
