set -eu
printf 'TVHOME_BEGIN\n'
test "$(id -u)" = 901 || exit 1
grep -q '^Version=T-KSU2ECAKUC-0080-2024.2;' /etc/prd_info.ini || exit 1
printf 'VOLUME_COMPONENT_PATHS\n'
for base in /usr/apps /opt/usr/apps; do
  for folder in "$base"/*volume*; do
    test -d "$folder" || continue
    ls -ld "$folder"
    if test -w "$folder"; then printf 'SDK_DIRECTORY_WRITABLE\n'; else printf 'SDK_DIRECTORY_NOT_WRITABLE\n'; fi
    find "$folder" -maxdepth 3 -type f 2>/dev/null | head -30
  done
done
printf 'TVHOME_END\n'
