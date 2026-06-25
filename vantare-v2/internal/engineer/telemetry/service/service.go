package service

import (
	"context"
	"sync"
	"time"

	"github.com/vantare/overlays/v2/internal/engineer/telemetry"
)

type Config struct {
	ReadHz float64
	Source telemetry.Source
}

type Update struct {
	Seq   uint64
	Frame *telemetry.Frame
}

type Service struct {
	cfg    Config
	mu     sync.Mutex
	subs   []chan Update
	latest *telemetry.Frame
	seq    uint64
}

func New(cfg Config) *Service {
	if cfg.ReadHz <= 0 {
		cfg.ReadHz = 60
	}
	return &Service{cfg: cfg}
}

func (s *Service) Subscribe() (<-chan Update, func()) {
	ch := make(chan Update, 8)
	s.mu.Lock()
	s.subs = append(s.subs, ch)
	if s.latest != nil {
		ch <- Update{Seq: s.seq, Frame: s.latest}
	}
	s.mu.Unlock()
	return ch, func() {
		s.mu.Lock()
		defer s.mu.Unlock()
		for i, existing := range s.subs {
			if existing == ch {
				copy(s.subs[i:], s.subs[i+1:])
				s.subs[len(s.subs)-1] = nil
				s.subs = s.subs[:len(s.subs)-1]
				close(ch)
				return
			}
		}
	}
}

func (s *Service) Run(ctx context.Context) error {
	ticker := time.NewTicker(time.Duration(float64(time.Second) / s.cfg.ReadHz))
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			s.close()
			return ctx.Err()
		case <-ticker.C:
			s.readOnce()
		}
	}
}

func (s *Service) readOnce() {
	if s.cfg.Source == nil {
		return
	}
	frame := s.cfg.Source.ReadFrame()
	if frame == nil {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.seq++
	s.latest = frame
	upd := Update{Seq: s.seq, Frame: frame}
	for _, sub := range s.subs {
		select {
		case sub <- upd:
		default:
		}
	}
}

func (s *Service) close() {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, ch := range s.subs {
		close(ch)
	}
	s.subs = nil
}
