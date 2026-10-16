package calc

import (
	"math/big"
	"testing"
)

func TestDivide(t *testing.T) {
	tests := []struct {
		name string
		a, b string
		want string
	}{
		{"exact result", "10", "4", "2.5"},
		{"one third rounds down", "1", "3", "0.333333333333"},
		{"two thirds rounds up", "2", "3", "0.666666666667"},
		{"zero dividend", "0", "5", "0"},
		{"negative dividend", "-10", "4", "-2.5"},
		{"negative divisor", "10", "-4", "-2.5"},
		{"both negative", "-10", "-4", "2.5"},
		{"decimals", "0.3", "0.1", "3"},
		{"negative zero dividend", "-0", "5", "0"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Divide([]*big.Rat{mustParse(t, tt.a), mustParse(t, tt.b)})
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

func TestDivideByZero(t *testing.T) {
	tests := []struct {
		name string
		a, b string
	}{
		{"one over zero", "1", "0"},
		{"zero over zero", "0", "0"},
		{"negative over zero", "-1", "0"},
		{"over decimal zero", "1", "0.000"},
		{"over negative zero", "1", "-0"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Divide([]*big.Rat{mustParse(t, tt.a), mustParse(t, tt.b)})
			if err == nil {
				t.Fatalf("expected error, got %v", got)
			}
			if got != nil {
				t.Errorf("got %v, want nil on error", got)
			}
			assertCode(t, err, CodeDivisionByZero)
		})
	}
}

func TestDivideDoesNotMutateOperands(t *testing.T) {
	a, b := big.NewRat(1, 3), big.NewRat(2, 5)

	if _, err := Divide([]*big.Rat{a, b}); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if a.Cmp(big.NewRat(1, 3)) != 0 || b.Cmp(big.NewRat(2, 5)) != 0 {
		t.Errorf("operands mutated: a=%s b=%s", a.RatString(), b.RatString())
	}
}
