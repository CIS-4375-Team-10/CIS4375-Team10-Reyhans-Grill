CREATE TABLE IF NOT EXISTS Electronic_Income (
  Electronic_ID INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  Income_Date DATE NOT NULL,
  Channel VARCHAR(40) NOT NULL,
  Amount DECIMAL(12, 2) NOT NULL,
  Notes VARCHAR(120),
  Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  Updated_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS Cash_Income (
  Cash_ID INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  Income_Date DATE NOT NULL,
  Amount DECIMAL(12, 2) NOT NULL,
  Notes VARCHAR(120),
  Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  Updated_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS Expense (
  Expense_ID INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  Expense_Date DATE NOT NULL,
  Payment_Type VARCHAR(40) NOT NULL,
  Paid_To VARCHAR(120) NOT NULL,
  Description VARCHAR(255),
  Amount DECIMAL(12, 2) NOT NULL,
  Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  Updated_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO Expense (Expense_Date, Payment_Type, Paid_To, Description, Amount) VALUES
('2025-11-02', 'CHASE', 'Costco', 'Groceries + supplies', 375.15),
('2025-11-02', 'CHASE', 'Hong K', 'Produce', 85.20),
('2025-11-02', 'CHASE', 'HEB', 'Groceries', 13.98),
('2025-11-03', 'CHASE', 'Flex LLC', 'Rent', 2010.00),
('2025-11-03', 'CHASE', 'HEB', 'Produce', 13.98),
('2025-11-05', 'CHASE', 'Restaurant Depot', 'Inventory restock', 444.34),
('2025-11-05', 'CHASE', 'Costco', 'Inventory restock', 40.81),
('2025-11-08', 'CHASE', 'John', 'Zelle transfer', 35.44),
('2025-11-08', 'CHASE', 'H Propane', 'Propane refill', 70.00),
('2025-11-08', 'CHASE', 'Costco', 'Bulk groceries', 500.81),
('2025-11-09', 'CHASE', 'Hood Cleaning', 'Service', 220.00),
('2025-11-12', 'CHASE', 'Restaurant Depot', 'Inventory restock', 785.91),
('2025-11-15', 'CHASE', 'Phoenicia', 'Specialty goods', 223.58),
('2025-11-15', 'CHASE', 'Sales Tax', 'Monthly payment', 1971.41),
('2025-11-18', 'CHASE', 'Faisal', 'Supplies', 6.82),
('2025-11-22', 'CHASE', 'Fire Marshal', 'Inspection fee', 195.00),
('2025-11-23', 'CHASE', 'Costco', 'Inventory restock', 124.60),
('2025-11-24', 'CHASE', 'Ace Hardware', 'Maintenance supplies', 19.03),
('2025-11-26', 'CHASE', 'Fiesta', 'Groceries', 15.60),
('2025-11-29', 'CHASE', 'Bibek Insurance', 'Insurance premium', 37.50),
('2025-11-29', 'CHASE', 'Go Daddy', 'Domain renewal', 100.00),
('2025-11-30', 'CHASE', 'Restaurant Depot', 'Inventory restock', 113.24),
('2025-11-30', 'MJ', 'T-Mobile', 'Phone service', 40.00),
('2025-11-30', 'MJ', 'Electric Company', 'Utilities', 90.00);

INSERT INTO Cash_Income (Income_Date, Amount, Notes) VALUES
('2025-11-02', 16.00, 'Daily closeout'),
('2025-11-03', 115.00, 'Daily closeout'),
('2025-11-05', 150.00, 'Weekend boost'),
('2025-11-07', 20.00, 'Daily closeout'),
('2025-11-10', 100.00, 'Daily closeout'),
('2025-11-13', 71.00, 'Daily closeout'),
('2025-11-17', 38.00, 'Daily closeout'),
('2025-11-20', 89.00, 'Daily closeout'),
('2025-11-23', 430.00, 'Large catering payment'),
('2025-11-27', 255.00, 'Holiday traffic'),
('2025-11-30', 20.00, 'Daily closeout');

INSERT INTO Electronic_Income (Income_Date, Channel, Amount, Notes) VALUES
('2025-11-02', 'Card', 209.87, NULL),
('2025-11-02', 'DoorDash', 192.70, NULL),
('2025-11-02', 'UberEats', 40.50, NULL),
('2025-11-03', 'Card', 409.28, NULL),
('2025-11-04', 'DoorDash', 178.62, NULL),
('2025-11-05', 'UberEats', 190.31, NULL),
('2025-11-06', 'GrubHub', 27.98, NULL),
('2025-11-07', 'Card', 640.73, NULL),
('2025-11-09', 'DoorDash', 202.15, NULL),
('2025-11-10', 'Card', 429.41, NULL),
('2025-11-12', 'Card', 869.10, NULL),
('2025-11-13', 'DoorDash', 299.33, NULL),
('2025-11-14', 'Card', 433.24, NULL),
('2025-11-16', 'Card', 272.50, NULL),
('2025-11-17', 'DoorDash', 151.57, NULL),
('2025-11-18', 'Card', 359.27, NULL),
('2025-11-19', 'DoorDash', 788.31, NULL),
('2025-11-20', 'Card', 807.10, NULL),
('2025-11-23', 'UberEats', 90.07, NULL),
('2025-11-24', 'Card', 681.71, NULL),
('2025-11-25', 'Card', 593.69, NULL),
('2025-11-26', 'Card', 1453.43, NULL),
('2025-11-27', 'GrubHub', 90.93, NULL),
('2025-11-28', 'Card', 1073.95, NULL),
('2025-11-29', 'DoorDash', 263.05, NULL),
('2025-11-30', 'UberEats', 79.91, NULL),
('2025-11-30', 'GrubHub', 119.49, NULL);
