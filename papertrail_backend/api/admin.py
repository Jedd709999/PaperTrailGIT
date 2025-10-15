from django.contrib import admin
from .models import (
    User, ThesisTopic, DocumentType, ThesisDocument,
    DefenseSchedule, Evaluation, Comment, Notification
)

admin.site.register(User)
admin.site.register(ThesisTopic)
admin.site.register(DocumentType)
admin.site.register(ThesisDocument)
admin.site.register(DefenseSchedule)
admin.site.register(Evaluation)
admin.site.register(Comment)
admin.site.register(Notification)
