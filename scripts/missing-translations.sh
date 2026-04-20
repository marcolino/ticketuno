#!/usr/bin/env bash
#
# Count missing translations

grep -rn '": ""' shared/locales/{it,fr,zh}/common.json