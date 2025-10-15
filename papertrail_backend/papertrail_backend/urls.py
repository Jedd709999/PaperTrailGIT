from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static

def home(request):
    return JsonResponse({"message": "Welcome to PaperTrail API"})

urlpatterns = [
    path("", home),  # 👈 this will handle http://127.0.0.1:8000/
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) 
