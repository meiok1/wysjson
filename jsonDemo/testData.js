// wysJSON Extension Test Data

// Test 1: Simple JSON object
const simpleData = {
  name: "John Doe",
  age: 30,
  active: true,
  email: "john@example.com",
  新列: [{
    value: 1,
    新列: 1
  }, {
    value: 1,
    新列: 1
  }]
};


console.log("Simple Data:", simpleData);
// Test 2: Nested JSON with array
const nestedData = {
  users: [
    { id: 1, name: "Alice", email: "alice@example.com" },
    { id: 2, name: "Bob", email: "bob@example.com" },
    { id: 3, name: "Charlie", email: "charlie@example.com" }
  ],
  meta: {
    total: 3,
    page: 1,
    status: "success"
  }
};

// Test 3: Mixed with non-JSON (functions, Date, etc.)
const complexData = {
  name: "Project",
  created: new Date("2024-01-01"),
  handler: function(item) { 
    console.log("Processing:", item); 
  },
  items: [{
    id: 1,
    value: 100,
    新列: 100,
    新列2: 100
  }, {
    id: 1,
    value: 100,
    新列: 100,
    新列2: 100
  }, {
    id: 1,
    value: 100,
    新列: 100,
    新列2: 100
  }, {
    id: 1,
    value: 100,
    新列: 100,
    新列2: 100
  }, {
    id: 1,
    value: 100,
    新列: 100,
    新列2: 100
  }],
  undefined_field: undefined,
  bigint_field: BigInt(123456789),
  symbol_field: Symbol("test")
};

// Test 4: Array of simple values
const simpleArray = ["apple", "banana", "cherry", "date", "elderberry", "11", 11, 11, 11]

// Test 5: Array of objects
[{
  x: 333,
  y: 333
}, {
  x: 333,
  y: 333
}, {
  x: 333,
  y: 333
}, {
  x: 333,
  y: 333
}, {
  x: 333,
  y: 333
}, {
  x: 10,
  y: 10
}]
