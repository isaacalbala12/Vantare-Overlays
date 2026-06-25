package spotter

import "testing"

func TestOverlap_NewAheadWithinCarLength(t *testing.T) {
	cfg := DefaultOverlapConfig()
	got := ClassifyAlignedOverlap(AlignedOpponent{X: 2.0, Z: -4.0}, false, cfg)
	if !got.InOverlap || got.Side != SideLeft {
		t.Fatalf("got %+v", got)
	}
}

func TestOverlap_NewBehindUsesExtraLength(t *testing.T) {
	cfg := DefaultOverlapConfig()
	got := ClassifyAlignedOverlap(AlignedOpponent{X: -2.0, Z: 4.8}, false, cfg)
	if !got.InOverlap || got.Side != SideRight {
		t.Fatalf("got %+v", got)
	}
}

func TestOverlap_RejectsTooCloseLaterally(t *testing.T) {
	cfg := DefaultOverlapConfig()
	got := ClassifyAlignedOverlap(AlignedOpponent{X: 0.5, Z: -2.0}, false, cfg)
	if got.InOverlap {
		t.Fatalf("expected no overlap, got %+v", got)
	}
}

func TestOverlap_ExistingOverlapUsesClearGap(t *testing.T) {
	cfg := DefaultOverlapConfig()
	got := ClassifyAlignedOverlap(AlignedOpponent{X: 2.0, Z: 4.8}, true, cfg)
	if !got.InOverlap {
		t.Fatalf("expected existing overlap to hold through clear gap")
	}
}

func TestOverlap_RejectsOutsideTrackZone(t *testing.T) {
	cfg := DefaultOverlapConfig()
	got := ClassifyAlignedOverlap(AlignedOpponent{X: 21.0, Z: 0}, false, cfg)
	if got.InOverlap || got.RejectReason != "outside_track_zone" {
		t.Fatalf("got %+v", got)
	}
}
