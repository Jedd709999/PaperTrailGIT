import os
import django
import sys

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'papertrail_backend.settings')
django.setup()

from papertrail_backend.api.models import User, StudentGroup, ThesisTopic

# Get a student user
student = User.objects.get(username='student1')
if not student:
    print("No student user found")
    exit(1)

print(f"Found student: {student.username}")

# Get the student's group
student_groups = student.student_groups.all()
if not student_groups.exists():
    print("Student is not in any groups")
    exit(1)

group = student_groups.first()
print(f"Student is in group: {group.name}")

# Check if the group has an adviser
if not group.adviser:
    print("Group does not have an adviser")
    exit(1)
else:
    print(f"Group {group.name} has adviser {group.adviser.username}")

# Create a thesis topic for the student (this should automatically assign the adviser)
thesis = ThesisTopic.objects.create(
    title="Test Thesis for Adviser Assignment",
    description="This is a test thesis to verify adviser assignment",
    student=student,
    group=group
)

print(f"Created thesis: {thesis.title}")
print(f"Thesis adviser: {thesis.adviser.username if thesis.adviser else 'None'}")

# Check if the adviser was automatically assigned
if thesis.adviser == group.adviser:
    print("SUCCESS: Adviser was automatically assigned to the thesis!")
else:
    print("FAILURE: Adviser was not assigned to the thesis")