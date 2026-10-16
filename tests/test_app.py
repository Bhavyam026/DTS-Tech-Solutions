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
        return _FakeResponse("Ji, electrical panel ke liye details bataiye.")


def _client_with_confirmed_session(session_id):
    client = dts_app.app.test_client()
    session = dts_app._get_session(session_id)
    session["state"] = "CONFIRMED"
    session["summary"] = "DTS AI Enquiry Summary\nProduct / Service: CCTV"
    session["details"] = {"product_service": "CCTV", "quantity": "2 CCTV Camera"}
    session["history"] = [
        {"role": "user", "content": "2 CCTV chahiye Boisar"},
        {"role": "assistant", "content": "Customer explicitly confirmed the displayed summary."},
    ]
    return client, session


def test_new_requirement_after_confirmation_starts_fresh_enquiry(monkeypatch):
    session_id = "dts-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
    dts_app._sessions.pop(session_id, None)
    client, session = _client_with_confirmed_session(session_id)
    monkeypatch.setattr(dts_app, "model", _FakeChat())

    response = client.post(
        "/api/chat",
        json={
            "session_id": session_id,
            "messages": [{"role": "user", "content": "muze electrical panel bhi chahiye"}],
        },
    )

    assert response.status_code == 200
    data = response.get_json()
    assert data["state"] == "GATHERING"
    assert "pehle hi confirm" not in data["reply"].casefold()
    assert data["pending_summary"] is None
    assert data["whatsapp_draft_url"] is None
    assert data["whatsapp_sent"] is False
    assert session["summary"] is None
    assert session["details"] is None
    assert session["history"][0]["content"] == "muze electrical panel bhi chahiye"


def test_non_requirement_after_confirmation_stays_locked():
    session_id = "dts-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
    dts_app._sessions.pop(session_id, None)
    client, session = _client_with_confirmed_session(session_id)

    response = client.post(
        "/api/chat",
        json={
            "session_id": session_id,
            "messages": [{"role": "user", "content": "thanks"}],
        },
    )

    assert response.status_code == 200
    data = response.get_json()
    assert data["state"] == "CONFIRMED"
    assert "pehle hi confirm" in data["reply"].casefold()
    assert data["pending_summary"] == session["summary"]
    assert data["whatsapp_draft_url"] is None
    assert data["whatsapp_sent"] is False



def test_general_greeting_and_value_questions_get_direct_answers():
    cases = [
        (
            "dts-cccccccc-cccc-cccc-cccc-cccccccccccc",
            "hii",
            ("Main DTS AI Assistant", "CCTV", "help"),
        ),
        (
            "dts-dddddddd-dddd-dddd-dddd-dddddddddddd",
            "muze ky milega yaha pe",
            ("technical solution", "CCTV", "enquiry"),
        ),
        (
            "dts-eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
            "ku maiapke serivces use karu",
            ("DTS", "installation", "AMC"),
        ),
        (
            "dts-ffffffff-ffff-ffff-ffff-ffffffffffff",
            "konsi services provide karte ho",
            ("CCTV", "CAT6", "electrical", "fire safety", "AMC"),
        ),
        (
            "dts-11111111-1111-1111-1111-111111111111",
            "kaun kaun si service dete ho",
            ("Prizor", "NVR", "UPS", "installation"),
        ),
    ]

    for session_id, message, expected_terms in cases:
        dts_app._sessions.pop(session_id, None)
        client = dts_app.app.test_client()
        response = client.post(
            "/api/chat",
            json={
                "session_id": session_id,
                "messages": [{"role": "user", "content": message}],
            },
        )

        assert response.status_code == 200
        data = response.get_json()
        reply = data["reply"].casefold()
        assert all(term.casefold() in reply for term in expected_terms)
        if message != "hii":
            assert "aapko kis cheez ki requirement hai" not in reply
        assert data["whatsapp_sent"] is False
