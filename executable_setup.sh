#!/bin/bash

set -eo pipefail

# move into the repo root
cd "$(dirname "$0")/.."

DESTROY_CLUSTER='false'
SKIP_DEPLOY='false'
VERBOSE='false'

declare -xr KUBECONFIG="${PWD}/kubeconfig.yaml"
declare -xr K3D_FIX_DNS="true"

function main() {
    while getopts "hdsv" option; do
        case "${option}" in
            d) DESTROY_CLUSTER='true' ;;
            s) SKIP_DEPLOY='true' ;;
            v) VERBOSE='true' ;;
            *) usage && exit 1 ;;
        esac
    done

    if [[ "${VERBOSE}" == 'true' ]]; then
        echo "WARNING: Verbose logging enabled. Secrets might be logged."
        set -x
    fi

    if [[ "${DESTROY_CLUSTER}" == 'true' ]]; then
        k3d cluster delete
        exit
    fi

    if ! k3d cluster get k3s-default > /dev/null; then
        k3d cluster create --config=scripts/k3d-config.yaml
        k3d kubeconfig get k3s-default > kubeconfig.yaml
    fi

    if [[ "${SKIP_DEPLOY}" == 'false' ]]; then
        local delay=2

        while ! kubectl apply -k clusters/local/flux-system ; do
            echo "Deploy failed, retrying in ${delay} seconds."
            sleep ${delay}

            if ! ((delay >= 30)); then
                delay=$((delay*2))
            fi
        done

        if ! kubectl get secrets flux-system -n flux-system -o name; then
            if [[ -n "${GIT_REPO_TOKEN_USERNAME}" && -n "${GIT_REPO_TOKEN_PASSWORD}" ]]; then
                kubectl create secret generic flux-system -n flux-system \
                    --from-literal username="${GIT_REPO_TOKEN_USERNAME}" \
                    --from-literal password="${GIT_REPO_TOKEN_PASSWORD}"
            fi
        fi

        flux check
        flux reconcile kustomization flux-system --with-source --timeout 1m
    fi
}

function usage() {
    printf "
setup

This script will use k3d to quickly setup a local kubernetes cluster with the flux already installed.
By default it will create a flux secret for the git repository if both GIT_REPO_TOKEN_USERNAME and 
GIT_REPO_TOKEN_PASSWORD are set.

It will not update your kube config to point to the new cluster. Instead it will write the configuration
to kubeconfig.yaml in the root of this repository. You can use the KUBECONFIG environment variable to
instruct kubectl and other tools to use the local cluster.

TIP: use a tool like direnv to automatically set environment variables whenever you enter this folder!
For example the following command will create a .envrc file that will set your KUBECONFIG to point to
the local k3d config automatically.

cat > .envrc <<EOF
export KUBECONFIG=\${PWD}/kubeconfig.yaml
EOF

Usage:
    # create a cluster, deploy flux and create a flux secret
    ./setup

    # create a cluster but skip deploying flux.
    ./setup -s

    # destroy the cluster
    ./setup -d

Options:
    -h Print this screen.
    -d Destroy cluster.
    -s Skip deploying flux.
    -v Verbosely log all commands executed by this script. WARNING: this might log secrets.
"
}

main "$@"
