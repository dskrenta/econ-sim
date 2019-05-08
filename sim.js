(() => {
  'use strict';

  // Defaults
  let INITIAL_POPULATION_SIZE = 100;
  let DEFAULT_WEALTH_FACTOR = 25000;
  let DAYS_OF_EXECUTION = 365;
  let MARGINAL_PROPENSITY_TO_COMSUME = 0.6;
  let DEFAULT_NUM_SHARES = 1000000;
  let DEFAULT_PRICE_PER_SQUARE_FOOT = 123;
  let HUNGER_FACTOR_DEATH = 30;

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

  const bankInterestRate = fed.interestRate + (fed.interestRate * 0.20);

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
        const squareFeet = rand(1000, 3000);

        people[personId].assets = {
          ...people[personId].assets,
          food: { units: rand(50, 100) },
          home: {
            squareFeet,
            price: squareFeet * DEFAULT_PRICE_PER_SQUARE_FOOT
          },
          job: {
            companyId: randCompanyId,
            salary: rand(10000, 25000)
          }
        };

        companies[randCompanyId].employees.push(personId);
      },
      seventyfifth: () => {
        const squareFeet = rand(2000, 4000);

        people[personId].assets = {
          ...people[personId].assets,
          food: { units: rand(75, 100) },
          home: {
            squareFeet,
            price: squareFeet * DEFAULT_PRICE_PER_SQUARE_FOOT
          },
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
        const squareFeet = rand(4000, 6000);

        people[personId].assets = {
          ...people[personId].assets,
          food: { units: rand(100, 250) },
          home: {
            squareFeet,
            price: squareFeet * DEFAULT_PRICE_PER_SQUARE_FOOT
          },
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
        const squareFeet = rand(6000, 10000);

        people[personId].assets = {
          ...people[personId].assets,
          food: { units: rand(300, 700) },
          home: {
            squareFeet,
            price: DEFAULT_PRICE_PER_SQUARE_FOOT * squareFeet
          },
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

  // Run sim func
  function runSim() {
    // Sim loop
    for (let i = 0; i < DAYS_OF_EXECUTION; i++) {
      // Other upkeep
      for (let personId in people) {
        // Person upkeep
        personUpkeep(personId, i);
      }
    }

    // Companies hack
    delete companies[undefined];

    // Call display functions
    displayStats();
    displayCompaniesTable();
    displayPersonTable();
    displayOrdersTable();
  }

  // Utils
  function displayCompaniesTable() {
    const insertElement = document.getElementById('companies-table');
    const html = `
      <h1>Companies</h1>
      <table class="table">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Company Type</th>
            <th scope="col">Market Cap</th>
            <th scope="col">Share Price</th>
            <th scope="col">Shares Owned</th>
            <th scope="col">Total Shares</th>
            <th scope="col">Shareholders</th>
            <th scope="col">Employees</th>
          </tr>
        </thead>
        <tbody>
          ${Object.values(companies).map(company => ` 
            <tr ${company.marketCap <= 0 && `class="table-danger"`}> 
              <td>${company.name}</td>
              <td>${company.type}</td>
              <td>$${company.marketCap}</td>
              <td>$${company.sharePrice}</td>
              <td>${company.sharesOwned}</td>
              <td>${company.totalShares}</td>
              <td>${company.shareholders && Object.values(company.shareholders).length}</td>
              <td>${company.employees && company.employees.length}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    insertElement.insertAdjacentHTML('afterbegin', html);
  }

  function displayPersonTable() {
    const insertElement = document.getElementById('people-table');
    const html = `
      <h1>People</h1>
      <table class="table">
        <thead>
          <tr>
            <th scope="col">Avatar</th>
            <th scope="col">Name</th>
            <th scope="col">Alive</th>
            <th scope="col">Wealth</th>
            <th scope="col">Food Units</th>
            <th scope="col">Hunger Factor</th>
            <th scope="col">Home</th>
            <th scope="col">Job Salary</th>
            <th scope="col">Stock</th>
            <th scope="col">logNormalSeedValue</th>
          </tr>
        </thead>
        <tbody>
          ${Object.values(people).map(person => `
            <tr ${!person.status.alive && `class="table-danger"`}> 
              <td><img src="${person.general.profileImage}"/></td>
              <td>${person.general.name}</td>
              <td>${person.status.alive}</td>
              <td>$${person.wealth.toFixed(2)}</td>
              <td>${person.assets.food.units}</td>
              <td>${person.status.hungerFactor}</td>
              <td>${person.assets.home ? `${person.assets.home.squareFeet} sq feet, ${person.assets.home.price ? `Price: $${person.assets.home.price}` : `Mortgage per day: ${person.assets.home.mortgage.toFixed(2)}`}` : 'false'}</td>
              <td>$${person.assets.job ? person.assets.job.salary.toFixed(2) : 0}</td>
              <td>${person.logNormalSeedVal}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    insertElement.insertAdjacentHTML('afterbegin', html);
  }

  function displayOrdersTable() {
    const insertElement = document.getElementById('orders-table');
    const html = `
      <h1>Truncated Orders (500 of ${orders.length})</h1>
      <table class="table">
        <thead>
          <tr>
            <th scope="col">Type</th>
            <th scope="col">Time Index</th>
            <th scope="col">Name</th>
            <th scope="col">Product Name</th>
            <th scope="col">Cost</th>
            <th scope="col">Units</th>
          </tr>
        </thead>
        <tbody>
          ${orders.slice(0, 499).map(order => `
            <tr> 
              <td>${order.type}</td>
              <td>${order.timeIndex}</td>
              <td>${people[order.personId].general.name}</td>
              <td>${order.productName}</td>
              <td>${order.cost}</td>
              <td>${order.units}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    insertElement.insertAdjacentHTML('afterbegin', html);
  }

  function displayStats() {
    const insertElement = document.getElementById('stats-table');

    let totalSpending = 0;
    for (let order of orders) {
      totalSpending += order.cost;
    }

    const html = `
      <h1>Stats</h1>
      <table class="table">
        <thead>
          <tr>
            <th scope="col">Total Spending</th>
            <th scope="col">People Dead</th>
            <th scope="col">People Alive</th>
            <th scope="col">Num Solvent Companies</th>
            <th scope="col">Num Companies</th>
          </tr>
        </thead>
        <tbody>
          <tr> 
            <td>${totalSpending.toFixed(2)}</td>
            <td>${Object.values(people).filter(person => person.status.alive === false).length}</td>
            <td>${Object.values(people).filter(person => person.status.alive === true).length}</td>
            <td>${Object.values(companies).filter(company => company.marketCap > 0).length}</td>
            <td>${Object.values(companies).length}</td>
          </tr>
        </tbody>
      </table>
    `;
    insertElement.insertAdjacentHTML('afterbegin', html);
  }

  function personUpkeep(personId, timeIndex) {
    if (people[personId].status.alive === true) {
      const numFoodUnitsToConsume = rand(5, 10);
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
        const foodUnitsToBuy = (numFoodUnitsToConsume - people[personId].assets.food.units) + rand(1, 5);

        const foodCompanyId = getCompanyBySector('food');

        const purchaseResult = purchaseProduct({
          personId,
          productName: 'Food Unit',
          materialsRarityFactor: 2,
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

        if (people[personId].status.hungerFactor > 0) {
          people[personId].status.hungerFactor -= 1;
        }
      }
      else {
        people[personId].status.hungerFactor += 1;
      }

      // Shelter/home, utilities check
      if (people[personId].assets.home) {
        // Pay rent if purchased temporary housing
        if (people[personId].assets.home.rent) {
          const homeInfo = people[personId].assets.home;
          if (people[personId].wealth >= homeInfo.rent) {
            people[personId].wealth -= homeInfo.rent;
            companies[homeInfo.companyId].marketCap += homeInfo.rent;

            orders.push({
              type: 'consumerSpending',
              timeIndex,
              personId,
              productName: 'Temporary Housing',
              cost: homeInfo.rent,
              units: 1,
              companyId: homeInfo.companyId
            });
          }
          else {
            people[personId].assets.home = null;
          }
        }
        // Pay mortgage
        else if (people[personId].assets.home.mortgage) {
          // pay mortgage
          // const rentAfterInterest = homeInfo.rent + (bankInterestRate * homeInfo.rent);

        }
        else {
          // owns home
          // rand sell home
        }
      }
      else {
        // no home, buy, rent, or buy with mortgage
        const tempHousingCompanyId = getCompanyBySector('tempHome');
        const bankCompanyId = getCompanyBySector('bank');
        const realEstateCompanyId = getCompanyBySector('home');

        const purchaseHomeResult = purchaseHome({
          personId,
          companyId: realEstateCompanyId,
          bankCompanyId,
          loanType: 'fixed',
          minSquareFeet: 500,
          maxSquareFeet: 2000,
          timeIndex
        });

        if (!purchaseHomeResult) {
          purchaseTempHousing({
            personId,
            companyId: tempHousingCompanyId,
            minSquareFeet: 300,
            maxSquareFeet: 1000,
            timeIndex
          });
        }
      }

      // Employment check
      if (people[personId].assets.job.companyId) {
        // rand lose job
      }
      else {
        // get job
      }

      // Additional spending, investment
      if (totalSpend < targetSpend) {
        // spend more
      }

      // Person health check (home, hungerFactor, utilities)
      // possibly die
      if (people[personId].status.hungerFactor >= HUNGER_FACTOR_DEATH) {
        people[personId].status.alive = false;
      }
    }
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

  function loanQualification(personId, loanAmount, daysToPay = 365) {
    if (people[personId].assets.job) {
      if (people[personId].wealth + (people[personId].assets.job.salary * daysToPay) >= loanAmount) {
        return true;
      }
    }
    return false;
  }

  function purchaseHome({
    personId,
    companyId,
    bankCompanyId,
    loanType = 'fixed',
    minSquareFeet,
    maxSquareFeet,
    timeIndex = 0
  }) {
    const squareFeet = rand(minSquareFeet, maxSquareFeet);
    const basePrice = squareFeet * DEFAULT_PRICE_PER_SQUARE_FOOT;
    const tax = government.corporateTax * basePrice;
    const price = basePrice + tax;

    if (people[personId].wealth < price) {
      const daysToPay = 365;
      const loanAmount = price / daysToPay;
      const personQualifys = loanQualification(personId, price, daysToPay);

      if (personQualifys) {
        companies[bankCompanyId].marketCap -= price;
        companies[companyId.marketCap] += price;
        people[personId].wealth -= loanAmount + (loanAmount * bankInterestRate);

        people[personId].assets.home = {
          squareFeet,
          mortgage: loanAmount,
          daysLeft: daysToPay,
          loanType,
          companyId,
          bankCompanyId
        };

        return true;
      }

      return false;
    }
    else {
      people[personId].wealth -= price;
      companies[companyId].marketCap += price;

      people[personId].assets.home = {
        squareFeet,
        price,
        companyId
      };

      orders.push({
        type: 'consumerSpending',
        timeIndex,
        personId,
        productName: `Purchased ${squareFeet} square foot home outright`,
        cost: price,
        units: 1,
        companyId
      });

      return true;
    }
  }

  function purchaseTempHousing({
    personId,
    companyId,
    minSquareFeet,
    maxSquareFeet,
    timeIndex = 0
  }) {
    const squareFeet = rand(minSquareFeet, maxSquareFeet);
    const basePrice = squareFeet * DEFAULT_PRICE_PER_SQUARE_FOOT;
    const tax = government.corporateTax * basePrice;
    const price = basePrice + tax;
    const rent = price / 365;

    if (people[personId].wealth >= rent) {
      people[personId].assets.home = {
        squareFeet,
        rent,
        companyId
      };

      people[personId].wealth -= rent;
      companies[companyId].marketCap += rent;

      orders.push({
        type: 'consumerSpending',
        timeIndex,
        personId,
        productName: 'Temporary Housing Rent',
        cost: rent,
        units: 1,
        companyId
      });

      return true;
    }

    return false;
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
      const taxAmount = cost * government.corporateTax;
      people[personId].wealth -= cost;
      companies[companyId].marketCap += cost - taxAmount;
      government.wealth += taxAmount;

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

  function productCost(laborRarityFactor, materialsRarityFactor, desiredProfit = 0.20, units = 1) {
    const baseCost = 1 * laborRarityFactor * materialsRarityFactor;
    const tax = baseCost * government.corporateTax;
    const desiredProfitAddition = (baseCost + tax) * desiredProfit;
    return (baseCost + tax + desiredProfitAddition) * units;
  }

  function genId() {
    let d = new Date().getTime();
    if (typeof performance !== 'undefined' && typeof performance.now === 'function'){
      d += performance.now(); // use high-precision timer if available
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
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
  }

  const runButton = document.getElementById('run-button');
  runButton.addEventListener('click', e => {
    runSim();
  });

  const inputForm = document.getElementById('input-form');
  inputForm.addEventListener('keyup', e => {
    const targetVar = e.target.dataset.param;
    if (targetVar === 'initialPopulationSize') {
      INITIAL_POPULATION_SIZE = e.target.value;
    }
    else if (targetVar === 'defaultWealthFactor') {
      DEFAULT_WEALTH_FACTOR = e.target.value;
    }
    else if (targetVar === 'daysOfExecution') {
      DAYS_OF_EXECUTION = e.target.value;
    }
    else if (targetVar === 'mpc') {
      MARGINAL_PROPENSITY_TO_COMSUME = e.target.value;
    }
    else if (targetVar === 'defaultNumberOfShares') {
      DEFAULT_NUM_SHARES = e.target.value;
    }
    else if (targetVar === 'defaultPricePerSquareFoot') {
      DEFAULT_PRICE_PER_SQUARE_FOOT = e.target.value;
    }
    else if (targetVar === 'defaultHungerFactor') {
      HUNGER_FACTOR_DEATH = e.target.value;
    }
    else if (targetVar === 'interestRate') {
      fed.interestRate = e.target.value;
    }
    else if (targetVar === 'incomeTax') {
      government.incomeTax = e.target.value;
    }
    else if (targetVar === 'corporateTax') {
      government.corporateTax = e.target.value;
    }
    else if (targetVar === 'defaultGovernmentWealth') {
      government.wealth = e.target.value;
    }
  });
})();