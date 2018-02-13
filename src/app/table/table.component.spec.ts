import { async, ComponentFixture, TestBed, inject } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { By } from '@angular/platform-browser';

import { StoreModule, Store, combineReducers } from '@ngrx/store';

import { TableComponent } from './table.component';
import { ModalComponent } from "../modal/modal.component";
import { FormModalService } from "../form-modal.service";

import * as state from './table.state';

import * as mainDemoFlow from "../common/test/main_demo.flow";

interface AppState {
  nav: state.TableState;
}

const reducers = {
  'table': state.tableReducer
};

xdescribe('TableComponent', () => {
  let component: TableComponent;
  let fixture: ComponentFixture<TableComponent>;
  let store: Store<state.TableState>;
  
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,        
        StoreModule.forRoot(reducers),
      ],
      declarations: [ TableComponent, ModalComponent ],
      providers: [ 
        FormModalService        
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    store = TestBed.get(Store);
    
    fixture = TestBed.createComponent(TableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('main flow', () => {
    expect(component).toBeTruthy();

    store.dispatch(new state.TableFormBackendAction(
      mainDemoFlow.SIMPLE_FLOW.And_default_table_page_with_service_forms_should_be_displayed.serviceFormTable));
    
    let firstEntity = fixture.debugElement.query(By.css('tr'));
        
  });
});
