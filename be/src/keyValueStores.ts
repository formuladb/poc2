/**
 * © 2017 S.C. CRYSTALKEY S.R.L.
 * License TBD
 */

import config from "./config/config";

import { Service } from 'typedi';
import { KeyValueStoreBase } from '../../fe/src/app/common/key_value_store_i';
import { KeyValueStoreMem } from "../../fe/src/app/common/key_value_store_mem";

@Service()
export class KeyValueStores {
    public transactionsDB: KeyValueStoreBase = new KeyValueStoreMem();
    public dataDB: KeyValueStoreBase = new KeyValueStoreMem();
    public locksDB: KeyValueStoreBase = new KeyValueStoreMem();

    public init(): Promise<any> {
        return this.transactionsDB.info()
        .then(() => this.dataDB.info())
        .then(() => this.locksDB.info());
    }
}
