package calc

import (
	"fmt"
	"math/big"
	"sort"
)

// OperationInfo is the public description of a supported operation.
type OperationInfo struct {
	Name  string
	Arity int
}

// Service runs calculations on decimal strings.
type Service struct {
	reg Registry
}

func NewService() *Service {
	return &Service{reg: defaultRegistry()}
}

// Calculate looks up the operation, validates operands, runs it and formats the result.
func (s *Service) Calculate(op string, operands []string) (string, error) {
	operation, ok := s.reg[op]
	if !ok {
		return "", newError(CodeUnknownOperation, fmt.Sprintf("unknown operation %q", op))
	}
	if len(operands) != operation.Arity {
		return "", newError(CodeInvalidOperandCount,
			fmt.Sprintf("operation %q expects %d operand(s), got %d", op, operation.Arity, len(operands)))
	}

	args := make([]*big.Rat, len(operands))
	for i, raw := range operands {
		r, err := ParseDecimal(raw)
		if err != nil {
			return "", newError(CodeInvalidOperand,
				fmt.Sprintf("operand %d is not a valid decimal number", i+1))
		}
		args[i] = r
	}

	result, err := operation.Fn(args)
	if err != nil {
		return "", err
	}
	return FormatDecimal(result)
}

// Operations lists supported operations sorted by name.
func (s *Service) Operations() []OperationInfo {
	infos := make([]OperationInfo, 0, len(s.reg))
	for _, op := range s.reg {
		infos = append(infos, OperationInfo{Name: op.Name, Arity: op.Arity})
	}
	sort.Slice(infos, func(i, j int) bool { return infos[i].Name < infos[j].Name })
	return infos
}
