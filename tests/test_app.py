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


def test_unknown_location_is_accepted_instead_of_reprompted():
    assert dts_app._has_location_in_messages(["I need an electrical panel", "Dubai"])
    assert dts_app._extract_customer_location(["I need an electrical panel", "Dubai"]) == "Dubai"
    assert dts_app._has_location_in_messages(["I need CCTV installation in Dubai"])
    assert dts_app._extract_customer_location(["I need CCTV installation in Dubai"]) == "Dubai"


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




def test_cctv_brand_question_answers_prizor_before_asking_quantity():
    session_id = "dts-22222222-2222-2222-2222-222222222222"
    dts_app._sessions.pop(session_id, None)
    client = dts_app.app.test_client()

    response = client.post(
        "/api/chat",
        json={
            "session_id": session_id,
            "messages": [{"role": "user", "content": "cctv konsi campoy ka hai ??"}],
        },
    )

    assert response.status_code == 200
    data = response.get_json()
    reply = data["reply"].casefold()
    assert "prizor" in reply
    assert "outdoor poe" in reply
    assert "wi-fi ptz" in reply
    assert "kitni quantity" not in reply
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


def test_single_item_quantity_location_and_phone_are_tracked_without_reasking():
    session_id = "dts-33333333-3333-3333-3333-333333333333"
    dts_app._sessions.pop(session_id, None)
    client = dts_app.app.test_client()

    first = client.post(
        "/api/chat",
        json={
            "session_id": session_id,
            "messages": [{"role": "user", "content": "5 indoor cctv mumbai"}],
        },
    )
    assert first.status_code == 200
    first_data = first.get_json()
    assert first_data["state"] == "GATHERING"
    assert "mobile number" in first_data["reply"].casefold()
    assert "quantity" not in first_data["reply"].casefold() or "5" in first_data["reply"]
    session = dts_app._sessions[session_id]
    assert session["details"]["quantity"] == "5 CCTV Camera"
    assert session["details"]["location"] == "Mumbai"
    assert session["details"]["product_service"] == "Indoor CCTV Camera"

    second = client.post(
        "/api/chat",
        json={
            "session_id": session_id,
            "messages": [{"role": "user", "content": "9876543210"}],
        },
    )
    assert second.status_code == 200
    second_data = second.get_json()
    assert second_data["state"] == "SUMMARY_READY"
    assert "5 CCTV Camera" in second_data["pending_summary"]
    assert "Mumbai" in second_data["pending_summary"]
    assert "9876543210" in second_data["pending_summary"]
    assert second_data["whatsapp_draft_url"] is None
    assert second_data["whatsapp_sent"] is False

    third = client.post(
        "/api/chat",
        json={
            "session_id": session_id,
            "messages": [{"role": "user", "content": "CONFIRM SUMMARY"}],
        },
    )
    assert third.status_code == 200
    third_data = third.get_json()
    assert third_data["state"] == "CONFIRMED"
    assert third_data["whatsapp_draft_url"].startswith("https://wa.me/")
    assert third_data["whatsapp_sent"] is False


def test_confirm_summary_without_complete_summary_does_not_create_whatsapp_draft():
    session_id = "dts-44444444-4444-4444-4444-444444444444"
    dts_app._sessions.pop(session_id, None)
    client = dts_app.app.test_client()

    response = client.post(
        "/api/chat",
        json={
            "session_id": session_id,
            "messages": [{"role": "user", "content": "CONFIRM SUMMARY"}],
        },
    )

    assert response.status_code == 200
    data = response.get_json()
    assert data["state"] == "GATHERING"
    assert data["whatsapp_draft_url"] is None
    assert "complete enquiry summary" in data["reply"].casefold()
    assert data["whatsapp_sent"] is False



def test_prizor_tv_question_is_recognized_instead_of_redirecting_to_cctv():
    message = "Prizor 43-Inch Smart 4K UHD TV ye nhiye ky ??"
    reply = dts_app._deterministic_catalog_reply(message, [message])

    assert dts_app._has_customer_requirement(["muje 43 ich ka tv chiye"])
    assert reply is not None
    assert "43-inch Smart TV" in reply
    assert "Stock aur price confirm karke" in reply
    assert "kitne TV chahiye" in reply
    assert "catalogue mein alag product requirement" not in reply
    assert "CCTV" not in reply


def test_tv_quantity_is_parsed_separately_from_screen_size():
    assert dts_app._extract_multi_item_quantities(["2 TV chahiye"]) == ["2 TV"]
    assert dts_app._extract_multi_item_quantities(["43 inch TV chahiye"]) == []
    fallback, details = dts_app._deterministic_quota_fallback(
        ["43 inch TV chahiye", "Mumbai"]
    )
    assert "TV" in details["product_service"]
    assert details["location"] == "Mumbai"
    assert "quantity" in fallback.casefold()
    assert "Namaste! Main DTS AI Assistant hoon. Aapko kis cheez ki requirement hai" not in fallback



def test_tv_feature_question_keeps_existing_quantity_and_location_and_asks_only_for_phone(monkeypatch):
    session_id = "dts-cccccccc-cccc-cccc-cccc-cccccccccccc"
    dts_app._sessions.pop(session_id, None)
    client = dts_app.app.test_client()
    session = dts_app._get_session(session_id)
    session["history"] = [
        {"role": "user", "content": "50 ich ka TV chahiye"},
        {"role": "assistant", "content": "Ji, Smart TV ke liye enquiry le sakte hain. Kitne TV chahiye?"},
        {"role": "user", "content": "2"},
        {"role": "assistant", "content": "Installation ya service kis location par chahiye?"},
        {"role": "user", "content": "palghar MIDC mai"},
        {"role": "assistant", "content": "Apna valid 10-digit Indian mobile number share karein."},
    ]

    response = client.post(
        "/api/chat",
        json={
            "session_id": session_id,
            "messages": [{"role": "user", "content": "Tv ke andar ky ky milega ??"}],
        },
    )

    assert response.status_code == 200
    data = response.get_json()
    assert data["state"] == "GATHERING"
    assert "exact model par depend karta hai" in data["reply"]
    assert "50-inch" in data["reply"]
    assert "2 TV" in data["reply"]
    assert "Palghar" in data["reply"]
    assert "mobile number" in data["reply"].casefold()
    assert "kitne TV chahiye" not in data["reply"].casefold()
    assert "location" not in data["reply"].casefold()
    assert data["whatsapp_draft_url"] is None
    assert data["whatsapp_sent"] is False
