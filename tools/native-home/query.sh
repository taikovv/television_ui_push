set -eu
trap 'rm -f /home/owner/share/tmp/sdk_tools/TvHomeControl.dll /home/owner/share/tmp/sdk_tools/TvHomeControl.deps.json /home/owner/share/tmp/sdk_tools/TvHomeControl.runtimeconfig.json /home/owner/share/tmp/sdk_tools/TvHomeOriginal.json' EXIT
printf 'TVHOME_BEGIN\n'
/usr/bin/dotnet /home/owner/share/tmp/sdk_tools/TvHomeControl.dll query
printf 'TVHOME_END\n'
