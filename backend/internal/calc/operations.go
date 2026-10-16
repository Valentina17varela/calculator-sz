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
