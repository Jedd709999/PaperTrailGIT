from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    UserViewSet, ThesisTopicViewSet, DocumentTypeViewSet, ThesisDocumentViewSet,
    DefenseScheduleViewSet, EvaluationViewSet, CommentViewSet, NotificationViewSet,
    RegisterView, me, logout_view, CustomTokenObtainPairView, StudentGroupViewSet, admin_stats,
    GroupProposalViewSet,  # Add GroupProposalViewSet
)

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'student-groups', StudentGroupViewSet)
router.register(r'group-proposals', GroupProposalViewSet)  # Add group-proposals endpoint
router.register(r'thesis-topics', ThesisTopicViewSet)
router.register(r'document-types', DocumentTypeViewSet)
router.register(r'thesis-documents', ThesisDocumentViewSet)
router.register(r'defense-schedules', DefenseScheduleViewSet)
router.register(r'evaluations', EvaluationViewSet)
router.register(r'comments', CommentViewSet)
router.register(r'notifications', NotificationViewSet)

urlpatterns = [
    path("", include(router.urls)),
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", CustomTokenObtainPairView.as_view(), name="login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/logout/", logout_view, name="logout"),
    path("auth/me/", me, name="me"),
    path("admin/stats/", admin_stats, name="admin_stats"),
]