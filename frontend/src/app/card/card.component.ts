import { Component } from '@angular/core';
import { NgChartsModule } from 'ng2-charts';


@Component({
  selector: 'app-card',
  standalone: true,
  imports: [NgChartsModule],
  templateUrl: './card.component.html',
  styleUrl: './card.component.css'
})
export class CardComponent {

}
