import { calculateMortgage } from './mortgage-calc';

const testCases = [
  { id: 1, bank: 'Emirates NBD', price: 460000, downPayment: 46000, downPct: 10, years: 15, rate: 3.80, expectedPayable: 649980, expectedMonthly: 3611 },
  { id: 2, bank: 'BSF', price: 460000, downPayment: 46000, downPct: 10, years: 15, rate: 3.85, expectedPayable: 653085, expectedMonthly: 3628 },
  { id: 3, bank: 'Al Rajhi', price: 460000, downPayment: 138000, downPct: 30, years: 15, rate: 4.19, expectedPayable: 524377, expectedMonthly: 2913 },
  { id: 4, bank: 'SNB', price: 460000, downPayment: 138000, downPct: 30, years: 15, rate: 4.26, expectedPayable: 527758, expectedMonthly: 2932 },
  { id: 5, bank: 'SHL', price: 460000, downPayment: 46000, downPct: 10, years: 15, rate: 6.23, expectedPayable: 800883, expectedMonthly: 4449 }
];

console.log('🧪 Running Mortgage Formula Verification...');
let allPassed = true;

for (const tc of testCases) {
  const result = calculateMortgage({
    price: tc.price,
    downPaymentAmount: tc.downPayment,
    loanPeriodYears: tc.years,
    annualRatePct: tc.rate
  });

  const totalPayableRounded = Math.round(result.totalPayableValue);
  const monthlyRounded = Math.round(result.monthlyInstalment);

  const payableOk = totalPayableRounded === tc.expectedPayable;
  const monthlyOk = monthlyRounded === tc.expectedMonthly;

  if (payableOk && monthlyOk) {
    console.log(`✅ Case #${tc.id} (${tc.bank}): Passed! Monthly: ${monthlyRounded}, Total Payable: ${totalPayableRounded}`);
  } else {
    allPassed = false;
    console.error(`❌ Case #${tc.id} (${tc.bank}) FAILED!`);
    console.error(`   Expected Monthly: ${tc.expectedMonthly}, Got: ${monthlyRounded}`);
    console.error(`   Expected Payable: ${tc.expectedPayable}, Got: ${totalPayableRounded}`);
    console.error(`   Details:`, result);
  }
}

if (allPassed) {
  console.log('🎉 All formula verification test cases passed successfully!');
} else {
  console.error('❌ Some test cases failed. Please inspect the formula scaling.');
  process.exit(1);
}
