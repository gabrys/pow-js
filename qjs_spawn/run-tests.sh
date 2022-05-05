#!/bin/bash

diff -u <(node tests.mjs 2>&1) <(qjs tests.mjs 2>&1) && echo All tests OK
