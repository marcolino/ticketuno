#!/usr/bin/env bash
#
# Count missing translations

grep -rn '": ""' shared/locales/{it,fr,zh}/common.json
if [ $? -ne 0 ]; then exit 0; else exit 1; fi