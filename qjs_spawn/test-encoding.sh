#!/bin/bash

test_strings=(
"apostrophee '"
'quote "'
'%TEMP%'
'bs: \'
# '\\\ \\' broken in node and pow
'#^'
'$$'
'!*&^#*^&)E(R&)(*^%%'
'    '
'new lines



new lines'
'#'
':'
'C:\Program Files\Git'
'ąść'
'a  b'
''
'<<>>>>'
)

# POW_SPAWN="dist/windows/pow.exe spawn"
# POW_VV_SPAWN="dist/windows/pow.exe -vv spawn"

POW_SPAWN="pow spawn"
POW_VV_SPAWN="pow -vv spawn"

POW_SPAWN="node qjs_spawn/node_spawn.mjs"
POW_VV_SPAWN="node qjs_spawn/node_spawn.mjs"

for expected in "${test_strings[@]}"; do
  actual=$($POW_SPAWN "C:\\Program Files\\Git\\usr\\bin\\echo.exe" "$expected")
  if diff <(echo "$expected") <(echo "$actual") 1>/dev/null; then
    echo -n "."
  else
    echo
    echo Not ok: $expected
    echo
    diff <(echo "$expected") <(echo "$actual")

    $POW_VV_SPAWN "C:\\Program Files\\Git\\usr\\bin\\echo.exe" "$expected"
    exit 1
  fi
done
echo
