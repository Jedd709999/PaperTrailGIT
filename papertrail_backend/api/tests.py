from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from .models import StudentGroup, ThesisTopic

User = get_user_model()

class ThesisTopicAdviserAssignmentTest(TestCase):
    def setUp(self):
        # Create users
        self.student = User.objects.create_user(
            username='teststudent',
            email='student@test.com',
            password='testpass123',
            role='Student'
        )
        
        self.adviser = User.objects.create_user(
            username='testadviser',
            email='adviser@test.com',
            password='testpass123',
            role='Adviser'
        )
        
        self.admin = User.objects.create_superuser(
            username='testadmin',
            email='admin@test.com',
            password='testpass123'
        )
        
        # Create a group with the adviser assigned
        self.group = StudentGroup.objects.create(
            name='Test Group',
            adviser=self.adviser
        )
        self.group.students.add(self.student)
        
        # Create API client
        self.client = APIClient()

    def test_adviser_assignment_on_thesis_creation(self):
        # Get JWT token for the student
        refresh = RefreshToken.for_user(self.student)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        # Create a thesis topic via the API (this should trigger perform_create)
        response = self.client.post('/api/thesis-topics/', {
            'title': 'Test Thesis',
            'description': 'Test Description'
        })
        
        # Print response for debugging
        print(f"Response status: {response.status_code}")
        print(f"Response data: {response.data}")
        
        # Check that the thesis was created successfully
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Get the created thesis
        thesis = ThesisTopic.objects.get(title='Test Thesis')
        
        # Check that the adviser was automatically assigned
        self.assertIsNotNone(thesis.adviser)
        self.assertEqual(thesis.adviser, self.adviser)
        
        print(f"Thesis created: {thesis.title}")
        print(f"Thesis adviser: {thesis.adviser.username if thesis.adviser else 'None'}")
        print("SUCCESS: Adviser was automatically assigned to the thesis!")