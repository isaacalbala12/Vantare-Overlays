package audio

import "errors"

// ErrPlaybackUnsupported is returned on platforms without audio playback.
var ErrPlaybackUnsupported = errors.New("audio: playback not supported on this platform")