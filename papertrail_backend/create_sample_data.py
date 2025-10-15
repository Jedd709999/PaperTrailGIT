import os
import sys
import django
from typing import Dict, Any, List

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'papertrail_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.db.models import Manager, QuerySet
from api.models import (
    StudentGroup,
    ThesisTopic,
    ThesisDocument,
    ThesisStatusHistory,
    DefenseSchedule,
    Evaluation,
    Comment,
    Notification,
    DocumentType,
    ThesisStatus,
)
from django.utils import timezone
import random

# Type hints for Django models
User = get_user_model()

def create_sample_data():
    print('Creating sample data...')
    
    # Create sample users
    users = create_users()
    
    # Create document types
    doc_types = create_document_types()
    
    # Create student groups
    groups = create_student_groups(users)
    
    # Create thesis topics
    theses = create_thesis_topics(users, groups)
    
    # Create thesis documents
    documents = create_thesis_documents(theses, users, doc_types)
    
    # Create comments
    create_comments(theses, users)
    
    # Create evaluations
    create_evaluations(theses, users)
    
    # Create notifications
    create_notifications(users, theses)
    
    # Create defense schedules
    create_defense_schedules(theses, users)
    
    print('Sample data created successfully!')
    
    # Print login credentials
    print('\n' + '='*50)
    print('Demo Login Credentials:')
    print('='*50)
    print('Admin: admin / admin123')
    print('Adviser: adviser1 / adviser123')
    print('Panel: panel1 / panel123')
    print('Student: student1 / student123')
    print('='*50)

def create_users() -> Dict[str, Any]:
    print('Creating users...')
    users = {}
    
    # Admin - only create if it doesn't exist
    if not User.objects.filter(username='admin').exists():  # type: ignore
        users['admin'] = User.objects.create_user(  # type: ignore
            username='admin',
            email='admin@university.edu',
            password='admin123',
            first_name='System',
            last_name='Administrator',
            role='Admin',
            student_id='ADMIN001',
            department='Computer Science'
        )
    else:
        users['admin'] = User.objects.get(username='admin')  # type: ignore
        print('Admin user already exists, skipping creation.')
    
    # Advisers
    for i in range(1, 3):
        username = f'adviser{i}'
        if not User.objects.filter(username=username).exists():  # type: ignore
            users[username] = User.objects.create_user(  # type: ignore
                username=username,
                email=f'{username}@university.edu',
                password='adviser123',
                first_name=f'Adviser',
                last_name=str(i),
                role='Adviser',
                student_id=f'ADV{i:03d}',
                department='Computer Science'
            )
        else:
            users[username] = User.objects.get(username=username)  # type: ignore
            print(f'User {username} already exists, skipping creation.')
    
    # Panel members
    for i in range(1, 4):
        username = f'panel{i}'
        if not User.objects.filter(username=username).exists():  # type: ignore
            users[username] = User.objects.create_user(  # type: ignore
                username=username,
                email=f'{username}@university.edu',
                password='panel123',
                first_name=f'Panel',
                last_name=str(i),
                role='Panel',
                student_id=f'PAN{i:03d}',
                department='Computer Science'
            )
        else:
            users[username] = User.objects.get(username=username)  # type: ignore
            print(f'User {username} already exists, skipping creation.')
    
    # Students
    for i in range(1, 6):
        username = f'student{i}'
        if not User.objects.filter(username=username).exists():  # type: ignore
            users[username] = User.objects.create_user(  # type: ignore
                username=username,
                email=f'{username}@university.edu',
                password='student123',
                first_name=f'Student',
                last_name=str(i),
                role='Student',
                student_id=f'STU{i:03d}',
                department='Computer Science'
            )
        else:
            users[username] = User.objects.get(username=username)  # type: ignore
            print(f'User {username} already exists, skipping creation.')
    
    return users

def create_document_types() -> Dict[str, DocumentType]:
    print('Creating document types...')
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

    order = 0
    for code, name in types_data:
        # Check if document type already exists
        if not DocumentType.objects.filter(name=name).exists():  # type: ignore
            dt = DocumentType.objects.create(  # type: ignore
                name=name,
                description=f'Document type for {name.lower()}',
                is_required=False,
                order=order,
            )
            doc_types[code] = dt
        else:
            doc_types[code] = DocumentType.objects.get(name=name)  # type: ignore
            print(f'Document type {name} already exists, skipping creation.')
        order += 1

    return doc_types

def create_student_groups(users: Dict[str, Any]) -> List[StudentGroup]:
    print('Creating student groups...')
    groups = []
    
    # Group 1
    group1_name = 'Thesis Group A'
    if not StudentGroup.objects.filter(name=group1_name).exists():  # type: ignore
        group1 = StudentGroup.objects.create(  # type: ignore
            name=group1_name
        )
        group1.students.add(users['student1'], users['student2'])
        group1.adviser = users['adviser1']
        group1.panel_members.add(users['panel1'], users['panel2'])
        group1.save()
        groups.append(group1)
    else:
        group1 = StudentGroup.objects.get(name=group1_name)  # type: ignore
        groups.append(group1)
        print(f'Group {group1_name} already exists, skipping creation.')
    
    # Group 2
    group2_name = 'Thesis Group B'
    if not StudentGroup.objects.filter(name=group2_name).exists():  # type: ignore
        group2 = StudentGroup.objects.create(  # type: ignore
            name=group2_name
        )
        group2.students.add(users['student3'], users['student4'])
        group2.adviser = users['adviser2']
        group2.panel_members.add(users['panel2'], users['panel3'])
        group2.save()
        groups.append(group2)
    else:
        group2 = StudentGroup.objects.get(name=group2_name)  # type: ignore
        groups.append(group2)
        print(f'Group {group2_name} already exists, skipping creation.')
    
    return groups

def create_thesis_topics(users: Dict[str, Any], groups: List[StudentGroup]) -> List[ThesisTopic]:
    print('Creating thesis topics...')
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
        # Check if thesis topic already exists
        if not ThesisTopic.objects.filter(title=data['title']).exists():  # type: ignore
            thesis = ThesisTopic.objects.create(  # type: ignore
                title=data['title'],
                description=data['description'],
                keywords=data['keywords'],
                student=data['student'],
                group=data['group'],
                adviser=users['adviser1'],
                status=random.choice([
                    ThesisStatus.TOPIC_SUBMISSION,
                    ThesisStatus.PROPOSAL_WRITING,
                    ThesisStatus.RESEARCH_PHASE,
                    ThesisStatus.DRAFT_REVIEW,
                ]),
            )

            # Create initial status history
            ThesisStatusHistory.objects.create(  # type: ignore
                thesis=thesis,
                old_status=None,
                new_status=thesis.status,
                notes='Initial status',
                changed_by=users['admin'],
            )

            theses.append(thesis)
        else:
            thesis = ThesisTopic.objects.get(title=data['title'])  # type: ignore
            theses.append(thesis)
            print(f'Thesis topic "{data["title"]}" already exists, skipping creation.')
    
    return theses

def create_thesis_documents(theses: List[ThesisTopic], users: Dict[str, Any], doc_types: Dict[str, DocumentType]) -> List[ThesisDocument]:
    print('Creating thesis documents...')
    documents = []
    
    # Create some sample documents for each thesis
    for thesis in theses:
        # Check if proposal document already exists
        if not ThesisDocument.objects.filter(thesis=thesis, doc_type='proposal').exists():  # type: ignore
            # Create a minimal in-memory file for upload
            proposal_content = ContentFile(b"Dummy PDF content for proposal")
            proposal = ThesisDocument(
                thesis=thesis,
                doc_type='proposal',
                original_filename='thesis_proposal.pdf',
                file_size=len(proposal_content.read() or b""),
                version=1,
                uploaded_by=thesis.student,
                is_latest=True,
            )
            proposal_content.seek(0)
            proposal.file.save(f"thesis_{thesis.id}_proposal_v1.pdf", proposal_content, save=True)  # type: ignore
            documents.append(proposal)
        else:
            print(f'Proposal document for thesis "{thesis.title}" already exists, skipping creation.')

        # Create chapter 1 document for some theses
        if thesis.status in [ThesisStatus.RESEARCH_PHASE, ThesisStatus.DRAFT_REVIEW]:
            if not ThesisDocument.objects.filter(thesis=thesis, doc_type='chapter1').exists():  # type: ignore
                ch1_content = ContentFile(b"Dummy PDF content for chapter 1")
                ch1 = ThesisDocument(
                    thesis=thesis,
                    doc_type='chapter1',
                    original_filename='chapter1_introduction.pdf',
                    file_size=len(ch1_content.read() or b""),
                    version=1,
                    uploaded_by=thesis.student,
                    is_latest=True,
                )
                ch1_content.seek(0)
                ch1.file.save(f"thesis_{thesis.id}_chapter1_v1.pdf", ch1_content, save=True)  # type: ignore
                documents.append(ch1)
            else:
                print(f'Chapter 1 document for thesis "{thesis.title}" already exists, skipping creation.')
    
    return documents

def create_comments(theses: List[ThesisTopic], users: Dict[str, Any]) -> None:
    print('Creating comments...')
    
    # Only create comments if none exist
    if Comment.objects.count() == 0:  # type: ignore
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
            Comment.objects.create(  # type: ignore
                text=data['text'],
                comment_type=data['comment_type'],
                thesis=data['thesis'],
                user=data['user'],
                is_resolved=random.choice([True, False])
            )
    else:
        print('Comments already exist, skipping creation.')

def create_evaluations(theses: List[ThesisTopic], users: Dict[str, Any]) -> None:
    print('Creating evaluations...')
    
    # Only create evaluations if none exist
    if Evaluation.objects.count() == 0:  # type: ignore
        criteria_options = ['content', 'methodology', 'analysis', 'presentation', 'originality', 'overall']
        
        for thesis in theses:
            # Check if the group and panel_members exist
            if hasattr(thesis, 'group') and thesis.group is not None:
                # Use type: ignore for the panel_members access
                if thesis.group.panel_members.exists():  # type: ignore
                    # Create evaluations from panel members
                    for panel_user in thesis.group.panel_members.all():  # type: ignore
                        for criteria in criteria_options[:3]:  # Only evaluate first 3 criteria
                            Evaluation.objects.create(  # type: ignore
                                thesis=thesis,
                                panel_member=panel_user,
                                criteria=criteria,
                                score=random.randint(70, 95),
                                comments=f'Good work on {criteria}. Room for improvement in some areas.',
                                is_final=False,
                            )
    else:
        print('Evaluations already exist, skipping creation.')

def create_notifications(users: Dict[str, Any], theses: List[ThesisTopic]) -> None:
    print('Creating notifications...')
    
    # Only create notifications if none exist
    if Notification.objects.count() == 0:  # type: ignore
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
            Notification.objects.create(  # type: ignore
                title=data['title'],
                message=data['message'],
                notification_type=data['notification_type'],
                user=data['user'],
                thesis=data['thesis'],
                is_read=random.choice([True, False])
            )
    else:
        print('Notifications already exist, skipping creation.')

def create_defense_schedules(theses: List[ThesisTopic], users: Dict[str, Any]) -> None:
    print('Creating defense schedules...')
    
    # Only create defense schedules if none exist
    if DefenseSchedule.objects.count() == 0:  # type: ignore
        # Schedule defense for first thesis
        if theses:
            defense_date = timezone.now() + timezone.timedelta(days=30)
            ds = DefenseSchedule.objects.create(  # type: ignore
                thesis=theses[0],
                date=defense_date,
                location='Conference Room A',
                duration_minutes=60,
                created_by=users['admin'],
            )
            # Assign panel members from the thesis group if available
            if theses[0].group:
                # Use type: ignore for the panel_members access
                ds.panel_members.set(theses[0].group.panel_members.all())  # type: ignore
                ds.save()
    else:
        print('Defense schedules already exist, skipping creation.')

if __name__ == '__main__':
    create_sample_data()