package calc

import (
	"errors"
	"regexp"
	"strings"
	"testing"
)

var formattedPattern = regexp.MustCompile(`^-?\d+(\.\d+)?$`)

// isDecimalString is an independent check of the operand grammar.
func isDecimalString(s string) bool {
	i := 0
	digits := func() int {
		n := 0
		for i < len(s) && s[i] >= '0' && s[i] <= '9' {
			i++
			n++
		}
		return n
	}
	if i < len(s) && s[i] == '-' {
		i++
	}
	if digits() == 0 {
		return false
	}
	if i < len(s) && s[i] == '.' {
		i++
		if digits() == 0 {
			return false
		}
	}
	return i == len(s)
}

func isCalcCode(c Code) bool {
	switch c {
	case CodeUnknownOperation, CodeInvalidOperandCount, CodeInvalidOperand,
		CodeDivisionByZero, CodeNegativeSquareRoot, CodeNonIntegerExponent, CodeOutOfRange:
		return true
	}
	return false
}

func errCode(t *testing.T, err error) Code {
	t.Helper()
	var calcErr *Error
	if !errors.As(err, &calcErr) {
		t.Fatalf("error %v is not *Error", err)
	}
	return calcErr.Code
}

func checkFormatted(t *testing.T, s string) {
	t.Helper()
	if !formattedPattern.MatchString(s) {
		t.Fatalf("result %q is not a plain decimal", s)
	}
	if s == "-0" {
		t.Fatalf("result is %q, want 0", s)
	}
	if _, frac, found := strings.Cut(s, "."); found {
		if len(frac) > formatPrecision {
			t.Fatalf("result %q has more than %d decimals", s, formatPrecision)
		}
		if strings.HasSuffix(frac, "0") {
			t.Fatalf("result %q has trailing zeros", s)
		}
	}
}

func FuzzParseDecimal(f *testing.F) {
	seeds := []string{
		"0.1", "-5", "007", "abc", "1e3", "", "1.", ".5", "+1", "-0", "-",
		"1.2.3", "1\n", strings.Repeat("9", 32), strings.Repeat("9", 33),
	}
	for _, seed := range seeds {
		f.Add(seed)
	}
	f.Fuzz(func(t *testing.T, s string) {
		r, err := ParseDecimal(s)

		wantValid := len(s) <= maxOperandLen && isDecimalString(s)
		if (err == nil) != wantValid {
			t.Fatalf("ParseDecimal(%q) error = %v, want valid = %v", s, err, wantValid)
		}
		if err != nil {
			if r != nil {
				t.Fatalf("ParseDecimal(%q) returned %v with an error", s, r)
			}
			if code := errCode(t, err); code != CodeInvalidOperand {
				t.Fatalf("ParseDecimal(%q) code = %q, want %q", s, code, CodeInvalidOperand)
			}
			return
		}
		out, err := FormatDecimal(r)
		if err != nil {
			t.Fatalf("FormatDecimal(%q) error: %v", s, err)
		}
		checkFormatted(t, out)
	})
}

func FuzzCalculate(f *testing.F) {
	seeds := [][3]string{
		{"add", "0.1", "0.2"},
		{"divide", "1", "0"},
		{"sqrt", "-1", "0"},
		{"power", "2", "101"},
		{"power", "0", "-1"},
		{"percent", "15", "200"},
		{"multiply", "-0", "5"},
		{"modulo", "1", "2"},
		{"add", "abc", "1"},
		{"power", strings.Repeat("9", 32), "100"},
	}
	for _, s := range seeds {
		f.Add(s[0], s[1], s[2])
	}
	svc := NewService()
	f.Fuzz(func(t *testing.T, op, a, b string) {
		for _, operands := range [][]string{{a, b}, {a}, nil} {
			got, err := svc.Calculate(op, operands)
			if err != nil {
				if got != "" {
					t.Fatalf("Calculate(%q, %q) = %q with an error", op, operands, got)
				}
				if code := errCode(t, err); !isCalcCode(code) {
					t.Fatalf("Calculate(%q, %q) returned unexpected code %q", op, operands, code)
				}
				continue
			}
			checkFormatted(t, got)
		}

		if op == "add" || op == "multiply" {
			ab, errAB := svc.Calculate(op, []string{a, b})
			ba, errBA := svc.Calculate(op, []string{b, a})
			if (errAB == nil) != (errBA == nil) || ab != ba {
				t.Fatalf("%s is not commutative for %q, %q: %q (%v) vs %q (%v)", op, a, b, ab, errAB, ba, errBA)
			}
			if errAB != nil && errCode(t, errAB) != errCode(t, errBA) {
				t.Fatalf("%s error codes differ for %q, %q", op, a, b)
			}
		}
	})
}
