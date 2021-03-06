/**
 * © 2018 S.C. FORMULA DATABASE S.R.L.
 * License TBD
 */

import { Entity, Pn, EntityProperty } from "@domain/metadata/entity";
import { $s2e } from '@functions/s2e';
import { $User, $Dictionary } from "@domain/metadata/default-metadata";


export const GEN__Settings: Entity = {
    _id: "GEN__Settings",
    props: {
        name: { name: "name", propType_: Pn.TEXT } as EntityProperty,
        valueNumber: { name: "valueNumber", propType_: Pn.NUMBER } as EntityProperty,
        valueText: { name: "valueText", propType_: Pn.DOCUMENT } as EntityProperty,
        valueDate: { name: "valueDate", propType_: Pn.DATETIME } as EntityProperty,
    }
}

export const GEN__Currency: Entity = {
    _id: "GEN__Currency",
    props: {

        code: { name: "code", propType_: Pn.TEXT } as EntityProperty,
        rate1: { name: "rate1", propType_: Pn.NUMBER } as EntityProperty,
        rate2: { name: "rate2", propType_: Pn.NUMBER } as EntityProperty,
        rate3: { name: "rate3", propType_: Pn.NUMBER } as EntityProperty,
        rate4: { name: "rate4", propType_: Pn.NUMBER } as EntityProperty,
        rate5: { name: "rate5", propType_: Pn.NUMBER, } as EntityProperty,
    },
    validations: {
        "rate1!max": { conditionExpr: $s2e('rate1 < 10000 ') }
    }
};

export const GEN__Person: Entity = {
    _id: "GEN__Person",
    props: {

        code: { name: "code", propType_: Pn.TEXT, required: true } as EntityProperty,
        actor_code: { name: "actor_code", propType_: Pn.TEXT, required: true } as EntityProperty,
        name: { name: "name", propType_: Pn.TEXT } as EntityProperty,
        district: { name: "district", propType_: Pn.TEXT } as EntityProperty,
        city: { name: "city", propType_: Pn.TEXT } as EntityProperty,
        address: { name: "address", propType_: Pn.TEXT } as EntityProperty,
        supervisor: { name: "supervisor", propType_: Pn.TEXT } as EntityProperty,
        manager: { name: "manager", propType_: Pn.TEXT } as EntityProperty,
        phone: { name: "phone", propType_: Pn.TEXT } as EntityProperty,
        fax: { name: "fax", propType_: Pn.TEXT } as EntityProperty,
        tax_number: { name: "tax_number", propType_: Pn.TEXT } as EntityProperty,
        details: { name: "details", propType_: Pn.TEXT } as EntityProperty,
        state: { name: "state", propType_: Pn.TEXT, required: true, } as EntityProperty,
    }
};

export const GEN__Client: Entity = {
    _id: "GEN__Client",
    props: {

        code: { name: "code", propType_: Pn.TEXT, required: true } as EntityProperty,
        username: { name: "username", propType_: Pn.TEXT } as EntityProperty,
        name: { name: "name", propType_: Pn.TEXT } as EntityProperty,
        role: { name: "role", propType_: Pn.TEXT } as EntityProperty,
        password: { name: "password", propType_: Pn.TEXT } as EntityProperty,
        details: { name: "details", propType_: Pn.TEXT } as EntityProperty,
        type: { name: "type", propType_: Pn.TEXT } as EntityProperty,
        parent_code: { name: "parent_code", propType_: Pn.TEXT } as EntityProperty,
        param1: { name: "param1", propType_: Pn.TEXT } as EntityProperty,
        state: { name: "state", propType_: Pn.TEXT, required: true, } as EntityProperty,
    }
};


export const General: Entity = {
    _id: "GEN",
    pureNavGroupingChildren: [$User._id, $Dictionary._id, GEN__Client._id, GEN__Currency._id, GEN__Person._id],
    props: {},
};
