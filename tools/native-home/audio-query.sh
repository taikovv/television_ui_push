set -eu
trap 'rm -f /home/owner/share/tmp/sdk_tools/TvHomeAudioProbe.dll /home/owner/share/tmp/sdk_tools/TvHomeAudioProbe.deps.json /home/owner/share/tmp/sdk_tools/TvHomeAudioProbe.runtimeconfig.json' EXIT
printf 'TVHOME_BEGIN\n'
/usr/bin/dotnet /home/owner/share/tmp/sdk_tools/TvHomeAudioProbe.dll
printf 'RECEIVER_DESCRIPTOR\n'
vconftool get memory/volume-setting/receiver-device || true
printf 'TVHOME_END\n'
