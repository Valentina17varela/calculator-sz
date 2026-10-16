package calc

import "math/big"

// Add returns args[0] + args[1].
func Add(args []*big.Rat) (*big.Rat, error) {
	return new(big.Rat).Add(args[0], args[1]), nil
}

// Subtract returns args[0] - args[1].
func Subtract(args []*big.Rat) (*big.Rat, error) {
	return new(big.Rat).Sub(args[0], args[1]), nil
}

// Multiply returns args[0] * args[1].
func Multiply(args []*big.Rat) (*big.Rat, error) {
	return new(big.Rat).Mul(args[0], args[1]), nil
}

// Divide returns args[0] / args[1] exactly; rounding happens only on format.
func Divide(args []*big.Rat) (*big.Rat, error) {
	if args[1].Sign() == 0 {
		return nil, newError(CodeDivisionByZero, "cannot divide by zero")
	}
	return new(big.Rat).Quo(args[0], args[1]), nil
}

const maxExponent = 100

// Power returns args[0] ^ args[1]. The exponent must be an integer with
// absolute value at most 100; a negative exponent gives the reciprocal.
func Power(args []*big.Rat) (*big.Rat, error) {
	base, exp := args[0], args[1]
	if !exp.IsInt() {
		return nil, newError(CodeNonIntegerExponent, "exponent must be an integer")
	}
	if exp.Num().CmpAbs(big.NewInt(maxExponent)) > 0 {
		return nil, newError(CodeOutOfRange, "exponent must be between -100 and 100")
	}
	n := exp.Num().Int64()
	if n == 0 {
		return big.NewRat(1, 1), nil
	}
	if n < 0 {
		if base.Sign() == 0 {
			return nil, newError(CodeDivisionByZero, "cannot raise zero to a negative power")
		}
		n = -n
		return new(big.Rat).SetFrac(pow(base.Denom(), n), pow(base.Num(), n)), nil
	}
	return new(big.Rat).SetFrac(pow(base.Num(), n), pow(base.Denom(), n)), nil
}

func pow(x *big.Int, n int64) *big.Int {
	return new(big.Int).Exp(x, big.NewInt(n), nil)
}

var (
	sqrtScale        = pow(big.NewInt(10), 14)
	sqrtScaleSquared = pow(big.NewInt(10), 28)
)

// Sqrt returns the square root of args[0] truncated to 14 decimal digits;
// FormatDecimal later rounds it to 12.
func Sqrt(args []*big.Rat) (*big.Rat, error) {
	x := args[0]
	if x.Sign() < 0 {
		return nil, newError(CodeNegativeSquareRoot, "cannot take the square root of a negative number")
	}
	scaled := new(big.Int).Mul(x.Num(), sqrtScaleSquared)
	scaled.Quo(scaled, x.Denom())
	root := scaled.Sqrt(scaled)
	return new(big.Rat).SetFrac(root, sqrtScale), nil
}

// Percent takes [p, base] and returns p percent of base: base * p / 100.
func Percent(args []*big.Rat) (*big.Rat, error) {
	r := new(big.Rat).Mul(args[1], args[0])
	return r.Quo(r, big.NewRat(100, 1)), nil
}
