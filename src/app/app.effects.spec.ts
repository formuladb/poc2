import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { cold, hot, getTestScheduler } from 'jasmine-marbles';
import { empty } from 'rxjs/observable/empty';
import { Observable } from 'rxjs/Observable';
import { StoreModule, Store, combineReducers } from '@ngrx/store';
import { RouterTestingModule } from '@angular/router/testing';
import {
    RouterNavigationAction, RouterNavigationPayload, ROUTER_NAVIGATION
} from '@ngrx/router-store';
import 'rxjs/add/observable/merge';

import { Entity } from "./common/domain/metadata/entity";
import * as appState from './app.state';
import * as fromTable from './table/table.state';
import * as fromForm from './form/form.state';
import { AppEffects } from "./app.effects";
import { ChangeObj } from "./common/domain/change_obj";

import { MockMetadata, General__Actor, General__Currency } from "./common/test/mocks/mock-metadata";
import * as mainDemoFlow from "./common/test/main_demo.flow";
import { getDefaultTable, getDefaultForm } from "./common/domain.utils";

export class TestActions extends Actions {
    constructor() {
        super(empty());
    }

    set stream(source: Observable<any>) {
        this.source = source;
    }
}

export function getActions() {
    return new TestActions();
}


xdescribe('AppEffects', () => {

    let effects: AppEffects;
    // let backendReadService: BackendReadService;
    let actions$: TestActions;
    let actorTestId: string = null;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                StoreModule.forRoot(appState.reducers),
                RouterTestingModule
            ],
            providers: [
                // BackendReadService,
                AppEffects,
                { provide: Actions, useFactory: getActions }
            ]
        });

        effects = TestBed.get(AppEffects);
        actions$ = TestBed.get(Actions);
        // backendReadService = TestBed.get(BackendReadService);
        actorTestId = mainDemoFlow.mockData.getAllForPath(General__Actor._id)[0]._id;
    });

    it('a router effect test', () => {
            let values = {
                a: {
                    type: ROUTER_NAVIGATION,
                    payload: {routerState: {url: '/General__Actor'}} as RouterNavigationPayload<appState.RouterState>
                } as RouterNavigationAction<appState.RouterState>,
                b: {
                    type: ROUTER_NAVIGATION,
                    payload: {routerState: {
                        url: '/General__Actor/' + actorTestId
                    }} as RouterNavigationPayload<appState.RouterState>
                } as RouterNavigationAction<appState.RouterState>,
                c: {
                    type: ROUTER_NAVIGATION,
                    payload: {routerState: {url: '/General__Currency'}} as RouterNavigationPayload<appState.RouterState>
                } as RouterNavigationAction<appState.RouterState>,
                m: new fromTable.TableFormBackendAction(getDefaultTable(General__Actor as Entity)),
                n: new fromTable.TableDataFromBackendAction(
                    mainDemoFlow.mockData.getAllForPath(General__Actor._id).map(o => new ChangeObj(o))),
                o: new fromForm.FormFromBackendAction(getDefaultForm(General__Actor as Entity, mainDemoFlow.mockMetadata.entitiesMap)),
                p: new fromForm.FormDataFromBackendAction(mainDemoFlow.mockData.get(General__Actor._id, actorTestId)),
                q: new fromTable.TableFormBackendAction(getDefaultTable(General__Currency as Entity)),
                r: new fromTable.TableDataFromBackendAction(
                    mainDemoFlow.mockData.getAllForPath(General__Currency._id).map(o => new ChangeObj(o))),
                s: new fromForm.FormFromBackendAction(getDefaultForm(General__Currency as Entity, mainDemoFlow.mockMetadata.entitiesMap)),
            }

            actions$.stream = hot('--a----bc',values);
            const expected = cold('--(mno)p(qrs)', values);

            let i = 0;
            effects.listenForRouterChanges();
            // expect(effects.tableFormActions$).toBeObservable(expected);
        }
    );
});
