/**
 * © 2018 S.C. FORMULA DATABASE S.R.L.
 * License TBD
 */

import { Entity, Pn, EntityProperty, FormulaProperty, EntityStateGraph } from "@domain/metadata/entity";
import { $s2e } from "@functions/s2e";
import { $User } from "@domain/metadata/default-metadata";

// export const HotelReport = {
//     _id: "HotelReport",
//     isEditable: true,
//     props: {
//         date: { name: "date", propType_: Pn.DATETIME},
//         occupancy: { name: "occupancy", propType_: Pn.FORMULA, 
//             formula: 'COUNTIF(Booking, $INTERSECTS(@[start_date], @[end_Date], date, date, "D")) / COUNT(BookingItem) * 100' } as EntityProperty,
//     }
// };

export const BookingItem = {
    _id: "BookingItem",
    isEditable: true,
    props: {
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
    validations: {
        noOverlap: { conditionExpr: $s2e('overlapping <= 10') }
    },
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
        user_id: { name: "user_id", propType_: Pn.REFERENCE_TO, referencedEntityName: $User._id, referencedPropertyName: '_id' } as EntityProperty,
        user_name: { name: "user_name", propType_: Pn.REFERENCE_TO, referencedEntityName: $User._id, referencedPropertyName: $User.props.name.name } as EntityProperty,
        booking_item_id: { name: "booking_item_id", propType_: Pn.REFERENCE_TO, referencedEntityName: BookingItem._id, referencedPropertyName: '_id' } as EntityProperty,
        booking_item_name: { name: "booking_item_name", propType_: Pn.REFERENCE_TO, referencedEntityName: BookingItem._id, referencedPropertyName: BookingItem.props.name.name } as EntityProperty,
        booking_item_price: { name: "booking_item_price", propType_: Pn.REFERENCE_TO, referencedEntityName: BookingItem._id, referencedPropertyName: BookingItem.props.price.name } as EntityProperty,
        start_date: { name: "start_date", propType_: Pn.DATETIME, required: true } as EntityProperty,
        end_date: { name: "end_date", propType_: Pn.DATETIME, required: true } as EntityProperty,
        days: { name: "days", propType_: Pn.FORMULA, formula: 'DATEDIF(start_date, end_date, "D") + 1' } as EntityProperty,
        cost: { name: "cost", propType_: Pn.FORMULA, formula: 'days * booking_item_price' } as EntityProperty,
        bookings_for_the_same_room: { name: "bookings_for_the_same_room", propType_: Pn.FORMULA, formula: '"FILTER(Booking, @[booking_item_id] == booking_item_id)"' } as EntityProperty,
        // booking_day_table: {
        //     name: 'booking_day_table',
        //     propType_: Pn.CHILD_TABLE,
        //     referencedEntityName: "BookingDay",
        //     props: {},
        //     isLargeTable: true,
        // } as EntityProperty,
    },
}

export const BookingDay = {
    _id: "BookingDay",
    props: {
        booking_id: { name: "booking_id", propType_: Pn.REFERENCE_TO, referencedEntityName: Booking._id, referencedPropertyName: '_id' } as EntityProperty,
        booking_item_id: { name: "booking_item_id", propType_: Pn.REFERENCE_TO, referencedEntityName: Booking._id, referencedPropertyName: Booking.props.booking_item_id.name } as EntityProperty,
        date: { name: "date", propType_: Pn.DATETIME } as EntityProperty,
    }
}

export const BookingApp = {
    _id: 'BookingApp',
    pureNavGroupingChildren: [BookingItem._id, Booking._id],
    props: {},
};
