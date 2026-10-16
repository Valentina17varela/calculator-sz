package calc

import (
	"math/big"
	"testing"
)

func mustParse(t *testing.T, s string) *big.Rat {
	t.Helper()
	r, err := ParseDecimal(s)
	if err != nil {
		t.Fatalf("ParseDecimal(%q): %v", s, err)
	}
	return r
}

func TestArithOperations(t *testing.T) {
	tests := []struct {
		name string
		fn   func([]*big.Rat) (*big.Rat, error)
		a, b string
		want string
	}{
		{"add exact decimals", Add, "0.1", "0.2", "0.3"},
		{"add cancels to zero", Add, "-5", "5", "0"},
		{"add negatives", Add, "-1.5", "-2.25", "-3.75"},
		{"add large", Add, "99999999999999999999", "1", "100000000000000000000"},
		{"subtract below zero", Subtract, "0", "0.1", "-0.1"},
		{"subtract same", Subtract, "3.3", "3.3", "0"},
		{"subtract negative", Subtract, "5", "-5", "10"},
		{"multiply decimals", Multiply, "1.5", "1.5", "2.25"},
		{"multiply negative zero", Multiply, "-0", "5", "0"},
		{"multiply by zero negative", Multiply, "-5", "0", "0"},
		{"multiply signs", Multiply, "-2", "-3", "6"},
		{"multiply small", Multiply, "0.1", "0.1", "0.01"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			args := []*big.Rat{mustParse(t, tt.a), mustParse(t, tt.b)}

			got, err := tt.fn(args)
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

func TestArithDoesNotMutateOperands(t *testing.T) {
	fns := map[string]func([]*big.Rat) (*big.Rat, error){
		"add": Add, "subtract": Subtract, "multiply": Multiply,
	}
	for name, fn := range fns {
		t.Run(name, func(t *testing.T) {
			a, b := big.NewRat(1, 3), big.NewRat(2, 5)

			if _, err := fn([]*big.Rat{a, b}); err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if a.Cmp(big.NewRat(1, 3)) != 0 || b.Cmp(big.NewRat(2, 5)) != 0 {
				t.Errorf("operands mutated: a=%s b=%s", a.RatString(), b.RatString())
			}
		})
	}
}
