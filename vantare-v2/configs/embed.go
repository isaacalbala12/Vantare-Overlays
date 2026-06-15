package configs

import (
	"embed"
)

//go:embed custom-hfg.json example-edit.json example-racing.json example-streaming.json
var ConfigsFS embed.FS
