from rest_framework.routers import DefaultRouter

from .views import ProjectViewSet, TaskViewSet

router = DefaultRouter()
router.register("projects", ProjectViewSet, basename="projects")
router.register("tasks", TaskViewSet, basename="tasks")

urlpatterns = router.urls
