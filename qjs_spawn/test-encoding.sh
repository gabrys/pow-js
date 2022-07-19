#!/bin/bash

test_strings=(
"apostrophee '"
'quote "'
'bs: \'
'\\\ \\'
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

for expected in "${test_strings[@]}"; do
  actual=$(dist/windows/pow.exe spawn echo "$expected")
  if diff <(echo "$expected") <(echo "$actual") 1>/dev/null; then
    echo -n "."
  else
    echo
    echo Not ok: $expected
    echo
    diff <(echo "$expected") <(echo "$actual")

    dist/windows/pow.exe -vv spawn echo "$expected"
    exit 1
  fi
done
echo
