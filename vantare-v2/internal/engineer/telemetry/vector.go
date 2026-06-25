package telemetry

import "math"

type Vec3 struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
	Z float64 `json:"z"`
}

func (v Vec3) Sub(other Vec3) Vec3 {
	return Vec3{X: v.X - other.X, Y: v.Y - other.Y, Z: v.Z - other.Z}
}

func (v Vec3) Dot(other Vec3) float64 {
	return v.X*other.X + v.Y*other.Y + v.Z*other.Z
}

func (v Vec3) Len() float64 {
	return math.Sqrt(v.Dot(v))
}

type Orientation struct {
	Row0 Vec3 `json:"row0"`
	Row1 Vec3 `json:"row1"`
	Row2 Vec3 `json:"row2"`
}

// LocalX returns the vehicle local +X axis expressed in world coordinates.
// LMU/rFactor local +X points to the driver's left.
func (o Orientation) LocalX() Vec3 {
	return Vec3{X: o.Row0.X, Y: o.Row1.X, Z: o.Row2.X}
}

// LocalZ returns the vehicle local +Z axis expressed in world coordinates.
// LMU/rFactor local +Z points backwards.
func (o Orientation) LocalZ() Vec3 {
	return Vec3{X: o.Row0.Z, Y: o.Row1.Z, Z: o.Row2.Z}
}

func (o Orientation) Forward() Vec3 {
	z := o.LocalZ()
	return Vec3{X: -z.X, Y: -z.Y, Z: -z.Z}
}

func (o Orientation) Left() Vec3 {
	return o.LocalX()
}
