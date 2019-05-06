import * as _ from 'lodash';
import { AppState, AppActions } from "./app.state";
import { PageChangedActionN } from "../actions/page.user.actions";
import { autoLayoutFormPage } from "../components/auto-layout.service";

export function autoLayoutReducer(state: AppState, action: AppActions): AppState {
    let ret: AppState = state;
    switch (action.type) {
        case PageChangedActionN:
            if (!state.entity.selectedEntity || state.entity.entities.length == 0) break;
            ret = {
                ...state,
                page: {
                    ...state.page,
                    // form: autoLayoutFormPage(null, state.entity.selectedEntity, _.keyBy(state.entity.entities, '_id'), action.page),
                },
            }
            break;
    }

    return ret;
}