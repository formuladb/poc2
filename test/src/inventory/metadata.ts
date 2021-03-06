/**
 * © 2018 S.C. FORMULA DATABASE S.R.L.
 * License TBD
 */

import { Entity, Pn, FormulaProperty, EntityProperty, ReferenceToProperty, EntityStateGraph, ChildTableProperty, Schema } from "@domain/metadata/entity";
import { $s2e } from "@functions/s2e";
import { $Currency, DefaultAppOpts } from "@domain/metadata/default-metadata";
import { App } from "@domain/app";

export const ProductLocation = {
    _id: 'ProductLocation',
    props: {
        _id: { name: "_id", propType_: Pn.TEXT, required: true } as EntityProperty,
        product_id: { name: 'product_id', propType_: Pn.TEXT, required: true, defaultValue: 'DEFAULT-location' } as EntityProperty,
        location_code: { name: 'location_code', propType_: Pn.TEXT, required: true, defaultValue: 'DEFAULT-location' } as EntityProperty,
        category: { name: 'category', propType_: Pn.TEXT, required: true } as EntityProperty,
        received_stock__: {
            name: 'received_stock__',
            propType_: Pn.FORMULA,
            formula: 'SUMIF(ReceiptItem.quantity, product_id == @[_id])',
        } as FormulaProperty,
        available_stock__: {
            name: 'available_stock__',
            propType_: Pn.FORMULA,
            formula: 'received_stock__ - ordered_stock__',
        } as FormulaProperty,
        ordered_stock__: {
            name: 'ordered_stock__',
            propType_: Pn.FORMULA,
            formula: 'SUMIF(OrderItem.quantity, product_id == @[_id])'
        } as FormulaProperty,
        price: { name: 'price', propType_: Pn.NUMBER } as EntityProperty,
        currency: {
            propType_: Pn.REFERENCE_TO,
            referencedEntityName: 'General_Currency',
            referencedPropertyName: 'code',
            name: 'currency__'
        } as EntityProperty,
        minimal_stock: { name: 'minimal_stock', propType_: Pn.NUMBER, required: true } as EntityProperty,
        moving_stock: { name: 'moving_stock', propType_: Pn.NUMBER, required: true } as EntityProperty,
        state: { name: 'state', propType_: Pn.TEXT, required: true } as EntityProperty,
    },
    validations: {
        positiveStock: { conditionExpr: $s2e('available_stock__ >= 0') }
    },
};
const eeee: Entity = ProductLocation as Entity;

export const InventoryProduct = {
    _id: 'InventoryProduct',
    props: {
        _id: { name: "_id", propType_: Pn.TEXT, required: true } as EntityProperty,
        code: { name: 'code', propType_: Pn.TEXT, required: true } as EntityProperty,
        barcode: { name: 'barcode', propType_: Pn.TEXT } as EntityProperty,
        name: { name: 'name', propType_: Pn.TEXT, required: true } as EntityProperty,
        description: { name: 'description', propType_: Pn.TEXT } as EntityProperty,
        inventory_location: {
            name: 'inventory_location',
            propType_: Pn.CHILD_TABLE, referencedEntityName: ProductLocation._id, props: {}
        } as EntityProperty,
    }
};

export const InventoryProductUnit = {
    _id: 'InventoryProductUnit',
    props: {
        _id: { name: "_id", propType_: Pn.TEXT, required: true } as EntityProperty,
        code: { name: 'code', propType_: Pn.TEXT, required: true } as EntityProperty,
        productCode: {
            propType_: Pn.REFERENCE_TO,
            name: 'product_code',
            referencedEntityName: InventoryProduct._id,
            referencedPropertyName: 'code'
        } as EntityProperty,
        product_name: {
            propType_: Pn.REFERENCE_TO,
            name: 'product_name',
            referencedEntityName: InventoryProduct._id,
            referencedPropertyName: 'name'
        } as EntityProperty,
        inventory_location: { name: 'inventory_location', propType_: Pn.TEXT, required: true } as EntityProperty,
        serial1: { name: 'serial1', propType_: Pn.TEXT } as EntityProperty,
        serial2: { name: 'serial2', propType_: Pn.TEXT } as EntityProperty,
        serial3: { name: 'serial3', propType_: Pn.TEXT } as EntityProperty,
        serial4: { name: 'serial4', propType_: Pn.TEXT } as EntityProperty,
        serial5: { name: 'serial5', propType_: Pn.TEXT } as EntityProperty,
        serial6: { name: 'serial6', propType_: Pn.TEXT } as EntityProperty,
        serial7: { name: 'serial7', propType_: Pn.TEXT } as EntityProperty,
        install_date: { name: 'install_date', propType_: Pn.DATETIME } as EntityProperty,
        state: { name: 'state', propType_: Pn.TEXT, required: true } as EntityProperty,
        nb_piston_cycles: { name: 'nb_piston_cycles', propType_: Pn.TEXT } as EntityProperty,
        brita_counter: { name: 'brita_counter', propType_: Pn.TEXT } as EntityProperty,
        washing_cycles: { name: 'washing_cycles', propType_: Pn.TEXT, } as EntityProperty,
    }
};


export const InventoryReceipt = {
    _id: 'InventoryReceipt',
    isEditable: true,
    props: {
        _id: { name: "_id", propType_: Pn.TEXT, required: true } as EntityProperty,
        receipt_item_table: {
            name: 'receipt_item_table', propType_: Pn.CHILD_TABLE,
            referencedEntityName: 'ReceiptItem', props: {}, isLargeTable: true
        } as EntityProperty,
    }
};

export const ReceiptItem = {
    _id: 'ReceiptItem',
    props: {
        _id: { name: "_id", propType_: Pn.TEXT, required: true } as EntityProperty,
        product_id: { name: 'product_id', propType_: Pn.REFERENCE_TO, referencedEntityName: ProductLocation._id, referencedPropertyName: ProductLocation.props._id.name } as EntityProperty,
        quantity: { name: 'quantity', propType_: Pn.NUMBER, required: true } as EntityProperty,
        price: { name: 'price', propType_: Pn.REFERENCE_TO, referencedEntityName: ProductLocation._id, referencedPropertyName: ProductLocation.props.price.name } as EntityProperty,
        units: {
            name: 'units',
            propType_: Pn.CHILD_TABLE,
            referencedEntityName: InventoryProductUnit._id,
        } as ChildTableProperty,
    }
};


export const OrderItem = {
    _id: 'OrderItem',
    props: {
        _id: { name: "_id", propType_: Pn.TEXT, required: true } as EntityProperty,
        product_id: { name: 'product_id', propType_: Pn.REFERENCE_TO, referencedEntityName: ProductLocation._id, referencedPropertyName: ProductLocation.props._id.name } as EntityProperty,
        quantity: { name: 'quantity', propType_: Pn.NUMBER, required: true } as EntityProperty,
        error_quantity: { name: 'error_quantity', propType_: Pn.NUMBER } as EntityProperty,
        client_stock: { name: 'client_stock', propType_: Pn.NUMBER } as EntityProperty,
        units: {
            name: 'units',
            propType_: Pn.CHILD_TABLE,
            referencedEntityName: InventoryProductUnit._id,
        } as ChildTableProperty,
    },
    autoCorrectionsOnValidationFailed: {
        'ProductLocation!positiveStock': [
            { targetPropertyName: 'quantity', autoCorrectExpr: $s2e('MAX(0, quantity + $ROW$.available_stock__)') },
            { targetPropertyName: 'error_quantity', autoCorrectExpr: $s2e('ABS($OLD$.quantity - quantity)') },
        ],
    },
};


export const InventoryOrder = {
    _id: 'InventoryOrder',
    stateGraph: {
        nodes: ['PENDING', 'COMPLETE', 'APPROVED', 'PROCESSED', 'CANCELLED'],
        transitions: [
            { source: 'PENDING', target: 'COMPLETE' },
            { source: 'COMPLETE', target: 'APPROVED' },
            { source: 'APPROVED', target: 'PROCESSED' },
            { source: 'PENDING', target: 'CANCELLED' },
            { source: 'COMPLETE', target: 'CANCELLED' },
            { source: 'APPROVED', target: 'CANCELLED' },
        ]
    } as EntityStateGraph,
    props: {
        _id: { name: "_id", propType_: Pn.TEXT, required: true } as EntityProperty,
        sales_agent: { name: 'sales_agent', propType_: Pn.TEXT, required: true } as EntityProperty,
        creation_date: { name: 'creation_date', propType_: Pn.DATETIME, required: true } as EntityProperty,
        order_item_table: {
            name: 'order_item_table',
            propType_: Pn.CHILD_TABLE,
            referencedEntityName: OrderItem._id,
            props: {},
            isLargeTable: true,
        } as EntityProperty,
    }
};

export const LargeSalesReport = {
    _id: "LargeSalesReport",
    props: {
        _id: { name: "_id", propType_: Pn.TEXT, required: true } as EntityProperty,
        client: { name: "client", propType_: Pn.TEXT, required: true } as EntityProperty,
        month: { name: "month", propType_: Pn.DATETIME } as EntityProperty,
        large_sales_product_table: {
            name: "large_sales_product_table",
            propType_: Pn.CHILD_TABLE,
            referencedEntityName: "LargeSalesProduct",
            isLargeTable: true,
            props: {},
        } as EntityProperty,
    }
};

export const LargeSalesProduct = {
    _id: "LargeSalesProduct",
    props: {
        _id: { name: "_id", propType_: Pn.TEXT, required: true } as EntityProperty,
        product_id: { name: "product_id", propType_: Pn.TEXT, required: true } as EntityProperty,
        product_name: { name: "product_name", propType_: Pn.TEXT, required: true } as EntityProperty,
        large_sales_value: {
            name: "large_sales_value",
            propType_: Pn.FORMULA,
            formula: `SUMIF(OrderItem.quantity, product_id == @[product_id] && quantity > 100)`,
        } as FormulaProperty,
    }
}

export const InventoryApp: App = {
    _id: "App~~Basic_Inventory",
    name: "Basic_Inventory",
    ...DefaultAppOpts,
    category: "",
    description: "Basic Inventory with positive stock",
    pages: [
        "index.html",
    ],
};


export const InventorySchema: Schema = {
    _id: 'FRMDB_SCHEMA~~' + InventoryApp._id,
    entities: {
        [InventoryOrder._id]: InventoryOrder,
        [OrderItem._id]: OrderItem,
        [InventoryReceipt._id]: InventoryReceipt,
        [ReceiptItem._id]: ReceiptItem,
        [InventoryProduct._id]: InventoryProduct,
        [ProductLocation._id]: ProductLocation,
        [InventoryProductUnit._id]: InventoryProductUnit,
        [LargeSalesReport._id]: LargeSalesReport,
        [LargeSalesProduct._id]: LargeSalesProduct,
        [$Currency._id]: $Currency,
    }
}
