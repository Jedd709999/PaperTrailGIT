from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from api.models import StudentGroup, ThesisTopic, ThesisDocument, ThesisStatusHistory, DefenseSchedule, Evaluation, Comment, Notification, DocumentType
from django.utils import timezone
import random

User = get_user_model()

class Command(BaseCommand):
    help = 'Create sample data for PaperTrail demo'

    def handle(self, *args, **options):
        self.stdout.write('Creating sample data...')
        
        # Create sample users
        users = self.create_users()
        
        # Create document types
        doc_types = self.create_document_types()
        
        # Create student groups
        groups = self.create_student_groups(users)
        
        # Create thesis topics
        theses = self.create_thesis_topics(users, groups)
        
        # Create thesis documents
        documents = self.create_thesis_documents(theses, users, doc_types)
        
        # Create comments
        self.create_comments(theses, users)
        
        # Create evaluations
        self.create_evaluations(theses, users)
        
        # Create notifications
        self.create_notifications(users, theses)
        
        # Create defense schedules
        self.create_defense_schedules(theses, users)
        
        self.stdout.write(self.style.SUCCESS('Sample data created successfully!'))
        
        # Print login credentials
        self.stdout.write('\n' + '='*50)
        self.stdout.write('Demo Login Credentials:')
        self.stdout.write('='*50)
        self.stdout.write('Admin: admin / admin123')
        self.stdout.write('Adviser: adviser1 / adviser123')
        self.stdout.write('Panel: panel1 / panel123')
        self.stdout.write('Student: student1 / student123')
        self.stdout.write('='*50)

    def create_users(self):
        self.stdout.write('Creating users...')
        users = {}
        
        # Admin
        users['admin'] = User.objects.create_user(
            username='admin',
            email='admin@university.edu',
            password='admin123',
            first_name='System',
            last_name='Administrator',
            role='Admin',
            student_id='ADMIN001',
            department='Computer Science'
        )
        
        # Advisers
        for i in range(1, 3):
            username = f'adviser{i}'
            users[username] = User.objects.create_user(
                username=username,
                email=f'{username}@university.edu',
                password='adviser123',
                first_name=f'Adviser',
                last_name=str(i),
                role='Adviser',
                student_id=f'ADV{i:03d}',
                department='Computer Science'
            )
        
        # Panel members
        for i in range(1, 4):
            username = f'panel{i}'
            users[username] = User.objects.create_user(
                username=username,
                email=f'{username}@university.edu',
                password='panel123',
                first_name=f'Panel',
                last_name=str(i),
                role='Panel',
                student_id=f'PAN{i:03d}',
                department='Computer Science'
            )
        
        # Students
        for i in range(1, 6):
            username = f'student{i}'
            users[username] = User.objects.create_user(
                username=username,
                email=f'{username}@university.edu',
                password='student123',
                first_name=f'Student',
                last_name=str(i),
                role='Student',
                student_id=f'STU{i:03d}',
                department='Computer Science'
            )
        
        return users

    def create_document_types(self):
        self.stdout.write('Creating document types...')
        doc_types = {}
        types_data = [
            ('proposal', 'Thesis Proposal'),
            ('chapter1', 'Chapter 1 - Introduction'),
            ('chapter2', 'Chapter 2 - Literature Review'),
            ('chapter3', 'Chapter 3 - Methodology'),
            ('chapter4', 'Chapter 4 - Results'),
            ('chapter5', 'Chapter 5 - Discussion'),
            ('final', 'Final Manuscript'),
            ('defense', 'Defense Presentation'),
        ]
        
        for code, name in types_data:
            doc_types[code] = DocumentType.objects.create(
                code=code,
                name=name,
                description=f'Document type for {name.lower()}'
            )
        
        return doc_types

    def create_student_groups(self, users):
        self.stdout.write('Creating student groups...')
        groups = []
        
        # Group 1
        group1 = StudentGroup.objects.create(
            name='Thesis Group A',
            description='Machine Learning Research Group'
        )
        group1.students.add(users['student1'], users['student2'])
        group1.adviser = users['adviser1']
        group1.panel_members.add(users['panel1'], users['panel2'])
        group1.save()
        groups.append(group1)
        
        # Group 2
        group2 = StudentGroup.objects.create(
            name='Thesis Group B',
            description='Web Development Research Group'
        )
        group2.students.add(users['student3'], users['student4'])
        group2.adviser = users['adviser2']
        group2.panel_members.add(users['panel2'], users['panel3'])
        group2.save()
        groups.append(group2)
        
        return groups

    def create_thesis_topics(self, users, groups):
        self.stdout.write('Creating thesis topics...')
        theses = []
        
        topics_data = [
            {
                'title': 'Machine Learning Applications in Healthcare',
                'description': 'This research explores the application of machine learning algorithms in healthcare systems for disease prediction and diagnosis.',
                'keywords': 'machine learning, healthcare, ai, prediction',
                'student': users['student1'],
                'group': groups[0]
            },
            {
                'title': 'Web Security in Modern Applications',
                'description': 'A comprehensive study of web security vulnerabilities and mitigation strategies in modern web applications.',
                'keywords': 'web security, cybersecurity, vulnerabilities',
                'student': users['student3'],
                'group': groups[1]
            },
            {
                'title': 'Blockchain Technology for Supply Chain Management',
                'description': 'Investigating the implementation of blockchain technology to improve transparency and efficiency in supply chain management.',
                'keywords': 'blockchain, supply chain, transparency',
                'student': users['student2'],
                'group': groups[0]
            }
        ]
        
        for data in topics_data:
            thesis = ThesisTopic.objects.create(
                title=data['title'],
                description=data['description'],
                keywords=data['keywords'],
                student=data['student'],
                group=data['group'],
                status=random.choice(['Pending', 'Approved', 'In Progress', 'Under Review'])
            )
            
            # Create status history
            ThesisStatusHistory.objects.create(
                thesis=thesis,
                status=thesis.status,
                notes='Initial status',
                changed_by=users['admin']
            )
            
            theses.append(thesis)
        
        return theses

    def create_thesis_documents(self, theses, users, doc_types):
        self.stdout.write('Creating thesis documents...')
        documents = []
        
        # Create some sample documents for each thesis
        for thesis in theses:
            # Create proposal document
            doc = ThesisDocument.objects.create(
                thesis=thesis,
                doc_type='proposal',
                original_filename='thesis_proposal.pdf',
                file_size=1024000,  # 1MB
                version=1,
                uploaded_by=thesis.student,
                is_latest=True
            )
            documents.append(doc)
            
            # Create chapter 1 document for some theses
            if thesis.status in ['In Progress', 'Under Review']:
                doc = ThesisDocument.objects.create(
                    thesis=thesis,
                    doc_type='chapter1',
                    original_filename='chapter1_introduction.pdf',
                    file_size=2048000,  # 2MB
                    version=1,
                    uploaded_by=thesis.student,
                    is_latest=True
                )
                documents.append(doc)
        
        return documents

    def create_comments(self, theses, users):
        self.stdout.write('Creating comments...')
        
        comments_data = [
            {
                'text': 'Great start on the proposal! Please expand on the methodology section.',
                'comment_type': 'general',
                'thesis': theses[0],
                'user': users['adviser1']
            },
            {
                'text': 'The research questions are well-defined. Consider adding more related work.',
                'comment_type': 'general',
                'thesis': theses[0],
                'user': users['panel1']
            },
            {
                'text': 'Excellent literature review. The theoretical framework is solid.',
                'comment_type': 'general',
                'thesis': theses[1],
                'user': users['adviser2']
            }
        ]
        
        for data in comments_data:
            Comment.objects.create(
                text=data['text'],
                comment_type=data['comment_type'],
                thesis=data['thesis'],
                user=data['user'],
                is_resolved=random.choice([True, False])
            )

    def create_evaluations(self, theses, users):
        self.stdout.write('Creating evaluations...')
        
        criteria_options = ['content', 'methodology', 'analysis', 'presentation', 'originality', 'overall']
        
        for thesis in theses:
            if thesis.status in ['Under Review', 'In Progress']:
                # Create evaluations from panel members
                for panel_user in thesis.group.panel_members.all():
                    for criteria in criteria_options[:3]:  # Only evaluate first 3 criteria
                        Evaluation.objects.create(
                            thesis=thesis,
                            evaluator=panel_user,
                            criteria=criteria,
                            score=random.randint(70, 95),
                            comments=f'Good work on {criteria}. Room for improvement in some areas.',
                            is_final=False
                        )

    def create_notifications(self, users, theses):
        self.stdout.write('Creating notifications...')
        
        notifications_data = [
            {
                'title': 'Thesis Topic Approved',
                'message': 'Your thesis topic has been approved by your adviser.',
                'notification_type': 'thesis_status',
                'user': users['student1'],
                'thesis': theses[0]
            },
            {
                'title': 'New Comment Received',
                'message': 'Your adviser has left a comment on your proposal.',
                'notification_type': 'comment',
                'user': users['student1'],
                'thesis': theses[0]
            },
            {
                'title': 'Document Uploaded',
                'message': 'A new document has been uploaded for review.',
                'notification_type': 'assignment',
                'user': users['adviser1'],
                'thesis': theses[0]
            },
            {
                'title': 'Evaluation Required',
                'message': 'Please evaluate the submitted thesis document.',
                'notification_type': 'evaluation',
                'user': users['panel1'],
                'thesis': theses[0]
            },
            {
                'title': 'Defense Scheduled',
                'message': 'Your thesis defense has been scheduled.',
                'notification_type': 'defense',
                'user': users['student1'],
                'thesis': theses[0]
            }
        ]
        
        for data in notifications_data:
            Notification.objects.create(
                title=data['title'],
                message=data['message'],
                notification_type=data['notification_type'],
                user=data['user'],
                thesis=data['thesis'],
                is_read=random.choice([True, False])
            )

    def create_defense_schedules(self, theses, users):
        self.stdout.write('Creating defense schedules...')
        
        # Schedule defense for first thesis
        if theses:
            defense_date = timezone.now() + timezone.timedelta(days=30)
            DefenseSchedule.objects.create(
                thesis=theses[0],
                date=defense_date,
                location='Conference Room A',
                duration_minutes=60,
                scheduled_by=users['admin']
            )
