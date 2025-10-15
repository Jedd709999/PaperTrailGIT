import os
import sys
import django

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'papertrail_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from papertrail_backend.api.models import StudentGroup
from django.test import Client

User = get_user_model()

def test_group_creation():
    print("Testing group creation with new fields...")
    
    # Get users
    try:
        admin_user = User.objects.get(username='admin0')
        student1 = User.objects.get(username='student1')
        student2 = User.objects.get(username='student2')
        adviser = User.objects.get(username='adviser1')
        panel1 = User.objects.get(username='panel1')
        panel2 = User.objects.get(username='panel2')
        print(f"Found users: admin={admin_user.username}, students={student1.username}, {student2.username}, adviser={adviser.username}, panels={panel1.username}, {panel2.username}")
    except User.DoesNotExist as e:
        print(f"Error: Required user not found - {e}")
        return
    
    # Create a group with new fields
    try:
        group = StudentGroup.objects.create(
            name="Test Research Group",
            year=2025,
            course="Computer Science",
            thesis_title="Advanced Machine Learning Applications",
            created_by=admin_user
        )
        print(f"Created group: {group.name}")
        print(f"Year: {group.year}")
        print(f"Course: {group.course}")
        print(f"Thesis Title: {group.thesis_title}")
        
        # Add students
        group.students.add(student1, student2)
        print(f"Added students: {student1.username}, {student2.username}")
        
        # Assign adviser
        group.adviser = adviser
        group.save()
        print(f"Assigned adviser: {adviser.username}")
        
        # Assign panel members
        group.panel_members.add(panel1, panel2)
        print(f"Assigned panel members: {panel1.username}, {panel2.username}")
        
        print("Group creation test PASSED!")
        
    except Exception as e:
        print(f"Error creating group: {e}")
        return

def test_api_endpoints():
    print("\nTesting API endpoints...")
    
    # Get users
    try:
        admin_user = User.objects.get(username='admin0')
        student1 = User.objects.get(username='student1')
        # These variables aren't used in this function, so we'll comment them out
        # adviser = User.objects.get(username='adviser1')
        # panel1 = User.objects.get(username='panel1')
    except User.DoesNotExist as e:
        print(f"Error: Required user not found - {e}")
        return
    
    # Create API client
    client = Client()
    
    # Generate JWT token for admin user
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(admin_user)
    access_token = str(refresh.access_token)
    
    # Test creating a group via API
    try:
        response = client.post('/api/student-groups/', {
            'name': 'API Test Group',
            'year': 2025,
            'course': 'Data Science',
            'thesis_title': 'Neural Networks in Healthcare',
            'students': [student1.id]
        }, content_type='application/json', HTTP_AUTHORIZATION=f'Bearer {access_token}')
        
        if response.status_code == 201:
            print("API group creation test PASSED!")
            group_data = response.json()
            print(f"Created group: {group_data['name']}")
            print(f"Year: {group_data.get('year', 'N/A')}")
            print(f"Course: {group_data.get('course', 'N/A')}")
            print(f"Thesis Title: {group_data.get('thesis_title', 'N/A')}")
        else:
            print(f"API group creation test FAILED with status {response.status_code}")
            print(f"Response: {response.json()}")
            
    except Exception as e:
        print(f"Error testing API endpoints: {e}")

if __name__ == "__main__":
    test_group_creation()
    test_api_endpoints()