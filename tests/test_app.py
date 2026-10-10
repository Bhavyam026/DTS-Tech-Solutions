import json
import os
import pytest
import re
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
        numbers = re.findall(r"(?<!\d)(?:\+?91[\s-]?)?0?\d{10}(?!\d)", customer_text)
        details = {
            "product_service": "CCTV cameras" if "cctv cameras" in customer_text.casefold() else None,
            "location": "Boisar" if "boisar" in customer_text.casefold() else None,
            "quantity": None,
            "contact_name": None,
            "contact_number": numbers[-1] if numbers else None,
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

    first = post_message(client, session_id, "I need CCTV cameras in Boisar, number 9876543210")
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

    first = post_message(client, first_session, "I need CCTV cameras in Boisar, number 9876543210")
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



def test_valid_indian_mobile_number_formats():
    assert dts_app._is_valid_indian_mobile("9876543210")
    assert dts_app._is_valid_indian_mobile("+91 9876543210")
    assert dts_app._is_valid_indian_mobile("09876543210")
    assert not dts_app._is_valid_indian_mobile("1234567890")
    assert not dts_app._is_valid_indian_mobile("987654321")


def test_summary_waits_for_valid_mobile_number():
    client = dts_app.app.test_client()
    session_id = "dts-12345678-1234-4234-8234-123456789abc"

    invalid = post_message(
        client,
        session_id,
        "I need CCTV cameras in Boisar, number 1234567890",
    )
    invalid_body = invalid.get_json()
    assert invalid.status_code == 200
    assert invalid_body["state"] == "GATHERING"
    assert invalid_body["pending_summary"] is None
    assert invalid_body["whatsapp_draft_url"] is None
    assert "valid 10-digit" in invalid_body["reply"]

    valid = post_message(client, session_id, "My mobile number is 9876543210")
    valid_body = valid.get_json()
    assert valid.status_code == 200
    assert valid_body["state"] == "SUMMARY_READY"
    assert "9876543210" in valid_body["pending_summary"]
    assert valid_body["whatsapp_draft_url"] is None
    assert valid_body["whatsapp_sent"] is False


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

def test_json_parser_accepts_fenced_json_object():
    parsed = dts_app._parse_json_object(
        '```json\n{"product_service":"fire safety equipment","location":"Boisar"}\n```'
    )
    assert parsed == {
        "product_service": "fire safety equipment",
        "location": "Boisar",
    }


def test_chat_adapter_falls_back_on_transient_primary_model_error(monkeypatch):
    class BrokenPrimaryChat:
        def send_message(self, message):
            raise RuntimeError("503 UNAVAILABLE: temporary high demand")

    class FakeChats:
        def __init__(self):
            self.models = []

        def create(self, model, history, config):
            self.models.append(model)
            return FakeChat(history)

    class FakeClient:
        def __init__(self):
            self.chats = FakeChats()

    fake_client = FakeClient()
    monkeypatch.setattr(dts_app, "GEMINI_FALLBACK_MODEL", "gemini-3.6-flash")
    adapter = dts_app._ChatAdapter(
        BrokenPrimaryChat(),
        client=fake_client,
        history=[{"role": "user", "parts": ["previous test turn"]}],
        config={},
        model_name="gemini-3.8-flash",
    )

    response = adapter.send_message("5 fire safety equipment")

    assert response.text == "Thanks, I have noted your enquiry."
    assert fake_client.chats.models == ["gemini-3.6-flash"]



def test_extractor_falls_back_on_transient_primary_model_error(monkeypatch):
    class FakeModels:
        def __init__(self):
            self.calls = []

        def generate_content(self, model, contents, config):
            self.calls.append(model)
            if model == "gemini-3.8-flash":
                raise RuntimeError("503 UNAVAILABLE: temporary high demand")
            return SimpleNamespace(
                text='{"product_service":"fire safety equipment","location":"Boisar"}'
            )

    class FakeClient:
        def __init__(self):
            self.models = FakeModels()

    fake_client = FakeClient()
    monkeypatch.setattr(dts_app, "GEMINI_MODEL", "gemini-3.8-flash")
    monkeypatch.setattr(dts_app, "GEMINI_FALLBACK_MODEL", "gemini-3.6-flash")
    monkeypatch.setattr(dts_app, "_get_gemini_client", lambda: fake_client)

    response = dts_app._GeminiExtractorModel().generate_content("test prompt")

    assert response.text.startswith("{")
    assert fake_client.models.calls == ["gemini-3.8-flash", "gemini-3.6-flash"]


def test_json_parser_rejects_malformed_json():
    with pytest.raises(json.JSONDecodeError):
        dts_app._parse_json_object('{"product_service": "CCTV", "location": }')


def test_json_parser_rejects_non_object_json():
    assert dts_app._parse_json_object('["not", "an", "object"]') is None


def test_malformed_extractor_json_never_prepares_whatsapp_draft():
    class MalformedExtractor:
        def generate_content(self, prompt):
            return SimpleNamespace(
                text="""\x60\x60\x60json
{"product_service":"fire safety equipment","location":}
\x60\x60\x60"""
            )

    dts_app.extractor_model = MalformedExtractor()
    client = dts_app.app.test_client()
    session_id = "dts-12345678-1234-4234-8234-123456789abc"

    response = post_message(
        client,
        session_id,
        "I need fire safety equipment in Boisar, number 9876543210",
    )
    body = response.get_json()

    assert response.status_code == 200
    assert body["state"] == "GATHERING"
    assert body["pending_summary"] is None
    assert body["whatsapp_draft_url"] is None
    assert body["whatsapp_sent"] is False

def test_expired_session_is_recreated_without_stale_summary():
    client = dts_app.app.test_client()
    session_id = "dts-12345678-1234-4234-8234-123456789abc"

    first = post_message(client, session_id, "I need CCTV cameras in Boisar, number 9876543210")
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



def test_dts_brand_inventory_never_claims_unlisted_cctv_brands():
    reply = dts_app._sanitize_bot_reply(
        "Humare paas CP Plus, Hikvision, Dahua available hai."
    )
    assert "Prizor products listed" in reply
    assert "availability main confirm nahi kar sakta" in reply
    assert "available hai" not in reply


def test_internal_prompt_fragment_is_replaced_with_customer_safe_acknowledgement():
    reply = dts_app._sanitize_bot_reply(
        "**: * Acknowledge receipt of details clearly without claiming"
    )
    assert reply == "Ji, aapki details mil gayi hain. Enquiry abhi send nahi hui hai."
    assert "Acknowledge receipt of" not in reply


def test_quota_exhaustion_does_not_trigger_model_fallback():
    error = RuntimeError(
        "429 RESOURCE_EXHAUSTED: Quota exceeded for metric: "
        "generate_content_free_tier_requests"
    )
    assert dts_app._is_quota_exhausted_error(error)
    assert not dts_app._is_transient_provider_error(error)


def test_extractor_is_not_called_until_customer_provides_mobile_number():
    class NoCallExtractor:
        def __init__(self):
            self.called = False

        def generate_content(self, prompt):
            self.called = True
            raise AssertionError("Extractor should not run before a mobile number is supplied")

    extractor = NoCallExtractor()
    dts_app.extractor_model = extractor
    client = dts_app.app.test_client()
    session_id = "dts-12345678-1234-4234-8234-123456789abc"

    response = post_message(client, session_id, "CCTV chiye")

    assert response.status_code == 200
    assert response.get_json()["state"] == "GATHERING"
    assert extractor.called is False
