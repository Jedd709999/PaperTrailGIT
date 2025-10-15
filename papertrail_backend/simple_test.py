import os
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'papertrail_backend.settings')
django.setup()

# Now we can import Django models
from api.models import User, StudentGroup, ThesisTopic

# Get a student user
student = User.objects.get(username='student1')
print(f"Found student: {student.username}")

# Get the student's group
student_groups = student.student_groups.all()
print(f"Student is in {student_groups.count()} groups")

if student_groups.exists():
    group = student_groups.first()
    print(f"First group: {group.name}")
    print(f"Group adviser: {group.adviser.username if group.adviser else 'None'}")
    
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
else:
    print("Student is not in any groups")