import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  is_open = true;

  close(event: any) {
    const sidebar: HTMLElement | null = document.getElementById('sidebar')!;

    this.is_open
      ? sidebar.classList.add('is_hidden')
      : sidebar.classList.remove('is_hidden');

    this.is_open = !this.is_open;
  }
}
