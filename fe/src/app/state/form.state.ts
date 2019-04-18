/**
* © 2018 S.C. FORMULA DATABASE S.R.L.
* License TBD
*/

import { Action, createSelector, createFeatureSelector } from '@ngrx/store';

import { DataObj, mergeSubObj } from "@core/domain/metadata/data_obj";
import { Form, NodeElement, isNodeElementWithChildren, NodeType, FormAutocomplete } from "@core/domain/uimetadata/form";
import { ChangeObj, applyChanges } from "@core/domain/change_obj";
import * as events from "@core/domain/event";
import * as formUserActions from '../actions/form.user.actions';
import * as formServerActions from '../actions/form.backend.actions';
import * as _ from 'lodash';

export { DataObj };
export { Form };
export { ChangeObj, applyChanges };

export class AutoCompleteState {
    controls: {[refPropertyName: string]: FormAutocomplete} = {};
    options: {}[] = [];
    selectedOption: {} | null;

    constructor(public currentObjId: string, public entityAlias: string, public currentControl: FormAutocomplete) {}
}

export interface FormState {
    form: Form | null;
    formData: DataObj | null;
    eventFromBackend: events.MwzEvents | null;
    rdonly: boolean;
    dragged: NodeElement | null;
    autoCompleteState: AutoCompleteState | null;
}

export const formInitialState: FormState = {
    form: null,
    formData: null,
    eventFromBackend: null,
    rdonly: true,
    dragged: null,
    autoCompleteState: null,
};


export type FormActions =
    | formServerActions.FormDataFromBackendAction
    | formServerActions.ResetFormDataFromBackendAction
    | formServerActions.FormFromBackendAction
    | formServerActions.FormNotifFromBackendAction
    | formServerActions.FormAutoCompleteOptionsFromBackendAction
    | formUserActions.FormDragAction
    | formUserActions.FormDropAction
    | formUserActions.FormDeleteAction
    | formUserActions.FormSwitchTypeAction
    | formUserActions.FormAddAction
    | formUserActions.UserEnteredAutocompleteText
    | formUserActions.UserChoseAutocompleteOption
    ;


const removeRecursive = (tree: NodeElement, item: NodeElement) => {
    if (isNodeElementWithChildren(tree)) {
        if (tree.childNodes && tree.childNodes.length > 0) {
            tree.childNodes = tree.childNodes.filter(c => c._id !== item._id);
            tree.childNodes.forEach(c => removeRecursive(c, item));
        }
    }
}

const modifyRecursive = (tree: NodeElement, filter: (each: NodeElement) => boolean, action: (found: NodeElement) => void) => {
    if (filter(tree)) action(tree);
    if (isNodeElementWithChildren(tree)) {
        if (tree.childNodes && tree.childNodes.length > 0) {
            tree.childNodes.forEach(c => modifyRecursive(c, filter, action));
        }
    }
}

const addRecursive = (tree: NodeElement, sibling: NodeElement, position: string, what: NodeElement) => {
    console.log(tree, position, sibling, what)
    if (tree && isNodeElementWithChildren(tree) && tree.childNodes) {
        for (var i: number = 0; i < tree.childNodes.length; i++) {
            if (tree.childNodes[i]._id === sibling._id) {
                switch (position) {
                    case 'before':
                        tree.childNodes.splice(i, 0, what);
                        return;
                    case 'after':
                        tree.childNodes.splice(i + 1, 0, what);
                        return;
                    case 'append':
                        const p = tree.childNodes[i];
                        if (isNodeElementWithChildren(p) && p.childNodes)
                            p.childNodes.push(what);
                        return;
                }
            }
            else {
                addRecursive(tree.childNodes[i], sibling, position, what);
            }
        }
    }
}

/**
* 
* @param state 
* @param action 
*/
export function formReducer(state = formInitialState, action: FormActions): FormState {
    let ret: FormState = state;
    switch (action.type) {
        case formServerActions.ResetFormDataFromBackendActionN:
            ret = {
                ...state,
                formData: action.obj
            };
            break;
        //changes from the server are coming: properties modified
        case formServerActions.FormDataFromBackendActionN:
            if (null == state.formData || state.formData._id === action.obj._id) ret = { ...state, formData: action.obj };
            else {
                let formData = {
                    ...state.formData
                };
                mergeSubObj(formData, action.obj);
                ret = {
                    ...state,
                    formData: formData,
                };
            }
            break;
        case formServerActions.FormNotifFromBackendActionN:
            ret = {
                ...state,
                eventFromBackend: action.event,
            };
            break;
        //user navigates to different forms
        case formServerActions.FormFromBackendActionN:
            ret = {
                ...state,
                form: action.form,
            };
            break;
        case formServerActions.FormAutoCompleteOptionsFromBackendActionN:
            ret = {...state};
            let incomingEntityName = action.formAutocomplete.refEntityAlias || action.formAutocomplete.refEntityName;
            if (!ret.autoCompleteState || ret.autoCompleteState.entityAlias !== incomingEntityName || ret.autoCompleteState.currentObjId !== action.currentObjId) {
                console.warn("Internal check failed for FormAutoCompleteOptionsFromBackendAction, autocomplete from backend does not match the state:", ret.autoCompleteState, action);
            } else {
                ret.autoCompleteState = {
                   ...ret.autoCompleteState, 
                   options: action.rows,
                };
            }
            break;
        case formUserActions.UserEnteredAutocompleteTextN:
            ret = {...state};
            setAutoCompleteState(action.currentObjId, ret, action.formAutocompleteNode);
            break;
        case formUserActions.UserChoseAutocompleteOptionN:
            if (!state.autoCompleteState || !state.autoCompleteState.options || !_.find(state.autoCompleteState.options, action.option) ) {
                console.warn("Internal check failed for UserChoseAutocompleteOption, autocomplete from backend does not match the state:", ret.autoCompleteState, action);
            } else {
                ret = {
                    ...state,
                    autoCompleteState: {
                        ...state.autoCompleteState,
                        selectedOption: action.option,
                    },
                };
            }
            break;
        case formServerActions.FormAutoCompleteOptionsFromBackendActionN:
            break;
        case formUserActions.FormDragActionN:
            return { ...state, dragged: action.payload }

        case formUserActions.FormDropActionN:
            if (state.form && state.dragged) {
                removeRecursive(state.form, state.dragged as NodeElement);
                addRecursive(state.form, action.payload.drop, action.payload.position, state.dragged as NodeElement);
            }
            return { ...state, dragged: null } //TODO check immutable

        case formUserActions.FormDeleteActionN:
            if (state.form) {
                removeRecursive(state.form, action.payload);
            }
            return state;
        case formUserActions.FormSwitchTypeActionN:
            if (state.form) {
                modifyRecursive(state.form, n => n._id === action.payload.node._id, n => console.log(n))//TODO implement conversion
            }
            return state;
    }

    // if (action.type.match(/^\[form\]/)) console.log('[form] reducer:', state, action, ret);
    return ret;
}


function setAutoCompleteState(currentObjId: string, state: FormState, autoCompleteNode: FormAutocomplete) {
    if (!state.form) return;
    state.autoCompleteState = new AutoCompleteState(currentObjId, autoCompleteNode.refEntityAlias || autoCompleteNode.refEntityName, autoCompleteNode);
    walkForm(state.form, state.autoCompleteState);
}
function walkForm(node: NodeElement, autoCompleteState: AutoCompleteState) {
    if (node.nodeType === NodeType.form_autocomplete) {
        let entityName = node.refEntityAlias || node.refEntityName;
        if (autoCompleteState.entityAlias === entityName) {
            autoCompleteState.controls[node.refPropertyName] = node;
        }
    } else if (isNodeElementWithChildren(node)) {
        for (let childNode of node.childNodes || []) {
            walkForm(childNode, autoCompleteState);
        }
    }
}

/**
* Link with global application state
*/
export const reducers = {
    'form': formReducer
};
export const getForm = createFeatureSelector<FormState>('form');
export const getFormDataState = createSelector(
    getForm,
    (state: FormState) => state ? state.formData : formInitialState.formData
);
export const getFormState = createSelector(
    getForm,
    (state: FormState) => state ? state.form : formInitialState.form
);
export const getFormReadOnly = createSelector(
    getForm,
    (state: FormState) => state ? state.rdonly : formInitialState.rdonly
);
export const getAutoCompleteState = createSelector(
    getForm,
    (state: FormState) => state ? state.autoCompleteState : formInitialState.autoCompleteState
);