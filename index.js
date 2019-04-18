'use strict';

function rand(
  min = 0,
  max = 1,
  int = true
) {
  if (int) {
    min = Math.ceil(min);
    max = Math.floor(max);
  }
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function gdp(
  consumerSpending,
  ivestorSpending,
  governmentSpending,
  exports,
  imports
) {
  const gdp = consumerSpending + ivestorSpending + governmentSpending + (exports - imports);
  return gdp;
}

console.log(gdp(100, 10000, 10000, 100, 10));
