package main

import (
	"encoding/binary"
	"fmt"
	"math"
	"os"
	"time"

	"github.com/vantare/overlays/v2/internal/telemetry/lmu"
)

func main() {
	out := os.Args[1]
	if out == "" {
		out = "lmu-dump3.csv"
	}
	r, err := lmu.Open()
	if err != nil {
		fmt.Println("OPEN ERROR:", err)
		os.Exit(1)
	}
	defer r.Close()

	f, err := os.Create(out)
	if err != nil {
		fmt.Println("create:", err)
		os.Exit(1)
	}
	defer f.Close()

	// Try int32, float32, uint16 for each 4-byte aligned field from 100..584
	fmt.Fprintln(f, "sample,id,name,place,laps,class,off,hex8,i32,f32,u16_lo,u16_hi,ascii")

	sample := 0
	deadline := time.Now().Add(6 * time.Second)
	for time.Now().Before(deadline) {
		buf := r.Bytes()
		if len(buf) < lmu.ObjectOutSize {
			time.Sleep(100 * time.Millisecond)
			continue
		}
		for i := 0; i < 104; i++ {
			off := 2192 + i*584
			if off+584 > len(buf) {
				break
			}
			id := int32(binary.LittleEndian.Uint32(buf[off:]))
			if id < 0 {
				continue
			}
			name := readString(buf[off+4:], 32)
			if name == "" {
				continue
			}
			place := buf[off+199]
			totalLaps := int16(binary.LittleEndian.Uint16(buf[off+100:]))
			class := readString(buf[off+200:], 32)
			// Only emit the first sample per (slot,off) to keep CSV small
			if sample != 0 {
				continue
			}
			for field := 100; field < 584; field += 4 {
				bits := binary.LittleEndian.Uint32(buf[off+field:])
				asI32 := int32(bits)
				asF32 := math.Float32frombits(bits)
				u16lo := uint16(bits)
				u16hi := uint16(bits >> 16)
				ascii := ""
				if buf[off+field] >= 32 && buf[off+field] < 127 &&
					buf[off+field+1] >= 32 && buf[off+field+1] < 127 &&
					buf[off+field+2] >= 32 && buf[off+field+2] < 127 &&
					buf[off+field+3] >= 32 && buf[off+field+3] < 127 {
					ascii = string([]byte{buf[off+field], buf[off+field+1], buf[off+field+2], buf[off+field+3]})
				}
				fmt.Fprintf(f, "%d,%d,%q,%d,%d,%q,%d,%08x,%d,%.4f,%d,%d,%q\n",
					sample, id, name, place, totalLaps, class, field, bits, asI32, asF32, u16lo, u16hi, ascii)
			}
		}
		sample++
		time.Sleep(2 * time.Second)
	}
	fmt.Println("done, sample count:", sample)
}

func readString(buf []byte, max int) string {
	for i, b := range buf[:max] {
		if b == 0 {
			return string(buf[:i])
		}
	}
	return string(buf[:max])
}
