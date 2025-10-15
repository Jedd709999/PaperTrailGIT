from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import (
    User, ThesisTopic, DocumentType, ThesisDocument, StudentGroup,
    DefenseSchedule, Evaluation, Comment, Notification, ThesisStatusHistory,
    GroupProposal
)

User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add role as a claim in the JWT
        token["role"] = user.role
        return token

    def validate(self, attrs):
        data = super().validate(attrs)

        # Add user info to the response
        if hasattr(self, 'user') and self.user:
            data["user"] = {
                "id": self.user.id,
                "username": self.user.username,
                "email": self.user.email,
                "role": self.user.role,
            }
        return data

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "password", "role"]

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
            role=validated_data.get("role", "Student"),
        )


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "role", "student_id", "department"]


class StudentGroupSerializer(serializers.ModelSerializer):
    # Make students writeable via list of user IDs; still expose nested on read
    students = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.filter(role="Student"),
        required=False
    )
    adviser = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role="Adviser"),
        required=False,
        allow_null=True
    )
    panel_members = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.filter(role="Panel"),
        required=False,
        allow_null=True
    )
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = StudentGroup
        fields = "__all__"

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Replace student IDs with nested user data for responses
        data["students"] = UserSerializer(instance.students.all(), many=True).data
        # Replace adviser ID with nested user data
        if instance.adviser:
            data["adviser"] = UserSerializer(instance.adviser).data
        # Replace panel_members IDs with nested user data
        if instance.panel_members.exists():
            data["panel_members"] = UserSerializer(instance.panel_members.all(), many=True).data
        # Replace created_by ID with nested user data
        if instance.created_by:
            data["created_by"] = UserSerializer(instance.created_by).data
        return data

# NEW: Group Proposal Serializer
class GroupProposalSerializer(serializers.ModelSerializer):
    students = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.filter(role="Student"),
        required=True
    )
    preferred_adviser = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role="Adviser"),
        required=False,
        allow_null=True
    )
    assigned_adviser = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role="Adviser"),
        required=False,
        allow_null=True
    )
    created_by = UserSerializer(read_only=True)
    student_group = StudentGroupSerializer(read_only=True)

    class Meta:
        model = GroupProposal
        fields = "__all__"
        read_only_fields = ["created_at", "status", "student_group"]
        
    def validate(self, attrs):
        # Validate that title is provided
        title = attrs.get('title')
        if not title or not title.strip():
            raise serializers.ValidationError("Title is required.")
        
        # Validate that description is provided
        description = attrs.get('description')
        if not description or not description.strip():
            raise serializers.ValidationError("Description or problem statement is required.")
        
        # Validate that at least one student is selected
        students = attrs.get('students')
        if not students or len(students) == 0:
            raise serializers.ValidationError("At least one student must be selected.")
        
        return super().validate(attrs)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Replace student IDs with nested user data for responses
        data["students"] = UserSerializer(instance.students.all(), many=True).data
        # Replace preferred_adviser ID with nested user data
        if instance.preferred_adviser:
            data["preferred_adviser"] = UserSerializer(instance.preferred_adviser).data
        # Replace assigned_adviser ID with nested user data
        if instance.assigned_adviser:
            data["assigned_adviser"] = UserSerializer(instance.assigned_adviser).data
        # Replace created_by ID with nested user data
        if instance.created_by:
            data["created_by"] = UserSerializer(instance.created_by).data
        # Replace student_group ID with nested data
        if instance.student_group:
            data["student_group"] = StudentGroupSerializer(instance.student_group).data
        return data


class ThesisStatusHistorySerializer(serializers.ModelSerializer):
    changed_by = UserSerializer(read_only=True)
    
    class Meta:
        model = ThesisStatusHistory
        fields = "__all__"


class DocumentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentType
        fields = "__all__"


class ThesisDocumentSerializer(serializers.ModelSerializer):
    # thesis is writeable via its ID, but will be represented as a nested object on read.
    # Use string reference to avoid circular import issues
    thesis = serializers.SerializerMethodField()
    thesis_id = serializers.PrimaryKeyRelatedField(
        queryset=ThesisTopic.objects.all(), source='thesis', write_only=True
    )
    uploaded_by = UserSerializer(read_only=True)
    comments_count = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ThesisDocument
        fields = "__all__"
        read_only_fields = ["uploaded_at", "version", "uploaded_by", "is_latest", "file_size", "original_filename", "file_url"]

    def get_thesis(self, obj):
        """Return full thesis object with group information for frontend filtering"""
        # Use a simple serializer to avoid circular references
        class ThesisSimpleSerializer(serializers.ModelSerializer):
            group = serializers.SerializerMethodField()
            student = UserSerializer(read_only=True)
            
            class Meta:
                model = ThesisTopic
                fields = ["id", "title", "student", "group"]
                
            def get_group(self, obj):
                if obj.group:
                    # Return a simple representation of the group with students
                    return {
                        "id": obj.group.id,
                        "name": obj.group.name,
                        "students": UserSerializer(obj.group.students.all(), many=True).data
                    }
                return None
        
        return ThesisSimpleSerializer(obj.thesis).data

    def get_comments_count(self, obj):
        return obj.comments.count()

    def get_file_url(self, obj):
        if obj.file:
            return obj.file.url
        return None
        
    def validate(self, attrs):
        # Log validation for debugging
        print(f"Validating ThesisDocument with attrs: {attrs}")
        # Check if we're creating a new instance
        if not self.instance:
            thesis = attrs.get('thesis')
            doc_type = attrs.get('doc_type')
            if thesis and doc_type:
                # This is just for debugging - we shouldn't be setting version from frontend
                print(f"Creating document for thesis {thesis.id}, doc_type {doc_type}")
                
                # Check if there's already a document with the same thesis and doc_type
                existing_docs = ThesisDocument.objects.filter(
                    thesis=thesis,
                    doc_type=doc_type
                ).order_by("-version")
                
                if existing_docs.exists():
                    latest_version = existing_docs.first().version
                    print(f"Latest version for this thesis and doc_type: {latest_version}")
                else:
                    print("No existing documents found for this thesis and doc_type")
        return super().validate(attrs)
        
    def create(self, validated_data):
        # Remove version from validated_data if present
        validated_data.pop('version', None)
        # Let the view handle setting the version
        print(f"Creating document with validated_data: {validated_data}")
        return super().create(validated_data)
        
    # Override the unique validator
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Remove unique together validator for thesis, doc_type, version
        validators = []
        for validator in self.validators:
            if hasattr(validator, 'fields') and set(validator.fields) == {'thesis', 'doc_type', 'version'}:
                continue
            validators.append(validator)
        self.validators = validators

# Create a simplified serializer to avoid circular references
class ThesisDocumentSimpleSerializer(serializers.ModelSerializer):
    uploaded_by = UserSerializer(read_only=True)
    comments_count = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ThesisDocument
        fields = ["id", "doc_type", "original_filename", "file_size", "version", "uploaded_at", "is_latest", "uploaded_by", "comments_count", "file_url"]

    def get_comments_count(self, obj):
        return obj.comments.count()

    def get_file_url(self, obj):
        if obj.file:
            return obj.file.url
        return None


class ThesisTopicSerializer(serializers.ModelSerializer):
    student = UserSerializer(read_only=True)
    adviser = UserSerializer(read_only=True)
    group = StudentGroupSerializer(read_only=True)
    status_history = ThesisStatusHistorySerializer(many=True, read_only=True)
    documents_count = serializers.SerializerMethodField()
    latest_document = serializers.SerializerMethodField()

    class Meta:
        model = ThesisTopic
        fields = "__all__"
        read_only_fields = ["submitted_at", "approved_at"]

    def get_documents_count(self, obj):
        return obj.documents.count()

    def get_latest_document(self, obj):
        latest = obj.documents.filter(is_latest=True).first()
        if latest:
            # Use the simple serializer to avoid circular references
            return ThesisDocumentSimpleSerializer(latest).data
        return None


class DefenseScheduleSerializer(serializers.ModelSerializer):
    thesis = serializers.StringRelatedField(read_only=True)
    panel_members = UserSerializer(many=True, read_only=True)
    created_by = UserSerializer(read_only=True)
    
    class Meta:
        model = DefenseSchedule
        fields = "__all__"


class ConflictCheckSerializer(serializers.Serializer):
    date = serializers.DateTimeField()
    duration_minutes = serializers.IntegerField(default=60)
    panel_member_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=True
    )


class EvaluationSerializer(serializers.ModelSerializer):
    thesis = serializers.StringRelatedField(read_only=True)
    panel_member = UserSerializer(read_only=True)
    
    class Meta:
        model = Evaluation
        fields = "__all__"
        read_only_fields = ["submitted_at"]


class CommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    thesis = serializers.StringRelatedField(read_only=True)
    thesis_document = serializers.StringRelatedField(read_only=True)
    replies = serializers.SerializerMethodField()
    
    class Meta:
        model = Comment
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]

    def get_replies(self, obj):
        if obj.replies.exists():
            return CommentSerializer(obj.replies.all(), many=True).data
        return []


class NotificationSerializer(serializers.ModelSerializer):
    thesis = serializers.StringRelatedField(read_only=True)
    
    class Meta:
        model = Notification
        fields = "__all__"
        read_only_fields = ["created_at"]
