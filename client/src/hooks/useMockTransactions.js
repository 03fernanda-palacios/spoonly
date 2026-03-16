// Returns a date string N days ago from today
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const MOCK_TRANSACTIONS = [
  { date: daysAgo(1),  name: 'Office Cafeteria', amount: 11.00, category: ['Food and Drink', 'Restaurants'] },
  { date: daysAgo(3),  name: 'Sweetgreen',        amount: 14.50, category: ['Food and Drink', 'Restaurants'] },
  { date: daysAgo(4),  name: 'Office Cafeteria',  amount: 11.00, category: ['Food and Drink', 'Restaurants'] },
  { date: daysAgo(5),  name: 'Uber Eats',          amount: 23.80, category: ['Food and Drink', 'Restaurants'] },
  { date: daysAgo(6),  name: 'Whole Foods',        amount: 58.40, category: ['Food and Drink', 'Groceries'] },
  { date: daysAgo(7),  name: 'Chipotle',           amount: 13.25, category: ['Food and Drink', 'Restaurants'] },
  { date: daysAgo(8),  name: 'Office Cafeteria',  amount: 11.00, category: ['Food and Drink', 'Restaurants'] },
  { date: daysAgo(10), name: 'Sweetgreen',        amount: 14.50, category: ['Food and Drink', 'Restaurants'] },
  { date: daysAgo(11), name: 'Trader Joe\'s',     amount: 39.90, category: ['Food and Drink', 'Groceries'] },
  { date: daysAgo(13), name: 'Whole Foods',        amount: 44.10, category: ['Food and Drink', 'Groceries'] },
];

export function deriveSpendingContext(transactions) {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const restaurants = transactions.filter(t => t.category[1] === 'Restaurants');
  const weeklyAll   = transactions.filter(t => new Date(t.date).getTime() >= weekAgo);

  const weeklySpend   = weeklyAll.reduce((sum, t) => sum + t.amount, 0);
  const avgMealCost   = restaurants.reduce((sum, t) => sum + t.amount, 0) / restaurants.length;
  const cafeteriaHits = transactions.filter(t => t.name === 'Office Cafeteria').length;
  const comfortBudget = Math.round(avgMealCost * 1.1);

  const cafeteriaNote = cafeteriaHits >= 3
    ? `frequently eats unsatisfying cafeteria food (${cafeteriaHits}x recently — eager for better alternatives)`
    : cafeteriaHits > 0
      ? `has eaten cafeteria food ${cafeteriaHits}x recently`
      : 'avoids cafeteria food';

  return [
    `Weekly food spend: $${weeklySpend.toFixed(2)}.`,
    `Average restaurant meal: $${avgMealCost.toFixed(2)}.`,
    `User ${cafeteriaNote}.`,
    `Comfortable meal budget: ~$${comfortBudget} per meal.`,
  ].join(' ');
}

export default function useMockTransactions() {
  return MOCK_TRANSACTIONS;
}
