package service

import (
	"sync"
)

// NotificationStore manages the in-memory history of engineer notifications.
type NotificationStore struct {
	mu            sync.RWMutex
	notifications []EngineerNotification
	maxSize       int
}

// NewNotificationStore creates a new NotificationStore with a maximum size limit.
func NewNotificationStore(maxSize int) *NotificationStore {
	if maxSize <= 0 {
		maxSize = 50
	}
	return &NotificationStore{
		notifications: make([]EngineerNotification, 0),
		maxSize:       maxSize,
	}
}

// Add appends a notification to the store, enforcing the maximum size limit.
func (s *NotificationStore) Add(n EngineerNotification) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.notifications = append(s.notifications, n)
	if len(s.notifications) > s.maxSize {
		// Discard oldest and keep the last maxSize elements (chronological order)
		s.notifications = s.notifications[len(s.notifications)-s.maxSize:]
	}
}

// GetAll returns a deep copy of all notifications in the store.
func (s *NotificationStore) GetAll() []EngineerNotification {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Return a deep copy to ensure thread safety and immutability outside the store
	result := make([]EngineerNotification, len(s.notifications))
	copy(result, s.notifications)
	return result
}

// Clear empties all stored notifications.
func (s *NotificationStore) Clear() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.notifications = make([]EngineerNotification, 0)
}
