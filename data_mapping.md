# Pharmacore Data Mapping

This document outlines the data structure for the Pharmacore system. Each table includes 8 additional buffer fields to accommodate future expansion.

## 1. Medicines (Inventory)
Stores all medicine records, stock levels, and storage requirements.

| Field Name | Data Type | Description |
|------------|-----------|-------------|
| id | UUID / String | Primary Key |
| name | String | Medicine name and dosage |
| sku | String | Stock Keeping Unit |
| category | Enum | Prescription (Rx), OTC, Cold Chain, Controlled |
| batch | String | Batch number |
| expiry_date | Date | Expiration date |
| price | Decimal | Selling price |
| purchase_price | Decimal | Cost price |
| stock | Integer | Current quantity in hand |
| reorder_point | Integer | Threshold for low stock alerts |
| storage_type | Enum | Room temp, Cold, Controlled |
| is_perishable | Boolean | Flag for sensitive items |
| buffer_field_1 | Text | Reserved for future use |
| buffer_field_2 | Text | Reserved for future use |
| buffer_field_3 | Text | Reserved for future use |
| buffer_field_4 | Text | Reserved for future use |
| buffer_field_5 | Text | Reserved for future use |
| buffer_field_6 | Text | Reserved for future use |
| buffer_field_7 | Text | Reserved for future use |
| buffer_field_8 | Text | Reserved for future use |

## 2. Sales (POS Transactions)
Records every customer transaction.

| Field Name | Data Type | Description |
|------------|-----------|-------------|
| id | UUID / String | Primary Key |
| transaction_id | String | Human-readable ID (e.g., TXN-1001) |
| customer_id | UUID / String | Link to Customers table (Optional) |
| timestamp | DateTime | Date and time of sale |
| subtotal | Decimal | Total before tax |
| vat_amount | Decimal | Value Added Tax (5%) |
| total_amount | Decimal | Final payable amount |
| payment_method | Enum | Cash, Card, Rewards |
| status | Enum | Completed, Refunded, Cancelled |
| buffer_field_1 | Text | Reserved for future use |
| buffer_field_2 | Text | Reserved for future use |
| buffer_field_3 | Text | Reserved for future use |
| buffer_field_4 | Text | Reserved for future use |
| buffer_field_5 | Text | Reserved for future use |
| buffer_field_6 | Text | Reserved for future use |
| buffer_field_7 | Text | Reserved for future use |
| buffer_field_8 | Text | Reserved for future use |

## 3. Customers
Stores patient and customer information.

| Field Name | Data Type | Description |
|------------|-----------|-------------|
| id | UUID / String | Primary Key |
| name | String | Full name |
| phone | String | Contact number |
| email | String | Email address |
| emirates_id | String | National ID for Rx validation |
| reward_points | Integer | Accumulated loyalty points |
| last_visit | Date | Date of last transaction |
| buffer_field_1 | Text | Reserved for future use |
| buffer_field_2 | Text | Reserved for future use |
| buffer_field_3 | Text | Reserved for future use |
| buffer_field_4 | Text | Reserved for future use |
| buffer_field_5 | Text | Reserved for future use |
| buffer_field_6 | Text | Reserved for future use |
| buffer_field_7 | Text | Reserved for future use |
| buffer_field_8 | Text | Reserved for future use |

## 4. Procurement (GRN & Suppliers)
Tracks incoming stock from suppliers.

| Field Name | Data Type | Description |
|------------|-----------|-------------|
| id | UUID / String | Primary Key |
| supplier_name | String | Name of the supplier |
| invoice_no | String | Supplier invoice reference |
| grn_no | String | Goods Received Note number |
| date_received | Date | Date items were received |
| total_cost | Decimal | Total purchase cost |
| status | Enum | Pending, Received, Partially Received |
| buffer_field_1 | Text | Reserved for future use |
| buffer_field_2 | Text | Reserved for future use |
| buffer_field_3 | Text | Reserved for future use |
| buffer_field_4 | Text | Reserved for future use |
| buffer_field_5 | Text | Reserved for future use |
| buffer_field_6 | Text | Reserved for future use |
| buffer_field_7 | Text | Reserved for future use |
| buffer_field_8 | Text | Reserved for future use |

## 5. HR & Payroll
Manages staff details and monthly payments.

| Field Name | Data Type | Description |
|------------|-----------|-------------|
| id | UUID / String | Primary Key |
| employee_name | String | Full name |
| role | String | Pharmacist, Assistant, Manager, etc. |
| join_date | Date | Employment start date |
| base_salary | Decimal | Monthly base pay |
| deductions | Decimal | Taxes, penalties, etc. |
| bonuses | Decimal | Performance incentives |
| net_pay | Decimal | Final payable salary |
| status | Enum | Active, Terminated, On Leave |
| buffer_field_1 | Text | Reserved for future use |
| buffer_field_2 | Text | Reserved for future use |
| buffer_field_3 | Text | Reserved for future use |
| buffer_field_4 | Text | Reserved for future use |
| buffer_field_5 | Text | Reserved for future use |
| buffer_field_6 | Text | Reserved for future use |
| buffer_field_7 | Text | Reserved for future use |
| buffer_field_8 | Text | Reserved for future use |

## 6. Cold Store Logs
Monitoring temperature and humidity for sensitive medicines.

| Field Name | Data Type | Description |
|------------|-----------|-------------|
| id | UUID / String | Primary Key |
| zone_name | String | Name of the cooling zone |
| timestamp | DateTime | Reading time |
| temperature | Decimal | Recorded temperature (°C) |
| humidity | Decimal | Recorded humidity (%) |
| status | Enum | Normal, Warning, Critical |
| recorded_by | String | Sensor ID or Employee name |
| buffer_field_1 | Text | Reserved for future use |
| buffer_field_2 | Text | Reserved for future use |
| buffer_field_3 | Text | Reserved for future use |
| buffer_field_4 | Text | Reserved for future use |
| buffer_field_5 | Text | Reserved for future use |
| buffer_field_6 | Text | Reserved for future use |
| buffer_field_7 | Text | Reserved for future use |
| buffer_field_8 | Text | Reserved for future use |

## 7. Prescriptions (Rx Validation)
Validating and recording doctor-issued prescriptions.

| Field Name | Data Type | Description |
|------------|-----------|-------------|
| id | UUID / String | Primary Key |
| rx_number | String | Unique prescription ID |
| patient_id | UUID / String | Link to Customers table |
| doctor_name | String | Issuing physician |
| facility_name | String | Hospital or Clinic name |
| date_issued | Date | Date on prescription |
| status | Enum | Validated, Dispensed, Rejected |
| scan_url | String | Link to scanned image/PDF |
| buffer_field_1 | Text | Reserved for future use |
| buffer_field_2 | Text | Reserved for future use |
| buffer_field_3 | Text | Reserved for future use |
| buffer_field_4 | Text | Reserved for future use |
| buffer_field_5 | Text | Reserved for future use |
| buffer_field_6 | Text | Reserved for future use |
| buffer_field_7 | Text | Reserved for future use |
| buffer_field_8 | Text | Reserved for future use |

## 8. Finance (Treasury & Cashflow)
Tracking all incoming and outgoing funds.

| Field Name | Data Type | Description |
|------------|-----------|-------------|
| id | UUID / String | Primary Key |
| transaction_type | Enum | Income, Expense, Transfer |
| category | Enum | Sales, Salary, Rent, Utility, Stock Purchase |
| amount | Decimal | Monetary value |
| date | Date | Date of transaction |
| description | Text | Detailed notes |
| payment_source | String | Bank account, Cash box, etc. |
| buffer_field_1 | Text | Reserved for future use |
| buffer_field_2 | Text | Reserved for future use |
| buffer_field_3 | Text | Reserved for future use |
| buffer_field_4 | Text | Reserved for future use |
| buffer_field_5 | Text | Reserved for future use |
| buffer_field_6 | Text | Reserved for future use |
| buffer_field_7 | Text | Reserved for future use |
| buffer_field_8 | Text | Reserved for future use |
