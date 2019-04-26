'use strict';

const { inspect } = require('util');
const Prob = require('prob.js');
const faker = require('faker');
const crypto = require('crypto');

// Constants
const INITIAL_POPULATION_SIZE = 100;
const DEFAULT_WEALTH_FACTOR = 25000;
const DAYS_OF_EXECUTION = 365;
const MARGINAL_PROPENSITY_TO_COMSUME = 0.6;
const DEFAULT_NUM_SHARES = 1000000;

const logNormal = Prob.lognormal(0, 1);

// Main groups
const fed = {
  interestRate: 0.06,
  inflationRate: 0.02
};

const government = {
  incomeTax: 0.2, // check
  corporateTax: 0.2, // check
  budget: 10000,
  exportTax: 0.01,
  importTax: 0.01,
  wealth: 0 // check
};

const companies = {
  [genId()]: {
    name: 'Mass Housing Co',
    type: 'tempHome'
  },
  [genId()]: {
    name: 'Consume Co',
    type: 'food'
  },
  [genId()]: {
    name: 'Buckys Bank',
    type: 'bank'
  },
  [genId()]: {
    name: 'Copper Real Estate',
    type: 'home'
  },
  [genId()]: {
    name: 'Franks Utilities',
    type: 'util'
  },
  [genId()]: {
    name: 'Expensive Services',
    type: 'misc'
  }
};

const people = {};

const orders = [];

// Init companies
for (let id in companies) {
  const marketCap = rand(1000000, 10000000);

  companies[id] = {
    ...companies[id],
    marketCap,
    employees: [],
    sharesOwned: 0,
    totalShares: DEFAULT_NUM_SHARES,
    historicalSharePrices: [],
    shareholders: [],
    sharePrice: marketCap / DEFAULT_NUM_SHARES,
  }
}

// Init people
const initialCompanyIds = Object.keys(companies);

for (let i = 0; i < INITIAL_POPULATION_SIZE; i++) {
  const logNormalVal = logNormal();
  const personId = genId();
  const randCompanyId = Object.keys(companies)[rand(0, Object.keys(companies).length - 1)];

  people[personId] = {
    status: {
      alive: true,
      solvent: true,
      hungerFactor: 0
    },
    general: {
      name: faker.name.findName(),
      profileImage: faker.image.avatar()
    },
    wealth: logNormalVal * DEFAULT_WEALTH_FACTOR,
    assets: {
      job: {
        companyId: null,
        salary: 0
      },
      stock: {}
    },
    logNormalSeedVal: logNormalVal,
    personLog: [] // Do at end
  };

  buildPercentiles({
    logNormalVal,
    ten: () => {
      people[personId].assets = {
        ...people[personId].assets,
        food: { units: rand(1, 25) }
      };
    },
    twentyfifth: () => {
      people[personId].assets = {
        ...people[personId].assets,
        food: { units: rand(10, 50) },
        job: {
          companyId: randCompanyId,
          salary: rand(5000, 10000)
        }
      };

      companies[randCompanyId].employees.push(personId);
    },
    fifty: () => {
      people[personId].assets = {
        ...people[personId].assets,
        food: { units: rand(50, 100) },
        home: { squareFeet: rand(1000, 3000) },
        job: {
          companyId: randCompanyId,
          salary: rand(10000, 25000)
        }
      };

      companies[randCompanyId].employees.push(personId);
    },
    seventyfifth: () => {
      people[personId].assets = {
        ...people[personId].assets,
        food: { units: rand(75, 100) },
        home: { squareFeet: rand(2000, 4000) },
        job: {
          companyId: randCompanyId,
          salary: rand(25000, 75000)
        }
      };

      companies[randCompanyId].employees.push(personId);

      const companyIndex = rand(0, initialCompanyIds.length - 1);
      buyShares(personId, initialCompanyIds[companyIndex], rand(10, 100));
    },
    ninety: () => {
      people[personId].assets = {
        ...people[personId].assets,
        food: { units: rand(100, 250) },
        home: { squareFeet: rand(4000, 6000) },
        job: {
          companyId: randCompanyId,
          salary: rand(75000, 150000)
        }
      };

      companies[randCompanyId].employees.push(personId);

      const companyIndex = rand(0, initialCompanyIds.length - 1);
      buyShares(personId, initialCompanyIds[companyIndex], rand(1000, 10000));
    },
    veryRare: () => {
      people[personId].assets = {
        ...people[personId].assets,
        food: { units: rand(300, 700) },
        home: { squareFeet: rand(6000, 10000) },
        job: {
          companyId: randCompanyId,
          salary: rand(200000, 1000000)
        }
      };

      companies[randCompanyId].employees.push(personId);

      const companyIndex = rand(0, initialCompanyIds.length - 1);
      buyShares(personId, initialCompanyIds[companyIndex], rand(10000, 1000000));
    }
  })
}

// Sim loop
for (let i = 0; i < DAYS_OF_EXECUTION; i++) {
  // Other upkeep
  for (let personId in people) {
    // Person upkeep
    personUpkeep(personId, i);
  }
}

// logObj(people);
// logObj(companies);
console.log(orders);

// Utils
function personUpkeep(personId, timeIndex) {
  if (people[personId].status.alive === true) {
    const numFoodUnitsToConsume = rand(5, 15);
    const employerId = people[personId].assets.job.companyId;
    const income = people[personId].assets.job.salary / 365;
    const incomeAfterTax = income * government.incomeTax;
    government.wealth += income - incomeAfterTax;
    if (employerId) companies[employerId].marketCap -= income;
    const targetSpend = incomeAfterTax * MARGINAL_PROPENSITY_TO_COMSUME;
    let totalSpend = 0;

    // Income
    people[personId].wealth += incomeAfterTax;

    // Buy food units if needed
    if (people[personId].assets.food.units <= numFoodUnitsToConsume) {
      const foodUnitsToBuy = (numFoodUnitsToConsume - people[personId].assets.food.units) + rand(1, 25);

      const foodCompanyId = getCompanyBySector('food');

      const purchaseResult = purchaseProduct({
        personId,
        productName: 'Food Unit',
        materialsRarityFactor: 5,
        laborRarityFactor: 1,
        desiredProfit: 0.20,
        timeIndex,
        units: foodUnitsToBuy,
        companyId: foodCompanyId
      });

      if (purchaseResult.result) {
        people[personId].assets.food.units += foodUnitsToBuy
        totalSpend += purchaseProduct.cost;
      };
    }

    // Food unit consumption
    if (people[personId].assets.food.units >= numFoodUnitsToConsume) {
      people[personId].assets.food.units -= numFoodUnitsToConsume;
    }
    else {
      people[personId].status.hungerFactor += 1;
    }

    // Shelter/home, utilities check

    // Employment check

    // Additional spending, investment

    // Person health check (home, hungerFactor, utilities)
    // possibly die
  }

  /*
    possibly add to coporation formation list
      - capital requirements
      - skill requirments
    check status
      - employed / unemployed
      - deceased / living
    income
      - salary
    purchase needs
      - food
      - utils
      - loans
      - mortgage
      - find job if need be
    invest if applicable
      - stocks
      - bank
    purchase misc
      - purchase items to fill MPC requirement

       needs: [
      {
        type: 'home'
      },
      {
        type: 'util'
      },
      {
        type: 'food'
      },
      {
        type: 'job'
      }
    ],
  */
}

function logObj(obj) {
  console.log(inspect(obj, false, null));
}

const nullFunc = () => null;

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

function buildPercentiles({
  logNormalVal,
  ten = nullFunc,
  twentyfifth = nullFunc,
  fifty = nullFunc,
  seventyfifth = nullFunc,
  ninety = nullFunc,
  veryRare = nullFunc
}) {
  if (logNormalVal <= 0.25) {
    ten();
  }
  else if (logNormalVal > 0.25 && logNormalVal <= 0.5) {
    twentyfifth();
  }
  else if (logNormalVal > 0.5 && logNormalVal <= 1) {
    fifty();
  }
  else if (logNormalVal > 1 && logNormalVal <= 2) {
    seventyfifth();
  }
  else if (logNormalVal > 2 && logNormalVal <= 4) {
    ninety();
  }
  else if (logNormalVal > 4) {
    veryRare();
  }
}

function getCompanyBySector(sector) {
  const companiesInSector = Object.entries(companies).filter(item => item[1].type === sector)[0][0];
  return companiesInSector;
}

function purchaseProduct({
  personId,
  productName,
  laborRarityFactor,
  materialsRarityFactor,
  desiredProfit = 0.20,
  timeIndex = 0,
  units = 1,
  companyId
}) {
  const cost = productCost(laborRarityFactor, materialsRarityFactor, desiredProfit, units);

  if (people[personId].wealth >= cost) {
    people[personId].wealth -= cost;
    companies[companyId].marketCap += cost;

    orders.push({
      type: 'consumerSpending',
      timeIndex,
      personId,
      productName,
      cost,
      units,
      companyId
    });

    return {
      result: true,
      cost
    };
  }
  return {
    result: false
  };
}

// fix
function productCost(laborRarityFactor, materialsRarityFactor, desiredProfit = 0.20, units = 1) {
  const baseCost = 1 * laborRarityFactor * materialsRarityFactor;
  const tax = baseCost * government.corporateTax;
  const desiredProfitAddition = (baseCost + tax) * desiredProfit;
  return (baseCost + tax + desiredProfitAddition) * units;
}

function genId() {
  return crypto.randomBytes(16).toString('hex');
}

function buyShares(personId, companyId, numShares, timeIndex = 0) {
  const sharePrice = companies[companyId].sharePrice;

  if (people[personId].wealth >= (numShares * sharePrice) && (companies[companyId].totalShares - companies[companyId].sharesOwned) >= numShares) {
    people[personId].wealth -= numShares * sharePrice;
    companies[companyId].sharesOwned += numShares;
    companies[companyId].marketCap += numShares * sharePrice;
    companies[companyId].sharePrice = companies[companyId].marketCap / companies[companyId].totalShares;

    if (companyId in people[personId].assets.stock) {
      companies[companyId].shareholders[personId].shares += numShares;
      people[personId].assets.stock[companyId].shares += numShares;
    }
    else {
      companies[companyId].shareholders[personId] = {
        shares: numShares,
        sharePrice,
        timeIndex
      };

      people[personId].assets.stock[companyId] = {
        shares: numShares,
        sharePrice,
        timeIndex
      };
    }

    orders.push({
      type: 'investorSpending',
      timeIndex,
      personId,
      productName: `Bought ${numShares} shares of ${companies[companyId].name}`,
      cost: numShares * sharePrice,
      units: numShares
    });

    return true;
  }

  return false;

  // get current share price
  // subtract numShares * sharePrice from person liquidity
  // increment company shares owned
  // increase share price by factor of shares purchased
  // increase marketCap and liquidity to compensate
}

function sellShares(personId, companyId, numShares, timeIndex = 0) {
  const sharePrice = companies[companyId].sharePrice;

  if (companyId in people[personId].assets.stock && people[personId].assets.stock[companyId].shares <= numShares) {
    people[personId].wealth += numShares * sharePrice;
    companies[companyId].shareholders[personId].shares -= numShares;
    people[personId].assets.stock[companyId].shares -= numShares;
    companies[companyId].marketCap -= numShares * sharePrice;
    companies[companyId].sharePrice = companies[companyId].marketCap / companies[companyId].totalShares;

    return true;
  }

  return false;

  // get current share price
  // modify person wealth by numShares * sharePrice
  // decrement company shares owned
  // decrease share price by factor of shares sold
  // decrement marketCap to compensate
}
