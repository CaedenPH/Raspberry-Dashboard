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
  _5minInterval = interval(1 * 60 * 1000);
  counter: number = 0;
  network_counter: number = 0;
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
        pointHoverBorderColor: '#fad5e2',
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
  ram_color: string = "background: var(--accent-green);";


  networkspeed: ChartData = {
    datasets: [
      {
        // download
        data: [],
        borderColor: '#63B3ED',
        pointBackgroundColor: '#63B3Ed'
      },
      {
        // upload
        data: [],
        borderColor: '#d63384',
        pointBackgroundColor: 'd63384'
      }
    ],
    labels: []
  };
  networkcolor: string = "background: var(--accent-grey);"

  constructor() {
    this.timeinterval.subscribe(() => {
      axios.get("/api/data/server").then(
        (response) => {
        if(this.counter > 7){
            this.lineChartData.datasets[0].data.shift();
            this.ramusage.datasets[0].data.shift();

            this.lineChartData.labels?.shift();
            this.ramusage.labels?.shift();

  
          this.lineChartData = {...this.lineChartData};
          this.ramusage = {...this.ramusage};
        }
          
          

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
    });
  

  this._5minInterval.subscribe(() => {

    axios.get("/api/data/serverspeed").then(
      (response) => {
        if (this.network_counter > 3) {
          this.networkspeed.datasets[0].data.shift();
          this.networkspeed.datasets[1].data.shift();
          this.networkspeed.labels?.shift();

  
          this.networkspeed = {...this.networkspeed};
          this.network_counter--;
        }

        let time = new Date(response.data["time"] * 1000);
        let time_string = time.getUTCHours().toString() + ":" + time.getMinutes().toString() + ":" + time.getUTCSeconds().toString();
        this.networkspeed.datasets[0].data.push(response.data["download"]);
        this.networkspeed.datasets[1].data.push(response.data["upload"]);
        this.networkspeed.labels?.push(time_string);

        this.networkspeed = {...this.networkspeed};
        this.network_counter++;
      }
    )
  });

  }
  
}
