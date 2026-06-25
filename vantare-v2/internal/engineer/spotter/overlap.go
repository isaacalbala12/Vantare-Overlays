package spotter

import "math"

type OverlapConfig struct {
	TrackZoneToConsiderM  float64
	CarLengthM           float64
	CarWidthM            float64
	CarBehindExtraM      float64
	GapNeededForClearM   float64
}

type OverlapResult struct {
	InOverlap    bool
	Side         Side
	LateralM     float64
	ForwardM     float64
	RejectReason string
}

func DefaultOverlapConfig() OverlapConfig {
	return OverlapConfig{
		TrackZoneToConsiderM: 20.0,
		CarLengthM:          4.5,
		CarWidthM:           1.8,
		CarBehindExtraM:     0.4,
		GapNeededForClearM:  0.5,
	}
}

func ClassifyAlignedOverlap(aligned AlignedOpponent, existingOverlap bool, cfg OverlapConfig) OverlapResult {
	side := sideFromAlignedX(aligned.X)
	lat := math.Abs(aligned.X)
	long := math.Abs(aligned.Z)
	result := OverlapResult{
		Side:     side,
		LateralM: lat,
		ForwardM: long,
	}
	if side == "" {
		result.RejectReason = "centerline"
		return result
	}
	if lat > cfg.TrackZoneToConsiderM {
		result.RejectReason = "outside_track_zone"
		return result
	}
	if lat <= cfg.CarWidthM {
		result.RejectReason = "inside_min_lateral_gap"
		return result
	}
	if existingOverlap {
		if long < cfg.CarLengthM+cfg.GapNeededForClearM {
			result.InOverlap = true
			return result
		}
		result.RejectReason = "existing_overlap_clear_gap"
		return result
	}
	if aligned.Z <= 0 && -aligned.Z < cfg.CarLengthM {
		result.InOverlap = true
		return result
	}
	if aligned.Z > 0 && aligned.Z < cfg.CarLengthM+cfg.CarBehindExtraM {
		result.InOverlap = true
		return result
	}
	result.RejectReason = "outside_longitudinal_overlap"
	return result
}
