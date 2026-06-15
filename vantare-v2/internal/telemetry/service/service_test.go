package service_test

import (
	"context"
	"testing"
	"time"

	"github.com/vantare/overlays/v2/internal/telemetry/lmu"
	"github.com/vantare/overlays/v2/internal/telemetry/service"
	"github.com/vantare/overlays/v2/pkg/models"
)

func TestServiceEmitsOnSubscribe(t *testing.T) {
	buf := lmu.BuildSyntheticBuffer()
	src := service.FuncSource{ReadFunc: func() []byte { return buf }}

	svc := service.New(service.Config{
		ReadHz: 60,
		EmitHz: 30,
		Source: src,
	})

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go func() { _ = svc.Run(ctx) }()

	sub, unsub := svc.Subscribe()
	defer unsub()
	upd := readUpdate(t, sub, 500*time.Millisecond)
	if upd.Snapshot == nil || !upd.Snapshot.Connected {
		t.Fatal("expected connected snapshot")
	}
	if upd.Seq != 1 {
		t.Fatalf("seq: got %d want 1", upd.Seq)
	}
	if upd.Diff == nil || upd.Diff.D["connected"] != true {
		t.Fatal("expected diff on first emit")
	}
}

func TestServiceSubscribeReplay(t *testing.T) {
	buf := lmu.BuildSyntheticBuffer()
	src := service.FuncSource{ReadFunc: func() []byte { return buf }}

	svc := service.New(service.Config{
		ReadHz: 60,
		EmitHz: 30,
		Source: src,
	})

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go func() { _ = svc.Run(ctx) }()

	first, unsub1 := svc.Subscribe()
	readUpdate(t, first, 500*time.Millisecond)
	unsub1()

	second, unsub2 := svc.Subscribe()
	defer unsub2()
	select {
	case replay := <-second:
		if replay.Snapshot == nil || !replay.Snapshot.Connected {
			t.Fatal("expected replay snapshot")
		}
	case <-time.After(100 * time.Millisecond):
		t.Fatal("expected immediate replay on subscribe")
	}
}

func TestServiceHeartbeatEmitWhenStable(t *testing.T) {
	buf := lmu.BuildSyntheticBuffer()
	src := service.FuncSource{ReadFunc: func() []byte { return buf }}

	svc := service.New(service.Config{
		ReadHz: 60,
		EmitHz: 30,
		Source: src,
	})

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go func() { _ = svc.Run(ctx) }()

	sub, unsub := svc.Subscribe()
	defer unsub()
	first := readUpdate(t, sub, 500*time.Millisecond)
	if first.Seq != 1 {
		t.Fatalf("seq: got %d want 1", first.Seq)
	}

	// With the heartbeat emit, stable telemetry still re-emits at EmitHz.
	second := readUpdate(t, sub, 200*time.Millisecond)
	if second.Seq != first.Seq+1 {
		t.Fatalf("expected heartbeat emit seq=%d, got %d", first.Seq+1, second.Seq)
	}
}

func TestServiceEmitRateCapped(t *testing.T) {
	var tick int
	src := service.FuncSource{ReadFunc: func() []byte {
		buf := lmu.BuildSyntheticBuffer()
		lmu.SetPlayerSpeedMPS(buf, 15+float64(tick)*0.2)
		tick++
		return buf
	}}

	svc := service.New(service.Config{
		ReadHz: 60,
		EmitHz: 10,
		Source: src,
	})

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go func() { _ = svc.Run(ctx) }()

	sub, unsub := svc.Subscribe()
	defer unsub()
	readUpdate(t, sub, 500*time.Millisecond)

	count := 0
	deadline := time.After(550 * time.Millisecond)
loop:
	for {
		select {
		case <-sub:
			count++
		case <-deadline:
			break loop
		}
	}
	if count < 2 || count > 8 {
		t.Fatalf("emit count %d outside expected ~5 for 10Hz/550ms with changing data", count)
	}
}

func TestServiceClosesSubscribersOnShutdown(t *testing.T) {
	buf := lmu.BuildSyntheticBuffer()
	src := service.FuncSource{ReadFunc: func() []byte { return buf }}

	svc := service.New(service.Config{
		ReadHz: 60,
		EmitHz: 30,
		Source: src,
	})

	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() {
		_ = svc.Run(ctx)
		close(done)
	}()

	sub, unsub := svc.Subscribe()
	readUpdate(t, sub, 500*time.Millisecond)
	unsub()

	cancel()
	select {
	case <-done:
	case <-time.After(500 * time.Millisecond):
		t.Fatal("Run did not exit after cancel")
	}
}

func TestServiceUnsubscribeStopsDelivery(t *testing.T) {
	var tick int
	src := service.FuncSource{ReadFunc: func() []byte {
		buf := lmu.BuildSyntheticBuffer()
		lmu.SetPlayerSpeedMPS(buf, 15+float64(tick)*0.5)
		tick++
		return buf
	}}

	svc := service.New(service.Config{
		ReadHz: 60,
		EmitHz: 30,
		Source: src,
	})

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go func() { _ = svc.Run(ctx) }()

	sub, unsub := svc.Subscribe()
	readUpdate(t, sub, 500*time.Millisecond)
	unsub()

	deadline := time.After(400 * time.Millisecond)
	for {
		select {
		case upd, ok := <-sub:
			if ok {
				t.Fatalf("unexpected update after unsubscribe: seq=%d", upd.Seq)
			}
			return
		case <-deadline:
			t.Fatal("channel should close after unsubscribe")
		}
	}
}

func TestServiceUsesDirectTelemetrySource(t *testing.T) {
	src := directTelemetrySource{t: &models.Telemetry{
		Connected: true,
		Player: &models.PlayerTelemetry{Speed: 12, Gear: 3, EngineRPM: 4000},
		Vehicles: []models.VehicleScoring{{ID: 1, DriverName: "Isaac", IsPlayer: true}},
		PlayerHasVehicle: true,
	}}
	svc := service.New(service.Config{ReadHz: 60, EmitHz: 30, Source: src})
	svc.ProcessReadForTest()
	ch, unsub := svc.Subscribe()
	defer unsub()
	select {
	case upd := <-ch:
		if upd.Snapshot == nil || len(upd.Snapshot.Vehicles) != 1 {
			t.Fatalf("unexpected update: %#v", upd)
		}
	default:
		t.Fatal("expected replay")
	}
}

type directTelemetrySource struct {
	t *models.Telemetry
}

func (d directTelemetrySource) Read() []byte { return nil }
func (d directTelemetrySource) ReadTelemetry() *models.Telemetry { return d.t }

func readUpdate(t *testing.T, sub <-chan service.Update, timeout time.Duration) service.Update {
	t.Helper()
	select {
	case upd := <-sub:
		return upd
	case <-time.After(timeout):
		t.Fatal("timeout waiting for update")
		return service.Update{}
	}
}
