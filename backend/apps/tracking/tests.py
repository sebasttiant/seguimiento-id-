import re
from concurrent.futures import ThreadPoolExecutor

from django.contrib.auth import get_user_model
from django.db import close_old_connections, connection, connections
from django.test import TransactionTestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.tracking.models import Project, ProjectAdvancedData

User = get_user_model()


class TrackingPermissionsTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin.tests@internal.invalid",
            password="Admin123!",
            role="admin",
        )
        self.editor = User.objects.create_user(
            email="editor.tests@internal.invalid",
            password="Editor123!",
            role="editor",
        )
        self.viewer = User.objects.create_user(
            email="viewer.tests@internal.invalid",
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

    def test_viewer_can_read_project_detail_but_not_edit(self):
        project = Project.objects.create(name="Project Detail Viewer", created_by=self.admin)
        self.client.force_authenticate(self.viewer)

        detail_response = self.client.get(f"/api/projects/{project.id}/")
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)

        update_response = self.client.patch(
            f"/api/projects/{project.id}/",
            {"name": "No autorizado"},
            format="json",
        )
        self.assertEqual(update_response.status_code, status.HTTP_403_FORBIDDEN)

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
            email="admin2.tests@internal.invalid",
            password="Admin123!",
            role="admin",
        )
        self.editor = User.objects.create_user(
            email="editor2.tests@internal.invalid",
            password="Editor123!",
            role="editor",
        )
        self.viewer = User.objects.create_user(
            email="viewer2.tests@internal.invalid",
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

    def test_clientbrief_reference_image_is_persisted_in_database(self):
        self.client.force_authenticate(self.editor)
        payload = {
            "clientName": "Laboratorio Imagen",
            "referenceImage": {
                "id": "img-1",
                "name": "referencia.png",
                "mimeType": "image/png",
                "size": 67,
                "contentBase64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=",
            },
        }

        write_response = self.client.patch(
            f"/api/projects/{self.project.id}/advanced-modules/clientbrief/",
            payload,
            format="json",
        )
        self.assertEqual(write_response.status_code, status.HTTP_200_OK)

        read_response = self.client.get(f"/api/projects/{self.project.id}/advanced-modules/")
        self.assertEqual(read_response.status_code, status.HTTP_200_OK)
        self.assertEqual(read_response.data["clientBrief"]["referenceImage"]["id"], "img-1")
        self.assertEqual(read_response.data["clientBrief"]["referenceImage"]["mimeType"], "image/png")
        self.assertNotIn("contentBase64", read_response.data["clientBrief"]["referenceImage"])

        advanced_data = ProjectAdvancedData.objects.get(project=self.project)
        self.assertEqual(advanced_data.client_brief["referenceImage"]["id"], "img-1")

        image_response = self.client.get(
            f"/api/projects/{self.project.id}/advanced-modules/image/clientbrief/"
        )
        self.assertEqual(image_response.status_code, status.HTTP_200_OK)
        self.assertEqual(image_response.data["referenceImage"]["id"], "img-1")
        self.assertEqual(
            image_response.data["referenceImage"]["contentBase64"],
            payload["referenceImage"]["contentBase64"],
        )

    def test_prebrief_and_clientbrief_reference_images_are_loaded_independently(self):
        self.client.force_authenticate(self.editor)

        prebrief_payload = {
            "clientName": "Lead inicial",
            "referenceImage": {
                "id": "img-pre-only",
                "name": "prebrief.png",
                "mimeType": "image/png",
                "size": 67,
                "contentBase64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=",
            },
        }
        clientbrief_payload = {
            "clientName": "Cliente formal",
            "referenceImage": {
                "id": "img-client-only",
                "name": "clientbrief.png",
                "mimeType": "image/png",
                "size": 67,
                "contentBase64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNkYAAAAAIAAeIhvDMAAAAASUVORK5CYII=",
            },
        }

        prebrief_response = self.client.patch(
            f"/api/projects/{self.project.id}/advanced-modules/prebrief/",
            prebrief_payload,
            format="json",
        )
        self.assertEqual(prebrief_response.status_code, status.HTTP_200_OK)

        clientbrief_response = self.client.patch(
            f"/api/projects/{self.project.id}/advanced-modules/clientbrief/",
            clientbrief_payload,
            format="json",
        )
        self.assertEqual(clientbrief_response.status_code, status.HTTP_200_OK)

        modules_response = self.client.get(f"/api/projects/{self.project.id}/advanced-modules/")
        self.assertEqual(modules_response.status_code, status.HTTP_200_OK)
        self.assertEqual(modules_response.data["preBrief"]["referenceImage"]["id"], "img-pre-only")
        self.assertEqual(modules_response.data["clientBrief"]["referenceImage"]["id"], "img-client-only")
        self.assertNotIn("contentBase64", modules_response.data["preBrief"]["referenceImage"])
        self.assertNotIn("contentBase64", modules_response.data["clientBrief"]["referenceImage"])

        prebrief_image_response = self.client.get(
            f"/api/projects/{self.project.id}/advanced-modules/image/prebrief/"
        )
        self.assertEqual(prebrief_image_response.status_code, status.HTTP_200_OK)
        self.assertEqual(prebrief_image_response.data["referenceImage"]["id"], "img-pre-only")
        self.assertEqual(
            prebrief_image_response.data["referenceImage"]["contentBase64"],
            prebrief_payload["referenceImage"]["contentBase64"],
        )

        clientbrief_image_response = self.client.get(
            f"/api/projects/{self.project.id}/advanced-modules/image/clientbrief/"
        )
        self.assertEqual(clientbrief_image_response.status_code, status.HTTP_200_OK)
        self.assertEqual(clientbrief_image_response.data["referenceImage"]["id"], "img-client-only")
        self.assertEqual(
            clientbrief_image_response.data["referenceImage"]["contentBase64"],
            clientbrief_payload["referenceImage"]["contentBase64"],
        )

    def test_clientbrief_reference_image_rejects_invalid_mime_type(self):
        self.client.force_authenticate(self.editor)
        payload = {
            "referenceImage": {
                "id": "img-2",
                "name": "documento.pdf",
                "mimeType": "application/pdf",
                "size": 10,
                "contentBase64": "aGVsbG8=",
            },
        }

        response = self.client.patch(
            f"/api/projects/{self.project.id}/advanced-modules/clientbrief/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("referenceImage", response.data)

    def test_advanced_modules_prebrief_reference_image_with_uploaded_at_is_persisted(self):
        self.client.force_authenticate(self.editor)
        payload = {
            "preBrief": {
                "validated": True,
                "referenceImage": {
                    "id": "img-pre-1",
                    "name": "prebrief.png",
                    "mimeType": "image/png",
                    "size": 67,
                    "contentBase64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=",
                    "uploadedAt": "2026-03-19T12:34:56Z",
                },
            }
        }

        response = self.client.patch(
            f"/api/projects/{self.project.id}/advanced-modules/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["preBrief"]["referenceImage"]["uploadedAt"],
            "2026-03-19T12:34:56Z",
        )

        advanced_data = ProjectAdvancedData.objects.get(project=self.project)
        self.assertEqual(
            advanced_data.pre_brief["referenceImage"]["uploadedAt"],
            "2026-03-19T12:34:56Z",
        )

    def test_projects_list_excludes_reference_image_content_base64(self):
        self.client.force_authenticate(self.editor)
        payload = {
            "clientBrief": {
                "referenceImage": {
                    "id": "img-list-1",
                    "name": "listado.png",
                    "mimeType": "image/png",
                    "size": 67,
                    "contentBase64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=",
                }
            }
        }

        write_response = self.client.patch(
            f"/api/projects/{self.project.id}/advanced-modules/",
            payload,
            format="json",
        )
        self.assertEqual(write_response.status_code, status.HTTP_200_OK)

        list_response = self.client.get("/api/projects/")
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        project_row = next(item for item in list_response.data if str(item["id"]) == str(self.project.id))
        self.assertNotIn(
            "contentBase64",
            project_row["advanced_modules"]["clientBrief"]["referenceImage"],
        )


class TrackingConsecutiveApiTests(APITestCase):
    def setUp(self):
        self.editor = User.objects.create_user(
            email="editor-consecutive.tests@internal.invalid",
            password="Editor123!",
            role="editor",
        )
        self.client.force_authenticate(self.editor)

    def test_create_project_returns_full_year_consecutive(self):
        response = self.client.post("/api/projects/", {"name": "Proyecto consecutivo"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertRegex(response.data["consecutive"], r"^\d{4}-\d{4}$")
        self.assertTrue(response.data["consecutive"].endswith(str(timezone.localdate().year)))


class TrackingConsecutiveConcurrencyTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.editor = User.objects.create_user(
            email="editor-concurrency.tests@internal.invalid",
            password="Editor123!",
            role="editor",
        )

    def _create_project_and_get_consecutive(self, idx):
        close_old_connections()
        try:
            project = Project.objects.create(name=f"Proyecto {idx}", created_by_id=self.editor.id)
            return project.consecutive
        finally:
            connections.close_all()

    def test_consecutive_is_unique_under_parallel_creations(self):
        if connection.vendor == "sqlite" and connection.settings_dict.get("NAME") == ":memory:":
            self.skipTest("SQLite in-memory no comparte estado entre hilos en este escenario")

        total = 8
        with ThreadPoolExecutor(max_workers=total) as pool:
            consecutives = list(pool.map(self._create_project_and_get_consecutive, range(total)))
        close_old_connections()

        self.assertEqual(len(consecutives), total)
        self.assertEqual(len(set(consecutives)), total)
        self.assertTrue(all(re.match(r"^\d{4}-\d{4}$", item or "") for item in consecutives))
