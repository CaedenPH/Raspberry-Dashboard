import { Component, ViewChild } from '@angular/core';
import { LoginComponent } from '../login/login.component';
import { GraphCardComponent } from '../graph-card/graph-card.component';
import { delay, interval } from 'rxjs';
import { ChartConfiguration, ChartData } from 'chart.js';
import axios from 'axios';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  imports: [LoginComponent, GraphCardComponent],
})
export class HomeComponent {
  @ViewChild('app-graph-card') graph!: GraphCardComponent;
  timeinterval = interval(5 * 1000);
  counter: number = 0;
  color = "background: var(--accent-gradient)";


  shiftcounter: number = 0;

  lineChartData: ChartData = {
    datasets: [
      {
        data: [],
        backgroundColor: '#fad5e2',
        borderColor: 'red',
        pointBackgroundColor: '#fad5e205',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#fad5e2)',
        fill: 'origin',
      }
    ],
    labels: []
  };

  ramusage: ChartData = {
    datasets: [
      {
        data: [],
        
        backgroundColor: 'rgba(0,100,0,0.3)',
        borderColor: 'green',
        pointBackgroundColor: 'rgba(148,159,177,1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(148,159,177,0.8)',
        fill: 'origin',
      }
    ],
    labels: []
  };

  constructor() {
    this.timeinterval.subscribe(() => {
      let json: any;
      axios.get("/api/data/server").then(
        (response) => {
          if(this.counter > 7){
            this.lineChartData.datasets[0].data.shift();
            this.ramusage.datasets[0].data.shift();

            this.lineChartData.labels?.shift();
            this.ramusage.labels?.shift();
          }
  
          this.lineChartData = {...this.lineChartData};
          this.ramusage = {...this.ramusage};
          
          

        this.lineChartData.datasets[0].data.push(response.data["loadavg"]);
        this.ramusage.datasets[0].data.push((response.data["freeram"] / response.data["totalram"]) * 100);
        
        let time = new Date(response.data["time"] * 1000);
        let time_string = time.getUTCHours().toString() + ":" + time.getMinutes().toString() + ":" + time.getUTCSeconds().toString();

        this.ramusage.labels?.push(time_string);
        this.lineChartData.labels?.push(time_string);

        

        this.lineChartData = {...this.lineChartData};
        this.ramusage = {...this.ramusage};

        
        this.counter++;

        }
      );
    })
  }

  
}
