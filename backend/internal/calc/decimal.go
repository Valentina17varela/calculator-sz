package calc

import (
	"math/big"
	"regexp"
	"strings"
)

const (
	maxOperandLen   = 32
	maxResultBits   = 4096
	formatPrecision = 12
)

var decimalPattern = regexp.MustCompile(`^-?\d+(\.\d+)?$`)

// ParseDecimal strictly parses a decimal string into an exact rational.
func ParseDecimal(s string) (*big.Rat, error) {
	if len(s) > maxOperandLen || !decimalPattern.MatchString(s) {
		return nil, newError(CodeInvalidOperand, "operand is not a valid decimal number")
	}
	r, ok := new(big.Rat).SetString(s)
	if !ok {
		return nil, newError(CodeInvalidOperand, "operand is not a valid decimal number")
	}
	return r, nil
}

// FormatDecimal renders r with up to 12 decimal places, trailing zeros trimmed.
func FormatDecimal(r *big.Rat) (string, error) {
	if r.Num().BitLen() > maxResultBits || r.Denom().BitLen() > maxResultBits {
		return "", newError(CodeOutOfRange, "result is out of range")
	}
	s := r.FloatString(formatPrecision)
	s = strings.TrimRight(s, "0")
	s = strings.TrimRight(s, ".")
	if s == "-0" {
		return "0", nil
	}
	return s, nil
}
