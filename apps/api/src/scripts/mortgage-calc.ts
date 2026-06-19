export interface MortgageInput {
  price: number;
  downPaymentAmount: number;
  loanPeriodYears: number;
  annualRatePct: number;
}

export interface MortgageOutput {
  downPaymentAmount: number;
  totalLoanAmount: number;
  totalPayableValue: number;
  monthlyInstalment: number;
  bankProfitPercentage: number;
}

/**
 * Calculates mortgage breakdown using the exact reverse-engineered formula.
 * Pre-rounding values are returned. Final values are rounded for display.
 */
export function calculateMortgage({
  price,
  downPaymentAmount,
  loanPeriodYears,
  annualRatePct
}: MortgageInput): MortgageOutput {
  const loanAmount = price - downPaymentAmount;

  // Scaling exactly per the spec:
  const interestRateUnits = annualRatePct * 100; // e.g. 3.80 -> 380

  const totalPayableValue = loanAmount + (interestRateUnits / 10000) * loanAmount * loanPeriodYears;
  const monthlyInstalment = totalPayableValue / (12 * loanPeriodYears);
  const bankProfitPercentage = 100 - (100 * loanAmount) / totalPayableValue;

  return {
    downPaymentAmount,
    totalLoanAmount: loanAmount,
    totalPayableValue,
    monthlyInstalment,
    bankProfitPercentage
  };
}
