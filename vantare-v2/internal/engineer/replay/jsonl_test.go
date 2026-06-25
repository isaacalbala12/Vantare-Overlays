package replay

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/vantare/overlays/v2/internal/engineer/telemetry"
)

func TestOneFrameRoundTrip(t *testing.T) {
	frame := &telemetry.Frame{
		Connected:        true,
		PlayerHasVehicle: true,
		Player: &telemetry.PlayerTelemetry{
			ID:    1,
			Speed: 100.5,
		},
		TimestampUnixMS: 1623800000000,
	}

	var buf bytes.Buffer
	err := WriteFrame(&buf, frame)
	if err != nil {
		t.Fatalf("failed to write frame: %v", err)
	}

	reader := NewReader(&buf)
	readFrame, next, err := reader.Next()
	if err != nil {
		t.Fatalf("failed to read frame: %v", err)
	}
	if !next {
		t.Fatalf("expected to read next frame, but got EOF")
	}

	if readFrame.Connected != frame.Connected {
		t.Errorf("expected Connected %v, got %v", frame.Connected, readFrame.Connected)
	}
	if readFrame.Player.Speed != frame.Player.Speed {
		t.Errorf("expected Speed %v, got %v", frame.Player.Speed, readFrame.Player.Speed)
	}
	if readFrame.TimestampUnixMS != frame.TimestampUnixMS {
		t.Errorf("expected TimestampUnixMS %v, got %v", frame.TimestampUnixMS, readFrame.TimestampUnixMS)
	}

	// Next read should return EOF
	_, next, err = reader.Next()
	if err != nil {
		t.Fatalf("unexpected error on second read: %v", err)
	}
	if next {
		t.Errorf("expected EOF, but got another frame")
	}
}

func TestMalformedJSON(t *testing.T) {
	malformed := `{"connected": true,`
	reader := NewReader(strings.NewReader(malformed))
	_, _, err := reader.Next()
	if err == nil {
		t.Error("expected error reading malformed JSON, got nil")
	}
}

func TestReplaySource(t *testing.T) {
	frames := []*telemetry.Frame{
		{
			Connected:       true,
			TimestampUnixMS: 1000,
		},
		{
			Connected:       true,
			TimestampUnixMS: 2000,
		},
		{
			Connected:       true,
			TimestampUnixMS: 3000,
		},
	}

	tempFile, err := os.CreateTemp("", "replay-test-*.jsonl")
	if err != nil {
		t.Fatalf("failed to create temp file: %v", err)
	}
	defer os.Remove(tempFile.Name())
	defer tempFile.Close()

	for _, f := range frames {
		if err := WriteFrame(tempFile, f); err != nil {
			t.Fatalf("failed to write frame to temp file: %v", err)
		}
	}

	// Seek to beginning or just close and reopen
	tempFile.Close()

	src, err := NewSource(tempFile.Name())
	if err != nil {
		t.Fatalf("failed to open replay source: %v", err)
	}
	defer src.Close()

	info := src.Info()
	if info.Kind != telemetry.KindReplay {
		t.Errorf("expected KindReplay, got %v", info.Kind)
	}
	expectedName := filepath.Base(tempFile.Name())
	if info.Name != expectedName {
		t.Errorf("expected Name %q, got %q", expectedName, info.Name)
	}
	if info.Live {
		t.Errorf("expected Live to be false")
	}
	if !info.Available {
		t.Errorf("expected Available to be true")
	}

	// Read frames in order
	for i, expected := range frames {
		got := src.ReadFrame()
		if got == nil {
			t.Fatalf("frame %d is nil", i)
		}
		if got.TimestampUnixMS != expected.TimestampUnixMS {
			t.Errorf("frame %d: expected TimestampUnixMS %v, got %v", i, expected.TimestampUnixMS, got.TimestampUnixMS)
		}
	}

	// Subsequent reads should continue to return the last frame (frames[2])
	for i := 0; i < 3; i++ {
		got := src.ReadFrame()
		if got == nil {
			t.Fatalf("subsequent frame %d is nil", i)
		}
		if got.TimestampUnixMS != frames[2].TimestampUnixMS {
			t.Errorf("subsequent frame %d: expected last frame timestamp %v, got %v", i, frames[2].TimestampUnixMS, got.TimestampUnixMS)
		}
	}
}

func TestReplaySourceEmptyFile(t *testing.T) {
	tempFile, err := os.CreateTemp("", "replay-empty-test-*.jsonl")
	if err != nil {
		t.Fatalf("failed to create temp file: %v", err)
	}
	defer os.Remove(tempFile.Name())
	tempFile.Close()

	src, err := NewSource(tempFile.Name())
	if err != nil {
		t.Fatalf("failed to open replay source: %v", err)
	}
	defer src.Close()

	if got := src.ReadFrame(); got != nil {
		t.Errorf("expected nil frame from empty replay source, got %+v", got)
	}
}

func TestReplaySourceNonExistentFile(t *testing.T) {
	_, err := NewSource("non-existent-file-xyz.jsonl")
	if err == nil {
		t.Error("expected error opening non-existent file, got nil")
	}
}
