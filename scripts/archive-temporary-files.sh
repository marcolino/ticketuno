#!/usr/bin/env bash
#
# Archive to a destination folder all source files whose name matches a pattern.

srcFolders='./backend/src ./frontend/src ./scripts'
pattern='*\-V[0-9]*'
dstFolder='./tmp'

find $srcFolders -type f -iname $pattern -print0 | while IFS= read -r -d '' file; do
  target="${dstFolder}/${file#./}"
  mkdir -p "$(dirname "$target")"
  mv "$file" "$target"
  echo "archived $file"
done

exit 0
