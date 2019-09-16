#!/bin/bash
set -Ee

trap _cleanup ERR
trap _cleanup EXIT

ENV_NAME="t$CI_COMMIT_SHA"
if [ -z "$ENV_NAME" ]; then 
    ENV_NAME="t`git rev-parse HEAD`"
fi
echo "ENV_NAME=${ENV_NAME}"
export ENV_NAME
export KUBECONFIG=k8s/production-kube-config.conf
export BASEDIR=`dirname $0`

function _cleanup {
    /usr/bin/killall -q kubectl || true
    /usr/bin/killall -q node || true
}

function build_images_and_deploy_dev {
    bash $BASEDIR/create-dev-tenant.sh "$ENV_NAME"
    skaffold run -p dev
    while ! kubectl -n $ENV_NAME get pods | grep 'lb-'; do sleep 1; done
    POD=`kubectl -n $ENV_NAME get pod -l service=db -o jsonpath='{.items[0].metadata.name}'`
    nc -z localhost 5432 || kubectl -n $ENV_NAME port-forward $POD 5432:5432 &
    while ! nc -z localhost 5432; do sleep 1; done
    npm run e2e:data
}

function test_postgres {
    POD=`kubectl -n $ENV_NAME get pod -l service=db -o jsonpath='{.items[0].metadata.name}'`
    nc -z localhost 5432 || kubectl -n $ENV_NAME port-forward $POD 5432:5432 &
    while ! nc -z localhost 5432; do sleep 1; done
    FRMDB_STORAGE=postgres npm test
}

function test_stress {
    npm test -- core/src/frmdb_engine.stress.spec.ts
    POD=`kubectl -n $ENV_NAME get pod -l service=db -o jsonpath='{.items[0].metadata.name}'`
    nc -z localhost 5432 || kubectl -n $ENV_NAME port-forward $POD 5432:5432 &
    while ! nc -z localhost 5432; do sleep 1; done
    FRMDB_STORAGE=postgres npm test -- core/src/frmdb_engine.stress.spec.ts
}

function e2e_dev_env {
    POD=`kubectl -n $ENV_NAME get pod -l service=lb -o jsonpath='{.items[0].metadata.name}'`
    nc -z localhost 8085 || kubectl -n $ENV_NAME port-forward $POD 8085:80 &
    bash serve.sh &
    TARGET=headless protractor --baseUrl='http://localhost:8081' e2e/protractor.conf.js
#    - skaffold delete
}

function publish_static_assets {
    git clone https://gitlab-ci-token:${CI_JOB_TOKEN}@gitlab.com/frmdb-apps/ci-tools.git
    cd ci-tools
    npm install
    source tools.sh
    cd ..
    export NODE_PATH=`pwd`/ci-tools/node_modules
    # publish elastic APM RUM
    curl -L -O https://github.com/elastic/apm-agent-rum-js/releases/latest/download/elastic-apm-rum.umd.min.js
    upload-assets elastic-apm-rum.umd.min.js
    # publish vvvebj on GCloud
    upload-assets `find vvvebjs -type f -print`
    # publish FE on GCloud
    mkdir -p dist/fe
    cp fe/js/*js dist-fe/frmdb-fe.js dist-fe/frmdb-data-grid.js dist-fe/frmdb-editor.js dist/fe
    cp -ar fe/img dist/fe/
    cd dist
    upload-assets `find -type f -printf '%P\n'`
}

function deploy_staging {
    skaffold -n $ENV_NAME run -p staging
    POD=`kubectl -n $ENV_NAME get pod -l service=db -o jsonpath='{.items[0].metadata.name}'`
    nc -z localhost 5433 || kubectl -n $ENV_NAME port-forward $POD 5433:5432 &
    while ! nc -z localhost 5433; do sleep 1; done
    PGPORT=5433 npm run e2e:data
}

function e2e_demo_env {
    TARGET=headless protractor --baseUrl='https://demo.formuladb.io' e2e/protractor.conf.js
}

function deploy_production {
    skaffold -n $ENV_NAME run
    POD=`kubectl -n $ENV_NAME get pod -l service=db -o jsonpath='{.items[0].metadata.name}'`
    nc -z localhost 5433 || kubectl -n $ENV_NAME port-forward $POD 5433:5432 &
    while ! nc -z localhost 5433; do sleep 1; done
    PGPORT=5433 npm run e2e:data
}

function e2e_production_env {
    TARGET=headless protractor --baseUrl='https://formuladb.io' e2e/protractor.conf.js
}

function cleanup {
    docker system prune -af
    find /home/gitlab-runner/cache/ -type f -mmin +60 -delete
    # cleanup registry: BE development images in febe project
    bash ./ci/cleanup-docker-registry.sh mfDqKQ6zwhZaszaNpUys 4245551 398919 7
}

eval $1
