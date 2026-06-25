//go:build windows

package audio

import (
	"fmt"
	"os/exec"
	"path/filepath"
	"sync"
	"time"
)

// maxPlaybackDuration is the maximum time a single playback can take
// before it's killed. Spotter phrases are 1-3 seconds; 8s gives margin.
const maxPlaybackDuration = 8 * time.Second

// killTimeout is how long we wait after killing a process before giving up.
const killTimeout = 2 * time.Second

// Player plays audio files on Windows using WPF MediaPlayer via a
// PowerShell subprocess. Play() blocks until the audio finishes or
// the timeout elapses, ensuring the queueLoop doesn't cut off audio
// mid-playback.
type Player struct {
	mu      sync.Mutex
	current *exec.Cmd
}

func NewPlayer() *Player {
	return &Player{}
}

// Play plays an audio file and blocks until playback completes or
// maxPlaybackDuration elapses. If audio is already playing, it stops
// the previous playback first. Returns an error if the file cannot
// be played or the process times out.
func (p *Player) Play(path string) error {
	p.mu.Lock()

	// Stop any currently playing audio.
	p.stopLocked()

	absPath, err := filepath.Abs(path)
	if err != nil {
		p.mu.Unlock()
		return fmt.Errorf("audio: cannot resolve path: %w", err)
	}

	// Use PowerShell with WPF MediaPlayer. The script has try/catch to
	// exit quickly on errors (invalid file, missing codec, etc.)
	// rather than sleeping the full duration.
	script := fmt.Sprintf(
		`try { `+
			`Add-Type -AssemblyName presentationCore -ErrorAction Stop; `+
			`$p = New-Object System.Windows.Media.MediaPlayer; `+
			`$p.Open([uri]'%s'); `+
			`Start-Sleep -Milliseconds 200; `+
			`if ($p.NaturalDuration.HasTimeSpan) { `+
			`$secs = [math]::Ceiling($p.NaturalDuration.TimeSpan.TotalSeconds + 0.5) `+
			`} else { $secs = 3 }; `+
			`$p.Play(); `+
			`Start-Sleep -Seconds $secs; `+
			`$p.Close() `+
			`} catch { exit 1 }`,
		absPath,
	)

	cmd := exec.Command("powershell", "-NoProfile", "-NonInteractive", "-Command", script)
	// Do NOT set cmd.Stderr — it creates a pipe that blocks cmd.Wait()
	// after Kill(). We rely on the exit code for error detection.

	if err := cmd.Start(); err != nil {
		p.mu.Unlock()
		return fmt.Errorf("audio: cannot start playback: %w", err)
	}
	p.current = cmd
	p.mu.Unlock()

	// Wait for playback with timeout.
	done := make(chan error, 1)
	go func() {
		done <- cmd.Wait()
	}()

	select {
	case err := <-done:
		p.mu.Lock()
		p.current = nil
		p.mu.Unlock()
		if err != nil {
			return fmt.Errorf("audio: playback error: %w", err)
		}
		return nil
	case <-time.After(maxPlaybackDuration):
		// Timeout — kill the process and wait briefly.
		_ = cmd.Process.Kill()
		select {
		case <-done:
		case <-time.After(killTimeout):
			// Process won't die — abandon it.
		}
		p.mu.Lock()
		p.current = nil
		p.mu.Unlock()
		return fmt.Errorf("audio: playback timed out after %v", maxPlaybackDuration)
	}
}

// Stop kills any currently playing audio process.
func (p *Player) Stop() {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.stopLocked()
}

// stopLocked kills the current process. Must be called with mu held.
func (p *Player) stopLocked() {
	if p.current != nil && p.current.Process != nil {
		_ = p.current.Process.Kill()
		// Wait briefly for the process to die — don't block forever.
		done := make(chan struct{})
		go func() {
			_ = p.current.Wait()
			close(done)
		}()
		select {
		case <-done:
		case <-time.After(killTimeout):
		}
	}
	p.current = nil
}