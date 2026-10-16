package calc

import (
	"math/big"
	"testing"
)

func TestPercent(t *testing.T) {
	tests := []struct {
		name string
		p    string
		base string
		want string
	}{
		{"fifteen percent of 200", "15", "200", "30"},
		{"zero percent", "0", "5", "0"},
		{"zero base", "25", "0", "0"},
		{"hundred percent is identity", "100", "7.25", "7.25"},
		{"above hundred percent", "150", "10", "15"},
		{"decimal percent", "12.5", "80", "10"},
		{"fraction of one percent", "0.5", "1", "0.005"},
		{"negative percent", "-10", "50", "-5"},
		{"negative base", "10", "-50", "-5"},
		{"both negative", "-10", "-50", "5"},
		{"repeating result rounds", "1", "3", "0.03"},
		{"negative zero percent", "-0", "5", "0"},
		{"tiny result keeps precision", "1", "0.0000001", "0.000000001"},
		{"tiny result rounds to zero", "0.00000000001", "1", "0"},
		{"tiny result rounds up to one unit", "0.00000000005", "1.1", "0.000000000001"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Percent([]*big.Rat{mustParse(t, tt.p), mustParse(t, tt.base)})
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

func TestPercentDoesNotMutateOperands(t *testing.T) {
	p, base := big.NewRat(3, 7), big.NewRat(-5, 2)

	if _, err := Percent([]*big.Rat{p, base}); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if p.Cmp(big.NewRat(3, 7)) != 0 || base.Cmp(big.NewRat(-5, 2)) != 0 {
		t.Errorf("operands mutated: p=%s base=%s", p.RatString(), base.RatString())
	}
}
