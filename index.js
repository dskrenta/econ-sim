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
  incomeTax: 0.2,
  corporateTax: 0.2,
  budget: 10000,
  exportTax: 0.01,
  importTax: 0.01
};

const companies = {
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
    name: 'Induldge Services',
    type: 'misc'
  }
};

const people = {};

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
    assets: {
      job: {
        salary: 0
      },
      stock: {}
    },
    logNormalSeedVal: logNormalVal
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
    upkeep(personId);
  }
}

logObj(people);
logObj(companies);

// Utils
function upkeep(personId) {
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
  */

  const numFoodUnitsToConsume = rand(2, 5);
  people[personId].wealth += people[personId].assets.job.salary / 365;
  if (people[personId].assets.food.units <= numFoodUnitsToConsume) {
    people[personId].wealth -= rand(20, 50);
    people[personId].assets.food.units += rand(10, 20);
  }
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

function productCost() {
  // costOfLabor, costOfMaterials, overhead expenses, desired profit as percentage, efficiency
}

function costOfLabor(difficulty) {
  // difficulty, size of labor pool, cost of training, taxes, employee benefits
}

function costOfMaterials() {
  // complexity, rarity
}

function decision() {
  // needs, MPC -> misc vs investing vs needs,
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
