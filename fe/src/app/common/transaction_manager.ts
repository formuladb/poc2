import { KeyValueStoreFactoryI } from "./key_value_store_i";

function ll(eventId: string, retryNb: number | string): string {
    return new Date().toISOString() + "|" + eventId + "|" + retryNb;
}

class Transaction {
    conflictingTransactions: Set<string> = new Set();
    constructor(public transactionId: string, public objectIds: Set<string>) {}
}

export class TransactionManager {
    private currentTransactions: Map<string, Transaction> = new Map();

    constructor(private kvsFactory: KeyValueStoreFactoryI) {}

    private sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    public async runTransaction(
        transactionId: string, 
        transactionPrepareCallback: (retryNb: number) => Promise<string[]>, 
        lockAcquiredCallback: () => Promise<any>,
    ) {
        let objIds = await transactionPrepareCallback(0);
        let newTrans = new Transaction(transactionId, new Set(objIds));
        
        this.currentTransactions.forEach(trans => {
            for (let objId of objIds) {
                if (trans.objectIds.has(objId)) {
                    newTrans.conflictingTransactions.add(trans.transactionId);
                }
            }
        });
        this.currentTransactions.set(transactionId, newTrans);//works because this is single-threaded

        console.log(ll(transactionId, 0) + "|objIds: " + JSON.stringify(objIds) + "|conflicts: " + 
            JSON.stringify(Array.from(newTrans.conflictingTransactions.keys())));

        while (newTrans.conflictingTransactions.size > 0) {
            await this.sleep(100);
            //TODO: add timeout
        }

        console.log(ll(transactionId, 0) + "|executing transaction");
        await transactionPrepareCallback(1);//re-prepare the transaction after conflicts have been resolved
        await lockAcquiredCallback();

        this.currentTransactions.forEach(trans => {
            if (trans.conflictingTransactions.has(newTrans.transactionId)) {
                trans.conflictingTransactions.delete(newTrans.transactionId);
            }
        });
        this.currentTransactions.delete(newTrans.transactionId);
    }
}
