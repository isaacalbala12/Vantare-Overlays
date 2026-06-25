package service

type EngineerNotification struct {
	ID        string `json:"id"`
	Category  string `json:"category"`
	Severity  string `json:"severity"`
	TextKey   string `json:"textKey"`
	Text      string `json:"text"`
	Priority  int    `json:"priority"`
	CreatedAt int64  `json:"createdAt"`
	ExpiresAt int64  `json:"expiresAt,omitempty"`
	Source    string `json:"source"`
}

type EngineerStatus struct {
	Enabled        bool                   `json:"enabled"`
	Connected      bool                   `json:"connected"`
	Source         string                 `json:"source"`
	SpotterEnabled bool                   `json:"spotterEnabled"`
	Sensitivity    string                 `json:"sensitivity"`
	TTSCacheCount  int                    `json:"ttsCacheCount"`
	RecentMessages []EngineerNotification `json:"recentMessages"`
	LastError      string                 `json:"lastError,omitempty"`
}

// Translations holds localized spotter phrases in Spanish.
var Translations = map[string]string{
	"spotter.car_left":    "Coche a la izquierda",
	"spotter.car_right":   "Coche a la derecha",
	"spotter.still_there": "Sigue ahí",
	"spotter.clear_left":  "Libre izquierda",
	"spotter.clear_right": "Libre derecha",
	"spotter.all_clear":   "Libre",
	"spotter.three_wide":  "Tres en paralelo",
}

// Translate translates a text key to Spanish. If the key is not found, it returns the key itself.
func Translate(key string) string {
	if val, ok := Translations[key]; ok {
		return val
	}
	return key
}
