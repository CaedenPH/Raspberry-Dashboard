import { Component, ViewChild } from '@angular/core';
import { LoginComponent } from '../login/login.component';
import { GraphCardComponent } from "../graph-card/graph-card.component";

@Component({
    selector: 'app-home',
    standalone: true,
    templateUrl: './home.component.html',
    styleUrl: './home.component.css',
    imports: [LoginComponent, GraphCardComponent]
})
export class HomeComponent {
    @ViewChild('app-graph-card') graph!: GraphCardComponent;

    

}
