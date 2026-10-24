set -eu
printf 'TVHOME_BEGIN\n'
test "$(id -u)" = 901 || { echo 'Expected SDK user 901; refusing'; exit 1; }
id
uname -m
sed -n '/^Version=/p;/^Model=/p' /etc/prd_info.ini
cat /etc/tizen-release
printf '\nDOTNET\n'
ls -d /usr/share/dotnet/shared/Microsoft.NETCore.App/* 2>/dev/null || true
printf '\nHOME_PREFERENCES\n'
for k in db/appfw/home_appid db/appfw/startup_appid db/appfw/booting_appid_backup db/first_screen/type db/menu/smart_hub/ontvsetting/auto_start; do vconftool get "$k" || true; done
printf '\nNATIVE_LIBRARIES\n'
ls -l /usr/lib/libbundle.so.0 /usr/lib/libaul.so.0 /usr/lib/libapp-context-manager-common.so /usr/lib/libcapi-appfw-app-operation-tv.so.0 /usr/lib/libvconf.so.0 2>/dev/null || true
printf '\nLAUNCHER\n'
ls -ld /opt/usr/apps/WGuqy2ffiw 2>/dev/null || true
printf '\nINSTALL_STATUS\n'
ps -ef | grep '[v]d_appinstall' || true
for f in /opt/usr/apps/WGuqy2ffiw/res/wgt/config.xml /opt/usr/apps/WGuqy2ffiw/res/config.xml /opt/usr/apps/WGuqy2ffiw/config.xml; do if test -r "$f"; then sed -n '/<widget/p' "$f"; fi; done
printf 'TVHOME_END\n'
