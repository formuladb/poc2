import { keyValueStoreSpecs, KeyValueStoreSpecObjType, KeyValueStoreSpecEntity } from "@core/key_value_store_i.spec";
import { KeyValueStoreMem, KeyObjStoreMem, KeyTableStoreMem } from "./key_value_store_mem";

/**
 * © 2018 S.C. FORMULA DATABASE S.R.L.
 * License TBD
 */


describe('KeyValueStoreMem', () => {
    keyValueStoreSpecs({kvs: new KeyTableStoreMem<KeyValueStoreSpecObjType>(KeyValueStoreSpecEntity)});
});
