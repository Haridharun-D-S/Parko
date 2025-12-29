import { LocationStrategy, HashLocationStrategy } from '@angular/common';
import { NgModule } from '@angular/core';

@NgModule({
  providers: [
    { provide: LocationStrategy, useClass: HashLocationStrategy }
  ]
})
export class AppModule {}
