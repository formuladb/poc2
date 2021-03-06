/**
 * © 2018 S.C. FORMULA DATABASE S.R.L.
 * License TBD
 */

import {
    Expression,
    CallExpression,
    isIdentifier,
    isCallExpression
} from "jsep";
import { PickOmit } from "../ts-utils";
import { ReduceFun } from "./reduce_functions";
import { ScalarValueTypes } from "./types";

export const enum ExecPlanN {
    CompiledScalarN ='CompiledScalarN',
    MapKeyN ='MapKeyN',
    MapValueN ='MapValueN',
    MapFunctionN ='MapFunctionN',
    MapKeyAndQueryN ='MapKeyAndQueryN',
    MapFunctionAndQueryN ='MapFunctionAndQueryN',
    MapReduceKeysAndQueriesN ='MapReduceKeysAndQueriesN',
    MapReduceKeysQueriesAndValueN ='MapReduceKeysQueriesAndValueN',
    MapReduceTriggerN ='MapReduceTriggerN',
    CompiledFormulaN ='CompiledFormulaN',
}

export type ExecPlanCompiledExpression = 
    CompiledScalar 
    | MapKey 
    | MapValue 
    | MapKeyAndQuery
    | MapFunctionAndQuery 
    | MapFunction 
    | MapReduceKeysAndQueries 
    | MapReduceKeysQueriesAndValue 
    | MapReduceTrigger 
    | CompiledFormula;

export interface ExecPlanBase {
    type_: ExecPlanN;
    rawExpr: Expression;
}

export const CompiledScalarN = ExecPlanN.CompiledScalarN;
export class CompiledScalar implements ExecPlanBase {
    readonly type_ = CompiledScalarN;
    rawExpr: Expression;
    has$Identifier: boolean;
    hasNon$Identifier: boolean;
}
export function isCompiledScalar(param): param is CompiledScalar {
    if (null == param || null != param.type) return false;
    return typeof param === 'object' && param.type_ === CompiledScalarN;
}



export const MapKeyN = ExecPlanN.MapKeyN;
export class MapKey implements ExecPlanBase {
    readonly type_ = MapKeyN;
    rawExpr: Expression;
    entityId: string;
    keyExpr: KeyExpression;
    has$Identifier: boolean;
    hasNon$Identifier: boolean;
}
export function isMapKey(param): param is MapKey {
    if (null == param || null != param.type) return false;
    return typeof param === 'object' && param.type_ === MapKeyN;
}
export function extendsMapKeyN(type_: ExecPlanN): boolean {
    return type_ === MapKeyN
        || type_ === MapFunctionN
        || type_ === MapKeyAndQueryN
        || type_ === MapFunctionAndQueryN
    ;
}
export function extendsMapKey(param): param is 
    | MapKey
    | MapFunction
    | MapKeyAndQuery
    | MapFunctionAndQuery
{
    if (null == param || null != param.type) return false;
    return typeof param === 'object' && extendsMapKeyN(param.type_);
}
export function includesMapKeyN(type_: ExecPlanN): boolean {
    return type_ === MapKeyN
        || type_ === MapFunctionN
        || type_ === MapKeyAndQueryN
        || type_ === MapFunctionAndQueryN
        || type_ === MapReduceKeysAndQueriesN
        || type_ === MapReduceTriggerN
    ;
}
export function includesMapKey(param): param is 
    | MapKey
    | MapFunction
    | MapKeyAndQuery
    | MapFunctionAndQuery
    | MapReduceKeysAndQueries
    | MapReduceTrigger
{
    if (null == param || null != param.type) return false;
    return typeof param === 'object' && includesMapKeyN(param.type_);
}


export const MapValueN = ExecPlanN.MapValueN;
export class MapValue {
    readonly type_ = MapValueN;
    rawExpr: Expression;
    entityId: string;
    valueExpr: Expression;
    has$Identifier: boolean;
    hasNon$Identifier: boolean;
}
export function isMapValue(param): param is MapValue {
    if (null == param || null != param.type) return false;
    return typeof param === 'object' && param.type_ === MapValueN;
}
export function extendsMapValueN(type_: ExecPlanN): boolean {
    return type_ === MapValueN
        || type_ === MapFunctionN
        || type_ === MapFunctionAndQueryN
    ;
}
export function extendsMapValue(param): param is 
    | MapValue
    | MapFunction
    | MapFunctionAndQuery
{
    if (null == param || null != param.type) return false;
    return typeof param === 'object' && extendsMapValueN(param.type_);
}

export function includesMapValueN(type_: ExecPlanN): boolean {
    return type_ === MapValueN
        || type_ === MapFunctionN
        || type_ === MapFunctionAndQueryN
        || type_ === MapReduceTriggerN
    ;
}
export function includesMapValue(param): param is 
    | MapValue
    | MapFunction
    | MapFunctionAndQuery
    | MapReduceTrigger 
{
    if (null == param || null != param.type) return false;
    return typeof param === 'object' && includesMapValueN(param.type_);
}



export type MapKeyQuery = Pick<MapFunctionAndQuery, 'keyExpr' | 'query' | 'existingIndex'>;
export class MapQuery {
    startkeyExpr: KeyExpression;
    endkeyExpr: KeyExpression;
    inclusive_start: boolean;
    inclusive_end: boolean;
    filter?: Expression;
}

export type KeyExpression = Expression[];

export const MapFunctionN = ExecPlanN.MapFunctionN;
export class MapFunction implements ExecPlanBase {
    readonly type_ = MapFunctionN;
    existingIndex?: string;
    rawExpr: Expression;
    entityId: string;
    keyExpr: KeyExpression;
    valueExpr: Expression;
}
export type MapFunctionT = PickOmit<MapFunction, 'type_' | 'rawExpr'>;
export function isMapFunction(param): param is MapFunction {
    if (null == param || null != param.type) return false;
    return typeof param === 'object' && param.type_ === MapFunctionN;
}

export const MapKeyAndQueryN = ExecPlanN.MapKeyAndQueryN;
export class MapKeyAndQuery implements ExecPlanBase {
    readonly type_ = MapKeyAndQueryN;
    rawExpr: Expression;
    entityId: string;
    keyExpr: KeyExpression;
    query: MapQuery;
}
export function isMapKeyAndQuery(param): param is MapKeyAndQuery {
    if (null == param || null != param.type) return false;
    return typeof param === 'object' && param.type_ === MapKeyAndQueryN;
}


export const MapFunctionAndQueryN = ExecPlanN.MapFunctionAndQueryN;
export class MapFunctionAndQuery implements ExecPlanBase {
    readonly type_ = MapFunctionAndQueryN;
    existingIndex?: string;
    rawExpr: Expression;
    entityId: string;
    keyExpr: KeyExpression;
    valueExpr: Expression;
    query: MapQuery;
}
export type MapFunctionAndQueryT = PickOmit<MapFunctionAndQuery, 'type_' | 'rawExpr'>;
export function isMapFunctionAndQuery(param): param is MapFunctionAndQuery {
    if (null == param || null != param.type) return false;
    return typeof param === 'object' && param.type_ === MapFunctionAndQueryN;
}
export function includesMapFunctionAndQueryN(type_: ExecPlanN): boolean {
    return type_ === MapFunctionAndQueryN
        || type_ === MapReduceKeysAndQueriesN
        || type_ === MapReduceKeysQueriesAndValueN
        || type_ === MapReduceTriggerN
    ;
}
export function includesMapFunctionAndQuery(param): param is MapFunctionAndQuery {
    if (null == param || null != param.type) return false;
    return typeof param === 'object' && includesMapFunctionAndQueryN(param.type_);
}

export const MapReduceKeysAndQueriesN = ExecPlanN.MapReduceKeysAndQueriesN;
export class MapReduceKeysAndQueries implements ExecPlanBase {
    readonly type_ = MapReduceKeysAndQueriesN;
    rawExpr: Expression;
    mapreduceAggsOfManyObservablesQueryableFromOneObs: {
        map: MapKeyQuery;
    }
    mapObserversImpactedByOneObservable: MapKeyQuery;
}
export function isMapReduceKeysAndQueries(param): param is MapReduceKeysAndQueries {
    if (null == param || null != param.type) return false;
    return typeof param === 'object' && param.type_ === MapReduceKeysAndQueriesN;
}
export function includesMapReduceKeysAndQueriesN(type_: ExecPlanN): boolean {
    return type_ === MapReduceKeysAndQueriesN
        || type_ === MapReduceKeysQueriesAndValueN
        || type_ === MapReduceTriggerN
    ;
}
export function includesMapReduceKeysAndQueries(param): param is 
    | MapReduceKeysAndQueries 
    | MapReduceKeysQueriesAndValue
    | MapReduceTrigger
{
    if (null == param || null != param.type) return false;
    return typeof param === 'object' && includesMapReduceKeysAndQueriesN(param.type_);
}


export const MapReduceKeysQueriesAndValueN = ExecPlanN.MapReduceKeysQueriesAndValueN;
export class MapReduceKeysQueriesAndValue implements ExecPlanBase {
    readonly type_ = MapReduceKeysQueriesAndValueN;
    rawExpr: Expression;
    mapreduceAggsOfManyObservablesQueryableFromOneObs: {
        map: {
            entityId: string;
            keyExpr: KeyExpression;
            valueExpr: Expression;
            query: MapQuery;
        }
    }
    mapObserversImpactedByOneObservable: MapKeyQuery;
}
export function isMapReduceKeysQueriesAndValue(param): param is MapReduceKeysQueriesAndValue {
    if (null == param || null != param.type) return false;
    return typeof param === 'object' && param.type_ === MapReduceKeysQueriesAndValueN;
}




export const MapReduceTriggerN = ExecPlanN.MapReduceTriggerN;
export class MapReduceTrigger implements ExecPlanBase {
    readonly type_ = MapReduceTriggerN;
    rawExpr: Expression;
    mapreduceAggsOfManyObservablesQueryableFromOneObs: {
        aggsViewName: string;
        aggsViewDescription: string;
        map: MapFunctionAndQueryT;
        reduceFun: ReduceFun;
    };
    mapObserversImpactedByOneObservable: MapFunctionAndQueryT & {
        obsViewName: string;
        obsViewDescription: string;
    };

    mapreduceAggsOfManyObservablesQueryableFromOneObs__?: string;//FIXME: security breach!!! this should be put somewhere else and not be available for the clients to see
    mapObserversImpactedByOneObservable__?: string;//FIXME: security breach!!! this should be put somewhere else and not be available for the clients to see
}
export function isMapReduceTrigger(param): param is MapReduceTrigger {
    if (null == param || null != param.type) return false;
    return typeof param === 'object' && param.type_ === MapReduceTriggerN;
}




export const CompiledFormulaN = ExecPlanN.CompiledFormulaN;
export class CompiledFormula implements ExecPlanBase {
    readonly type_ = CompiledFormulaN;
    finalExpression: Expression;
    rawExpr: Expression;
    targetEntityName: string;
    targetPropertyName: string;
    triggers?: MapReduceTrigger[];
};
export function isCompiledFormula(param): param is CompiledFormula {
    if (null == param || null != param.type) return false;
    return typeof param === 'object' && param.type_ === CompiledFormulaN;
}


export class ExecutionPlan {
    [deepPathFormulaProperty: string]: CompiledFormula;
}