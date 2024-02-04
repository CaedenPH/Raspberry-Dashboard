import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, RouterOutlet } from '@angular/router';
import { SidebarComponent } from "./sidebar/sidebar.component";

@Component({
    selector: 'app-root',
    standalone: true,
    templateUrl: './app.component.html',
    styleUrl: './app.component.css',
    imports: [CommonModule, RouterModule, RouterOutlet, SidebarComponent]
})
export class AppComponent {
  title = 'raspberry-dashboard';
  constructor(private route: ActivatedRoute) {}
  current_route: string = "";
  ngOnInit() {
    this.route.url.subscribe(([url]) => {
      const { path, parameters } = url;
      this.current_route = url.toString();
      console.log(url);
    });
  }

}
