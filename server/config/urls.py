from django.contrib import admin
from django.urls import path
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from calculator.views import calculator

schema_view = get_schema_view(
    openapi.Info(
        title="Calculator API",
        default_version="v1",
        description="Simple Calculator API",
    ),
    public=True,
    permission_classes=[permissions.AllowAny],
)

urlpatterns = [
    path("admin/", admin.site.urls),

    # Swagger
    path("swagger/", schema_view.with_ui("swagger", cache_timeout=0)),
    path("redoc/", schema_view.with_ui("redoc", cache_timeout=0)),

    # API
    path("calculate/", calculator, name="calculator"),
]


