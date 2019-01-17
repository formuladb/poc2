import { keyValueStoreSpecs, KeyValueStoreSpecObjType } from "./key_value_store_i.spec";
import { KeyValueStoreMem, KeyObjStoreMem } from "./key_value_store_mem";

/**
 * © 2017 S.C. CRYSTALKEY S.R.L.
 * License TBD
 */


fdescribe('KeyValueStoreMem', () => {
    keyValueStoreSpecs({kvs: new KeyObjStoreMem<KeyValueStoreSpecObjType>()});
});
