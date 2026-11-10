// Single source of truth for what you sell. Prices are in euro cents.
// The checkout page only sends the ids; the server looks up the price here,
// so nobody can change a price from the browser.
export const PRODUCTS = {
  north:     { name: 'Explore the North', amount: 800 },
  rural:     { name: 'The Rural Heart',                  amount: 800 },
  windmills: { name: 'Spot the Windmills',                amount: 800 },
};

export const CURRENCY = 'eur';
