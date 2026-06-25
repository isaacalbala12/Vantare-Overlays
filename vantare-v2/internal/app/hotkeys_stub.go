//go:build !windows

package app

import (
	"log"
)

// HotkeyManager stub for non-Windows platforms.
// It implements the same public API as the Windows HotkeyManager but as no-op methods.
type HotkeyManager struct{}

// NewHotkeyManager creates a non-functional hotkey manager.
func NewHotkeyManager() *HotkeyManager {
	return &HotkeyManager{}
}

// Register is a no-op on non-Windows platforms.
func (m *HotkeyManager) Register(name, combo string, action func()) error {
	log.Printf("hotkey: global hotkeys are not supported on this platform (skipped registering %q)", name)
	return nil
}

// UnregisterAll is a no-op on non-Windows platforms.
func (m *HotkeyManager) UnregisterAll() {}

// Start is a no-op on non-Windows platforms.
func (m *HotkeyManager) Start() error {
	log.Printf("hotkey: global hotkey manager stub started (non-Windows platform)")
	return nil
}

// Stop is a no-op on non-Windows platforms.
func (m *HotkeyManager) Stop() {}

// ReRegisterAll is a no-op on non-Windows platforms.
func (m *HotkeyManager) ReRegisterAll() {}

// UpdateFromSettings is a no-op on non-Windows platforms.
func (m *HotkeyManager) UpdateFromSettings(settings *AppSettings, actionMap map[string]func()) {
	log.Printf("hotkey: settings updated, hotkeys are not supported on this platform")
}

// ParseHotkeyCombo is a stub that returns dummy values on non-Windows platforms.
func ParseHotkeyCombo(combo string) (mods uint32, vk uint32, err error) {
	return 0, 0, nil
}
