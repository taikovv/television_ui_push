set -eu
printf 'TVHOME_BEGIN\n'
test "$(id -u)" = 901 || exit 1
grep -q '^Version=T-KSU2ECAKUC-0080-2024.2;' /etc/prd_info.ini || exit 1
f=/usr/lib/libadinfo.so
size=$(wc -c < "$f")
printf 'ADINFO_LIBRARY_BYTES %s\n' "$size"
if test "$size" -le 60000; then
  printf 'TVHOME_LIB_BASE64_BEGIN\n'
  base64 "$f"
  printf 'TVHOME_LIB_BASE64_END\n'
fi
printf 'TVHOME_END\n'
