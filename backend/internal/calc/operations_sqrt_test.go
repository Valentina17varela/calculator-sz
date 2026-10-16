package calc

import (
	"math/big"
	"testing"
)

func TestSqrt(t *testing.T) {
	tests := []struct {
		name string
		a    string
		want string
	}{
		{"perfect square", "16", "4"},
		{"irrational", "2", "1.414213562373"},
		{"zero", "0", "0"},
		{"negative zero", "-0", "0"},
		{"perfect square with decimals", "2.25", "1.5"},
		{"fraction below one", "0.25", "0.5"},
		{"small perfect square", "0.0001", "0.01"},
		{"one trillionth", "0.000000000001", "0.000001"},
		{"rounds up at 12 dp", "3", "1.732050807569"},
		{"rounds up with carry", "5", "2.2360679775"},
		{"irrational below one", "0.5", "0.707106781187"},
		{"large perfect square", "1000000000000000000000000000000", "1000000000000000"},
		{"one", "1", "1"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Sqrt([]*big.Rat{mustParse(t, tt.a)})
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

func TestSqrtKeepsFourteenDigits(t *testing.T) {
	got, err := Sqrt([]*big.Rat{big.NewRat(2, 1)})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	want := big.NewRat(141421356237309, 100000000000000)
	if got.Cmp(want) != 0 {
		t.Errorf("got %s, want %s", got.FloatString(14), want.FloatString(14))
	}
}

func TestSqrtNegative(t *testing.T) {
	tests := []struct {
		name string
		a    string
	}{
		{"minus one", "-1"},
		{"small negative", "-0.000000000001"},
		{"large negative", "-99999999999999999999"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Sqrt([]*big.Rat{mustParse(t, tt.a)})
			if err == nil {
				t.Fatalf("expected error, got %v", got)
			}
			if got != nil {
				t.Errorf("got %v, want nil on error", got)
			}
			assertCode(t, err, CodeNegativeSquareRoot)
		})
	}
}

func TestSqrtDoesNotMutateOperand(t *testing.T) {
	a := big.NewRat(9, 4)

	if _, err := Sqrt([]*big.Rat{a}); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if a.Cmp(big.NewRat(9, 4)) != 0 {
		t.Errorf("operand mutated to %s", a.RatString())
	}
}
