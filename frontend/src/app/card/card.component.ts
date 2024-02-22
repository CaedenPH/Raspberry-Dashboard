import { Component, Input } from '@angular/core';


@Component({
  selector: 'app-card',
  standalone: true,
  imports: [],
  templateUrl: './card.component.html',
  styleUrl: './card.component.css'
})
export class CardComponent {
  @Input() color!: string;
  @Input() icon!: string;
  @Input() heading!: string;
  
  @Input() value!: string;
  @Input() description!: string;

}
