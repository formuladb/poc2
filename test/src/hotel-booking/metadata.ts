/**
 * © 2018 S.C. FORMULA DATABASE S.R.L.
 * License TBD
 */

import { Pn, EntityProperty, EntityStateGraph, Schema } from "@domain/metadata/entity";
import { $User, $Dictionary, DefaultAppOpts } from "@domain/metadata/default-metadata";
import { App } from "@domain/app";

export const Room_Type = {
    _id: "Room_Type",
    isEditable: true,
    props: {
        _id: { name: "_id", propType_: Pn.TEXT, required: true } as EntityProperty,
        name: { name: "name", propType_: Pn.TEXT, required: true } as EntityProperty,
        description: { name: "description", propType_: Pn.TEXT, required: true } as EntityProperty,
        picture: { name: "picture", propType_: Pn.IMAGE } as EntityProperty,
        long_description: { name: "long_description", propType_: Pn.TEXT } as EntityProperty,
        price: { name: "price", propType_: Pn.NUMBER, required: true } as EntityProperty,
        wifi: { name: "wifi", propType_: Pn.BOOLEAN } as EntityProperty,
        parking: { name: "parking", propType_: Pn.BOOLEAN } as EntityProperty,
        // overlapping: { name: "overlapping", propType_: Pn.FORMULA, formula: 'COUNTIF(Booking.price, @[booking_item_id] == booking_item_id, $INTERSECTS(start_date, end_date, @[start_date], @[end_date], "D"))' } as EntityProperty,
        // overlapping: { name: "overlapping", propType_: Pn.FORMULA, formula: 'COUNTIF(Booking.cost, booking_item_id == @[_id])' } as EntityProperty,
        // booking_table: {
        //     name: 'booking_table',
        //     propType_: Pn.CHILD_TABLE,
        //     referencedEntityName: "Booking",
        //     props: {},
        //     isLargeTable: true,
        // } as EntityProperty,
    },
    // validations: {
    //     noOverlap: { conditionExpr: $s2e('overlapping <= 10') }
    // },
};

export const Room = {
    _id: "Room",
    isEditable: true,
    props: {
        _id: { name: "_id", propType_: Pn.TEXT, required: true } as EntityProperty,
        nb: { name: "nb", propType_: Pn.NUMBER, required: true } as EntityProperty,
        room_type: { name: "room_type", propType_: Pn.REFERENCE_TO, referencedEntityName: Room_Type._id, referencedPropertyName: '_id' } as EntityProperty,
    }
};

export const Booking = {
    _id: "Booking",
    isEditable: true,
    stateGraph: {
        nodes: ['PENDING', 'FINALIZED', 'CANCELLED'],
        transitions: [
            { source: 'PENDING', target: 'FINALIZED' },
            { source: 'PENDING', target: 'CANCELLED' },
            { source: 'FINALIZED', target: 'CANCELLED' },
        ]
    } as EntityStateGraph,
    props: {
        _id: { name: "_id", propType_: Pn.TEXT, required: true } as EntityProperty,
        guest: { name: "guest", propType_: Pn.REFERENCE_TO, referencedEntityName: $User._id, referencedPropertyName: '_id' } as EntityProperty,
        room: { name: "room", propType_: Pn.REFERENCE_TO, referencedEntityName: Room._id, referencedPropertyName: '_id' } as EntityProperty,
        start_date: { name: "start_date", propType_: Pn.DATETIME, required: true } as EntityProperty,
        end_date: { name: "end_date", propType_: Pn.DATETIME, required: true } as EntityProperty,
        nb_adults: { name: "nb_adults", propType_: Pn.NUMBER, required: true } as EntityProperty,
        nb_children: { name: "nb_children", propType_: Pn.NUMBER, required: true } as EntityProperty,
        days: { name: "days", propType_: Pn.FORMULA, formula: 'DATEDIF(start_date, end_date, "D") + 1' } as EntityProperty,
        cost: { name: "cost", propType_: Pn.FORMULA, formula: 'days * 100' } as EntityProperty,
        bookings_for_the_same_room: { name: "bookings_for_the_same_room", propType_: Pn.FORMULA, formula: '"FILTER(Booking, @[booking_item_id] == booking_item_id)"' } as EntityProperty,
        // booking_day_table: {
        //     name: 'booking_day_table',
        //     propType_: Pn.CHILD_TABLE,
        //     referencedEntityName: "BookingDay",
        //     props: {},
        //     isLargeTable: true,
        // } as EntityProperty,
    },
    // validations: {
    //     maxBooking: { conditionExpr: $s2e('days < 200 && cost < 20000') }
    // }
}

export const HotelBookingApp: App = {
    _id: "hotel-booking",
    name: "App~~hotel-booking",
    ...DefaultAppOpts,
    category: "",
    description: "Booking app for King Hotel",
    pages: [
        "index.html",
        "about.html",
        "gallery.html",
        "contact.html",
        "booking-F.html",
    ],
};

export const HotelBookingSchema: Schema = {
    _id: 'FRMDB_SCHEMA~~formuladb-examples--' + HotelBookingApp._id,
    entities: {
        [Room_Type._id]: Room_Type,
        [Room._id]: Room,
        [Booking._id]: Booking,
        [$User._id]: $User,
        [$Dictionary._id]: $Dictionary,
    },
}
