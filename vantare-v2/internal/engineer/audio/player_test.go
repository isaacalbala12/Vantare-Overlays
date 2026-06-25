//go:build windows

package audio

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

// findCachedMP3 finds a real MP3 file in the TTS cache for testing.
// Returns empty string if none found.
func findCachedMP3(t *testing.T) string {
	cacheDir := os.Getenv("APPDATA") + `\Vantare\Ingeniero\tts-cache\edge`
	entries, err := os.ReadDir(cacheDir)
	if err != nil {
		return ""
	}
	for _, e := range entries {
		if filepath.Ext(e.Name()) == ".mp3" {
			return filepath.Join(cacheDir, e.Name())
		}
	}
	return ""
}

func TestPlayer_PlayInvalidFile(t *testing.T) {
	p := NewPlayer()

	tmpDir := t.TempDir()
	dummyPath := filepath.Join(tmpDir, "invalid.mp3")
	if err := os.WriteFile(dummyPath, []byte("not real audio"), 0644); err != nil {
		t.Fatalf("cannot create dummy file: %v", err)
	}

	// Play should not hang or panic. It may return an error from PowerShell
	// (invalid media) or timeout, but either way it should return within
	// maxPlaybackDuration + margin.
	start := time.Now()
	err := p.Play(dummyPath)
	elapsed := time.Since(start)

	if elapsed > maxPlaybackDuration+2*time.Second {
		t.Errorf("Play took %v, should complete within %v + margin", elapsed, maxPlaybackDuration)
	}

	// Error is acceptable for invalid audio. What matters is no hang.
	_ = err
	t.Logf("Play(invalid) returned err=%v in %v", err, elapsed)
}

func TestPlayer_StopWhenIdle(t *testing.T) {
	p := NewPlayer()
	// Stop on a fresh player should not panic or block.
	p.Stop()
}

func TestPlayer_PlayRealFile(t *testing.T) {
	mp3Path := findCachedMP3(t)
	if mp3Path == "" {
		t.Skip("no cached MP3 files found, skipping real playback test")
	}

	p := NewPlayer()
	start := time.Now()
	err := p.Play(mp3Path)
	elapsed := time.Since(start)

	if err != nil {
		t.Fatalf("Play failed for real MP3: %v", err)
	}

	// A real MP3 should take at least 1 second (audio is ~2s) but
	// no more than maxPlaybackDuration.
	if elapsed < 500*time.Millisecond {
		t.Errorf("Play returned too fast (%v) — audio likely didn't play", elapsed)
	}
	if elapsed > maxPlaybackDuration+2*time.Second {
		t.Errorf("Play took %v, exceeded maxPlaybackDuration", elapsed)
	}

	t.Logf("Play(real) took %v, err=%v", elapsed, err)
}

func TestPlayer_StopCutsPlayback(t *testing.T) {
	mp3Path := findCachedMP3(t)
	if mp3Path == "" {
		t.Skip("no cached MP3 files found")
	}

	p := NewPlayer()

	// Start playback in a goroutine.
	playDone := make(chan error, 1)
	go func() {
		playDone <- p.Play(mp3Path)
	}()

	// Give it a moment to start.
	time.Sleep(1 * time.Second)

	// Stop should kill the process and Play should return quickly after.
	stopStart := time.Now()
	p.Stop()
	stopElapsed := time.Since(stopStart)

	if stopElapsed > 2*time.Second {
		t.Errorf("Stop took %v, should return quickly after kill", stopElapsed)
	}

	// Wait for Play to return (it should have been killed).
	select {
	case <-playDone:
	case <-time.After(5 * time.Second):
		t.Fatal("Play did not return within 5s after Stop")
	}
}

func TestPlayer_SequentialPlays(t *testing.T) {
	mp3Path := findCachedMP3(t)
	if mp3Path == "" {
		t.Skip("no cached MP3 files found")
	}

	p := NewPlayer()

	// Two sequential plays — the second should wait for the first to finish.
	start := time.Now()
	err1 := p.Play(mp3Path)
	mid := time.Now()
	err2 := p.Play(mp3Path)
	end := time.Now()

	if err1 != nil {
		t.Errorf("first Play failed: %v", err1)
	}
	if err2 != nil {
		t.Errorf("second Play failed: %v", err2)
	}

	firstDur := mid.Sub(start)
	totalDur := end.Sub(start)

	// Each play should take at least ~1s (audio is ~2s).
	if firstDur < 500*time.Millisecond {
		t.Errorf("first Play too fast: %v", firstDur)
	}
	// Total should be roughly 2x the first (both played to completion).
	if totalDur < firstDur*3/2 {
		t.Errorf("total %v too short vs first %v — second play may have been skipped", totalDur, firstDur)
	}

	t.Logf("First: %v, Total: %v", firstDur, totalDur)
}