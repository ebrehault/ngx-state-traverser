import { NgModule } from '@angular/core';
import { store } from './store';
import { EffectsModule } from '@ngrx/effects';
import { StateTraverserEffect } from './effect';


@NgModule({
  imports: [
    ...store,
    EffectsModule.forFeature([StateTraverserEffect]),
  ]
})
export class StateTraverserModule {
}
