from django.db import models
from django.contrib.auth.models import AbstractUser


# 1. ROLE (choices only, stored in User)
class Role(models.TextChoices):
    STUDENT = "Student"
    ADVISER = "Adviser"
    PANEL = "Panel"
    ADMIN = "Admin"


# 2. USER
class User(AbstractUser):
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STUDENT)
    student_id = models.CharField(max_length=20, blank=True, null=True)
    department = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f"{self.username} ({self.role})"


# 3. STUDENT GROUP
class StudentGroup(models.Model):
    name = models.CharField(max_length=200)
    students = models.ManyToManyField(User, related_name='student_groups', 
                                    limit_choices_to={'role': 'Student'})
    adviser = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, 
                               related_name='advised_groups', limit_choices_to={'role': 'Adviser'})
    panel_members = models.ManyToManyField(User, blank=True, related_name='panel_groups',
                                         limit_choices_to={'role': 'Panel'})
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="created_groups", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    year = models.IntegerField(null=True, blank=True)
    course = models.CharField(max_length=100, blank=True, null=True)
    thesis_title = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return str(self.name or f"StudentGroup {getattr(self, 'id', 'Unknown')}")

# NEW: GROUP PROPOSAL
class GroupProposal(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending Approval'),
        ('adviser_assigned', 'Awaiting Adviser Confirmation'),
        ('adviser_accepted', 'Adviser Accepted - Awaiting Admin Approval'),
        ('active', 'Active'),
        ('rejected', 'Rejected'),
    ]
    
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    students = models.ManyToManyField(User, related_name='proposed_groups', 
                                    limit_choices_to={'role': 'Student'})
    preferred_adviser = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, 
                                         related_name='preferred_adviser_proposals', 
                                         limit_choices_to={'role': 'Adviser'})
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="created_proposals")
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='pending')
    assigned_adviser = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, 
                                        related_name='assigned_adviser_proposals', 
                                        limit_choices_to={'role': 'Adviser'})
    student_group = models.ForeignKey(StudentGroup, on_delete=models.CASCADE, null=True, blank=True, 
                                     related_name='proposal')
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Proposal: {self.title} ({self.status})"


# 4. THESIS STATUS CHOICES
class ThesisStatus(models.TextChoices):
    TOPIC_SUBMISSION = "Topic Submission"
    TOPIC_REVIEW = "Topic Review"
    TOPIC_APPROVED = "Topic Approved"
    TOPIC_REJECTED = "Topic Rejected"
    PROPOSAL_WRITING = "Proposal Writing"
    PROPOSAL_REVIEW = "Proposal Review"
    PROPOSAL_APPROVED = "Proposal Approved"
    PROPOSAL_REVISION = "Proposal Revision"
    RESEARCH_PHASE = "Research Phase"
    WRITING_PHASE = "Writing Phase"
    DRAFT_REVIEW = "Draft Review"
    FINAL_REVIEW = "Final Review"
    DEFENSE_READY = "Defense Ready"
    DEFENSE_SCHEDULED = "Defense Scheduled"
    DEFENSE_COMPLETED = "Defense Completed"
    APPROVED = "Approved"
    REJECTED = "Rejected"


# 5. THESIS TOPIC
class ThesisTopic(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()
    keywords = models.TextField(blank=True, null=True, help_text="Comma-separated keywords")
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="thesis_topics")
    adviser = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, 
                               related_name="advised_theses", limit_choices_to={"role": Role.ADVISER})
    status = models.CharField(max_length=50, choices=ThesisStatus.choices, default=ThesisStatus.TOPIC_SUBMISSION)
    submitted_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    group = models.ForeignKey(StudentGroup, on_delete=models.SET_NULL, null=True, blank=True, related_name="theses")

    class Meta:
        ordering = ['-submitted_at']

    def __str__(self):
        return str(self.title or f"ThesisTopic {getattr(self, 'id', 'Unknown')}")
    
    def save(self, *args, **kwargs):
        # Automatically set the adviser field based on the group's adviser if not already set
        if self.group and self.group.adviser and not self.adviser:
            self.adviser = self.group.adviser
        super().save(*args, **kwargs)
    
    def is_panel_assigned(self):
        """Check if panel members are assigned to this thesis"""
        if self.group and self.group.panel_members.exists():
            return True
        return False
    
    def set_ready_for_defense_scheduling(self):
        """Set thesis status to 'Ready for Defense Scheduling'"""
        if self.status != ThesisStatus.DEFENSE_READY:
            ThesisStatusHistory.objects.create(
                thesis=self,
                old_status=self.status,
                new_status=ThesisStatus.DEFENSE_READY,
                notes='Thesis approved by adviser and ready for defense scheduling'
            )
            self.status = ThesisStatus.DEFENSE_READY
            self.save()


# 6. DOCUMENT TYPE
class DocumentType(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    is_required = models.BooleanField(default=False)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order', 'name']

    def __str__(self):
        return str(self.name or f"DocumentType {getattr(self, 'id', 'Unknown')}")


# 7. THESIS DOCUMENT
class ThesisDocument(models.Model):
    thesis = models.ForeignKey(ThesisTopic, on_delete=models.CASCADE, related_name="documents")
    doc_type = models.CharField(max_length=50, choices=[
        ('proposal', 'Thesis Proposal'),
        ('chapter1', 'Chapter 1 - Introduction'),
        ('chapter2', 'Chapter 2 - Literature Review'),
        ('chapter3', 'Chapter 3 - Methodology'),
        ('chapter4', 'Chapter 4 - Results'),
        ('chapter5', 'Chapter 5 - Discussion'),
        ('final', 'Final Manuscript'),
        ('defense', 'Defense Presentation'),
    ])
    file = models.FileField(upload_to="thesis_documents/")
    original_filename = models.CharField(max_length=255, default='unknown.pdf')
    file_size = models.BigIntegerField(default=0)
    version = models.IntegerField(default=1)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="uploaded_documents", null=True, blank=True)
    is_latest = models.BooleanField(default=True)

    class Meta:
        ordering = ['-uploaded_at']
        unique_together = ['thesis', 'doc_type', 'version']

    def __str__(self):
        # Fixed to avoid recursion in Django's translation system
        # Directly access the thesis title and doc_type without using get_doc_type_display()
        try:
            # Access the thesis title directly - this is how Django models work
            thesis_title = getattr(self.thesis, 'title', f'Thesis {getattr(self, "thesis_id", "Unknown")}')
            return f"{thesis_title} - {self.doc_type} (v{self.version})"
        except:
            return f"ThesisDocument {getattr(self, 'id', 'Unknown')}"

# 8. THESIS STATUS HISTORY
class ThesisStatusHistory(models.Model):
    thesis = models.ForeignKey(ThesisTopic, on_delete=models.CASCADE, related_name="status_history")
    old_status = models.CharField(max_length=50, choices=ThesisStatus.choices, null=True, blank=True)
    new_status = models.CharField(max_length=50, choices=ThesisStatus.choices)
    changed_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    changed_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-changed_at']
        verbose_name_plural = "Thesis Status Histories"

    def __str__(self):
        # Fixed to avoid recursion in Django's translation system
        # Directly access the thesis title and status values
        try:
            # Access the thesis title directly - this is how Django models work
            thesis_title = getattr(self.thesis, 'title', f'Thesis {getattr(self, "thesis_id", "Unknown")}')
            return f"{thesis_title}: {self.old_status} → {self.new_status}"
        except:
            return f"ThesisStatusHistory {getattr(self, 'id', 'Unknown')}"


# 9. DEFENSE SCHEDULE
class DefenseSchedule(models.Model):
    thesis = models.OneToOneField(ThesisTopic, on_delete=models.CASCADE, related_name="defense_schedule")
    date = models.DateTimeField(null=True, blank=True)
    location = models.CharField(max_length=255, default='TBD')
    duration_minutes = models.IntegerField(default=60)
    panel_members = models.ManyToManyField(User, related_name="defense_panels", 
                                         limit_choices_to={"role": Role.PANEL})
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="scheduled_defenses", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    def __str__(self):
        thesis_title = getattr(self.thesis, 'title', f'Thesis {getattr(self, "thesis_id", "Unknown")}')
        return f"{thesis_title} Defense - {self.date}"
    
    def check_conflicts(self, panel_member_ids=None):
        """
        Check for scheduling conflicts with panel members
        Returns a list of conflicts
        """
        if not self.date:
            return []
        
        if panel_member_ids is None:
            panel_member_ids = list(self.panel_members.values_list('id', flat=True))
        
        # Calculate end time
        from datetime import timedelta
        from django.utils import timezone
        end_time = timezone.localtime(self.date) + timedelta(minutes=self.duration_minutes)
        
        # Check for conflicts with existing schedules
        conflicts = []
        for panel_member_id in panel_member_ids:
            # Get all defense schedules for this panel member (excluding current schedule)
            panel_schedules = DefenseSchedule.objects.filter(
                panel_members=panel_member_id
            ).exclude(id=self.id)
            
            for schedule in panel_schedules:
                if schedule.date:
                    schedule_end = timezone.localtime(schedule.date) + timedelta(minutes=schedule.duration_minutes)
                    
                    # Check if there's a time overlap
                    if (timezone.localtime(self.date) < schedule_end and end_time > timezone.localtime(schedule.date)):
                        conflicts.append({
                            'panel_member_id': panel_member_id,
                            'conflicting_schedule_id': schedule.id,
                            'conflicting_thesis': schedule.thesis.title,
                            'conflicting_date': schedule.date.isoformat(),
                            'conflicting_duration': schedule.duration_minutes
                        })
        
        return conflicts


# 10. EVALUATION
class Evaluation(models.Model):
    CRITERIA_CHOICES = [
        ('content', 'Content Quality'),
        ('methodology', 'Methodology'),
        ('analysis', 'Analysis & Results'),
        ('presentation', 'Presentation'),
        ('originality', 'Originality'),
        ('overall', 'Overall Assessment'),
    ]

    thesis = models.ForeignKey(ThesisTopic, on_delete=models.CASCADE, related_name="evaluations")
    panel_member = models.ForeignKey(User, on_delete=models.CASCADE, 
                                   limit_choices_to={"role": Role.PANEL}, related_name="evaluations", null=True, blank=True)
    criteria = models.CharField(max_length=20, choices=CRITERIA_CHOICES, default='overall')
    score = models.DecimalField(max_digits=4, decimal_places=2, help_text="Score out of 100", default=0.00)
    comments = models.TextField(default='')
    submitted_at = models.DateTimeField(auto_now_add=True)
    is_final = models.BooleanField(default=False)

    class Meta:
        unique_together = ['thesis', 'panel_member', 'criteria']
        ordering = ['-submitted_at']

    def __str__(self):
        thesis_title = getattr(self.thesis, 'title', f'Thesis {getattr(self, "thesis_id", "Unknown")}')
        panel_member_username = getattr(self.panel_member, 'username', f'User {getattr(self, "panel_member_id", "Unknown")}')
        return f"Evaluation - {thesis_title} by {panel_member_username} ({self.criteria})"


# 11. COMMENT (feedback during document review)
class Comment(models.Model):
    COMMENT_TYPES = [
        ('general', 'General Comment'),
        ('suggestion', 'Suggestion'),
        ('correction', 'Correction Required'),
        ('approval', 'Approval'),
        ('question', 'Question'),
    ]

    thesis = models.ForeignKey(ThesisTopic, on_delete=models.CASCADE, related_name="comments", null=True, blank=True)
    thesis_document = models.ForeignKey(ThesisDocument, on_delete=models.CASCADE, related_name="comments", null=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="comments", null=True, blank=True)
    comment_type = models.CharField(max_length=20, choices=COMMENT_TYPES, default='general')
    text = models.TextField(default='')
    page_number = models.IntegerField(null=True, blank=True, help_text="Page number for document-specific comments")
    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    parent_comment = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        # Fixed to avoid potential recursion issues
        try:
            target = self.thesis_document or self.thesis
            user_username = getattr(self.user, 'username', f'User {getattr(self, "user_id", "Unknown")}')
            return f"Comment by {user_username} on {target}"
        except:
            return f"Comment {getattr(self, 'id', 'Unknown')}"


# 12. NOTIFICATION (for alerts like defense schedule, approvals, etc.)
class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('thesis_status', 'Thesis Status Update'),
        ('thesis_submission', 'Thesis Topic Submission'),
        ('comment', 'New Comment'),
        ('evaluation', 'New Evaluation'),
        ('defense', 'Defense Schedule'),
        ('assignment', 'New Assignment'),
        ('reminder', 'Reminder'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=255, default='Notification')
    message = models.TextField(default='')
    thesis = models.ForeignKey(ThesisTopic, on_delete=models.CASCADE, null=True, blank=True, related_name="notifications")
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        user_username = getattr(self.user, 'username', f'User {getattr(self, "user_id", "Unknown")}')
        return f"Notification for {user_username}: {self.title}"
