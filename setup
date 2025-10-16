#!/bin/bash

set -euo pipefail

if command -v chezmoi >/dev/null; then
  chezmoi init --apply --source $PWD
  exit 0
fi

if command -v mise >/dev/null; then
  mise exec chezmoi -- chezmoi init --apply --source $PWD
  exit 0
fi

sh -c "$(curl -fsLS get.chezmoi.io)" -- init --apply --source $PWD
exit 0
