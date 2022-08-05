#!/bin/bash

set -euo pipefail

need_demzify() {
  cp -n /build/cosmopolitan/build/bootstrap/apetest.com /build/apetest.com
  [ "$(/build/apetest.com)" != success ]
}

demzify() {
  echo
  echo  ====================
  echo "deMZify now (run #$1)"
  list_mz_files || true
  echo  ====================
  echo

  for comfile in $(find_com); do
    # Replace the magic MZ marker from the file
    # but keep the modification time via touch -r

    cp "$comfile" "$comfile.demz"
    sed s/MZqFpD/Ue6OCi/g -i "$comfile.demz"
    touch -r "$comfile" "$comfile.demz"
    mv "$comfile.demz" "$comfile"
  done
}

find_com() {
  find /build/cosmopolitan/ -name '*.com' -not -name qjs.com -not -name apetest.com
}

has_mz_files() {
  grep -q MZqFpD $(find_com)
}

list_mz_files() {
  grep -l MZqFpD $(find_com)
}
