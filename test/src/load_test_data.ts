/**
 * © 2018 S.C. FORMULA DATABASE S.R.L.
 * License TBD
 */

require('module-alias/register');

import { getKeyValueStoreFactory } from "@storage/key_value_store_impl_selector";

import { KeyValueStoreFactoryI } from "@core/key_value_store_i";
import { MockData } from "@test/mocks/mock-data";
import { FrmdbEngineStore } from "@core/frmdb_engine_store";
import { FrmdbEngine } from "@core/frmdb_engine";
import { KeyValueObj } from "@domain/key_value_obj";
import { ServerEventModifiedFormDataEvent } from "@domain/event";
import { Forms__ServiceForm_Form_ } from "@test/mocks/forms-ui-metadata";
import { LargeSalesReport_Form } from "@test/mocks/reports-ui-metadata";
import { HomePage_Form, HomePage_Table } from "@domain/default_pages/website-ui-metadata";
import { BookingItem_Form, Booking_Form, BookingItem_Table, Booking_Table } from "@test/mocks/booking-ui-metadata";
import { MockMetadata, CommonEntities } from "@test/mocks/mock-metadata";

function putObj(frmdbEngine: FrmdbEngine, obj: KeyValueObj) {
    return frmdbEngine.processEvent(new ServerEventModifiedFormDataEvent(obj));
}

const mockMetadata = new MockMetadata();

export async function loadTestData(): Promise<KeyValueStoreFactoryI> {
    try {
        let kvsFactory = await getKeyValueStoreFactory();
        await kvsFactory.clearAll();
        for (let app of mockMetadata.apps) {
            await kvsFactory.putApp(app);
        }
        
        let uiMetaLoaded = false;
        let commonEntitiesIds = CommonEntities.map(e => e._id);
        {
            let mockData = new MockData(CommonEntities.reduce((acc, e) => {
                acc[e._id] = e; return acc;
            }, {}));
            let frmdbEngineStore = new FrmdbEngineStore(kvsFactory, {_id: "FRMDB_SCHEMA", entities: mockData.entitiesMap});
            for (let entityId of commonEntitiesIds) {
                for (let obj of mockData.getAllForPath(entityId)) {
                    console.log("PUTTTTTT22", obj);
                    await frmdbEngineStore.putDataObj(obj);
                    // await putObj(frmdbEngine, obj);
                }
            }    
        }

        for (let schema of mockMetadata.schemas) {
            await kvsFactory.putSchema(schema);
            let mockData = new MockData(schema.entities);
            let frmdbEngineStore = new FrmdbEngineStore(kvsFactory, schema);
            let frmdbEngine = new FrmdbEngine(frmdbEngineStore);
            for (let entityId of Object.keys(schema.entities).filter(id => !commonEntitiesIds.includes(id))) {
                for (let obj of mockData.getAllForPath(entityId)) {
                    console.log("PUTTTTTT", obj);
                    await frmdbEngineStore.putDataObj(obj);
                    // await putObj(frmdbEngine, obj);
                }
            }
            if (!uiMetaLoaded) {
                for (let formUiMeta of [
                    Forms__ServiceForm_Form_, LargeSalesReport_Form, HomePage_Form, BookingItem_Form, Booking_Form
                ]) {
                    await frmdbEngine.frmdbEngineStore.putForm(formUiMeta);
                };
                for (let tbl of [HomePage_Table, BookingItem_Table, Booking_Table]) {
                    await frmdbEngine.frmdbEngineStore.putTable(tbl);
                };
                uiMetaLoaded = true;
            }
        }

        return kvsFactory;
    } catch (err) {
        console.error(err);
        throw err;
    }
}

loadTestData();