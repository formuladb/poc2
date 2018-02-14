import { Entity, PropertyTypeN } from '../../domain/metadata/entity';
import { typesafeDeepPath } from "../../domain.utils";

export const Inventory = {
    type_: "Entity_", _id: "/Inventory",
    properties: {},
    module: true
};

export const Inventory__Product = {
    type_: "Entity_", _id: "/Inventory/Product",
    properties: { _id: { type: PropertyTypeN.STRING },
        code: { type: PropertyTypeN.STRING, allowNull: false },
        barcode: { type: PropertyTypeN.STRING },
        name: { type: PropertyTypeN.STRING, allowNull: false },
        description: { type: PropertyTypeN.STRING },
        inventoryLocation: {
            type: PropertyTypeN.TABLE, properties: { 
                _id: { type: PropertyTypeN.STRING },
                locationCode: { type: PropertyTypeN.STRING, allowNull: false, defaultValue: "DEFAULT-location" },
                category: { type: PropertyTypeN.STRING, allowNull: false },
                price: { type: PropertyTypeN.NUMBER, allowNull: true },
                currency: {
                    type: PropertyTypeN.REFERENCE_ENTITY,
                    entity: {
                        deepPath: "/General/Currency",
                        copiedProperties: ["currency/code", "name"],
                    }
                },
                minimal_stock: { type: PropertyTypeN.NUMBER, allowNull: false },
                received_stock: {
                    type: PropertyTypeN.FORMULA,
                    formula: {
                        SUM: [{ EXPRESSION: "itemsInReceipt.received_quantity"}]
                    }
                },
                available_stock: {
                    type: PropertyTypeN.FORMULA,
                    formula: {
                        EXPRESSION: 'received_stock - reserved_stock - delivered_stock'
                    }
                },
                reserved_stock: {
                    type: PropertyTypeN.FORMULA,
                    formula: {
                        SUM: [{ EXPRESSION: "itemsInOrder.reserved_quantity" }]
                    }
                },
                delivered_stock: { type: PropertyTypeN.NUMBER },
                moving_stock: { type: PropertyTypeN.NUMBER, allowNull: false },
                state: { type: PropertyTypeN.STRING, allowNull: false }
            }
        }
    }
};

export const Inventory__ProductUnit = {
    type_: "Entity_", _id: "/Inventory/ProductUnit",
    properties: { _id: { type: PropertyTypeN.STRING },
        code: { type: PropertyTypeN.STRING, allowNull: false },
        product: {
            type: PropertyTypeN.REFERENCE_ENTITY, entity: {
                deepPath: "/Inventory/Product",
                copiedProperties: [
                    "code",
                    "name",
                    "price",
                    "currency_code",
                ]
            }
        },
        inventoryLocation: { type: PropertyTypeN.STRING, allowNull: false },
        serial1: { type: PropertyTypeN.STRING },
        serial2: { type: PropertyTypeN.STRING },
        serial3: { type: PropertyTypeN.STRING },
        serial4: { type: PropertyTypeN.STRING },
        serial5: { type: PropertyTypeN.STRING },
        serial6: { type: PropertyTypeN.STRING },
        serial7: { type: PropertyTypeN.STRING },
        install_date: { type: PropertyTypeN.DATETIME },
        state: { type: PropertyTypeN.STRING, allowNull: false },
        nb_piston_cycles: { type: PropertyTypeN.STRING },
        brita_counter: { type: PropertyTypeN.STRING },
        washing_cycles: { type: PropertyTypeN.STRING, }
    }
};

export const Inventory__Receipt = {
    type_: "Entity_", _id: "/Inventory/Receipt",
    properties: { _id: { type: PropertyTypeN.STRING },
        items: {
            type: PropertyTypeN.TABLE,
            properties: { _id: { type: PropertyTypeN.STRING },
                product: {
                    type: PropertyTypeN.REFERENCE_ENTITY,
                    entity: {
                        deepPath: typesafeDeepPath(Inventory__Product._id, Inventory__Product.properties, 'inventoryLocation'),
                        copiedProperties: [
                            "../code",
                            "../name",
                            "locationCode",
                            "price",
                            "currency/code",
                        ]
                    }
                },
                received_quantity: { type: PropertyTypeN.NUMBER, allowNull: false },
                // units: {
                //     type: PropertyTypeN.TABLE,
                //     properties: { _id: { type: PropertyTypeN.STRING },
                //         unit: { type: PropertyTypeN.REFERENCE_ENTITY, entity: { deepPath: Inventory__ProductUnit._id, copiedProperties: ["code", "serial"] } }
                //     }
                // },
            }
        }
    }
};

export const Inventory__Order = {
    type_: "Entity_", _id: "/Inventory/Order",
    properties: { 
        _id: { type: PropertyTypeN.STRING },
        items: {
            type: PropertyTypeN.TABLE, properties: { 
                _id: { type: PropertyTypeN.STRING },
                product: {
                    type: PropertyTypeN.REFERENCE_ENTITY,
                    entity: {
                        deepPath: typesafeDeepPath(Inventory__Product._id, Inventory__Product.properties, 'inventoryLocation'),
                        copiedProperties: [
                            "../code",
                            "../name",
                            "locationCode",
                            "price",
                            "currency/code",
                        ]
                    }
                },
                requested_quantity: { type: PropertyTypeN.NUMBER, allowNull: false },
                available_stock: { type: PropertyTypeN.FORMULA, formula: { CURRENT_VALUE_OF: "product.available_stock" } },
                reserved_quantity: {
                    type: PropertyTypeN.FORMULA,
                    formula: { EXPRESSION: 'if(available_stock > requested_quantity, requested_quantity, available_stock)'}
                },
                client_stock: { type: PropertyTypeN.NUMBER },
                // units: {
                //     type: PropertyTypeN.TABLE,
                //     properties: { _id: { type: PropertyTypeN.STRING },
                //         unit: { type: PropertyTypeN.REFERENCE_ENTITY, entity: { deepPath: Inventory__ProductUnit._id, copiedProperties: ["code", "serial"] } }
                //     }
                // },
            }
        }
    }
};
