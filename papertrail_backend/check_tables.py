import sqlite3

conn = sqlite3.connect('db.sqlite3')
cursor = conn.cursor()

# Check if api_thesisdocument exists
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='api_thesisdocument';")
doc_table_exists = cursor.fetchone()

print(f"api_thesisdocument exists: {doc_table_exists is not None}")

if doc_table_exists:
    cursor.execute('PRAGMA table_info(api_thesisdocument)')
    columns = cursor.fetchall()
    print("\napi_thesisdocument columns:")
    doc_type_id_exists = False
    for col in columns:
        print(f"  {col[1]} ({col[2]})")
        if col[1] == 'doc_type_id':
            doc_type_id_exists = True
    
    print(f"\ndoc_type_id column exists: {doc_type_id_exists}")

conn.close()
