/**
 * © 2017 S.C. CRYSTALKEY S.R.L.
 * License TBD
 */

import { Action, createSelector, createFeatureSelector } from '@ngrx/store';

import { DataObj } from './common/domain/metadata/data_obj';
import { ChangeObj, applyChanges } from './common/domain/change_obj';


export { DataObj };
export { ChangeObj, applyChanges };

import { Expression } from 'jsep';
import { EntityProperty, Pn } from './common/domain/metadata/entity';

export interface FormulaState {
  selectedFormula: string | undefined;
  editorExpr: string | undefined;
  selectedProperty: EntityProperty | null;
  formulaColumns: {[columnName: string]: string};
}

export const formulaEditorInitialState: FormulaState = {
  selectedFormula: undefined,
  editorExpr: undefined,
  selectedProperty: null,
  formulaColumns: {},
};


export const FormulaEditorToggleN = "[fx] FormulaEditorToggle";
export const FormulaEditedN = "[fx] FormulaEdited";

export class FormulaEditorToggle implements Action {
  readonly type = FormulaEditorToggleN;

  constructor() { }
}

export class FormulaEdited implements Action {
  readonly type = FormulaEditedN;

  constructor(public formulaColumns: {[columnName: string]: string}) { }
}

export type FormulaActions =
  | FormulaEditorToggle
  | FormulaEdited
  ;

/**
 * TODO: check if immuformulaEditor.js is needed, probably only for large data sets
 * 
 * @param state 
 * @param action 
 */
export function formulaEditorReducer(state = formulaEditorInitialState, action: FormulaActions): FormulaState {
  let ret: FormulaState = state;
  switch (action.type) {
    case FormulaEditorToggleN:
      ret = {
        ...state,
        editorExpr: state.editorExpr ? undefined : state.selectedFormula
      };
      break;
    case FormulaEditedN:
      ret = {
        ...state,
        formulaColumns: action.formulaColumns
      };
      break;
  }

  // if (action.type.match(/^\[formula\]/)) console.log('[formula] reducer:', state, action, ret);
  return ret;
}

/**
 * Link with global application state
 */
export const reducers = {
  'formula': formulaEditorReducer
};
export const getFormula = createFeatureSelector<FormulaState>('formula');

export const getEditorExpr = createSelector(
  getFormula,
  (state: FormulaState) => state.editorExpr
);
