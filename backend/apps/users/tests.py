from django.contrib.auth import get_user_model
from django.urls import reverse
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


class AuthApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="admin",
            email="admin.demo@internal.invalid",
            password="Admin123!",
            role="admin",
        )

    def test_login_me_and_refresh_flow_with_username(self):
        login_response = self.client.post(
            reverse("auth-login"),
            {"identifier": "admin", "password": "Admin123!"},
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertIn("access", login_response.data)
        self.assertIn("refresh", login_response.data)

        access = login_response.data["access"]
        refresh = login_response.data["refresh"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        me_response = self.client.get(reverse("auth-me"))
        self.assertEqual(me_response.status_code, status.HTTP_200_OK)
        self.assertEqual(me_response.data["role"], "admin")
        self.assertEqual(set(me_response.data.keys()), {"id", "username", "role"})

        refresh_response = self.client.post(
            reverse("auth-refresh"),
            {"refresh": refresh},
            format="json",
        )
        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)

    def test_login_still_supports_email_identifier(self):
        response = self.client.post(
            reverse("auth-login"),
            {"identifier": "admin.demo@internal.invalid", "password": "Admin123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertEqual(set(response.data["user"].keys()), {"id", "username", "role"})

    def test_health_endpoint_is_public(self):
        response = self.client.get(reverse("health"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["status"], "ok")

    @override_settings(ALLOWED_HOSTS=["localhost", "127.0.0.1", "testserver"])
    def test_invalid_host_returns_json_for_api(self):
        response = self.client.post(
            reverse("auth-login"),
            {"identifier": "admin", "password": "Admin123!"},
            format="json",
            HTTP_HOST="seguimiento-id-",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json().get("code"), "invalid_host")
