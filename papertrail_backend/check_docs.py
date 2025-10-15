import os
import sys
import django

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set the Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'papertrail_backend.settings')

# Setup Django
django.setup()

from api.models import ThesisDocument, User

# Get all documents
docs = ThesisDocument.objects.all()
print(f"Total documents: {docs.count()}")

# Print details of each document
for doc in docs:
    uploader_name = "Unknown"
    if doc.uploaded_by:
        if doc.uploaded_by.first_name or doc.uploaded_by.last_name:
            uploader_name = f"{doc.uploaded_by.first_name} {doc.uploaded_by.last_name}".strip()
        else:
            uploader_name = doc.uploaded_by.username
    print(f"Document ID: {doc.id}, Filename: {doc.original_filename}, Uploaded by: {uploader_name}")