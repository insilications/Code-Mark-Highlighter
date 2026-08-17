/**
 * Generates an array of mock users.
 * @param {number} count - The number of users to generate.
 */
function generateUsers(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `usr_${index}`,
    name: `User ${index}`,
    email: `user${index}@example.com`,
    isActive: Math.random() > 0.2, // 80% chance to be active
  }));
}

/**
 * Generates an array of mock orders linked to the provided users.
 * @param {number} orderCount - The number of orders to generate.
 * @param {Array} users - The array of generated users to pick IDs from.
 */
function generateOrders(orderCount, users) {
  const userCount = users.length;

  return Array.from({ length: orderCount }, (_, index) => {
    // Pick a random user to ensure .find() has to do actual work
    const randomUserIndex = Math.floor(Math.random() * userCount);

    return {
      id: `ord_${index}`,
      userId: users[randomUserIndex].id,
      amount: Number((Math.random() * 500).toFixed(2)),
      createdAt: new Date().toISOString(),
    };
  });
}

// --- Usage for your benchmark ---
// Try scaling these numbers up (e.g., 10,000 users and 50,000 orders)
// to see how the nested loops impact performance.
const mockUsers = generateUsers(1000);
const mockOrders = generateOrders(5000, mockUsers);

// Your snippet:
console.time('Enrichment Time');
const usersById = new Map(mockUsers.map((user) => [user.id, user]));
const enrichedOrders = mockOrders.map((order) => ({
  ...order,
  user: usersById.get(order.userId),
}));
console.timeEnd('Enrichment Time');


