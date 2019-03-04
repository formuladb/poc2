/**
 * © 2018 S.C. FORMULA DATABASE S.R.L.
 * License TBD
 */

import * as _ from "lodash";
import { FrmdbEngineStore } from "../../frmdb_engine_store";

import { compileFormula } from '../../formula_compiler';
import { evalExpression } from "../../map_reduce_utils";
import { ProductLocation, ReceiptItem, OrderItem } from "./mock-metadata";
import { KeyValueObj } from "@core/domain/key_value_obj";
import { ServerEventModifiedFormDataEvent } from "@core/domain/event";
import { FrmdbEngine } from "../../frmdb_engine";
import { Schema } from "@core/domain/metadata/entity";
import { getFrmdbEngine } from '@storage/key_value_store_impl_selector';
import { CompiledFormula } from "@core/domain/metadata/execution_plan";




describe('Inventory Metadata', () => {
    let frmdbTStore: FrmdbEngineStore;
    let frmdbEngine: FrmdbEngine;
    let originalTimeout;

    let cf1: CompiledFormula;
    let cf2: CompiledFormula;
    let cf3: CompiledFormula;
    let pl1 = { _id: "ProductLocation~~1", received_stock__: -1, ordered_stock__: -1, available_stock__: -1};
    let ri1_1 = { _id: "ReceiptItem~~1__1", product_id: "ProductLocation~~1", quantity: 10}; 
    let ri1_2 = { _id: "ReceiptItem~~1__2", product_id: "ProductLocation~~1", quantity: 5}; 
    let oi1_1 = { _id: "OrderItem~~1__1", product_id: "ProductLocation~~1", quantity: 10};
    let oi1_2 = { _id: "OrderItem~~1__2", product_id: "ProductLocation~~1", quantity: 4};

    const InventorySchema: Schema = {
        _id: "FRMDB_SCHEMA",
        entities: {
            ProductLocation: ProductLocation,
            ReceiptItem: ReceiptItem,
            OrderItem: OrderItem,
        }
    };

    beforeEach(async (done) => {
        frmdbEngine = await getFrmdbEngine(InventorySchema);
        frmdbTStore = frmdbEngine.frmdbEngineStore;
        await frmdbTStore.kvsFactory.clearAll();
        await frmdbEngine.init();
        originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 15000;

        cf1 = compileFormula(ProductLocation._id, 'received_stock__', ProductLocation.props.received_stock__.formula);
        cf2 = compileFormula(ProductLocation._id, 'ordered_stock__', ProductLocation.props.ordered_stock__.formula);
        cf3 = compileFormula(ProductLocation._id, 'available_stock__', ProductLocation.props.available_stock__.formula);

        await frmdbEngine.putDataObjAndUpdateViews(null, pl1);
        await frmdbEngine.putDataObjAndUpdateViews(null, ri1_1);
        await frmdbEngine.putDataObjAndUpdateViews(null, ri1_2);
        await frmdbEngine.putDataObjAndUpdateViews(null, oi1_1);

        done();
    });

    async function putObj(obj: KeyValueObj): Promise<ServerEventModifiedFormDataEvent> {
        return await frmdbEngine.processEvent(new ServerEventModifiedFormDataEvent(obj)) as ServerEventModifiedFormDataEvent;
    }

    afterEach(function() {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
    });

    fit("Basic stock operations", async (done) => {

        let obs = await frmdbTStore.getObserversOfObservable(ri1_1, cf1.triggers![0]);
        expect(obs[0]).toEqual(pl1);
        obs = await frmdbTStore.getObserversOfObservable(ri1_2, cf1.triggers![0]);
        expect(obs[0]).toEqual(pl1);
        obs = await frmdbTStore.getObserversOfObservable(oi1_1, cf2.triggers![0]);
        expect(obs[0]).toEqual(pl1);
        
        let ri1_1new = _.cloneDeep(ri1_1);
        ri1_1new.quantity = 11;

        obs = await frmdbTStore.getObserversOfObservableOldAndNew(ri1_1, ri1_1new, cf1.triggers![0]);
        expect(obs[0]).toEqual(pl1);
        expect(obs.length).toEqual(1);

        let aggsViewName = cf2.triggers![0].mapreduceAggsOfManyObservablesQueryableFromOneObs.aggsViewName;

        let sum = await frmdbTStore.getAggValueForObserver(pl1, cf1.triggers![0]);
        expect(sum).toEqual(15);
    
        sum = await frmdbTStore.preComputeAggForObserverAndObservable(pl1, ri1_1, ri1_1new, cf1.triggers![0]);
        expect(sum).toEqual(16);
    
        await frmdbEngine.putDataObjAndUpdateViews(ri1_1, ri1_1new);
        pl1.received_stock__ = (await frmdbTStore.getAggValueForObserver(pl1, cf1.triggers![0])) as number;
        expect(pl1.received_stock__).toEqual(16);

        pl1.ordered_stock__ = (await frmdbTStore.getAggValueForObserver(pl1, cf2.triggers![0])) as number;
        expect(pl1.ordered_stock__).toEqual(10);
        
        let availStock = evalExpression(pl1, cf3.finalExpression);
        expect(availStock).toEqual(6);

        await frmdbEngine.putDataObjAndUpdateViews(null, oi1_2);
        pl1.ordered_stock__ = (await frmdbTStore.getAggValueForObserver(pl1, cf2.triggers![0])) as number;
        expect(pl1.ordered_stock__).toEqual(14);
        
        availStock = evalExpression(pl1, cf3.finalExpression);
        expect(availStock).toEqual(2);

        // check auto-correction
        let oi1_2new = _.cloneDeep(oi1_2);
        let oi1_2newQuantity = 10;
        oi1_2new.quantity = oi1_2newQuantity;
        await putObj(ri1_1new);
        await putObj(oi1_2new);
        pl1.ordered_stock__ = (await frmdbTStore.getAggValueForObserver(pl1, cf2.triggers![0])) as number;
        expect(pl1.ordered_stock__).toEqual(16);
        availStock = evalExpression(pl1, cf3.finalExpression);
        expect(availStock).toEqual(0);
        let o: any = await frmdbTStore.getDataObj(oi1_2new._id);
        expect(o.quantity).toEqual(6);
        expect(o.error_quantity).toEqual(oi1_1.quantity + oi1_2newQuantity - ri1_1new.quantity - ri1_2.quantity);
        
        done();
    });
});
