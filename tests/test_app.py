import json
import os
import sys
import time
from pathlib import Path
from types import SimpleNamespace

os.environ.setdefault("GEMINI_API_KEY", "test-key")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import app as dts_app


class FakeChat:
    def __init__(self, history):
        self.history = history

    def send_message(self, message):
        return SimpleNamespace(text="Thanks, I have noted your enquiry.")


class FakeModel:
    def start_chat(self, history=None):
        return FakeChat(history or [])


class FakeExtractor:
    def generate_content(self, prompt):
        payload = json.loads(prompt)
        customer_text = " ".join(payload.get("customer_messages", []))
        details = {
            "product_service": "CCTV cameras" if "cctv cameras" in customer_text.casefold() else None,
            "location": "Boisar" if "boisar" in customer_text.casefold() else None,
            "quantity": None,
            "contact_name": None,
            "contact_number": None,
            "notes": None,
        }
        return SimpleNamespace(text=json.dumps(details))


def setup_function():
    dts_app.app.config.update(TESTING=True)
    dts_app._sessions.clear()
    dts_app.model = FakeModel()
    dts_app.extractor_model = FakeExtractor()


def post_message(client, session_id, message):
    return client.post(
        "/api/chat",
        json={
            "session_id": session_id,
            "messages": [{"role": "user", "content": message}],
        },
    )


def test_home_route_serves_root_index_html():
    response = dts_app.app.test_client().get("/")
    assert response.status_code == 200
    assert b"Dynamic Technology Solutions" in response.data


def test_invalid_session_id_is_rejected():
    response = post_message(dts_app.app.test_client(), "not-a-valid-session", "Hello")
    assert response.status_code == 400
    assert "error" in response.get_json()


def test_whatsapp_draft_requires_explicit_summary_confirmation():
    client = dts_app.app.test_client()
    session_id = "dts-12345678-1234-4234-8234-123456789abc"

    first = post_message(client, session_id, "I need CCTV cameras in Boisar")
    assert first.status_code == 200
    assert first.get_json()["state"] == "SUMMARY_READY"
    assert first.get_json()["pending_summary"]

    not_confirmation = post_message(client, session_id, "yes")
    assert not_confirmation.status_code == 200
    assert not_confirmation.get_json()["state"] != "CONFIRMED"
    assert not_confirmation.get_json()["whatsapp_draft_url"] is None
    assert not_confirmation.get_json()["whatsapp_sent"] is False

    confirmed = post_message(client, session_id, "CONFIRM SUMMARY")
    body = confirmed.get_json()
    assert confirmed.status_code == 200
    assert body["state"] == "CONFIRMED"
    assert body["whatsapp_draft_url"].startswith("https://wa.me/918390909845?")
    assert body["whatsapp_sent"] is False


def test_sessions_do_not_share_conversation_state():
    client = dts_app.app.test_client()
    first_session = "dts-12345678-1234-4234-8234-123456789abc"
    second_session = "dts-abcdefab-cdef-4abc-8def-abcdefabcdef"

    first = post_message(client, first_session, "I need CCTV cameras in Boisar")
    second = post_message(client, second_session, "Hello")

    assert first.get_json()["state"] == "SUMMARY_READY"
    assert second.get_json()["state"] == "GATHERING"
    assert second.get_json()["pending_summary"] is None


def test_health_endpoint_reports_configuration_without_calling_model():
    response = dts_app.app.test_client().get("/health")
    body = response.get_json()

    assert response.status_code == 200
    assert body["status"] == "ok"
    assert body["service"] == "DTS Gemini AI Backend"
    assert "ai_configured" in body
    assert "not a live Gemini response" in body["note"]


def test_github_pages_origin_passes_cors_preflight():
    origin = "https://bhavyam026.github.io"
    response = dts_app.app.test_client().options(
        "/api/chat",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers.get("Access-Control-Allow-Origin") == origin
    assert "POST" in response.headers.get("Access-Control-Allow-Methods", "")


def test_cctv_without_location_does_not_prepare_whatsapp_draft():
    client = dts_app.app.test_client()
    session_id = "dts-12345678-1234-4234-8234-123456789abc"

    response = post_message(client, session_id, "2 CCTV cameras")
    body = response.get_json()

    assert response.status_code == 200
    assert body["state"] == "GATHERING"
    assert body["pending_summary"] is None
    assert body["whatsapp_draft_url"] is None
    assert body["whatsapp_sent"] is False


def test_model_failure_returns_bounded_json_error():
    class BrokenModel:
        def start_chat(self, history=None):
            raise RuntimeError("simulated provider outage")

    dts_app.model = BrokenModel()
    client = dts_app.app.test_client()
    session_id = "dts-12345678-1234-4234-8234-123456789abc"

    response = post_message(client, session_id, "Hello")

    assert response.status_code == 502
    assert response.is_json
    assert "error" in response.get_json()

def test_expired_session_is_recreated_without_stale_summary():
    client = dts_app.app.test_client()
    session_id = "dts-12345678-1234-4234-8234-123456789abc"

    first = post_message(client, session_id, "I need CCTV cameras in Boisar")
    assert first.get_json()["state"] == "SUMMARY_READY"

    dts_app._sessions[session_id]["updated_at"] = (
        time.time() - dts_app.SESSION_TTL_SECONDS - 1
    )
    second = post_message(client, session_id, "Hello again")
    body = second.get_json()

    assert second.status_code == 200
    assert body["state"] == "GATHERING"
    assert body["pending_summary"] is None
    assert body["whatsapp_draft_url"] is None
