package calc

import (
	"errors"
	"reflect"
	"strings"
	"testing"
)

func TestServiceCalculate(t *testing.T) {
	svc := NewService()
	tests := []struct {
		name     string
		op       string
		operands []string
		want     string
	}{
		{"add", "add", []string{"0.1", "0.2"}, "0.3"},
		{"subtract", "subtract", []string{"0", "0.1"}, "-0.1"},
		{"multiply", "multiply", []string{"1.5", "1.5"}, "2.25"},
		{"divide", "divide", []string{"10", "4"}, "2.5"},
		{"divide repeating", "divide", []string{"1", "3"}, "0.333333333333"},
		{"power", "power", []string{"2", "10"}, "1024"},
		{"power negative exponent", "power", []string{"2", "-2"}, "0.25"},
		{"sqrt", "sqrt", []string{"16"}, "4"},
		{"sqrt irrational", "sqrt", []string{"2"}, "1.414213562373"},
		{"percent", "percent", []string{"15", "200"}, "30"},
		{"negative zero result", "multiply", []string{"-0", "5"}, "0"},
		{"leading zeros operand", "add", []string{"007", "1"}, "8"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := svc.Calculate(tt.op, tt.operands)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tt.want {
				t.Errorf("got %q, want %q", got, tt.want)
			}
		})
	}
}

func TestServiceCalculateErrors(t *testing.T) {
	svc := NewService()
	tests := []struct {
		name     string
		op       string
		operands []string
		code     Code
	}{
		{"unknown operation", "modulo", []string{"1", "2"}, CodeUnknownOperation},
		{"empty operation", "", []string{"1", "2"}, CodeUnknownOperation},
		{"operation is case sensitive", "ADD", []string{"1", "2"}, CodeUnknownOperation},
		{"unknown operation wins over arity", "nope", nil, CodeUnknownOperation},
		{"binary with one operand", "add", []string{"1"}, CodeInvalidOperandCount},
		{"binary with three operands", "add", []string{"1", "2", "3"}, CodeInvalidOperandCount},
		{"binary with nil operands", "add", nil, CodeInvalidOperandCount},
		{"unary with two operands", "sqrt", []string{"4", "4"}, CodeInvalidOperandCount},
		{"percent with one operand", "percent", []string{"5"}, CodeInvalidOperandCount},
		{"arity wins over invalid operand", "add", []string{"abc"}, CodeInvalidOperandCount},
		{"invalid first operand", "add", []string{"abc", "1"}, CodeInvalidOperand},
		{"invalid second operand", "add", []string{"1", "1e3"}, CodeInvalidOperand},
		{"empty operand", "sqrt", []string{""}, CodeInvalidOperand},
		{"leading dot operand", "multiply", []string{".5", "2"}, CodeInvalidOperand},
		{"plus sign operand", "subtract", []string{"+1", "2"}, CodeInvalidOperand},
		{"operand too long", "add", []string{strings.Repeat("1", 33), "1"}, CodeInvalidOperand},
		{"division by zero", "divide", []string{"1", "0"}, CodeDivisionByZero},
		{"negative square root", "sqrt", []string{"-1"}, CodeNegativeSquareRoot},
		{"non integer exponent", "power", []string{"2", "0.5"}, CodeNonIntegerExponent},
		{"exponent out of range", "power", []string{"2", "101"}, CodeOutOfRange},
		{"zero to negative power", "power", []string{"0", "-1"}, CodeDivisionByZero},
		{"result out of range", "power", []string{strings.Repeat("9", 32), "100"}, CodeOutOfRange},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := svc.Calculate(tt.op, tt.operands)
			if err == nil {
				t.Fatalf("expected error, got %q", got)
			}
			if got != "" {
				t.Errorf("got %q, want empty result on error", got)
			}
			assertCode(t, err, tt.code)
		})
	}
}

func TestServiceInvalidOperandMessage(t *testing.T) {
	svc := NewService()
	tests := []struct {
		name     string
		op       string
		operands []string
		want     string
	}{
		{"first operand", "add", []string{"abc", "1"}, "operand 1 is not a valid decimal number"},
		{"second operand", "add", []string{"1", "abc"}, "operand 2 is not a valid decimal number"},
		{"unary operand", "sqrt", []string{""}, "operand 1 is not a valid decimal number"},
		{"exponent notation", "percent", []string{"5", "1e3"}, "operand 2 is not a valid decimal number"},
		{"first invalid wins", "add", []string{"x", "y"}, "operand 1 is not a valid decimal number"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := svc.Calculate(tt.op, tt.operands)

			assertCode(t, err, CodeInvalidOperand)
			var calcErr *Error
			if errors.As(err, &calcErr) && calcErr.Message != tt.want {
				t.Errorf("Message = %q, want %q", calcErr.Message, tt.want)
			}
		})
	}
}

func TestServiceOperations(t *testing.T) {
	svc := NewService()

	want := []OperationInfo{
		{Name: "add", Arity: 2},
		{Name: "divide", Arity: 2},
		{Name: "multiply", Arity: 2},
		{Name: "percent", Arity: 2},
		{Name: "power", Arity: 2},
		{Name: "sqrt", Arity: 1},
		{Name: "subtract", Arity: 2},
	}
	if got := svc.Operations(); !reflect.DeepEqual(got, want) {
		t.Errorf("got %v, want %v", got, want)
	}
}

func TestServiceOperationsReturnsCopy(t *testing.T) {
	svc := NewService()

	first := svc.Operations()
	first[0].Name = "tampered"

	if got := svc.Operations()[0].Name; got != "add" {
		t.Errorf("first operation = %q, want %q", got, "add")
	}
}

func TestServiceOperationsMatchCalculate(t *testing.T) {
	svc := NewService()

	for _, info := range svc.Operations() {
		operands := make([]string, info.Arity)
		for i := range operands {
			operands[i] = "1"
		}
		if _, err := svc.Calculate(info.Name, operands); err != nil {
			t.Errorf("%s with %d operands: unexpected error: %v", info.Name, info.Arity, err)
		}
	}
}
