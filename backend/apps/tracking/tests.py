from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.tracking.models import Project, ProjectAdvancedData

User = get_user_model()


class TrackingPermissionsTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin@crm.local",
            password="Admin123!",
            role="admin",
        )
        self.editor = User.objects.create_user(
            email="editor@crm.local",
            password="Editor123!",
            role="editor",
        )
        self.viewer = User.objects.create_user(
            email="viewer@crm.local",
            password="Viewer123!",
            role="viewer",
        )

    def test_viewer_is_read_only(self):
        self.client.force_authenticate(self.viewer)
        create_response = self.client.post(
            "/api/projects/",
            {"name": "Project Viewer"},
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_editor_can_create_project(self):
        self.client.force_authenticate(self.editor)
        create_response = self.client.post(
            "/api/projects/",
            {"name": "Project Editor"},
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

    def test_viewer_can_read_projects(self):
        Project.objects.create(name="Project 1", created_by=self.admin)
        self.client.force_authenticate(self.viewer)
        list_response = self.client.get("/api/projects/")
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)

    def test_viewer_cannot_write_advanced_modules(self):
        project = Project.objects.create(name="Project 2", created_by=self.admin)
        self.client.force_authenticate(self.viewer)

        response = self.client.patch(
            f"/api/projects/{project.id}/advanced-modules/prebrief/",
            {"clientName": "No autorizado"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class TrackingAdvancedModulesTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin2@crm.local",
            password="Admin123!",
            role="admin",
        )
        self.editor = User.objects.create_user(
            email="editor2@crm.local",
            password="Editor123!",
            role="editor",
        )
        self.viewer = User.objects.create_user(
            email="viewer2@crm.local",
            password="Viewer123!",
            role="viewer",
        )
        self.project = Project.objects.create(name="Project Advanced", created_by=self.admin)

    def test_editor_can_update_all_advanced_modules(self):
        self.client.force_authenticate(self.editor)
        module_payloads = [
            ("prebrief", {"clientName": "Cliente Lead", "validated": True}),
            (
                "clientbrief",
                {
                    "clientName": "Laboratorio ACME",
                    "brand": "ACME",
                    "contactName": "Maria",
                    "leadStatus": "CALIFICADO",
                    "requirements": [{"title": "Fragancia suave", "notes": "Sin alcohol"}],
                },
            ),
            (
                "techspecs",
                {"phMin": 5.2, "phMax": 6.0, "viscosity": 1200, "viscosityUnit": "cP"},
            ),
            (
                "samples",
                {
                    "items": [
                        {"id": "dev-1", "kind": "dev", "title": "Lote 1", "batchCode": "B001"}
                    ]
                },
            ),
            (
                "qualityreg",
                {"transportTests": "Pendiente", "packagingCharacteristics": "Botella PET"},
            ),
            (
                "changes",
                {"items": [{"no": 1, "description": "Ajuste de viscosidad", "owner": "I+D"}]},
            ),
        ]

        for module_name, payload in module_payloads:
            with self.subTest(module=module_name):
                response = self.client.patch(
                    f"/api/projects/{self.project.id}/advanced-modules/{module_name}/",
                    payload,
                    format="json",
                )
                self.assertEqual(response.status_code, status.HTTP_200_OK)

        read_response = self.client.get(f"/api/projects/{self.project.id}/advanced-modules/")
        self.assertEqual(read_response.status_code, status.HTTP_200_OK)
        self.assertEqual(read_response.data["clientBrief"]["clientName"], "Laboratorio ACME")
        self.assertEqual(read_response.data["techSpecs"]["phMax"], 6.0)
        self.assertEqual(read_response.data["samples"]["items"][0]["id"], "dev-1")
        self.assertEqual(read_response.data["changes"]["items"][0]["description"], "Ajuste de viscosidad")

        db_value = ProjectAdvancedData.objects.get(project=self.project)
        self.assertEqual(db_value.client_brief["clientName"], "Laboratorio ACME")

    def test_invalid_advanced_module_payload_returns_400(self):
        self.client.force_authenticate(self.editor)

        response = self.client.patch(
            f"/api/projects/{self.project.id}/advanced-modules/techspecs/",
            {"phMin": 7.0, "phMax": 6.0},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("phMin", response.data)

    def test_viewer_can_read_advanced_modules(self):
        self.client.force_authenticate(self.viewer)

        response = self.client.get(f"/api/projects/{self.project.id}/advanced-modules/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("preBrief", response.data)
