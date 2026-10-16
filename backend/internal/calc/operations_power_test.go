package calc

import (
	"math/big"
	"strings"
	"testing"
)

func TestPower(t *testing.T) {
	tests := []struct {
		name string
		a, b string
		want string
	}{
		{"positive exponent", "2", "10", "1024"},
		{"negative exponent is reciprocal", "2", "-2", "0.25"},
		{"zero to zero is one", "0", "0", "1"},
		{"zero exponent", "5", "0", "1"},
		{"zero base positive exponent", "0", "5", "0"},
		{"negative base odd exponent", "-2", "3", "-8"},
		{"negative base even exponent", "-2", "2", "4"},
		{"negative base negative odd exponent", "-2", "-3", "-0.125"},
		{"decimal base", "0.5", "2", "0.25"},
		{"decimal base negative exponent", "1.5", "-2", "0.444444444444"},
		{"integer exponent written with decimals", "2", "2.0", "4"},
		{"exponent one", "7.25", "1", "7.25"},
		{"max exponent", "2", "100", "1267650600228229401496703205376"},
		{"max negative exponent rounds to zero", "2", "-100", "0"},
		{"max exponent boundary one", "1", "100", "1"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Power([]*big.Rat{mustParse(t, tt.a), mustParse(t, tt.b)})
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			s, err := FormatDecimal(got)
			if err != nil {
				t.Fatalf("FormatDecimal: %v", err)
			}
			if s != tt.want {
				t.Errorf("got %q, want %q", s, tt.want)
			}
		})
	}
}

func TestPowerErrors(t *testing.T) {
	tests := []struct {
		name string
		a, b string
		code Code
	}{
		{"zero to negative", "0", "-1", CodeDivisionByZero},
		{"zero to negative decimal-zero base", "0.000", "-2", CodeDivisionByZero},
		{"non integer exponent", "2", "0.5", CodeNonIntegerExponent},
		{"non integer negative exponent", "2", "-1.5", CodeNonIntegerExponent},
		{"non integer exponent with zero base", "0", "0.5", CodeNonIntegerExponent},
		{"exponent above limit", "2", "101", CodeOutOfRange},
		{"exponent below limit", "2", "-101", CodeOutOfRange},
		{"zero base with exponent below limit", "0", "-101", CodeOutOfRange}, // exponent range is validated before the zero base
		{"huge exponent", "2", strings.Repeat("9", 32), CodeOutOfRange},
		{"huge negative exponent", "2", "-" + strings.Repeat("9", 31), CodeOutOfRange},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Power([]*big.Rat{mustParse(t, tt.a), mustParse(t, tt.b)})
			if err == nil {
				t.Fatalf("expected error, got %v", got)
			}
			if got != nil {
				t.Errorf("got %v, want nil on error", got)
			}
			assertCode(t, err, tt.code)
		})
	}
}

func TestPowerResultTooLargeIsCaughtByFormat(t *testing.T) {
	base := mustParse(t, strings.Repeat("9", 32))

	got, err := Power([]*big.Rat{base, big.NewRat(100, 1)})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	_, err = FormatDecimal(got)
	assertCode(t, err, CodeOutOfRange)
}

func TestPowerDoesNotMutateOperands(t *testing.T) {
	a, b := big.NewRat(-3, 4), big.NewRat(-3, 1)

	if _, err := Power([]*big.Rat{a, b}); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if a.Cmp(big.NewRat(-3, 4)) != 0 || b.Cmp(big.NewRat(-3, 1)) != 0 {
		t.Errorf("operands mutated: a=%s b=%s", a.RatString(), b.RatString())
	}
}
