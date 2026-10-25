set -eu
printf 'TVHOME_BEGIN\n'
test "$(id -u)" = 901 || exit 1
grep -q '^Version=T-KSU2ECAKUC-0080-2024.2;' /etc/prd_info.ini || exit 1
printf 'AUDIO_QUERY_SYMBOLS\n'
for f in /usr/apps/org.tizen.volume-app/bin/volume-app /usr/apps/org.tizen.volume-setting/bin/volume-setting; do
  printf '%s\n' "$f"
  if test -r "$f"; then
    grep -aEo '(sound_manager|audio_manager|avoc|_ZN13CAudioControl|_ZN13CSystemConfig)[A-Za-z0-9_]+' "$f" | sort -u | head -100 || true
    grep -aEo '(Get|Is|On|get_|is_)[A-Za-z0-9_]*(Speaker|speaker|Output|output|Receiver|receiver|Arc|ARC|Route|route|Device|device)[A-Za-z0-9_]*' "$f" | sort -u | head -100 || true
  fi
done
printf 'AUDIO_LIBRARY_PATHS\n'
ls -l /usr/lib/*sound*manager* /usr/lib/*audio*manager* /usr/lib/*avoc* /usr/lib/*acm* 2>/dev/null | head -45 || true
printf 'AUDIO_STATE_READ_ONLY\n'
for k in memory/volume-setting/receiver-device memory/volume-setting/bt-device db/acm/ext_last_symphony_name memory/acm/networkspeaker_status memory/org.tizen.bt-settings-external-controller/ext_bt_spp_spdif_status memory/tv-viewer/show_ext_volume; do
  printf '%s\n' "$k"
  vconftool get "$k" || true
done
printf 'TVHOME_END\n'
