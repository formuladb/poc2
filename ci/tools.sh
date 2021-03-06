putSchema() {
    APP_NAME=$1
    SCHEMA_FILE=$2
    PORT=$3
    curl -XPUT  -H "Content-Type: application/json" -d@${SCHEMA_FILE} http://localhost:${PORT:-3000}/formuladb-api/${APP_NAME}/schema
}
putApp() {
    APP_NAME=$1
    APP_FILE=$2
    PORT=$3
    curl -XPUT  -H "Content-Type: application/json" -d@${APP_FILE} http://localhost:${PORT:-3000}/formuladb-api/${APP_NAME}
}
putTable() {
    APP_NAME=$1
    TABLE_FILE=$2
    PORT=$3
    curl -XPUT  -H "Content-Type: application/json" -d@${TABLE_FILE} http://localhost:${PORT:-3000}/formuladb-api/${APP_NAME}/table
}
putForm() {
    APP_NAME=$1
    FORM_FILE=$2
    PORT=$3
    curl -XPUT  -H "Content-Type: application/json" -d@${FORM_FILE} http://localhost:${PORT:-3000}/formuladb-api/${APP_NAME}/form
}
putTableData() {
    APP_NAME=$1
    FORM_FILE=$2
    PORT=$3
    curl -XPUT  -H "Content-Type: application/json" -d@${FORM_FILE} http://localhost:${PORT:-3000}/formuladb-api/${APP_NAME}/form
}

## dump json example:
#  (echo '\t on'; echo '\pset format unaligned'; echo "select json_agg(r) from (select * from tmolreport('2019-04-01')) r;") | sudo -i -u postgres psql dacris

#curl -XPOST  -H "Content-Type: application/json" -d '{"username":"Fredrick51","password":"pass123!"}' http://localhost:${PORT:-3000}/formuladb-api/login
#curl -XPOST  -H "Content-Type: application/json" -d '{"username":"Fredrick51","password":"pass123!"}' http://localhost:3000/formuladb-api/bla/schema

#putSchema customers/orbico/orbico-metadata.json
putBulk() {
    APP_NAME=$1
    DATA_FILE=$2
    PORT=$3
    curl -XPUT  -H "Content-Type: application/json" -d@${DATA_FILE} http://localhost:${PORT:-3000}/formuladb-api/${APP_NAME}/bulk
}

rsync-deploy() {
    PORT=$1
    DST=$3

    rsync -avz --exclude node_modules --exclude .git --exclude .gitignore -e "ssh -p $PORT" ${BASEDIR}/../${FRMDB_DEPLOYMENT_DIR} ${DST}/
    rsync -avz ${BASEDIR}/docker-compose.yml -e "ssh -p $PORT" ${SRC_DIR} ${DST}/febe/
}
#rsync-deploy 4179 ../customer-dacris dacris@mail.dacris.ro:/opt/data/dacris/LIVE/formuladb

#cp ./ssh/frmdb.id_rsa* ~/.ssh
#chmod 600 ~/.ssh/frmdb.id_rsa
#chmod 644 ~/.ssh/frmdb.id_rsa.pub
#chmod 700 ~/.ssh
ssh-ci() {
    #ssh -i ./ssh/frmdb.id_rsa root@34.73.93.144
    #ssh -i ~/.ssh/frmdb.id_rsa root@34.76.177.179
    ssh -i ~/.ssh/frmdb.id_rsa root@35.187.103.135
}

ssh-acr-dev() {
    ssh -i ~/.ssh/frmdb.id_rsa alexandru_cristu@34.71.250.129
}

ssh-demo() {
    ssh -i ./ssh/frmdb.id_rsa root@formuladb.online
}

#Note: spaces in path are not yet supported
upload-assets() {
    PATH_PREFIX="${PATH_PREFIX:-}"
    ASSETS="$@" node -e "\
    const {Storage} = require('@google-cloud/storage');\
    const storage = new Storage({keyFilename: '"$GCLOUD_BASEDIR"FormulaDB-storage-full.json'});\
    var array = process.env.ASSETS.split(' ');\
    for (var assetid = 0; assetid < array.length; assetid++) {\
        storage.bucket('formuladb-env/static-assets').upload(array[assetid], {destination: '"$PATH_PREFIX"' + array[assetid]}, function(err, file) {\
        if (!err) {\
            console.log(file.name)\
        } else {\
            console.log('error ', err.message)\
        }\
        });\
        console.log(array[assetid]);\
    }\
    ";
}

upload-asset() {
    upload-assets $1
}

upload-all() {
    find vvvebjs/ -type f|egrep -v '\.git|./demo/|\.scss$|\.php$|\.map$|bootstrap.js' | while read i; do
        upload-asset "$i"
    done    
}

kubectlget() {
    if ! uname -a | grep 'Linux.*Microsoft' >/dev/null; then echo "use this only in WSL"; return 1; fi
    #export KUBECONFIG=k8s/production-kube-config.conf
    namespace="`git branch|grep '^*'|cut -d ' ' -f2`"
    kubectl -n "$namespace" get "$@"
}

kubectldescribe() {
    if ! uname -a | grep 'Linux.*Microsoft' >/dev/null; then echo "use this only in WSL"; return 1; fi
    #export KUBECONFIG=k8s/production-kube-config.conf
    namespace="`git branch|grep '^*'|cut -d ' ' -f2`"
    kubectl -n "$namespace" describe "$@"
}

kubectlexec() {
    if ! uname -a | grep 'Linux.*Microsoft' >/dev/null; then echo "use this only in WSL"; return 1; fi
    #export KUBECONFIG=k8s/production-kube-config.conf
    service_name=$1
    shift
    namespace="`git branch|grep '^*'|cut -d ' ' -f2`"
    kubectl -n "$namespace" exec service/$service_name "$@"
    #TODO this needs to parse the arguments...it is more complex
}

kubectlsh() {
    if ! uname -a | grep 'Linux.*Microsoft' >/dev/null; then echo "use this only in WSL"; return 1; fi
    #export KUBECONFIG=k8s/production-kube-config.conf
    service_name=$1
    shift
    namespace="`git branch|grep '^*'|cut -d ' ' -f2`"
    kubectl -n "$namespace" exec service/$service_name "$@" bash -it
    #TODO this needs to parse the arguments...it is more complex
}

kubectlsh() {
    if ! uname -a | grep 'Linux.*Microsoft' >/dev/null; then echo "use this only in WSL"; return 1; fi
    #export KUBECONFIG=k8s/production-kube-config.conf
    service_name=$1
    shift
    namespace="`git branch|grep '^*'|cut -d ' ' -f2`"
    kubectl -n "$namespace" exec service/$service_name bash -it
    #TODO this needs to parse the arguments...it is more complex
}

kubectllogs() {
    if ! uname -a | grep 'Linux.*Microsoft' >/dev/null; then echo "use this only in WSL"; return 1; fi
    #export KUBECONFIG=k8s/production-kube-config.conf
    service_name=$1
    shift
    namespace="`git branch|grep '^*'|cut -d ' ' -f2`"
    kubectl -n "$namespace" logs service/$service_name "$@"
}

kubectldelete() {
    if ! uname -a | grep 'Linux.*Microsoft' >/dev/null; then echo "use this only in WSL"; return 1; fi
    #export KUBECONFIG=k8s/production-kube-config.conf
    service_name=$1
    shift
    namespace="`git branch|grep '^*'|cut -d ' ' -f2`"
    pod=`kubectl -n ${namespace} get pod -l service=${service_name} -o jsonpath='{.items[0].metadata.name}'`
    kubectl -n "$namespace" delete pod $pod
}

kubectlgetall() {
    if ! uname -a | grep 'Linux.*Microsoft' >/dev/null; then echo "use this only in WSL"; return 1; fi
    #export KUBECONFIG=k8s/production-kube-config.conf
    namespace="`git branch|grep '^*'|cut -d ' ' -f2`"
    for i in $(kubectl api-resources --verbs=list --namespaced -o name | grep -v "events.events.k8s.io" | grep -v "events" | sort | uniq); do
        kubectl -n "$namespace" get --ignore-not-found ${i} | sed -e "s/^/[$i] /"
    done
}

kubectlport-forward() {
    if ! uname -a | grep 'Linux.*Microsoft' >/dev/null; then echo "use this only in WSL"; return 1; fi
    #export KUBECONFIG=k8s/production-kube-config.conf
    service_name=$1
    shift
    namespace="`git branch|grep '^*'|cut -d ' ' -f2`"
    pod=`kubectl -n ${namespace} get pod -l service=${service_name} -o jsonpath='{.items[0].metadata.name}'`
    kubectl -n "$namespace" port-forward $pod "$@"
}

kubectlport-forward-env-be() {
    if ! uname -a | grep 'Linux.*Microsoft' >/dev/null; then echo "use this only in WSL"; return 1; fi
    export KUBECONFIG=k8s/production-kube-config.conf
    namespace=$1
    shift
    pod=`kubectl -n ${namespace} get pod -l service=be -o jsonpath='{.items[0].metadata.name}'`
    kubectl -n "$namespace" port-forward $pod 8085:3000
}

frmdb-be-load-test-data() {
    if ! uname -a | grep 'Linux.*Microsoft' >/dev/null; then echo "use this only in WSL"; return 1; fi
    namespace="`git branch|grep '^*'|cut -d ' ' -f2`"
    kubectl -n "$namespace" exec service/be -- env $@ node /dist-be/frmdb-be-load-test-data.js
}
