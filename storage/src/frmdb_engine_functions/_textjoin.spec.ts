/**
 * © 2017 S.C. CRYSTALKEY S.R.L.
 * License TBD
 */

import * as _ from "lodash";
import { FrmdbEngineStore } from "../frmdb_engine_store";

import { ServerEventModifiedFormDataN } from "../domain/event";
import { Fn } from "../domain/metadata/functions";
import { MapFunctionN, CompiledFormula } from "../domain/metadata/execution_plan";
import { compileFormula, $s2e } from "../formula_compiler";
import { evalExprES5 } from "../map_reduce_utils";
import { toStringCompiledFormula } from "../test/test_utils";
import { KeyValueStoreMem, KeyValueStoreFactoryMem } from "../key_value_store_mem";
import { Entity, Pn } from "../domain/metadata/entity";


describe('FrmdbEngineStore _textjoin', () => {

    let frmdbTStore: FrmdbEngineStore;
    let originalTimeout;
    let compiledFormula: CompiledFormula;


    async function putAndForceUpdateView(objOld, objNew, isAggs: boolean) {
        await frmdbTStore.putDataObj(objNew); 
        if (isAggs) {
            await frmdbTStore.forceUpdateViewForObj(compiledFormula.triggers![0].mapreduceAggsOfManyObservablesQueryableFromOneObs.aggsViewName, objOld, objNew);
        } else {
            await frmdbTStore.forceUpdateViewForObj(compiledFormula.triggers![0].mapObserversImpactedByOneObservable.obsViewName, objOld, objNew);
        }
    }
    
    beforeEach(async (done) => {
        await KeyValueStoreFactory.clearAll();
        frmdbTStore = new FrmdbEngineStore(KeyValueStoreFactory);
        originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 15000;
        done();
    });

    afterEach(function() {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
    });

    const textjoin1 = 'TEXTJOIN(IF(A._id, FLOOR(x/4) == @[idx]),";;")';
    it("B.list= " + textjoin1, async (done) => {

        let formula = textjoin1;
        compiledFormula = compileFormula('B', 'list', formula);
        await frmdbTStore.installFormula(compiledFormula);

        let a1 = { "_id": "A~~1", "x": 3 }; await putAndForceUpdateView(null, a1, true);
        let a2 = { "_id": "A~~2", "x": 2 }; await putAndForceUpdateView(null, a2, true);
        let a3 = { "_id": "A~~3", "x": 5 }; await putAndForceUpdateView(null, a3, true);
        let a4 = { "_id": "A~~4", "x": 6 }; await putAndForceUpdateView(null, a4, true);
        let a5 = { "_id": "A~~5", "x": 7 }; await putAndForceUpdateView(null, a5, true);

        let b1 = { "_id": "B~~1", "idx": 0 }; await putAndForceUpdateView(null, b1, false);
        let b2 = { "_id": "B~~2", "idx": 1 }; await putAndForceUpdateView(null, b2, false);
        let b3 = { "_id": "B~~3", "idx": 0 }; await putAndForceUpdateView(null, b3, false);

        let obsIndex = await frmdbTStore.mapQuery(compiledFormula.triggers![0].mapObserversImpactedByOneObservable.obsViewName);
        let aggsIndex = await frmdbTStore.mapQuery(compiledFormula.triggers![0].mapreduceAggsOfManyObservablesQueryableFromOneObs.aggsViewName);

        let obs = await frmdbTStore.getObserversOfObservable(a1, compiledFormula.triggers![0]);
        expect(obs.length).toEqual(2);
        expect(obs[0]).toEqual(b1);
        expect(obs[1]).toEqual(b3);
        obs = await frmdbTStore.getObserversOfObservable(a2, compiledFormula.triggers![0]);
        expect(obs.length).toEqual(2);
        expect(obs[0]).toEqual(b1);
        expect(obs[1]).toEqual(b3);
        obs = await frmdbTStore.getObserversOfObservable(a3, compiledFormula.triggers![0]);
        expect(obs.length).toEqual(1);
        expect(obs[0]).toEqual(b2);
        obs = await frmdbTStore.getObserversOfObservable(a4, compiledFormula.triggers![0]);
        expect(obs.length).toEqual(1);
        expect(obs[0]).toEqual(b2);
        obs = await frmdbTStore.getObserversOfObservable(a5, compiledFormula.triggers![0]);
        expect(obs.length).toEqual(1);
        expect(obs[0]).toEqual(b2);

        let txt = await frmdbTStore.getAggValueForObserver(b1, compiledFormula.triggers![0]);
        expect(txt).toEqual('A~~1;;A~~2');
        txt = await frmdbTStore.getAggValueForObserver(b2, compiledFormula.triggers![0]);
        expect(txt).toEqual('A~~3;;A~~4;;A~~5');
        txt = await frmdbTStore.getAggValueForObserver(b3, compiledFormula.triggers![0]);
        expect(txt).toEqual('A~~1;;A~~2');

        let bEntity: Entity = {
            _id: 'B',
            props: {
                list: { name: 'list', propType_: Pn.FORMULA, formula: formula, compiledFormula_: compiledFormula}
            }
        };
        let bTable = await frmdbTStore.adHocTableQuery(bEntity);
        expect(bTable[0]).toEqual(jasmine.objectContaining({"_id":"B~~1","idx":0,"list":";;A~~1"}));
        expect(bTable[1]).toEqual(jasmine.objectContaining({"_id":"B~~2","idx":1,"list":";;A~~3"}));
        expect(bTable[2]).toEqual(jasmine.objectContaining({"_id":"B~~3","idx":0,"list":";;A~~1"}));

        let a2new = _.cloneDeep(a2);
        a2new.x = 4;
        let obss = await frmdbTStore.getObserversOfObservableOldAndNew(a2, a2new, compiledFormula.triggers![0])
        expect(obss.length).toEqual(3);
        expect(obss[0]).toEqual(b1);
        expect(obss[1]).toEqual(b3);
        expect(obss[2]).toEqual(b2);

        txt = await frmdbTStore.preComputeAggForObserverAndObservable(b1, a2, a2new, compiledFormula.triggers![0]);
        expect(txt).toEqual('A~~1');
        txt = await frmdbTStore.preComputeAggForObserverAndObservable(b3, a2, a2new, compiledFormula.triggers![0]);
        expect(txt).toEqual('A~~1');
        txt = await frmdbTStore.preComputeAggForObserverAndObservable(b2, a2, a2new, compiledFormula.triggers![0]);
        expect(txt).toEqual('A~~2;;A~~3;;A~~4;;A~~5');

        await putAndForceUpdateView(a2, a2new, true);
        txt = await frmdbTStore.getAggValueForObserver(b1, compiledFormula.triggers![0]);
        expect(txt).toEqual('A~~1');
        txt = await frmdbTStore.getAggValueForObserver(b3, compiledFormula.triggers![0]);
        expect(txt).toEqual('A~~1');
        txt = await frmdbTStore.getAggValueForObserver(b2, compiledFormula.triggers![0]);
        expect(txt).toEqual('A~~2;;A~~3;;A~~4;;A~~5');

        done();
    });
    
});