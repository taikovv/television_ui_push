set -eu
trap 'rm -f /home/owner/share/tmp/sdk_tools/TvHomePrivacyProbe.dll /home/owner/share/tmp/sdk_tools/TvHomePrivacyProbe.deps.json /home/owner/share/tmp/sdk_tools/TvHomePrivacyProbe.runtimeconfig.json' EXIT
printf 'TVHOME_BEGIN\n'
/usr/bin/dotnet /home/owner/share/tmp/sdk_tools/TvHomePrivacyProbe.dll
printf 'FILTERED_LAT_CONSENT_DIAGNOSTIC_NO_IDENTIFIERS\n'
if command -v dlogutil >/dev/null 2>&1; then
  dlogutil -d -v brief ADINFO:D '*:S' 2>/dev/null | grep 'adinfo_is_lat_enabled' | tail -6 || true
else
  printf 'DIAGNOSTIC_LOG_UNAVAILABLE\n'
fi
printf 'TVHOME_END\n'
