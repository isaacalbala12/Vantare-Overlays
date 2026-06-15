package app

import (
	"sync"
	"time"

	"github.com/vantare/overlays/v2/internal/ops"
)

type OpsBridge struct {
	sampler  ops.Sampler
	emitter  EventEmitter
	interval time.Duration
	stop     chan struct{}
	done     chan struct{}
	mu       sync.Mutex
	started  bool
	stopped  bool
}

func NewOpsBridge(sampler ops.Sampler, emitter EventEmitter, interval time.Duration) *OpsBridge {
	if interval <= 0 {
		interval = ops.DefaultInterval
	}
	return &OpsBridge{
		sampler:  sampler,
		emitter:  emitter,
		interval: interval,
		stop:     make(chan struct{}),
		done:     make(chan struct{}),
	}
}

func (b *OpsBridge) Start() {
	b.mu.Lock()
	if b.started || b.stopped {
		b.mu.Unlock()
		return
	}
	b.started = true
	b.mu.Unlock()

	go func() {
		defer close(b.done)
		ticker := time.NewTicker(b.interval)
		defer ticker.Stop()

		b.emit()
		for {
			select {
			case <-ticker.C:
				b.emit()
			case <-b.stop:
				return
			}
		}
	}()
}

func (b *OpsBridge) Stop() {
	b.mu.Lock()
	if b.stopped {
		b.mu.Unlock()
		return
	}
	b.stopped = true
	started := b.started
	close(b.stop)
	if !started {
		close(b.done)
	}
	b.mu.Unlock()

	<-b.done
}

func (b *OpsBridge) emit() {
	if b == nil || b.sampler == nil || b.emitter == nil {
		return
	}
	b.emitter.Emit("ops:metrics", b.sampler.Sample())
}
