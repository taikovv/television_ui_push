set -eu
printf 'TVHOME_BEGIN\n'
test "$(id -u)" = 901 || exit 1
grep -q '^Version=T-KSU2ECAKUC-0080-2024.2;' /etc/prd_info.ini || exit 1
printf 'CANDIDATE_PROCESS_NAMES_NOT_PROOF_OF_COLLECTION\n'
ps -eo pid,comm 2>/dev/null | grep -Ei 'acr|adagent|analytics|recomm|content-grab|bixby|terms|privacy' | head -70 || true
printf 'COMPONENTS_AND_CONSENT_KEY_NAMES\n'
for name in com.samsung.tv.acr com.samsung.tv.iacr com.samsung.tv.adagent-service com.samsung.tv.coba.adagent com.samsung.tizen.samsung-analytics com.samsung.tv.termsclient com.samsung.tv.coba.privacychoice content-grab-service; do
  printf 'COMPONENT %s\n' "$name"
  for base in /usr/apps /opt/usr/apps; do
    dir="$base/$name"
    test -d "$dir" || continue
    ls -ld "$dir"
    if test -w "$dir"; then printf 'SDK_DIRECTORY_WRITABLE\n'; else printf 'SDK_DIRECTORY_NOT_WRITABLE\n'; fi
    if test -d "$dir/bin"; then
      for f in "$dir"/bin/*; do
        test -f "$f" && test -r "$f" || continue
        printf 'BINARY %s\n' "$f"
        grep -aEo '(db|memory)/[A-Za-z0-9_./-]*(privacy|consent|acr|advert|terms|voice|tracking|analytics)[A-Za-z0-9_./-]*' "$f" | sort -u | head -65 || true
      done
    fi
  done
done
printf 'ACR_PACKAGE_AND_PROCESS_PATHS\n'
ls -l /usr/share/packages/*[Aa][Cc][Rr]* /opt/share/packages/*[Aa][Cc][Rr]* /usr/share/packages/*adagent* /opt/share/packages/*adagent* 2>/dev/null || true
for pid in $(ps -eo pid,comm | awk '$2 == "ACRService" || $2 == "adagent-service" {print $1}'); do
  printf 'EXECUTABLE_FOR_PID %s\n' "$pid"
  readlink "/proc/$pid/exe" || true
done
for dir in /usr/apps/*[Aa][Cc][Rr]* /opt/usr/apps/*[Aa][Cc][Rr]* /usr/apps/*adagent* /opt/usr/apps/*adagent*; do
  test -d "$dir" || continue
  printf 'CANDIDATE_PATH %s\n' "$dir"
  for f in "$dir"/bin/*; do
    test -r "$f" && test -f "$f" || continue
    printf 'REFERENCED_KEYS %s\n' "$f"
    grep -aEo '(db|memory)/[A-Za-z0-9_./-]+' "$f" | sort -u | head -80 || true
  done
done
printf 'ACR_AND_ADAGENT_EXECUTABLE_METADATA\n'
for id in com.samsung.tv.acr com.samsung.tv.adagent-service; do
  printf 'APP_ID %s\n' "$id"
  for m in $(grep -l "appid=\"$id\"" /usr/share/packages/*.xml 2>/dev/null | head -2); do
    printf 'MANIFEST %s\n' "$m"
    sed -n '/<manifest /p;/<ui-application /p;/<service-application /p' "$m" | head -8
    for f in $(sed -n 's/.*exec="\([^" ]*\)".*/\1/p' "$m" | head -4); do
      case "$f" in /usr/apps/*/bin/*|/opt/usr/apps/*/bin/*) ;; *) continue ;; esac
      test -r "$f" || continue
      printf 'CONSENT_KEYS_IN %s\n' "$f"
      grep -aEo '(db|memory)/[A-Za-z0-9_./-]+' "$f" | sort -u | head -100 || true
      printf 'CONSENT_QUERY_SYMBOLS\n'
      grep -aEo '(get|is|Get|Is)[A-Za-z0-9_]*(Consent|consent|Agreement|agreement|Acr|ACR|Opt|Tracking|Privacy|privacy)[A-Za-z0-9_]*' "$f" | sort -u | head -65 || true
    done
  done
done
printf 'PRIVACY_QUERY_INTERFACES\n'
for f in /opt/usr/apps/com.samsung.tv.acr-service-app/bin/acr /usr/bin/adagent-service /opt/usr/apps/com.samsung.tizen.samsung-analytics/bin/samsung-analytics; do
  test -r "$f" && test -f "$f" || continue
  printf 'INTERFACES_IN %s\n' "$f"
  grep -aEo '(terms|acr|adinfo|privacy|policy|consent|agreement|is_)[A-Za-z0-9_]+' "$f" | sort -u | head -100 || true
  grep -aEo '(Get|Is|Check|Read)[A-Za-z0-9_]*(Consent|Agreement|Terms|Privacy|ACR|Acr|Policy|Tracking|OptIn|OptOut)[A-Za-z0-9_]*' "$f" | sort -u | head -65 || true
  grep -aEo '[A-Za-z0-9_.+-]+\.so(\.[0-9.]+)?' "$f" | sort -u | head -35 || true
done
printf 'PRIVACY_LIBRARY_PATHS\n'
ls /usr/lib/*adinfo* /usr/lib/*privacy* /usr/lib/*terms* /usr/lib/*acr* 2>/dev/null | head -55 || true
printf 'ADINFO_TRACKING_SETTING_INTERFACES\n'
if test -r /usr/lib/libadinfo.so; then
  grep -aEo '(db|memory)/[A-Za-z0-9_./-]+' /usr/lib/libadinfo.so | sort -u | head -65 || true
  grep -aEo '(adinfo|isLAT|getLAT|GetLAT|IsLAT|is_lat|get_lat|set_lat|IsLimit|GetLimit)[A-Za-z0-9_]+' /usr/lib/libadinfo.so | sort -u | head -70 || true
fi
printf 'ACR_DISCLAIMER_QUERY_NAMES\n'
grep -aEo '[A-Za-z0-9_]*(GetDisclaimerItemAgreement|disclaimer|consent|Privacy|privacy|Agreed)[A-Za-z0-9_]*' /opt/usr/apps/com.samsung.tv.acr-service-app/bin/acr | sort -u | head -60 || true
printf 'NETWORK_METADATA_SNAPSHOT_NO_PAYLOADS\n'
if command -v netstat >/dev/null 2>&1; then
  netstat -ntup 2>&1 | head -100 || true
else
  for f in /proc/net/tcp /proc/net/tcp6 /proc/net/udp /proc/net/udp6; do
    printf '%s\n' "$f"
    if test -r "$f"; then head -55 "$f"; else printf 'NOT_READABLE\n'; fi
  done
fi
printf 'TVHOME_END\n'
