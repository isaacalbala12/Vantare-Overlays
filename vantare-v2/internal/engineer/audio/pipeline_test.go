//go:build windows

package audio

import (
	"os"
	"testing"
	"time"
)

func TestQueuePlayerPipeline(t *testing.T) {
	mp3Path := findCachedMP3(t)
	if mp3Path == "" {
		t.Skip("no cached MP3 files found")
	}

	q := NewQueue()
	p := NewPlayer()

	// Enqueue 2 messages with the same audio path.
	now := time.Now().UnixMilli()
	msg1 := Message{
		ID:        "msg1",
		TextKey:   "spotter.car_left",
		Priority:  PrioritySpotter,
		CreatedAt: now,
		ExpiresAt: now + 30000, // 30s expiry
	}
	msg2 := Message{
		ID:        "msg2",
		TextKey:   "spotter.clear_left",
		Priority:  PrioritySpotter,
		CreatedAt: now,
		ExpiresAt: now + 30000,
	}
	q.Enqueue(msg1)
	q.Enqueue(msg2)

	if q.Len() != 2 {
		t.Fatalf("expected queue len 2, got %d", q.Len())
	}

	// Process the queue like the queueLoop does.
	processed := 0
	for q.Len() > 0 {
		msg, ok := q.Next(time.Now().UnixMilli())
		if !ok {
			break
		}
		processed++
		err := p.Play(mp3Path)
		if err != nil {
			t.Errorf("Play failed for %s: %v", msg.TextKey, err)
		}
	}

	if processed != 2 {
		t.Errorf("expected 2 messages processed, got %d", processed)
	}

	// Verify queue is empty.
	if q.Len() != 0 {
		t.Errorf("expected empty queue, got %d", q.Len())
	}
}

func TestQueueExpiryBeforePlay(t *testing.T) {
	q := NewQueue()
	p := NewPlayer()

	// Enqueue a message that expires immediately.
	now := time.Now().UnixMilli()
	msg := Message{
		ID:        "expired",
		TextKey:   "spotter.car_left",
		Priority:  PrioritySpotter,
		CreatedAt: now - 5000,
		ExpiresAt: now - 1000, // already expired
	}
	q.Enqueue(msg)

	// Next should skip the expired message.
	_, ok := q.Next(now)
	if ok {
		t.Error("expected expired message to be skipped, but it was returned")
	}

	// Queue should be empty.
	if q.Len() != 0 {
		t.Errorf("expected empty queue after expiry, got %d", q.Len())
	}

	_ = p
	_ = os.Stdout
}