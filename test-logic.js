const BookingLogic = require('./RPK-main/booking-logic');

function test() {
  console.log("Testing BookingLogic...");

  // Test Price Calculation
  const price1 = BookingLogic.calculatePrice(10, "Business Class");
  console.log(`10km Business Class: expected 15, got ${price1}`);
  if (price1 !== 15) throw new Error("Price calculation failed");

  const price2 = BookingLogic.calculatePrice(10, "First Class Executive");
  console.log(`10km First Class: expected 35, got ${price2}`);
  if (price2 !== 35) throw new Error("Price calculation failed");

  const price3 = BookingLogic.calculatePrice(10, "Mercedes V-Class", ["Child Seat"]);
  console.log(`10km V-Class + Child Seat: expected 40, got ${price3}`);
  if (price3 !== 40) throw new Error("Price calculation failed");

  // Test Date Parsing - Use a date in 2027 to be safe
  const date = BookingLogic.parseDate("25-12-2027", "14:30");
  console.log(`Parsing 25-12-2027 14:30: ${date.toISOString()}`);
  if (date.getDate() !== 25 || date.getMonth() !== 11 || date.getFullYear() !== 2027) throw new Error("Date parsing failed");

  // Test Validation
  const validData = {
    pickup: "Gent",
    destination: "Brussel",
    date: "25-12-2027",
    time: "14:30",
    name: "John Doe",
    email: "john@example.com",
    phone: "+32470123456",
    vehicle: "Business Class",
    payment_method: "Cash"
  };
  const val1 = BookingLogic.validateBooking(validData);
  console.log(`Validating correct data: isValid=${val1.isValid}, errors=${JSON.stringify(val1.errors)}, missingFields=${JSON.stringify(val1.missingFields)}`);
  if (!val1.isValid) throw new Error("Validation failed on valid data");

  const invalidData = { ...validData, payment_method: "Gold" };
  const val2 = BookingLogic.validateBooking(invalidData);
  console.log(`Validating invalid payment: isValid=${val2.isValid}, errors=${JSON.stringify(val2.errors)}`);
  if (val2.isValid) throw new Error("Validation passed on invalid payment");

  console.log("All BookingLogic tests passed!");
}

test();
