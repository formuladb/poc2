/**
 * © 2017 S.C. CRYSTALKEY S.R.L.
 * License TBD
 */

import { KeyValueObj } from "@storage/domain/key_value_obj";

export interface ObjLock extends KeyValueObj {
    eventId: string; 
}
