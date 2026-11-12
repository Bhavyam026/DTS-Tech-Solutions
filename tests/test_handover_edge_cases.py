import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import app as dts_app


class _FakeResponse:
    def __init__(self, text):
        self.text = text


class _FakeChat:
    def start_chat(self, history=None):
        return self

    def send_message(self, message):
        return _FakeResponse("Ji, aapki baat note kar li. Kripya details confirm karein.")


def _ready_session(session_id):
    dts_app._sessions.pop(session_id, None)
    session = dts_app._get_session(session_id)
    session["state"] = "SUMMARY_READY"
    session["details"] = {
        "product_service": "CCTV Camera",
        "quantity": "2 CCTV Camera",
        "location": "Boisar",
        "contact_name": "",
        "contact_number": "7826349150",
        "notes": "",
    }
    session["summary"] = dts_app._format_summary(session["details"])
    session["history"] = [
        {"role": "user", "content": "2 CCTV camera Boisar"},
        {"role": "user", "content": "7826349150"},
        {"role": "assistant", "content": session["summary"]},
    ]
    return session


def _post(client, session_id, message):
    return client.post(
        "/api/chat",
        json={
            "session_id": session_id,
            "messages": [{"role": "user", "content": message}],
        },
    )


def test_only_exact_confirm_summary_is_confirmation():
    assert dts_app._is_explicit_confirmation("CONFIRM SUMMARY")
    assert dts_app._is_explicit_confirmation("  confirm   summary  ")
    for casual in ("yes", "haan", "sahi hai", "ok", "okay", "done", "bhej do", "confirm summary please", "CONFIRM SUMMARY!"):
        assert not dts_app._is_explicit_confirmation(casual), casual


def test_casual_yes_does_not_create_whatsapp_draft(monkeypatch):
    session_id = "dts-aaaaaaaa-1111-2222-3333-444444444444"
    session = _ready_session(session_id)
    monkeypatch.setattr(dts_app, "model", _FakeChat())
    monkeypatch.setattr(dts_app, "_extract_details", lambda _messages: None)
    client = dts_app.app.test_client()

    response = _post(client, session_id, "haan")
    assert response.status_code == 200
    data = response.get_json()
    assert data["whatsapp_draft_url"] is None
    assert data["whatsapp_sent"] is False
    assert data["state"] != "CONFIRMED"


def test_exact_confirmation_creates_prefilled_draft_only_for_complete_summary():
    session_id = "dts-bbbbbbbb-1111-2222-3333-444444444444"
    _ready_session(session_id)
    client = dts_app.app.test_client()

    response = _post(client, session_id, "CONFIRM SUMMARY")
    assert response.status_code == 200
    data = response.get_json()
    assert data["state"] == "CONFIRMED"
    assert data["whatsapp_draft_url"].startswith("https://wa.me/")
    assert data["whatsapp_sent"] is False


def test_multi_product_quantities_remain_item_specific():
    messages = ["i want 5 ups and 3 electrical plane for plaghar loction"]
    assert dts_app._extract_multi_item_quantities(messages) == [
        "5 UPS",
        "3 Electrical Panel",
    ]
    fallback, details = dts_app._deterministic_quota_fallback(messages)
    assert "5 UPS" in details["quantity"]
    assert "3 Electrical Panel" in details["quantity"]
    assert details["location"] == "Palghar"
    # Without a customer mobile number, the safe next step is to ask for it,
    # not to show the final confirmation phrase prematurely.
    assert "mobile number" in fallback.casefold()


def test_quota_fallback_does_not_mark_whatsapp_as_sent():
    fallback, details = dts_app._deterministic_quota_fallback(
        ["2 ups", "1 electrical panel", "Boisar", "7826349150"]
    )
    assert details["quantity"]
    assert "CONFIRM SUMMARY" in fallback
    # The deterministic fallback prepares enquiry data only; it never sends WhatsApp.
    assert "sent" not in fallback.casefold()
