package calc

import "math/big"

// OperationFunc computes a result from already-parsed operands.
type OperationFunc func(args []*big.Rat) (*big.Rat, error)

// Operation describes one supported calculation.
type Operation struct {
	Name  string
	Arity int
	Fn    OperationFunc
}

// Registry maps an operation name to its definition.
type Registry map[string]Operation

func defaultRegistry() Registry {
	ops := []Operation{
		{Name: "add", Arity: 2, Fn: Add},
		{Name: "subtract", Arity: 2, Fn: Subtract},
		{Name: "multiply", Arity: 2, Fn: Multiply},
		{Name: "divide", Arity: 2, Fn: Divide},
		{Name: "power", Arity: 2, Fn: Power},
		{Name: "sqrt", Arity: 1, Fn: Sqrt},
		{Name: "percent", Arity: 2, Fn: Percent},
	}
	reg := make(Registry, len(ops))
	for _, op := range ops {
		reg[op.Name] = op
	}
	return reg
}
