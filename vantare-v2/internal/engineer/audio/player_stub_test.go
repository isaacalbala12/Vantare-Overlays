//go:build !windows

package audio

import "testing"

func TestPlayer_PlayFile_Stub(t *testing.T) {
	p := NewPlayer()
	if p == nil {
		t.Fatal("NewPlayer returned nil")
	}
	// On non-Windows, Play returns ErrPlaybackUnsupported
	err := p.Play("/nonexistent/file.mp3")
	if err != ErrPlaybackUnsupported {
		t.Errorf("expected ErrPlaybackUnsupported, got %v", err)
	}
}
