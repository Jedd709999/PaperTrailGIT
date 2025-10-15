from rest_framework import viewsets, generics, permissions, status, serializers
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from django.http import FileResponse
from .serializers import (
    CustomTokenObtainPairSerializer,
    RegisterSerializer,
    UserSerializer,
    StudentGroupSerializer,
    ThesisTopicSerializer,
    DocumentTypeSerializer,
    ThesisDocumentSerializer,
    DefenseScheduleSerializer,
    EvaluationSerializer,
    CommentSerializer,
    NotificationSerializer,
    ThesisStatusHistorySerializer,
    ConflictCheckSerializer,
    GroupProposalSerializer  # Add GroupProposalSerializer
)
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from django.db.models import QuerySet, Q
from typing import TYPE_CHECKING
from .models import (
    ThesisTopic, DocumentType, ThesisDocument, StudentGroup,
    DefenseSchedule, Evaluation, Comment, Notification, ThesisStatusHistory, ThesisStatus, Role,
    GroupProposal  # Add GroupProposal
)

if TYPE_CHECKING:
    from .models import (
        ThesisTopic, DocumentType, ThesisDocument, StudentGroup,
        DefenseSchedule, Evaluation, Comment, Notification, ThesisStatusHistory, ThesisStatus
    )


User = get_user_model()

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

# REGISTER
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


# GET PROFILE
@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def me(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


# ADMIN STATS
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_stats(request):
    # Check if user has admin role
    if request.user.role != 'Admin':
        return Response({'error': 'Permission denied'}, status=403)
    
    stats = {
        'total_users': User.objects.count(),
        'total_theses': ThesisTopic.objects.count(),
        'pending_approvals': ThesisTopic.objects.filter(status=ThesisStatus.TOPIC_REVIEW).count(),
        'active_defenses': DefenseSchedule.objects.filter(date__gte=timezone.now()).count(),
    }
    return Response(stats)


# LOGOUT
@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request):
    try:
        refresh_token = request.data["refresh"]
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response({"message": "Successfully logged out."})
    except Exception as e:
        return Response({"error": str(e)}, status=400)


# USER VIEWSET
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]


# STUDENT GROUP VIEWSET
class StudentGroupViewSet(viewsets.ModelViewSet):
    queryset = StudentGroup.objects.all()
    serializer_class = StudentGroupSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'Admin':
            return StudentGroup.objects.all()
        elif user.role == 'Adviser':
            return StudentGroup.objects.filter(adviser=user)
        elif user.role == 'Panel':
            return StudentGroup.objects.filter(panel_members=user)
        else:  # Student
            # Let students see groups where they are a member OR they created the group
            return StudentGroup.objects.filter(Q(students=user) | Q(created_by=user)).distinct()

    def perform_create(self, serializer):
        # Check if any student in the group already has an active group
        students_data = self.request.data.get('students', [])
        if students_data:
            # Check if any of the students already belong to an active group (other than the one being created)
            active_groups = StudentGroup.objects.filter(
                students__in=students_data,
                is_active=True
            ).distinct()
            
            if active_groups.exists():
                # Get the students who are in active groups
                students_in_active_groups = active_groups.values_list('students', flat=True)
                conflicting_students = set(students_data) & set(students_in_active_groups)
                
                if conflicting_students:
                    # Get user details for the conflicting students
                    conflicting_users = User.objects.filter(id__in=conflicting_students)
                    student_names = [f"{user.first_name} {user.last_name} ({user.username})" for user in conflicting_users]
                    raise serializers.ValidationError(
                        f"The following students already belong to active groups: {', '.join(student_names)}. "
                        "Students can only be part of one active group at a time."
                    )
        
        group = serializer.save(created_by=self.request.user)
        # Ensure creator is a member of the group
        if self.request.user.role == 'Student':
            group.students.add(self.request.user)
        group.save()

    def update(self, request, *args, **kwargs):
        # Check if any student being added already has an active group
        students_data = request.data.get('students', [])
        if students_data:
            # Get the current group to exclude it from the check
            group = self.get_object()
            
            # Check if any of the students already belong to another active group
            active_groups = StudentGroup.objects.filter(
                students__in=students_data,
                is_active=True
            ).exclude(id=group.id).distinct()
            
            if active_groups.exists():
                # Get the students who are in active groups
                students_in_active_groups = active_groups.values_list('students', flat=True)
                conflicting_students = set(students_data) & set(students_in_active_groups)
                
                if conflicting_students:
                    # Get user details for the conflicting students
                    conflicting_users = User.objects.filter(id__in=conflicting_students)
                    student_names = [f"{user.first_name} {user.last_name} ({user.username})" for user in conflicting_users]
                    raise serializers.ValidationError(
                        f"The following students already belong to active groups: {', '.join(student_names)}. "
                        "Students can only be part of one active group at a time."
                    )
        
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        # Get the group to be deleted
        group = self.get_object()
        
        # Find any associated group proposals and delete them
        # This ensures that when an admin deletes an active group, 
        # the associated group proposal is also deleted
        try:
            proposals = GroupProposal.objects.filter(student_group=group)
            proposal_count = proposals.count()
            proposals.delete()
            
            # Now delete the group itself
            response = super().destroy(request, *args, **kwargs)
            
            # Add a custom header to indicate how many proposals were also deleted
            response['X-Proposals-Deleted'] = str(proposal_count)
            return response
        except Exception as e:
            # If there's an error deleting proposals, still try to delete the group
            return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def assign_adviser(self, request, pk=None):
        group = self.get_object()
        adviser_id = request.data.get('adviser_id')
        try:
            adviser = User.objects.get(id=adviser_id, role='Adviser')
            group.adviser = adviser
            group.save()
            return Response({'status': 'Adviser assigned successfully'})
        except User.DoesNotExist:
            return Response({'error': 'Adviser not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def assign_panel(self, request, pk=None):
        group = self.get_object()
        panel_ids = request.data.get('panel_ids', [])
        try:
            panel_members = User.objects.filter(id__in=panel_ids, role='Panel')
            group.panel_members.set(panel_members)
            group.save()
            
            # Create notifications for all panel members
            for panel_member in panel_members:
                Notification.objects.create(
                    user=panel_member,
                    notification_type='assignment',
                    title='Panel Assignment',
                    message=f'You\'ve been assigned as a panel member for Group {group.id}.',
                )
            
            return Response({'status': 'Panel members assigned successfully'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        group = self.get_object()
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            member = User.objects.get(id=user_id, role='Student')
        except User.DoesNotExist:
            return Response({'error': 'Student not found'}, status=status.HTTP_404_NOT_FOUND)

        group.students.add(member)
        return Response({'status': 'Member added successfully'})

    @action(detail=True, methods=['post'])
    def remove_member(self, request, pk=None):
        group = self.get_object()
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            member = User.objects.get(id=user_id, role='Student')
        except User.DoesNotExist:
            return Response({'error': 'Student not found'}, status=status.HTTP_404_NOT_FOUND)

        group.students.remove(member)
        return Response({'status': 'Member removed successfully'})


# NEW: GROUP PROPOSAL VIEWSET
class GroupProposalViewSet(viewsets.ModelViewSet):
    queryset = GroupProposal.objects.all()
    serializer_class = GroupProposalSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'Admin':
            # Admin can see all proposals
            return GroupProposal.objects.all()
        elif user.role == 'Adviser':
            # Advisers can see proposals where they are preferred or assigned
            return GroupProposal.objects.filter(
                Q(preferred_adviser=user) | Q(assigned_adviser=user)
            )
        else:  # Student
            # Students can see proposals they created or are part of
            return GroupProposal.objects.filter(
                Q(created_by=user) | Q(students=user)
            ).distinct()

    def perform_create(self, serializer):
        # Check if any student in the proposal already has an active group
        students = self.request.data.get('students', [])
        if students:
            # Check if any of the students already belong to an active group
            active_groups = StudentGroup.objects.filter(
                students__in=students,
                is_active=True
            ).distinct()
            
            if active_groups.exists():
                # Get the students who are in active groups
                students_in_active_groups = active_groups.values_list('students', flat=True)
                conflicting_students = set(students) & set(students_in_active_groups)
                
                if conflicting_students:
                    # Get user details for the conflicting students
                    conflicting_users = User.objects.filter(id__in=conflicting_students)
                    student_names = [f"{user.first_name} {user.last_name} ({user.username})" for user in conflicting_users]
                    raise serializers.ValidationError(
                        f"The following students already belong to active groups: {', '.join(student_names)}. "
                        "Students can only be part of one active group at a time."
                    )
        
        # Create the proposal
        proposal = serializer.save(created_by=self.request.user)
        
        # Ensure creator is a member of the proposal
        if self.request.user.role == 'Student':
            proposal.students.add(self.request.user)
            
        # Create notification for admin
        admin_users = User.objects.filter(role='Admin')
        for admin in admin_users:
            Notification.objects.create(
                user=admin,
                notification_type='assignment',
                title='New Group Proposal',
                message='New thesis group proposal awaiting review.',
                # No thesis for group proposals
            )
        
        return proposal

    @action(detail=True, methods=['post'])
    def assign_adviser(self, request, pk=None):
        proposal = self.get_object()
        adviser_id = request.data.get('adviser_id')
        
        if not adviser_id:
            return Response({'error': 'adviser_id is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            adviser = User.objects.get(id=adviser_id, role='Adviser')
        except User.DoesNotExist:
            return Response({'error': 'Adviser not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Update proposal
        proposal.assigned_adviser = adviser
        proposal.status = 'adviser_assigned'
        proposal.save()
        
        # Create notification for the assigned adviser
        Notification.objects.create(
            user=adviser,
            notification_type='assignment',
            title='New Group Assignment',
            message='You\'ve been assigned to a new thesis group.',
            # No thesis for group proposals
        )
        
        # Create notification for students in the proposal
        for student in proposal.students.all():
            Notification.objects.create(
                user=student,
                notification_type='assignment',
                title='Adviser Assigned',
                message='An adviser has been assigned to your group proposal.',
                # No thesis for group proposals
            )
        
        return Response({'status': 'Adviser assigned successfully'})

    @action(detail=True, methods=['post'])
    def adviser_accept(self, request, pk=None):
        proposal = self.get_object()
        
        # Check if the current user is the assigned adviser
        if request.user != proposal.assigned_adviser:
            return Response({'error': 'Only the assigned adviser can accept this proposal'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        # Create the actual student group and thesis topic
        with transaction.atomic():
            # 1. Officially create the student group with the proposed members, thesis title, and assigned adviser
            student_group = StudentGroup.objects.create(
                name=proposal.title,
                created_by=proposal.created_by,
                adviser=proposal.assigned_adviser,
                course="TBD",  # Will be updated later
                thesis_title=proposal.title,
                is_active=True,  # 2. Set the group status to "Active" in the system
                year=timezone.now().year  # Add current year
            )
            
            # Add all students from the proposal to the group
            student_group.students.set(proposal.students.all())
            
            # 3. Convert the proposed thesis topic into an official ThesisTopic record linked to the newly created group
            thesis_topic = ThesisTopic.objects.create(
                title=proposal.title,
                description=proposal.description or "",
                student=proposal.created_by,
                adviser=proposal.assigned_adviser,
                group=student_group,
                status=ThesisStatus.TOPIC_APPROVED
            )
            
            # Update proposal status and link to the group
            proposal.status = 'active'
            proposal.student_group = student_group
            proposal.save()
            
            # 4. Notify all group members of the approval and their official group formation
            for student in proposal.students.all():
                Notification.objects.create(
                    user=student,
                    notification_type='assignment',
                    title='Group Activated',
                    message='Your thesis group has been approved and activated.',
                )
            
            # Create notification for adviser
            if proposal.assigned_adviser:
                Notification.objects.create(
                    user=proposal.assigned_adviser,
                    notification_type='assignment',
                    title='Group Activated',
                    message=f'Group "{proposal.title}" has been activated.',
                )
            
            # Create notification for admin
            admin_users = User.objects.filter(role='Admin')
            for admin in admin_users:
                Notification.objects.create(
                    user=admin,
                    notification_type='assignment',
                    title='Group Activated',
                    message=f'Group "{proposal.title}" has been activated',
                )
            
            # 5. Make the thesis topic visible to all group members in their dashboard
            # This is automatically handled by the ThesisTopicViewSet get_queryset method
            # which filters thesis topics based on group membership
            
            # 6. Enable collaborative document editing features for the group's thesis
            # This is automatically enabled as the thesis topic is now linked to the group
            # and the frontend will show the document editing features based on group membership
        
        return Response({
            'status': 'Group activated successfully',
            'student_group_id': student_group.id,
            'thesis_topic_id': thesis_topic.id
        })

    @action(detail=True, methods=['post'])
    def adviser_reject(self, request, pk=None):
        proposal = self.get_object()
        reason = request.data.get('reason', '')
        
        # Check if the current user is the assigned adviser
        if request.user != proposal.assigned_adviser:
            return Response({'error': 'Only the assigned adviser can reject this proposal'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        # Update proposal status
        proposal.status = 'rejected'
        proposal.save()
        
        # Create notification for admin
        admin_users = User.objects.filter(role='Admin')
        for admin in admin_users:
            Notification.objects.create(
                user=admin,
                notification_type='assignment',
                title='Group Proposal Rejected',
                message='Adviser declined; please reassign.',
                # No thesis for group proposals
            )
        
        # Create notifications for all students
        for student in proposal.students.all():
            Notification.objects.create(
                user=student,
                notification_type='assignment',
                title='Group Proposal Rejected',
                message=f'Your group proposal "{proposal.title}" has been rejected by the adviser. Reason: {reason}',
                # No thesis for group proposals
            )
        
        return Response({'status': 'Proposal rejected successfully'})

    @action(detail=True, methods=['post'])
    def remove_student(self, request, pk=None):
        proposal = self.get_object()
        student_id = request.data.get('student_id')
        
        # Check if student_id is provided
        if not student_id:
            return Response({'error': 'student_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if the current user is the creator of the proposal or the student themselves
        if request.user != proposal.created_by and request.user.id != student_id:
            return Response({'error': 'Only the proposal creator or the student themselves can remove a student from the proposal'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        # Check if the student is part of the proposal
        try:
            student = proposal.students.get(id=student_id)
        except User.DoesNotExist:
            return Response({'error': 'Student not found in this proposal'}, status=status.HTTP_404_NOT_FOUND)
        
        # Prevent the creator from removing themselves
        if student_id == proposal.created_by.id:
            return Response({'error': 'The proposal creator cannot remove themselves from the proposal'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Remove the student from the proposal
        proposal.students.remove(student)
        
        # Create notification for the removed student
        Notification.objects.create(
            user=student,
            notification_type='assignment',
            title='Removed from Group Proposal',
            message=f'You have been removed from the group proposal "{proposal.title}" by {proposal.created_by.get_full_name() or proposal.created_by.username}.',
            # No thesis for group proposals
        )
        
        # Create notification for the proposal creator if it's not the creator removing themselves
        if request.user.id != proposal.created_by.id:
            Notification.objects.create(
                user=proposal.created_by,
                notification_type='assignment',
                title='Student Left Group Proposal',
                message=f'{student.get_full_name() or student.username} has left the group proposal "{proposal.title}".',
                # No thesis for group proposals
            )
        
        return Response({'status': 'Student removed successfully'})


# THESIS TOPIC VIEWSET
class ThesisTopicViewSet(viewsets.ModelViewSet):
    queryset = ThesisTopic.objects.all()
    serializer_class = ThesisTopicSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        print(f"ThesisTopicViewSet - User: {user.username} (ID: {user.id}, Role: {user.role})")
        
        if user.role == 'Admin':
            queryset = ThesisTopic.objects.all()
            print("Admin user - returning all theses")
        elif user.role == 'Adviser':
            queryset = ThesisTopic.objects.filter(adviser=user)
            print(f"Adviser user - filtered by adviser ID {user.id}")
        elif user.role == 'Panel':
            queryset = ThesisTopic.objects.filter(group__panel_members=user)
            print(f"Panel member user - filtered by panel member ID {user.id}")
        else:  # Student
            # Students can see theses from their groups
            student_groups = user.student_groups.all()
            print(f"Student user - groups: {[g.id for g in student_groups]}")
            if student_groups.exists():
                # Return theses from all groups the student belongs to
                queryset = ThesisTopic.objects.filter(group__in=student_groups)
                print(f"Student in groups - filtered by group IDs {[g.id for g in student_groups]}")
            else:
                # Fallback to just the student's own theses
                queryset = ThesisTopic.objects.filter(student=user)
                print(f"Student not in groups - filtered by student ID {user.id}")
        
        print(f"ThesisTopicViewSet - Final queryset count: {queryset.count()}")
        return queryset

    def perform_create(self, serializer):
        # Get the student's group to check for an assigned adviser
        student = self.request.user
        adviser = None
        
        # Check if student belongs to any groups
        student_groups = student.student_groups.all()
        if student_groups.exists():
            # Get the first group with an assigned adviser
            group_with_adviser = student_groups.filter(adviser__isnull=False).first()
            if group_with_adviser:
                adviser = group_with_adviser.adviser
        
        # Create the thesis topic with the adviser (if found)
        thesis = serializer.save(student=student, adviser=adviser)
        
        # Create notification for the student
        Notification.objects.create(
            user=student,
            notification_type='thesis_submission',
            title='Thesis Topic Submitted',
            message=f'Your thesis topic "{thesis.title}" has been submitted successfully',
            thesis=thesis
        )
        
        # If the student has an adviser, create notification for adviser too
        if thesis.adviser:
            Notification.objects.create(
                user=thesis.adviser,
                notification_type='thesis_submission',
                title='New Thesis Topic Submitted',
                message=f'Student {student.get_full_name()} has submitted thesis topic "{thesis.title}"',
                thesis=thesis
            )

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        thesis = self.get_object()
        new_status = request.data.get('status')
        notes = request.data.get('notes', '')

        if new_status not in [choice[0] for choice in ThesisStatus.choices]:
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # Create status history
            ThesisStatusHistory.objects.create(
                thesis=thesis,
                old_status=thesis.status,
                new_status=new_status,
                changed_by=request.user,
                notes=notes
            )
            
            # Update thesis status
            old_status = thesis.status
            thesis.status = new_status
            if new_status in ['TOPIC_APPROVED', 'PROPOSAL_APPROVED', 'APPROVED']:
                thesis.approved_at = timezone.now()
            thesis.save()

            # Create notification for student
            Notification.objects.create(
                user=thesis.student,
                notification_type='thesis_status',
                title=f'Thesis Status Updated',
                message=f'Your thesis "{thesis.title}" status changed from {old_status} to {new_status}',
                thesis=thesis
            )
            
            # If the adviser approves the thesis, check if panel is assigned
            # If not assigned, notify admin to assign panel members
            if new_status == ThesisStatus.PROPOSAL_APPROVED and not thesis.is_panel_assigned():
                # Notify admin to assign panel members
                admin_users = User.objects.filter(role=Role.ADMIN)
                for admin in admin_users:
                    Notification.objects.create(
                        user=admin,
                        notification_type='assignment',
                        title='Panel Assignment Required',
                        message=f'Please assign panel members for thesis "{thesis.title}" by {thesis.student.get_full_name() or thesis.student.username}',
                        thesis=thesis
                    )
            
            # If adviser approves the thesis and panel is assigned, set status to DEFENSE_READY
            if new_status == ThesisStatus.PROPOSAL_APPROVED and thesis.is_panel_assigned():
                thesis.set_ready_for_defense_scheduling()
                
                # Notify all panel members
                for panel_member in thesis.group.panel_members.all():
                    Notification.objects.create(
                        user=panel_member,
                        notification_type='defense',
                        title='Thesis Ready for Defense Scheduling',
                        message=f'Thesis "{thesis.title}" is ready for defense scheduling',
                        thesis=thesis
                    )
                
                # Notify admin
                admin_users = User.objects.filter(role=Role.ADMIN)
                for admin in admin_users:
                    Notification.objects.create(
                        user=admin,
                        notification_type='defense',
                        title='Thesis Ready for Defense Scheduling',
                        message=f'Thesis "{thesis.title}" by {thesis.student.get_full_name() or thesis.student.username} is ready for defense scheduling',
                        thesis=thesis
                    )

        return Response({'status': 'Status updated successfully'})

    @action(detail=True, methods=['get'])
    def status_history(self, request, pk=None):
        thesis = self.get_object()
        history = ThesisStatusHistory.objects.filter(thesis=thesis)
        serializer = ThesisStatusHistorySerializer(history, many=True)
        return Response(serializer.data)


# DOCUMENT TYPE VIEWSET
class DocumentTypeViewSet(viewsets.ModelViewSet):
    queryset = DocumentType.objects.all()
    serializer_class = DocumentTypeSerializer
    permission_classes = [IsAuthenticated]


# THESIS DOCUMENT VIEWSET
class ThesisDocumentViewSet(viewsets.ModelViewSet):
    queryset = ThesisDocument.objects.all()
    serializer_class = ThesisDocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = ThesisDocument.objects.all()
        
        # Print debug information
        print(f"User: {user.username} (ID: {user.id}, Role: {user.role})")
        
        # Apply role-based filtering
        if user.role == 'Admin':
            # Admins can see all documents
            print("Admin user - returning all documents")
            pass
        elif user.role == 'Adviser':
            # Advisers can ONLY see documents from theses in groups they advise
            group_theses = ThesisTopic.objects.filter(group__adviser=user)
            queryset = queryset.filter(thesis__in=group_theses)
            print(f"Adviser user - filtered by group adviser ID {user.id}")
        elif user.role == 'Panel':
            # Panel members can see documents from theses where they are panel members (during defense)
            queryset = queryset.filter(thesis__group__panel_members=user)
            print(f"Panel member user - filtered by panel member ID {user.id}")
        else:  # Student
            # Students can see documents from theses they're working on
            # BUT we also want to ensure all group members can see each other's documents
            # So we check if the student belongs to any group and return documents from that group's theses
            student_groups = user.student_groups.all()
            print(f"Student user - groups: {[g.id for g in student_groups]}")
            if student_groups.exists():
                # Return documents from all theses in the student's groups
                queryset = queryset.filter(thesis__group__in=student_groups)
                print(f"Student in groups - filtered by group IDs {[g.id for g in student_groups]}")
            else:
                # Fallback to just the student's own theses
                queryset = queryset.filter(thesis__student=user)
                print(f"Student not in groups - filtered by student ID {user.id}")
        
        # Apply thesis_id filter if provided
        thesis_id = self.request.query_params.get('thesis_id')
        if thesis_id:
            queryset = queryset.filter(thesis_id=thesis_id)
            print(f"Filtered by thesis_id: {thesis_id}")
            
        print(f"Final queryset count: {queryset.count()}")
        return queryset

    def create(self, request, *args, **kwargs):
        # Completely bypass serializer validation and handle everything manually
        try:
            # Get the data from the request
            thesis_id = request.data.get('thesis_id')
            doc_type = request.data.get('doc_type')
            file_obj = request.data.get('file')
            
            if not thesis_id:
                return Response({'thesis_id': 'This field is required.'}, status=400)
            
            if not doc_type:
                return Response({'doc_type': 'This field is required.'}, status=400)
                
            if not file_obj:
                return Response({'file': 'This field is required.'}, status=400)
            
            # Get the thesis object
            try:
                thesis = ThesisTopic.objects.get(id=thesis_id)
            except ThesisTopic.DoesNotExist:
                return Response({'thesis_id': 'Invalid thesis ID.'}, status=400)
            
            # Check if the user is allowed to upload documents for this thesis
            # Students can upload if they are part of the same group as the thesis
            user = request.user
            if user.role == 'Student':
                # Check if user is in the same group as the thesis
                if thesis.group and user.student_groups.filter(id=thesis.group.id).exists():
                    # User is in the same group, allow upload
                    pass
                elif thesis.student == user:
                    # User is the thesis owner, allow upload
                    pass
                else:
                    # User is not authorized to upload for this thesis
                    return Response({'error': 'You do not have permission to upload documents for this thesis.'}, status=403)
            elif user.role not in ['Adviser', 'Admin']:
                # Only students, advisers, and admins can upload documents
                return Response({'error': 'You do not have permission to upload documents.'}, status=403)
            
            # Mark previous versions as not latest
            ThesisDocument.objects.filter(
                thesis=thesis,
                doc_type=doc_type
            ).update(is_latest=False)

            # Get next version number
            last_doc = ThesisDocument.objects.filter(
                thesis=thesis,
                doc_type=doc_type
            ).order_by("-version").first()
            
            next_version = last_doc.version + 1 if last_doc else 1
            
            # Log for debugging
            print(f"Creating document with thesis_id={thesis_id}, doc_type={doc_type}, version={next_version}")
            print(f"Last document: {last_doc}")

            # Create the document with the correct version
            document = ThesisDocument(
                thesis=thesis,
                doc_type=doc_type,
                original_filename=file_obj.name,
                file_size=file_obj.size,
                version=next_version,
                uploaded_by=request.user,
                is_latest=True
            )
            
            # Handle the file upload properly
            document.file.save(file_obj.name, file_obj, save=True)
            
            # Create notifications for all relevant group members
            if request.user.role == 'Student':
                # Notify the adviser if there is one
                if thesis.adviser:
                    Notification.objects.create(
                        user=thesis.adviser,
                        notification_type='upload',
                        title='New Document Uploaded',
                        message=f'{request.user.get_full_name() or request.user.username} has uploaded a new document: "{document.original_filename}".',
                        thesis=thesis
                    )
                
                # Notify all other students in the same group
                if thesis.group:
                    # Get all students in the group except the uploader
                    other_students = thesis.group.students.exclude(id=request.user.id)
                    for student in other_students:
                        Notification.objects.create(
                            user=student,
                            notification_type='upload',
                            title='New Document Uploaded',
                            message=f'{request.user.get_full_name() or request.user.username} has uploaded a new document: "{document.original_filename}".',
                            thesis=thesis
                        )
            
            # If this is a proposal document, update thesis status and notify adviser
            if doc_type == 'proposal':
                # Update thesis status to "Proposal Review"
                old_status = thesis.status
                thesis.status = ThesisStatus.PROPOSAL_REVIEW
                thesis.save()
                
                # Create status history
                ThesisStatusHistory.objects.create(
                    thesis=thesis,
                    old_status=old_status,
                    new_status=ThesisStatus.PROPOSAL_REVIEW,
                    changed_by=request.user,
                    notes='Proposal document uploaded'
                )
                
                # Create notification for student
                Notification.objects.create(
                    user=thesis.student,
                    notification_type='thesis_status',
                    title='Proposal Submitted for Review',
                    message=f'Your thesis proposal "{thesis.title}" has been submitted and is now under review',
                    thesis=thesis
                )
                
                # If the thesis has an adviser, create notification for adviser too
                if thesis.adviser:
                    Notification.objects.create(
                        user=thesis.adviser,
                        notification_type='thesis_submission',
                        title='New Thesis Proposal Submitted',
                        message=f'Student {thesis.student.get_full_name() or thesis.student.username} has submitted a thesis proposal for "{thesis.title}"',
                        thesis=thesis
                    )
            
            # Return the created document
            serializer = self.get_serializer(document)
            return Response(serializer.data, status=201)
            
        except Exception as e:
            print(f"Error creating document: {e}")
            return Response({'error': str(e)}, status=400)

    def perform_create(self, serializer):
        # The serializer's `create` method will handle associating the thesis
        # Get the thesis object for pre-save logic
        thesis_id = self.request.data.get('thesis_id')
        if not thesis_id:
            raise serializers.ValidationError({'thesis_id': 'This field is required.'})
        
        try:
            thesis = ThesisTopic.objects.get(id=thesis_id)
        except ThesisTopic.DoesNotExist:
            raise serializers.ValidationError({'thesis_id': 'Invalid thesis ID.'})
            
        # Check if the user is allowed to upload documents for this thesis
        # Students can upload if they are part of the same group as the thesis
        user = self.request.user
        if user.role == 'Student':
            # Check if user is in the same group as the thesis
            if thesis.group and user.student_groups.filter(id=thesis.group.id).exists():
                # User is in the same group, allow upload
                pass
            elif thesis.student == user:
                # User is the thesis owner, allow upload
                pass
            else:
                # User is not authorized to upload for this thesis
                raise serializers.ValidationError({'error': 'You do not have permission to upload documents for this thesis.'})
        elif user.role not in ['Adviser', 'Admin']:
            # Only students, advisers, and admins can upload documents
            raise serializers.ValidationError({'error': 'You do not have permission to upload documents.'})
            
        doc_type = self.request.data.get('doc_type')
        if not doc_type:
            raise serializers.ValidationError({'doc_type': 'This field is required.'})

        # Mark previous versions as not latest
        ThesisDocument.objects.filter(
            thesis=thesis,
            doc_type=doc_type
        ).update(is_latest=False)

        # Get next version number
        last_doc = ThesisDocument.objects.filter(
            thesis=thesis,
            doc_type=doc_type
        ).order_by("-version").first()
        
        # Log for debugging
        print(f"Last document found: {last_doc}")
        if last_doc:
            print(f"Last document version: {last_doc.version}")
        
        next_version = last_doc.version + 1 if last_doc else 1
        
        # Log for debugging
        print(f"Creating document with thesis_id={thesis_id}, doc_type={doc_type}, version={next_version}")
        print(f"Last document: {last_doc}")

        # Save with metadata
        file_obj = self.request.data.get('file')
        if not file_obj:
            raise serializers.ValidationError({'file': 'This field is required.'})
            
        # Create the document with the correct version
        document = ThesisDocument(
            thesis=thesis,
            doc_type=doc_type,
            original_filename=file_obj.name,
            file_size=file_obj.size,
            version=next_version,
            uploaded_by=self.request.user,
            is_latest=True
        )
        
        # Handle the file upload properly
        document.file.save(file_obj.name, file_obj, save=True)
        
        # Create notifications for all relevant group members
        if self.request.user.role == 'Student':
            # Notify the adviser if there is one
            if thesis.adviser:
                Notification.objects.create(
                    user=thesis.adviser,
                    notification_type='upload',
                    title='New Document Uploaded',
                    message=f'{self.request.user.get_full_name() or self.request.user.username} has uploaded a new document: "{document.original_filename}".',
                    thesis=thesis
                )
            
            # Notify all other students in the same group
            if thesis.group:
                # Get all students in the group except the uploader
                other_students = thesis.group.students.exclude(id=self.request.user.id)
                for student in other_students:
                    Notification.objects.create(
                        user=student,
                        notification_type='upload',
                        title='New Document Uploaded',
                        message=f'{self.request.user.get_full_name() or self.request.user.username} has uploaded a new document: "{document.original_filename}".',
                        thesis=thesis
                    )
        
        # If this is a proposal document, update thesis status and notify adviser
        if doc_type == 'proposal':
            # Update thesis status to "Proposal Review"
            old_status = thesis.status
            thesis.status = ThesisStatus.PROPOSAL_REVIEW
            thesis.save()
            
            # Create status history
            ThesisStatusHistory.objects.create(
                thesis=thesis,
                old_status=old_status,
                new_status=ThesisStatus.PROPOSAL_REVIEW,
                changed_by=self.request.user,
                notes='Proposal document uploaded'
            )
            
            # Create notification for student
            Notification.objects.create(
                user=thesis.student,
                notification_type='thesis_status',
                title='Proposal Submitted for Review',
                message=f'Your thesis proposal "{thesis.title}" has been submitted and is now under review',
                thesis=thesis
            )
            
            # If the thesis has an adviser, create notification for adviser too
            if thesis.adviser:
                Notification.objects.create(
                    user=thesis.adviser,
                    notification_type='thesis_submission',
                    title='New Thesis Proposal Submitted',
                    message=f'Student {thesis.student.get_full_name() or thesis.student.username} has submitted a thesis proposal for "{thesis.title}"',
                    thesis=thesis
                )

    def destroy(self, request, *args, **kwargs):
        # Check permissions based on role and group membership
        document = self.get_object()
        user = request.user
        
        # Admins can delete any document
        if user.role == 'Admin':
            return super().destroy(request, *args, **kwargs)
        
        # Students can only delete their own documents
        elif user.role == 'Student':
            if document.thesis.student != user:
                return Response(
                    {'error': 'You do not have permission to delete this document.'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            return super().destroy(request, *args, **kwargs)
        
        # Advisers and Panel members cannot delete documents
        else:
            return Response(
                {'error': 'You do not have permission to delete this document.'}, 
                status=status.HTTP_403_FORBIDDEN
            )

    def update(self, request, *args, **kwargs):
        # Check permissions based on role and group membership
        document = self.get_object()
        user = request.user
        
        # Admins can update any document
        if user.role == 'Admin':
            return super().update(request, *args, **kwargs)
        
        # Students can only update their own documents
        elif user.role == 'Student':
            if document.thesis.student != user:
                return Response(
                    {'error': 'You do not have permission to update this document.'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            return super().update(request, *args, **kwargs)
        
        # Advisers and Panel members cannot update documents
        else:
            return Response(
                {'error': 'You do not have permission to update this document.'}, 
                status=status.HTTP_403_FORBIDDEN
            )

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        document = self.get_object()
        if not document.file:
            return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)
        
        response = FileResponse(document.file, as_attachment=True, filename=document.original_filename)
        return response

    @action(detail=True, methods=['post'])
    def mark_for_review(self, request, pk=None):
        document = self.get_object()
        
        # Update document status (this would be implemented based on your document status model)
        # For now, we'll just send a notification to the adviser
        
        if document.thesis.adviser:
            Notification.objects.create(
                user=document.thesis.adviser,
                notification_type='thesis_submission',
                title='Document Ready for Review',
                message=f'{request.user.get_full_name() or request.user.username} has marked the document "{document.original_filename}" as ready for review.',
                thesis=document.thesis
            )
            
            # Also notify the student that the document has been sent for review
            Notification.objects.create(
                user=document.thesis.student,
                notification_type='thesis_status',
                title='Document Sent for Review',
                message=f'Your document "{document.original_filename}" has been sent to your adviser for review.',
                thesis=document.thesis
            )
        
        return Response({'status': 'Document marked for review and notifications sent'})


# DEFENSE SCHEDULE VIEWSET
class DefenseScheduleViewSet(viewsets.ModelViewSet):
    queryset = DefenseSchedule.objects.all()
    serializer_class = DefenseScheduleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'Admin':
            return DefenseSchedule.objects.all()
        elif user.role == 'Adviser':
            return DefenseSchedule.objects.filter(thesis__adviser=user)
        elif user.role == 'Panel':
            return DefenseSchedule.objects.filter(panel_members=user)
        else:  # Student
            return DefenseSchedule.objects.filter(thesis__student=user)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['post'])
    def check_conflicts(self, request):
        """
        Check for scheduling conflicts for panel members
        Expected data: {
            'date': 'YYYY-MM-DDTHH:MM:SS',
            'duration_minutes': 60,
            'panel_member_ids': [1, 2, 3]
        }
        """
        serializer = ConflictCheckSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Extract validated data
        date = request.data.get('date')
        duration_minutes = request.data.get('duration_minutes', 60)
        panel_member_ids = request.data.get('panel_member_ids', [])
        
        if not date or not panel_member_ids:
            return Response({'error': 'Date and panel_member_ids are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Parse the date
            from datetime import datetime
            if isinstance(date, str):
                date = datetime.fromisoformat(date.replace('Z', '+00:00'))
            
            # Calculate end time
            from datetime import timedelta
            end_datetime = date + timedelta(minutes=duration_minutes)
            
            # Check for conflicts with existing schedules
            conflicts = []
            for panel_member_id in panel_member_ids:
                # Get all defense schedules for this panel member
                panel_schedules = DefenseSchedule.objects.filter(panel_members=panel_member_id)
                
                for schedule in panel_schedules:
                    if schedule.date:
                        schedule_end = schedule.date + timedelta(minutes=schedule.duration_minutes)
                        
                        # Check if there's a time overlap
                        if (date < schedule_end and end_datetime > schedule.date):
                            conflicts.append({
                                'panel_member_id': panel_member_id,
                                'conflicting_schedule_id': schedule.id,
                                'conflicting_thesis': schedule.thesis.title,
                                'conflicting_date': schedule.date.isoformat(),
                                'conflicting_duration': schedule.duration_minutes
                            })
            
            return Response({'conflicts': conflicts})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def create(self, request, *args, **kwargs):
        """
        Override create to add conflict checking and notifications
        """
        # First check for conflicts
        conflict_check_data = {
            'date': request.data.get('date'),
            'duration_minutes': request.data.get('duration_minutes', 60),
            'panel_member_ids': request.data.get('panel_members', [])
        }
        
        # Create a mock request for conflict checking
        from django.http import HttpRequest
        from django.http.request import QueryDict
        mock_request = HttpRequest()
        mock_request.method = 'POST'
        mock_request.POST = QueryDict('')
        mock_request.data = conflict_check_data
        
        # Check conflicts
        conflict_response = self.check_conflicts(mock_request)
        if conflict_response and hasattr(conflict_response, 'data') and conflict_response.data and conflict_response.data.get('conflicts', []):
            return Response({
                'error': 'Scheduling conflicts detected',
                'conflicts': conflict_response.data.get('conflicts', [])
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Proceed with creation if no conflicts
        response = super().create(request, *args, **kwargs)
        
        if response.status_code == status.HTTP_201_CREATED:
            # Get the created defense schedule
            defense_schedule_id = None
            if hasattr(response, 'data') and response.data:
                defense_schedule_id = response.data.get('id')
            
            if defense_schedule_id:
                defense_schedule = DefenseSchedule.objects.get(id=defense_schedule_id)
                
                # Notify student
                Notification.objects.create(
                    user=defense_schedule.thesis.student,
                    notification_type='defense',
                    title='Defense Scheduled',
                    message=f'Your thesis defense for "{defense_schedule.thesis.title}" has been scheduled for {defense_schedule.date.strftime("%B %d, %Y at %I:%M %p")} at {defense_schedule.location}',
                    thesis=defense_schedule.thesis
                )
                
                # Notify adviser
                if defense_schedule.thesis.adviser:
                    Notification.objects.create(
                        user=defense_schedule.thesis.adviser,
                        notification_type='defense',
                        title='Defense Scheduled',
                        message=f'The defense for "{defense_schedule.thesis.title}" has been scheduled for {defense_schedule.date.strftime("%B %d, %Y at %I:%M %p")} at {defense_schedule.location}',
                        thesis=defense_schedule.thesis
                    )
                
                # Notify panel members
                for panel_member in defense_schedule.panel_members.all():
                    # Check if this is an existing panel member or newly added
                    is_existing_panel = defense_schedule.thesis.group and panel_member in defense_schedule.thesis.group.panel_members.all()
                    if is_existing_panel:
                        message = f'You\'ve been scheduled for an upcoming defense for Group {defense_schedule.thesis.group.id if defense_schedule.thesis.group else "N/A"}.'
                    else:
                        message = f'You have been assigned to the defense panel for "{defense_schedule.thesis.title}" scheduled for {defense_schedule.date.strftime("%B %d, %Y at %I:%M %p")} at {defense_schedule.location}.'
                    
                    Notification.objects.create(
                        user=panel_member,
                        notification_type='defense',
                        title='Defense Scheduled',
                        message=message,
                        thesis=defense_schedule.thesis
                    )
                
                # Notify admin
                from django.contrib.auth import get_user_model
                User = get_user_model()
                admin_users = User.objects.filter(role='Admin')
                for admin in admin_users:
                    Notification.objects.create(
                        user=admin,
                        notification_type='defense',
                        title='Defense Scheduled',
                        message=f'Defense for "{defense_schedule.thesis.title}" has been scheduled for {defense_schedule.date.strftime("%B %d, %Y at %I:%M %p")} at {defense_schedule.location}',
                        thesis=defense_schedule.thesis
                    )
        
        return response


# EVALUATION VIEWSET
class EvaluationViewSet(viewsets.ModelViewSet):
    queryset = Evaluation.objects.all()
    serializer_class = EvaluationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'Admin':
            return Evaluation.objects.all()
        elif user.role == 'Panel':
            return Evaluation.objects.filter(panel_member=user)
        elif user.role == 'Student':
            return Evaluation.objects.filter(thesis__student=user)
        elif user.role == 'Adviser':
            return Evaluation.objects.filter(thesis__adviser=user)
        return Evaluation.objects.none()

    def perform_create(self, serializer):
        serializer.save(panel_member=self.request.user)

    @action(detail=False, methods=['get'])
    def my_evaluations(self, request):
        if request.user.role != 'Panel':
            return Response({'error': 'Only panel members can access this'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        evaluations = Evaluation.objects.filter(panel_member=request.user)
        serializer = self.get_serializer(evaluations, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def thesis_evaluations(self, request):
        thesis_id = request.query_params.get('thesis_id')
        if not thesis_id:
            return Response({'error': 'thesis_id parameter required'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        evaluations = Evaluation.objects.filter(thesis_id=thesis_id)
        serializer = self.get_serializer(evaluations, many=True)
        return Response(serializer.data)


# COMMENT VIEWSET
class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'Admin':
            return Comment.objects.all()
        elif user.role == 'Adviser':
            return Comment.objects.filter(
                Q(thesis__adviser=user) | 
                Q(thesis_document__thesis__adviser=user)
            )
        elif user.role == 'Panel':
            return Comment.objects.filter(
                Q(thesis__group__panel_members=user) |
                Q(thesis_document__thesis__group__panel_members=user)
            )
        else:  # Student
            return Comment.objects.filter(
                Q(thesis__student=user) |
                Q(thesis_document__thesis__student=user)
            )

    def perform_create(self, serializer):
        comment = serializer.save(user=self.request.user)
        
        # Create notification for the document owner (student) when adviser or panel adds a comment
        if comment.thesis_document and comment.user != comment.thesis_document.thesis.student:
            Notification.objects.create(
                user=comment.thesis_document.thesis.student,
                notification_type='comment',
                title='New Comment on Your Document',
                message=f'{comment.user.get_full_name() or comment.user.username} added a comment to your document "{comment.thesis_document.original_filename}".',
                thesis=comment.thesis_document.thesis
            )
        
        # Create notification for adviser when student adds a comment
        if (comment.thesis_document and 
            comment.user == comment.thesis_document.thesis.student and 
            comment.thesis_document.thesis.adviser):
            Notification.objects.create(
                user=comment.thesis_document.thesis.adviser,
                notification_type='comment',
                title='New Comment from Student',
                message=f'{comment.user.get_full_name() or comment.user.username} added a comment to the document "{comment.thesis_document.original_filename}".',
                thesis=comment.thesis_document.thesis
            )

    def update(self, request, *args, **kwargs):
        comment = self.get_object()
        # Only allow users to update their own comments
        if comment.user != request.user:
            return Response({'error': 'You can only update your own comments'}, 
                          status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        comment = self.get_object()
        # Only allow users to delete their own comments
        if comment.user != request.user:
            return Response({'error': 'You can only delete your own comments'}, 
                          status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        comment = self.get_object()
        comment.is_resolved = True
        comment.save()
        return Response({'status': 'Comment resolved'})

    @action(detail=True, methods=['post'])
    def reply(self, request, pk=None):
        parent_comment = self.get_object()
        text = request.data.get('text')
        
        if not text:
            return Response({'error': 'Text is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        reply = Comment.objects.create(
            user=request.user,
            text=text,
            parent_comment=parent_comment,
            thesis=parent_comment.thesis,
            thesis_document=parent_comment.thesis_document,
            comment_type='general'
        )
        
        serializer = self.get_serializer(reply)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# NOTIFICATION VIEWSET
class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'Notification marked as read'})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'status': 'All notifications marked as read'})

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({'unread_count': count})