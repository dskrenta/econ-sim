'use strict';

const { inspect } = require('util');
const Prob = require('prob.js');
const faker = require('faker');

// Constants
const INITIAL_POPULATION_SIZE = 100; 
const DEFAULT_WEALTH_FACTOR = 25000;
const DAYS_OF_EXECUTION = 365;
const MARGINAL_PROPENSITY_TO_COMSUME = 0.6;

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

const corporations = [
  {
    name: 'Consume Co',
    type: 'food'
  },
  {
    name: 'Bucks Bank',
    type: 'bank'
  },
  {
    name: 'Franks Utilities',
    type: 'util'
  },
  {
    name: 'Joan\'s Real Estate',
    type: 'home'
  },
  {
    name: 'Induldge Services',
    type: 'misc'
  },
  {
    name: 'Steady Services',
    type: 'government'
  }
];

const people = [];

// Init people
for (let i = 0; i < INITIAL_POPULATION_SIZE; i++) {
  const logNormalVal = logNormal();

  const initialAssets = {};

  buildPercentiles({
    logNormalVal,
    ten: () => {
      initialAssets.food = {
        units: rand(1, 25)
      };

      initialAssets.job = {
        salary: rand(5000, 15000)
      };
    },
    twentyfifth: () => {
      initialAssets.food = {
        units: rand(10, 50)
      };

      initialAssets.job = {
        salary: rand(15000, 25000)
      };
    },
    fifty: () => {
      initialAssets.food = {
        units: rand(50, 100)
      };
      
      initialAssets.job = {
        salary: rand(25000, 50000)
      };

      initialAssets.home = {
        squareFeet: rand(1000, 3000)
      };
    },
    seventyfifth: () => {
      initialAssets.food = {
        units: rand(75, 100)
      };
      
      initialAssets.job = {
        salary: rand(50000, 75000)
      };

      initialAssets.home = {
        squareFeet: rand(2000, 4000)
      };
    },
    ninety: () => {
      initialAssets.food = {
        units: rand(100, 250)
      };
      
      initialAssets.job = {
        salary: rand(50000, 100000)
      };

      initialAssets.home = {
        squareFeet: rand(4000, 6000)
      };
    },
    veryRare: () => {
      initialAssets.food = {
        units: rand(300, 700)
      };
      
      initialAssets.job = {
        salary: rand(100000, 10000000)
      };

      initialAssets.home = {
        squareFeet: rand(10000, 25000)
      };
    }
  })

  people[i] = {
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
    assets: initialAssets,
    logNormalSeedVal: logNormalVal
  };
}

// Sim loop
for (let i = 0; i < DAYS_OF_EXECUTION; i++) {
  for (let j = 0; j < people.length; j++) {
    const numFoodUnitsToConsume = rand(2, 5);
    people[j].wealth += people[j].assets.job.salary / 365;
    // people[j].assets.food.units -= rand(2, 5);
    if (people[j].assets.food.units <= numFoodUnitsToConsume) {
      people[j].wealth -= rand(20, 50);
      people[j].assets.food.units += rand(10, 20);
    }
  }
}

logPeople(people);

// Utils
function logPeople(people) {
  console.log(inspect(people, false, null));
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

function decesion() {
  // needs, MPC -> misc vs investing vs needs, 
}