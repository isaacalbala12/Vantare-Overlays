package main

import (
	"context"
	"fmt"
	"time"

	"github.com/vantare/overlays/v2/internal/telemetry/lmu"
	"github.com/vantare/overlays/v2/internal/telemetry/service"
)

func main() {
	r, err := lmu.Open()
	if err != nil {
		fmt.Println("OPEN ERROR:", err)
		return
	}
	defer r.Close()

	svc := service.New(service.Config{ReadHz: 60, EmitHz: 30, Source: service.FuncSource{
		ReadFunc: r.Bytes,
		InfoData: service.SourceInfo{Kind: service.SimulatorLMU, Name: "Le Mans Ultimate", Live: true, Available: true},
	}})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	ch, unsub := svc.Subscribe()
	defer unsub()

	go svc.Run(ctx)

	count := 0
	for upd := range ch {
		count++
		if upd.Snapshot != nil && upd.Snapshot.Player != nil {
			fmt.Printf("seq=%d rpm=%.0f speed=%.1f gear=%d connected=%v\n",
				upd.Seq, upd.Snapshot.Player.EngineRPM, upd.Snapshot.Player.Speed, upd.Snapshot.Player.Gear, upd.Snapshot.Connected)
		} else {
			fmt.Printf("seq=%d nil player\n", upd.Seq)
		}
		if count >= 10 {
			break
		}
	}
	fmt.Println("total events", count)
}
