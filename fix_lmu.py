import pathlib

path = pathlib.Path('packages/sim-core/src/adapters/lmu.ts')
lines = path.read_text().splitlines()

for i, line in enumerate(lines):
    stripped = line.strip()
    if stripped == "import koffi from 'koffi';":
        lines[i] = "import * as koffi from 'koffi';"
    elif "'Pointer OpenFileMappingW" in line:
        lines[i] = "  private OpenFileMappingW = this.lib.func('void* OpenFileMappingW(uint32, bool, string)');"
    elif "'Pointer MapViewOfFile" in line:
        lines[i] = "  private MapViewOfFile = this.lib.func('void* MapViewOfFile(void*, uint32, uint32, uint32, size_t)');"
    elif "'bool UnmapViewOfFile(Pointer'" in line:
        lines[i] = "  private UnmapViewOfFile = this.lib.func('bool UnmapViewOfFile(void*)');"
    elif "'bool CloseHandle(Pointer'" in line:
        lines[i] = "  private CloseHandle = this.lib.func('bool CloseHandle(void*)');"

path.write_text('\n'.join(lines))
print('LMU adapter updated')
