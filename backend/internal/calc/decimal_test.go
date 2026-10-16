package calc

import (
	"errors"
	"math/big"
	"strings"
	"testing"
)

func assertCode(t *testing.T, err error, want Code) {
	t.Helper()
	var calcErr *Error
	if !errors.As(err, &calcErr) {
		t.Fatalf("error = %v, want *Error with code %q", err, want)
	}
	if calcErr.Code != want {
		t.Errorf("Code = %q, want %q", calcErr.Code, want)
	}
}

func TestParseDecimalValid(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  *big.Rat
	}{
		{"fraction", "0.1", big.NewRat(1, 10)},
		{"negative integer", "-5", big.NewRat(-5, 1)},
		{"leading zeros", "007", big.NewRat(7, 1)},
		{"zero", "0", big.NewRat(0, 1)},
		{"negative zero", "-0", big.NewRat(0, 1)},
		{"negative decimal", "-12.345", big.NewRat(-12345, 1000)},
		{"trailing zeros kept in value", "1.500", big.NewRat(3, 2)},
		{"exactly 32 chars", strings.Repeat("9", 32), func() *big.Rat {
			r, _ := new(big.Rat).SetString(strings.Repeat("9", 32))
			return r
		}()},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ParseDecimal(tt.input)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got.Cmp(tt.want) != 0 {
				t.Errorf("got %s, want %s", got.RatString(), tt.want.RatString())
			}
		})
	}
}

func TestParseDecimalInvalid(t *testing.T) {
	tests := []struct {
		name  string
		input string
	}{
		{"letters", "abc"},
		{"exponent", "1e3"},
		{"empty", ""},
		{"trailing dot", "1."},
		{"leading dot", ".5"},
		{"plus sign", "+1"},
		{"spaces", " 1"},
		{"trailing space", "1 "},
		{"trailing newline", "1\n"},
		{"fraction syntax", "1/3"},
		{"double minus", "--1"},
		{"two dots", "1.2.3"},
		{"lone minus", "-"},
		{"33 chars", strings.Repeat("9", 33)},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ParseDecimal(tt.input)
			if err == nil {
				t.Fatalf("expected error, got %v", got)
			}
			if got != nil {
				t.Errorf("got %v, want nil on error", got)
			}
			assertCode(t, err, CodeInvalidOperand)
		})
	}
}

func TestFormatDecimalValid(t *testing.T) {
	tests := []struct {
		name  string
		input *big.Rat
		want  string
	}{
		{"integer", big.NewRat(3, 1), "3"},
		{"integer with zeros kept", big.NewRat(1000, 1), "1000"},
		{"zero", big.NewRat(0, 1), "0"},
		{"half", big.NewRat(5, 2), "2.5"},
		{"third rounds down", big.NewRat(1, 3), "0.333333333333"},
		{"two thirds rounds up", big.NewRat(2, 3), "0.666666666667"},
		{"negative", big.NewRat(-1, 10), "-0.1"},
		{"exact 12 dp", big.NewRat(1, 1000000000000), "0.000000000001"},
		{"half rounds away from zero", big.NewRat(5, 10000000000000), "0.000000000001"},
		{"negative half rounds away from zero", big.NewRat(-5, 10000000000000), "-0.000000000001"},
		{"below half rounds to zero", big.NewRat(4, 10000000000000), "0"},
		{"negative zero normalized", big.NewRat(-1, 10000000000000), "0"},
		{"negative tiny normalized", big.NewRat(-4, 10000000000000), "0"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := FormatDecimal(tt.input)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tt.want {
				t.Errorf("got %q, want %q", got, tt.want)
			}
		})
	}
}

func TestFormatDecimalDoesNotMutateInput(t *testing.T) {
	in := big.NewRat(2, 3)
	if _, err := FormatDecimal(in); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if in.Cmp(big.NewRat(2, 3)) != 0 {
		t.Errorf("input mutated to %s", in.RatString())
	}
}

func TestFormatDecimalOutOfRange(t *testing.T) {
	tooBig := new(big.Int).Lsh(big.NewInt(1), 4096) // 4097 bits
	tests := []struct {
		name  string
		input *big.Rat
	}{
		{"numerator too large", new(big.Rat).SetInt(tooBig)},
		{"negative numerator too large", new(big.Rat).SetInt(new(big.Int).Neg(tooBig))},
		{"denominator too large", new(big.Rat).SetFrac(big.NewInt(1), tooBig)},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := FormatDecimal(tt.input)
			if err == nil {
				t.Fatalf("expected error, got %q", got)
			}
			assertCode(t, err, CodeOutOfRange)
		})
	}
}

func TestFormatDecimalAtLimit(t *testing.T) {
	atLimit := new(big.Int).Sub(new(big.Int).Lsh(big.NewInt(1), 4096), big.NewInt(1)) // 4096 bits
	got, err := FormatDecimal(new(big.Rat).SetInt(atLimit))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != atLimit.String() {
		t.Errorf("got %d chars, want %d chars", len(got), len(atLimit.String()))
	}
}
