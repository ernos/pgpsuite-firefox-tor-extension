#!/bin/bash
source ~/.bash/colors
source ~/.bash/debug
source ~/.bash/functions/log
source ~/.bash/functions/utils


VERSION_INCREMENT="FALSE"

ZIPFILE="${FILENAME}.zip"
XPIFILE="${FILENAME}.xpi"
manifest="manifest.json"
manitemp="manifest.temp"
index="index.html"
iorig="index.orig"
itemp="index.tmp"
itemplate="templates/index.template"
manitemplate="templates/manifest.template"
version_number="templates/version.placeholder"

version=$(cat "$version_number")
increment_version() {
  # Read the current version
  local version=$(cat "$version_number")
  
  # Split version into parts (assuming format like "4.0")
  IFS='.' read -r major minor <<< "$version"
  
  # Increment the minor version (second number)
  minor=$((minor + 1))
  
  # If minor > 9, increment major and reset minor to 0
  if [ $minor -gt 9 ]; then
      major=$((major + 1))
      minor=0
  fi
  
  # Write the new version back to file
  echo "${major}.${minor}" > "$version_number"
  echo "${major}.${minor}"
}
if [[ "$NO_VERSION_INCREMENT" == "TRUE" ]]; then
  version=$(increment_version)
fi

ok "${__}${C}New ${S}version ${B}number after ${G}increment:$version${NC}"
cp "$index" "$iorig"
if [ -f "$index" ]; then
  #confirm "${U}Update ${B}version${NC} ${I}with ${S}${W}$version ${C}in file: ${B}index.html${NC} ${CYAN}[${MAGENTA}[y/N]" | echo ""
  
  sed "s/__VERSION__/$version/g" "$itemplate" > "$itemp"
  itmp_size=$(ls -s "$itemp")

  if [ -f "$itemp" ]; then
    ok "${GREEN}\"$itemp\" exists and is larger than zero:${NC}"
    
    cp "$itemp" "$index"

  else
    warn "${YELLOW}\"$itemp\" doesn't exist"
    ls -s "$itemp"
  fi
else
  warn "${MAGENTA}Could not update __VERSION__ in \"$index\" since it doesn't exist${NC}"
fi
ZIPFILE="PGP Suite – Encrypt Messages & Files v$version.xpi"
ok "${B}Creating XPI File: ${C}$FILENAME${NC}"
cp $manitemplate $manifest
sed "s/__VERSION__/$version/g" "$manifest" > $manitemp
cp $manitemp $manifest



#ZIPFILE=$(sed "s/__VERSION__/$version/g" "$manifest")S
ok "${M}Name ${C}of ${Y}XPI file: ${R}$ZIPFILE${NC}"
#cat mtmp | grep $version


validate() {
  if [ "$1" == "$index" ]; then
    info "${W}Trying to validate: ${M}$1,,,"
    if [ ! $(cat $index | grep __VERSION__) ]; then
      ok "${GREEN}$index${NC} has been validated and checks out. Go ahead and put it in the zip, and then overwrite it with ${BLUE}$itemplate${NC} ${GREEN}when you are done.${NC}"

      zip -r "$ZIPFILE" "$index"
      rm "$index"
      cp "$iorig" "$index"

      ok "${G} Done validating and adding index.html to XPI${NC}"
    else
      error "${C}index.html contains: ${R}__VERSION__${NC}"
    fi
    
  elif [ "$1" == "$manifest" ]; then
    if [ ! $(cat "$manifest" | grep __VERSION__) ]; then      
      ok "${GREEN}$manifest${NC} has been validated and checks out. Go ahead and put it in the zip, and then overwrite it with ${BLUE}$manitemplate${NC} ${GREEN}when you are done.${NC}"

      zip -r "$ZIPFILE" "$manifest"
      rm "$manifest"
      cp "$manitemplate" "$manifest"

      ok "${G} Done validating and adding $manifest to XPI${NC}"
    else
      error "${C}index.html contains: ${R}__VERSION__${NC}"
    fi
  else
    info "${B}validate else clause...${NC}"
    
  fi
}
validate "index.html"
validate "$manifest"

#nvm run build.js
#confirm "Start creating zip file:$ZIPFILE" | 
zip -r "$ZIPFILE" "css/" "js/" "lib/" "icon/"
mkdir -p "builds"
mv "$ZIPFILE" "builds/${ZIPFILE}"
if [ -f "$iorig" ]; then
  ok "${BLUE}Switching back to original \"$iorig\"${NC}"
  rm "$index"
  mv "$iorig" "$index"
  rm "$itemp"
else
  warn "${MAGENTA}Could not find original backed up \"$index\" file${NC}"
fi


#rm $manitemp
cp "$itemplate" "$index"
cp $manitemplate $manifest
rm $manitemp