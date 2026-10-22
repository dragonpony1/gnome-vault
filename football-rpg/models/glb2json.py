import json, struct, base64, sys, os
def convert(src, dst):
    b = open(src, 'rb').read()
    assert b[:4] == b'glTF'
    off, js, binc = 12, None, None
    while off < len(b):
        ln, typ = struct.unpack('<II', b[off:off+8]); chunk = b[off+8:off+8+ln]
        if typ == 0x4E4F534A: js = json.loads(chunk)
        elif typ == 0x004E4942: binc = chunk
        off += 8 + ln
    if binc is not None:
        js['buffers'][0]['uri'] = 'data:application/octet-stream;base64,' + base64.b64encode(binc).decode()
    open(dst, 'w').write(json.dumps(js, separators=(',', ':')))
for src in sys.argv[2:]:
    dst = os.path.join(sys.argv[1], os.path.basename(src)[:-4] + '.json'); convert(src, dst)
    print(f"{os.path.basename(dst):28} {os.path.getsize(dst)/1e6:.2f}MB")
