package service

import (
	"context"
	"testing"
	"time"

	"github.com/vantare/overlays/v2/internal/engineer/telemetry"
)

type fakeSource struct {
	frame *telemetry.Frame
}

func (f *fakeSource) ReadFrame() *telemetry.Frame {
	return f.frame
}

func (f *fakeSource) Info() telemetry.SourceInfo {
	return telemetry.SourceInfo{
		Kind:      telemetry.KindSimulator,
		Name:      "Fake Simulator",
		Live:      true,
		Available: true,
	}
}

func (f *fakeSource) Close() error {
	return nil
}

func TestServiceSubscribe(t *testing.T) {
	frame := &telemetry.Frame{
		Connected:       true,
		TimestampUnixMS: time.Now().UnixMilli(),
	}
	src := &fakeSource{frame: frame}

	svc := New(Config{
		ReadHz: 100,
		Source: src,
	})

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	errChan := make(chan error, 1)
	go func() {
		errChan <- svc.Run(ctx)
	}()

	ch, unsubscribe := svc.Subscribe()

	// Wait for update
	select {
	case upd, ok := <-ch:
		if !ok {
			t.Fatalf("expected update, channel closed")
		}
		if upd.Frame == nil || !upd.Frame.Connected {
			t.Fatalf("expected connected frame in update")
		}
	case <-time.After(1 * time.Second):
		t.Fatalf("timed out waiting for update")
	}

	unsubscribe()

	cancel()
	select {
	case err := <-errChan:
		if err != nil && err != context.Canceled {
			t.Fatalf("unexpected service error: %v", err)
		}
	case <-time.After(1 * time.Second):
		t.Fatalf("timed out waiting for service shutdown")
	}
}
