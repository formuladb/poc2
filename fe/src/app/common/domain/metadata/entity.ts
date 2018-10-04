/**
 * © 2017 S.C. CRYSTALKEY S.R.L.
 * License TBD
 */

import { BaseObj, SubObj, isReservedPropName, RESERVED_PROP_NAMES } from '../base_obj';
import { CompiledFormula } from "./execution_plan";
import * as _ from 'lodash';
import { KeyValueObj, IdRevObj } from '../key_value_obj';
import { Expression } from 'jsep';

/**
 * the _id of the Entity is the path, e.g. Forms___ServiceForm
 */
export interface Entity extends KeyValueObj {
    _id: string;
    module_?: boolean;
    aliases?: {[aliasName: string]: string};
    validations?: _.Dictionary<FormulaValidation>;
    autoCorrectionsOnValidationFailed?: _.Dictionary<AutoCorrectionOnValidationFailed[]>;
    props: EntityProperties;

    // fromObjLiteral<T extends Pick<Entity, Exclude<keyof Entity, 'type_' | 'props' | 'fromObjLiteral'>> & {props: any}>(
    //     obj: T & {props: {readonly [x in keyof T['props']]: EntityProperty}}): Entity 
    // {
    //     Object.assign(this, obj);
    //     return this;
    // }
}


export interface AutoCorrectionOnValidationFailed {
    targetPropertyName: string;
    autoCorrectExpr: Expression;
}
export class FormulaValidation {
    conditionExpr: Expression;
    rollback?: boolean;
}

export type HasEntityProperties = Entity | SubTableProperty | SubEntityProperty;
export type EntityProperties = { [x: string]: EntityProperty };
export type EntityDeepPath = string;
export interface Schema extends BaseObj {
    readonly _id: 'FRMDB_SCHEMA';
    entities: {[x: string]: Entity};
}

export function isEntityProperty(param): param is EntityProperty {
    return param != null && typeof param === 'object' && param['propType_'] != null;
}

export function isPropertyWithProperties(param): param is SubTableProperty | SubEntityProperty {
    return isEntityProperty(param) && (param.propType_ === Pn.SUB_TABLE || param.propType_ === Pn.SUB_ENTITY);
}
export function extendEntityProperties(extendedEntity: HasEntityProperties, newProperties: EntityProperties) {
    _.toPairs(newProperties).forEach(([propName, p]) => {
        if (isReservedPropName(propName)) return;
        extendedEntity.props[propName] = p;
    });
}
export function queryEntityWithDeepPath(entity: Entity, referencedEntityName: EntityDeepPath): EntityProperties {
    let relativePath = referencedEntityName.replace(entity._id, '').replace(/^\//, '').replace(/\/@/g, '');
    if (null != relativePath && '' !== relativePath) {
        let pathInsideEntity = relativePath.replace(/\//, '.');
        return _(eval(`entity.${pathInsideEntity}`)).omit(RESERVED_PROP_NAMES).extend({ _id: { name: "_id", propType_: Pn.STRING } }).value() as EntityProperties;
    }
    return entity.props;
}


export const enum Pn {
    NUMBER = "NUMBER",
    STRING = "STRING",
    TEXT = "TEXT",
    DATETIME = "DATETIME",
    SUB_TABLE = "SUB_TABLE",
    BELONGS_TO = "BELONGS_TO",
    SUB_ENTITY = "SUB_ENTITY",
    FORMULA = "FORMULA",
}

export interface NumberProperty {
    propType_: Pn.NUMBER;
    name: string;
    defaultValue?: number;
    allowNull?: boolean;
}
export interface StringProperty {
    propType_: Pn.STRING;
    name: string;
    defaultValue?: string;
    allowNull?: boolean;
}
export interface TextProperty {
    propType_: Pn.TEXT;
    name: string;
    allowNull?: boolean;
}
export interface DatetimeProperty {
    propType_: Pn.DATETIME;
    name: string;
    allowNull?: boolean;
}

/**
 * Table of existing entities or entities created
 */
export interface SubTableProperty {
    propType_: Pn.SUB_TABLE;
    name: string;
    referencedEntityName?: string;
    snapshotCurrentValueOfProperties?: string[];
    isLargeTable?: boolean;
    props: EntityProperties;
}
export function isSubTableProperty(param): param is SubTableProperty {
    return param != null && typeof param === 'object' && param.propType_ === Pn.SUB_TABLE;
}

/**
 * This property represents an embedded entity that is created when the parent entity is created
 */
export interface SubEntityProperty {
    propType_: Pn.SUB_ENTITY;
    name: string;
    referencedEntityName?: string;
    props: EntityProperties;
}
export function isSubEntityProperty(param): param is SubEntityProperty {
    return param != null && typeof param === 'object' && param.propType_ == Pn.SUB_ENTITY;
}

export interface BelongsToProperty {
    propType_: Pn.BELONGS_TO;
    name: string;
    referencedEntityName: string;
    snapshotCurrentValueOfProperties: string[];
}
export function isBelongsToProperty(param): param is BelongsToProperty {
    return param != null && typeof param === 'object' && param.propType_ == Pn.BELONGS_TO;
}


export type FormulaExpression = string;

/**
 * This property represents a formula definition
 */
export interface FormulaProperty {
    propType_: Pn.FORMULA;
    name: string;
    formula: FormulaExpression;
    compiledFormula_?: CompiledFormula;
}
export function isFormulaProperty(param): param is FormulaProperty {
    return param != null && typeof param === 'object' && param.propType_ == Pn.FORMULA;
}

export type EntityProperty =
    | NumberProperty
    | StringProperty
    | TextProperty
    | DatetimeProperty
    | SubTableProperty
    | SubEntityProperty
    | BelongsToProperty
    | FormulaProperty
    ;