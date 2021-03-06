/**
 * © 2018 S.C. FORMULA DATABASE S.R.L.
 * License TBD
 */

import { Pn, EntityProperty } from "@domain/metadata/entity";


export const MBK__Service = {
    _id: 'MBK__Service',
    props: {
        category: { name: 'category', propType_: Pn.TEXT, required: true } as EntityProperty,
        name: { name: 'name', propType_: Pn.TEXT, required: true } as EntityProperty,
        // we should invent ENUM-ul
        unitType: { name: 'unitType', propType_: Pn.TEXT, required: true } as EntityProperty,
        unitPrice: { name: 'unitPrice ', propType_: Pn.NUMBER, required: true } as EntityProperty,
    },
};

export const MBK__Estimate = {
    _id: 'MBK__Estimate',
    props: {
        date: { name: 'date', propType_: Pn.DATETIME, required: true } as EntityProperty,
        client: { name: 'client', propType_: Pn.TEXT, required: true } as EntityProperty, // should be reference to GEN__Client
        // etc...
        totalPlayers: {
            name: 'totalPlayers', propType_: Pn.FORMULA,
            formula: 'SUMIF(MBK__Estimate__Service.musicians, estimateId == @[_id])'
        } as EntityProperty,
        services$: {
            name: 'services$',
            propType_: Pn.CHILD_TABLE,
            referencedEntityName: 'MBK__Estimate__Service',
            props: {},
            isLargeTable: true,
        } as EntityProperty,
    },
};

export const MBK__Estimate__Service = {
    _id: 'MBK__Estimate__Service',
    props: {
        estimateId: { name: 'estimateId', propType_: Pn.TEXT, required: true } as EntityProperty,
        serviceCategory: {
            name: 'service_category', propType_: Pn.REFERENCE_TO,
            referencedEntityName: MBK__Service._id,
            referencedPropertyName: 'category'
        } as EntityProperty,
        serviceName: {
            name: 'service_name', propType_: Pn.REFERENCE_TO,
            referencedEntityName: MBK__Service._id,
            referencedPropertyName: 'name'
        } as EntityProperty,
        serviceUnitType: {
            name: 'service_unit_type', propType_: Pn.REFERENCE_TO,
            referencedEntityName: MBK__Service._id,
            referencedPropertyName: 'unitType'
        } as EntityProperty,
        serviceUnitPrice: {
            name: 'service_unit_price', propType_: Pn.REFERENCE_TO,
            referencedEntityName: MBK__Service._id,
            referencedPropertyName: 'unitPrice'
        } as EntityProperty,
        musicians: { name: 'musicians', propType_: Pn.NUMBER, required: true } as EntityProperty,
        quantity: { name: 'quantity', propType_: Pn.NUMBER, required: true } as EntityProperty,
        doubles: { name: 'doubles', propType_: Pn.NUMBER, required: true } as EntityProperty,
        doubling: { name: 'doubling', propType_: Pn.FORMULA, formula: 'quantity * service.unitPrice * doubles * 0.2' } as EntityProperty,
        cartage: { name: 'cartage', propType_: Pn.NUMBER, required: true } as EntityProperty,
        total: {
            name: 'total', propType_: Pn.FORMULA,
            formula: 'musicians * quantity * service.unitPrice + doubling + cartage'
        } as EntityProperty,
    },
};

export const MBK__Session = {
    _id: 'MBK__Session',
    props: {
        estimateId: { name: 'estimateId', propType_: Pn.TEXT, required: true } as EntityProperty,
        date: { name: 'date', propType_: Pn.DATETIME, required: true } as EntityProperty,
    },
};

export const MBK__Booking = {
    _id: 'MBK__Booking',
    props: {
        sessionId: { name: 'sessionId', propType_: Pn.TEXT, required: true } as EntityProperty,
    },
};

export const MBK__Booking__Musician = {
    _id: 'MBK__Booking__Musician',
    props: {
        bookingId: { name: 'bookingId', propType_: Pn.TEXT, required: true } as EntityProperty,
        musicianName: { name: 'musicianName', propType_: Pn.TEXT, required: true } as EntityProperty,
        musicianEmail: { name: 'musicianEmail', propType_: Pn.TEXT, required: true } as EntityProperty,
    },
};

export const MBK__Email = {
    _id: 'MBK__Email',
    props: {
        date: { name: 'date', propType_: Pn.DATETIME, required: true } as EntityProperty,
        template: { name: 'template', propType_: Pn.TEXT, required: true } as EntityProperty,
        // should be reference to GEN__Client
    },
};

export const MusicBooking = {
    _id: 'MBK',
    pureNavGroupingChildren: [
        MBK__Service._id,
        MBK__Estimate._id,
        MBK__Estimate__Service._id,
        MBK__Session._id,
        MBK__Booking._id,
        MBK__Booking__Musician._id,
        MBK__Email._id,
    ],
    props: {},
};
