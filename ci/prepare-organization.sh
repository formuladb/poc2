FRMDB_ENV_NAME=$1
if [ -z "$FRMDB_ENV_NAME" ]; then echo "Usage: create_tenant.sh FRMDB_ENV_NAME"; exit 1; fi
NO_K8S=$3

export BASEDIR=`dirname $0`
export GOOGLE_APPLICATION_CREDENTIALS=$BASEDIR/FormulaDB-storage-full.json
export KUBECONFIG=$BASEDIR/../k8s/production-kube-config.conf

# -------------------------------------------------------------------------
# Tooling / Clients
# -------------------------------------------------------------------------
hash kubectl &>/dev/null || { 
  curl -LO https://storage.googleapis.com/kubernetes-release/release/`curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt`/bin/linux/amd64/kubectl
  chmod +x ./kubectl
  sudo mv ./kubectl /usr/local/bin/kubectl
}
hash kubectl &>/dev/null || { echo "kubectl not found! See https://kubernetes.io/docs/tasks/tools/install-kubectl/"; exit 1; }

hash skaffold &>/dev/null || {
  curl -Lo skaffold https://storage.googleapis.com/skaffold/releases/latest/skaffold-linux-amd64
  chmod +x skaffold
  sudo mv skaffold /usr/local/bin
}
hash skaffold &>/dev/null || { echo "skaffold not found! See https://skaffold.dev/docs/getting-started/#installing-skaffold"; exit $ERRCODE; }

hash kustomize &>/dev/null || { 
  curl -s https://api.github.com/repos/kubernetes-sigs/kustomize/releases/latest |\
  grep browser_download |\
  grep linux |\
  cut -d '"' -f 4 |\
  xargs curl -O -L
  mv kustomize_*_linux_amd64 kustomize
  chmod u+x ./kustomize
  sudo mv ./kustomize /usr/local/bin/
}
hash kustomize &>/dev/null || { echo "kustomize not found! See https://github.com/kubernetes-sigs/kustomize/blob/master/docs/INSTALL.md"; exit 1; }

hash gsutil || {
    echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
    sudo apt-get install -y apt-transport-https ca-certificates
    curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -
    sudo apt-get update && sudo apt-get install -y google-cloud-sdk
    gcloud auth activate-service-account --key-file=tools/FormulaDB-storage-full.json
}

# -------------------------------------------------------------------------
# External dependency: obj storage
# -------------------------------------------------------------------------

if ! gcloud auth list|grep formuladb-static-assets; then
    gcloud auth activate-service-account --key-file $BASEDIR/FormulaDB-storage-full.json
fi

# node $BASEDIR/gcloud.js 'createBucketIfNotExists("'$FRMDB_ENV_NAME'")'

# ASSETS="`git ls-files apps/hotel-booking/`" node $BASEDIR/gcloud.js \
#     'uploadAssets("'$FRMDB_ENV_NAME'")'

gsutil -m rsync -d -r apps/formuladb-internal/formuladb.io gs://formuladb-static-assets/$FRMDB_ENV_NAME/formuladb-internal/formuladb.io
gsutil -m rsync -d -r apps/formuladb-examples/hotel-booking gs://formuladb-static-assets/$FRMDB_ENV_NAME/formuladb-examples/hotel-booking

gsutil -m rsync -r vvvebjs gs://formuladb-static-assets/$FRMDB_ENV_NAME/formuladb-editor
gsutil -m rsync -x ".*.js.map$" -r dist-fe gs://formuladb-static-assets/$FRMDB_ENV_NAME/formuladb
gsutil -m rsync -r fe/img gs://formuladb-static-assets/$FRMDB_ENV_NAME/formuladb/img
gsutil -m rsync -r fe/icons gs://formuladb-static-assets/$FRMDB_ENV_NAME/formuladb/icons

curl -L -O https://github.com/elastic/apm-agent-rum-js/releases/latest/download/elastic-apm-rum.umd.min.js
gsutil cp elastic-apm-rum.umd.min.js gs://formuladb-static-assets/$FRMDB_ENV_NAME/elastic-apm-rum.umd.min.js

# -------------------------------------------------------------------------
# External dependency: Elastic stack
# -------------------------------------------------------------------------

# nothing to do for now

# -------------------------------------------------------------------------
# External dependency: k8s
# -------------------------------------------------------------------------

if [ -z "$NO_K8S" ]; then
  echo "Preparing k8s namespace ${FRMDB_ENV_NAME}"
  perl -p -i -e 's!value.*#TBD_ENV_NAME!value: '$FRMDB_ENV_NAME' #TBD_ENV_NAME!' k8s/overlays/development/patches/lb-deployment.yaml
  perl -p -i -e 's!value.*#TBD_ENV_NAME!value: '$FRMDB_ENV_NAME' #TBD_ENV_NAME!' k8s/overlays/development/patches/be-deployment.yaml

  if ! kubectl get namespaces|grep "\b${FRMDB_ENV_NAME}\b"; then 
      kubectl create namespace "${FRMDB_ENV_NAME}" 
  fi

  if ! kubectl -n "${FRMDB_ENV_NAME}" get secrets | grep "\bregcred\b"; then 
      kubectl -n "${FRMDB_ENV_NAME}" create secret generic regcred --from-file=.dockerconfigjson=${BASEDIR}/docker-config.json --type=kubernetes.io/dockerconfigjson; 
  fi
fi