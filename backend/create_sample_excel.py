import pandas as pd
import os

# Sample data matching your format
data = [
    {
        "contact_id": "76030014",
        "phone": "15058822424",
        "first_name": "Jim",
        "last_name": "Cravens",
        "title": "Owner",
        "company": "Gordos Gifts",
        "street": "5818 Dunlin Dr",
        "city": "Las Cruces",
        "state": "NM",
        "zip": "88013",
        "web_site": None,
        "annual_sales": None,
        "employee_count": None,
        "sic_code": "5947",
        "industry": None,
        "recording": "1"
    },
    {
        "contact_id": "74159244",
        "phone": "18316632858",
        "first_name": "CAROL",
        "last_name": "RYCHENER",
        "title": "PRINCIPAL",
        "company": "RADIOS PLUS",
        "street": "17080 BLACKIE RD",
        "city": "SALINAS",
        "state": "CA",
        "zip": "93907-8874",
        "web_site": None,
        "annual_sales": "LESS THAN $500,000",
        "employee_count": "1 TO 4",
        "sic_code": "5731",
        "industry": "ELECTRONIC EQUIPMENT & SUPPLIES-RETAIL",
        "recording": "0"
    }
]

# Create DataFrame
df = pd.DataFrame(data)

# Save to Excel
output_file = "sample_leads.xlsx"
df.to_excel(output_file, index=False)

print(f"Sample Excel file created: {output_file}")
print(f"\nColumns: {list(df.columns)}")
print(f"Rows: {len(df)}")
print("\nPreview:")
print(df.to_string())
