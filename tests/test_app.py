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
    assert session["history"][0]["content"] == "mujhe electrical panel bhi chahiye"


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



def test_messy_hinglish_and_indirect_sourcing_questions_get_direct_answers():
    # Realistic misspellings and indirect phrasing customers use on the DTS site.
    cases = [
        ("mu jo chiye wo apke pass nhi mila to", ("catalogue", "source", "special order")),
        ("muze jo chiye woapke pass nhi mila to", ("catalogue", "source", "special order")),
        ("muze SSD hai", ("SSD", "capacity", "256 GB")),
        ("ssd chahiye 1 tb", ("1 TB", "internal", "external")),
    ]
    for message, expected in cases:
        reply = dts_app._deterministic_catalog_reply(message, [message])
        assert reply is not None, message
        folded = reply.casefold()
        assert all(term.casefold() in folded for term in expected), (message, reply)


def test_ssd_quantity_number_is_not_repeated_as_capacity_question():
    reply = dts_app._deterministic_catalog_reply(
        "SSD chiye muze 3",
        ["SSD chiye muze 3"],
    )
    assert reply is not None
    assert "3 SSD" in reply
    assert "capacity" in reply.casefold()
    assert "256 GB" in reply
    assert "kitni capacity chahiye" not in reply.casefold()


def test_server_question_explains_options_before_followup():
    reply = dts_app._deterministic_catalog_reply(
        "server konsa milega",
        ["server konsa milega"],
    )
    assert reply is not None
    assert "tower server" in reply.casefold()
    assert "rack server" in reply.casefold()
    assert "file sharing" in reply.casefold()
    assert "exact model" in reply.casefold()
    assert "Namaste! Main DTS AI Assistant hoon" not in reply


def test_sourcing_followup_after_catalogue_question_does_not_repeat_catalogue():
    message = "order karwa sakte ho kya"
    context = [
        "ky ky apko",
        "DTS catalogue mein CCTV, networking, IT, electrical aur fire safety items hain.",
        "muze jo chiye wo apke pass nhi mila to",
        message,
    ]
    reply = dts_app._deterministic_catalog_reply(message, context)
    assert reply is not None
    assert "special order" in reply.casefold() or "source" in reply.casefold()
    assert "cctv & security" not in reply.casefold()
    assert "availability" in reply.casefold() or "confirm" in reply.casefold()


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
            "messages": [{"role": "user", "content": "7826349150"}],
        },
    )
    assert second.status_code == 200
    second_data = second.get_json()
    assert second_data["state"] == "SUMMARY_READY"
    assert "5 CCTV Camera" in second_data["pending_summary"]
    assert "Mumbai" in second_data["pending_summary"]
    assert "7826349150" in second_data["pending_summary"]
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



def test_firewall_to_network_rack_transition_does_not_repeat_greeting():
    session_id = "dts-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    dts_app._sessions.pop(session_id, None)
    client = dts_app.app.test_client()

    first = client.post(
        "/api/chat",
        json={
            "session_id": session_id,
            "messages": [{"role": "user", "content": "firewall hai apke pass"}],
        },
    )
    assert first.status_code == 200
    first_data = first.get_json()
    assert "firewall" in first_data["reply"].casefold()
    assert "catalogue mein firewall" in first_data["reply"].casefold()
    assert "Namaste! Main DTS AI Assistant hoon. Aapko kis cheez ki requirement hai" not in first_data["reply"]

    second = client.post(
        "/api/chat",
        json={
            "session_id": session_id,
            "messages": [{"role": "user", "content": "networkrack chiye"}],
        },
    )
    assert second.status_code == 200
    second_data = second.get_json()
    assert "network rack" in second_data["reply"].casefold()
    assert "u size" in second_data["reply"].casefold()
    assert "kitne racks" not in second_data["reply"].casefold() or "u size" in second_data["reply"].casefold()
    assert "Namaste! Main DTS AI Assistant hoon. Aapko kis cheez ki requirement hai" not in second_data["reply"]
    assert second_data["state"] == "GATHERING"
    assert second_data["pending_summary"] is None
    assert second_data["whatsapp_draft_url"] is None
    assert second_data["whatsapp_sent"] is False


def test_network_rack_followups_collect_u_size_quantity_location_phone_and_require_confirmation():
    session_id = "dts-bbbbbbbb-cccc-dddd-eeee-ffffffffffff"
    dts_app._sessions.pop(session_id, None)
    client = dts_app.app.test_client()

    messages = ["networkrack chiye", "12U", "2 racks", "Palghar MIDC", "7826349150"]
    responses = []
    for message in messages:
        response = client.post(
            "/api/chat",
            json={
                "session_id": session_id,
                "messages": [{"role": "user", "content": message}],
            },
        )
        assert response.status_code == 200
        responses.append(response.get_json())
        assert responses[-1]["whatsapp_draft_url"] is None
        assert responses[-1]["whatsapp_sent"] is False

    final = responses[-1]
    assert final["state"] == "SUMMARY_READY"
    assert "Network Rack (12U)" in final["pending_summary"]
    assert "2 Network Rack" in final["pending_summary"]
    assert "Palghar MIDC" in final["pending_summary"]
    assert "7826349150" in final["pending_summary"]

    confirm = client.post(
        "/api/chat",
        json={
            "session_id": session_id,
            "messages": [{"role": "user", "content": "CONFIRM SUMMARY"}],
        },
    )
    confirm_data = confirm.get_json()
    assert confirm_data["state"] == "CONFIRMED"
    assert confirm_data["whatsapp_draft_url"].startswith("https://wa.me/")
    assert confirm_data["whatsapp_sent"] is False



def test_tv_enquiry_keeps_size_quantity_location_through_feature_interruption():
    session_id = "dts-cccccccc-dddd-eeee-ffff-aaaaaaaaaaaa"
    dts_app._sessions.pop(session_id, None)
    client = dts_app.app.test_client()

    replies = []
    for message in [
        "TV hai ky ??",
        "50 ich ka chiye",
        "2",
        "palghar MIDC mai",
        "Tv ke andar ky ky milega ??",
    ]:
        response = client.post(
            "/api/chat",
            json={
                "session_id": session_id,
                "messages": [{"role": "user", "content": message}],
            },
        )
        assert response.status_code == 200
        data = response.get_json()
        replies.append(data["reply"])
        assert data["whatsapp_draft_url"] is None
        assert data["whatsapp_sent"] is False

    final_reply = replies[-1].casefold()
    assert "exact model par depend karta hai" in final_reply
    assert "50-inch" in final_reply
    assert "2 tv" in final_reply
    assert "palghar" in final_reply
    assert "mobile number" in final_reply
    assert "kitne tv chahiye" not in final_reply
    assert "city/area bata dein" not in final_reply
    assert dts_app._sessions[session_id]["state"] == "GATHERING"
    assert dts_app._sessions[session_id]["summary"] is None



def test_systemwide_hinglish_normalization_covers_common_product_typos():
    cases = {
        "acess contraol hai": "access control hai",
        "pen driver chiye": "pen drive chahiye",
        "loctaion pe chiye": "location pe chahiye",
        "kyky hota hai": "kya kya hota hai",
        "desktop mai ky ky hota hai": "desktop mai kya kya hota hai",
        "desk top mai ky ky hota hai": "desktop mai kya kya hota hai",
        "fire alaram hai": "fire alarm hai",
        "smok detector hai": "smoke detector hai",
        "access controll hai": "access control hai",
        "ups me ky hota hai": "ups me kya hota hai",
    }
    for message, expected in cases.items():
        assert dts_app._normalize_customer_text(message) == expected


def test_desktop_education_precedes_quantity_collection_and_preserves_state():
    session_id = "dts-eeeeeeee-aaaa-bbbb-cccc-dddddddddddd"
    dts_app._sessions.pop(session_id, None)
    client = dts_app.app.test_client()
    session = dts_app._get_session(session_id)
    session["state"] = "GATHERING"
    session["history"] = [
        {"role": "user", "content": "desktop chahiye"},
        {"role": "assistant", "content": "Desktop ke liye configuration bataiye."},
    ]

    response = client.post(
        "/api/chat",
        json={
            "session_id": session_id,
            "messages": [{"role": "user", "content": "desktop mai ky ky hota hai"}],
        },
    )

    assert response.status_code == 200
    data = response.get_json()
    assert "processor" in data["reply"].casefold()
    assert "ram" in data["reply"].casefold()
    assert "kitni quantity" not in data["reply"].casefold()
    assert data["state"] == "GATHERING"
    assert data["whatsapp_draft_url"] is None
    assert data["whatsapp_sent"] is False


def test_access_control_typo_gets_information_before_lead_collection():
    session_id = "dts-ffffffff-aaaa-bbbb-cccc-dddddddddddd"
    dts_app._sessions.pop(session_id, None)
    client = dts_app.app.test_client()

    response = client.post(
        "/api/chat",
        json={
            "session_id": session_id,
            "messages": [{"role": "user", "content": "acess contraol hai"}],
        },
    )

    assert response.status_code == 200
    data = response.get_json()
    assert "access-control" in data["reply"].casefold()
    assert "attendance" in data["reply"].casefold()
    assert "kitni quantity" not in data["reply"].casefold()
    assert data["whatsapp_sent"] is False


def test_pen_driver_typo_and_64_capacity_followup_keep_pen_drive_context():
    session_id = "dts-99999999-aaaa-bbbb-cccc-dddddddddddd"
    dts_app._sessions.pop(session_id, None)
    client = dts_app.app.test_client()

    first = client.post(
        "/api/chat",
        json={
            "session_id": session_id,
            "messages": [{"role": "user", "content": "pen driver hai?"}],
        },
    )
    assert first.status_code == 200
    assert "capacity" in first.get_json()["reply"].casefold() or "64 gb" in first.get_json()["reply"].casefold()

    second = client.post(
        "/api/chat",
        json={
            "session_id": session_id,
            "messages": [{"role": "user", "content": "64 ka"}],
        },
    )
    assert second.status_code == 200
    data = second.get_json()
    assert "64 gb pen drive" in data["reply"].casefold()
    assert "kitni pen drives" in data["reply"].casefold()
    assert data["whatsapp_sent"] is False


def test_vague_location_reply_preserves_active_service_context():
    session_id = "dts-88888888-aaaa-bbbb-cccc-dddddddddddd"
    dts_app._sessions.pop(session_id, None)
    client = dts_app.app.test_client()
    session = dts_app._get_session(session_id)
    session["state"] = "GATHERING"
    session["history"] = [
        {"role": "user", "content": "fire alarm chahiye"},
        {"role": "assistant", "content": "Aapko kitne detectors chahiye?"},
        {"role": "user", "content": "5 detectors"},
        {"role": "assistant", "content": "Installation kis location par chahiye?"},
    ]

    response = client.post(
        "/api/chat",
        json={
            "session_id": session_id,
            "messages": [{"role": "user", "content": "loctaion pe chiye"}],
        },
    )

    assert response.status_code == 200
    data = response.get_json()
    assert "city" in data["reply"].casefold() or "area" in data["reply"].casefold()
    assert "greeting" not in data["reply"].casefold()
    assert data["state"] == "GATHERING"
    assert data["whatsapp_draft_url"] is None
    assert data["whatsapp_sent"] is False


def test_new_desktop_question_is_not_hijacked_by_old_pen_drive_context():
    message = "desktop mai ky ky hota hai"
    reply = dts_app._deterministic_product_education_reply(
        message,
        ["pen driver hai?", "desktop mai ky ky hota hai"],
    )

    assert reply is not None
    assert "processor" in reply.casefold()
    assert "ram" in reply.casefold()
    assert "pen drive" not in reply.casefold()



def test_hdd_switches_context_after_pen_drive_and_is_added_as_second_product():
    session_id = "dts-12345678-abcd-1234-abcd-123456789012"
    dts_app._sessions.pop(session_id, None)
    client = dts_app.app.test_client()

    first = client.post(
        "/api/chat",
        json={
            "session_id": session_id,
            "messages": [{"role": "user", "content": "pen drive hai"}],
        },
    )
    assert first.status_code == 200
    assert "capacity" in first.get_json()["reply"].casefold()

    second = client.post(
        "/api/chat",
        json={
            "session_id": session_id,
            "messages": [{"role": "user", "content": "hdd bhi chiye"}],
        },
    )
    assert second.status_code == 200
    reply = second.get_json()["reply"].casefold()
    assert "hdd" in reply
    assert "internal" in reply and "external" in reply
    assert "kitni pen drives" not in reply
    assert second.get_json()["whatsapp_draft_url"] is None
    assert second.get_json()["whatsapp_sent"] is False

    fallback, details = dts_app._deterministic_quota_fallback(
        ["pen drive hai", "hdd bhi chiye"]
    )
    assert "USB Pen Drive" in details["product_service"]
    assert "HDD / Hard Disk Drive" in details["product_service"]
    assert "Har item/service ki quantity" in fallback

def test_festival_calendar_proxy_caches_upstream_response_and_sets_cors(monkeypatch):
    session_key = "2026:mumbai"
    with dts_app._festival_cache_lock:
        dts_app._festival_cache.pop(session_key, None)

    class _FestivalResponse:
        status_code = 200
        ok = True
        headers = {}

        def json(self):
            return {
                "year": 2026,
                "city": "mumbai",
                "festivals": [{
                    "date": "2026-10-21",
                    "rule": {
                        "nameEn": "Diwali",
                        "nameHi": "दीपावली",
                        "observanceCategory": "FESTIVAL",
                        "regions": ["PAN_INDIA"],
                        "isMajor": True,
                    },
                }],
            }

    calls = []

    def fake_get(url, headers, timeout):
        calls.append((url, headers, timeout))
        return _FestivalResponse()

    monkeypatch.setattr(dts_app.requests, "get", fake_get)
    client = dts_app.app.test_client()

    first = client.get(
        "/api/festivals?year=2026&city=mumbai",
        headers={"Origin": "https://bhavyam026.github.io"},
    )
    second = client.get(
        "/api/festivals?year=2026&city=mumbai",
        headers={"Origin": "https://bhavyam026.github.io"},
    )

    assert first.status_code == 200
    assert first.get_json()["festivals"][0]["rule"]["nameEn"] == "Diwali"
    assert first.headers["Access-Control-Allow-Origin"] == "https://bhavyam026.github.io"
    assert second.status_code == 200
    assert len(calls) == 1
    assert calls[0][0] == "https://astrotathya.com/api/festivals?year=2026&city=mumbai"

    with dts_app._festival_cache_lock:
        dts_app._festival_cache.pop(session_key, None)


def test_festival_calendar_proxy_rejects_unsupported_year_without_upstream_call(monkeypatch):
    def unexpected_get(*args, **kwargs):
        raise AssertionError("Unsupported years must not call the upstream provider.")

    monkeypatch.setattr(dts_app.requests, "get", unexpected_get)
    response = dts_app.app.test_client().get("/api/festivals?year=2028")

    assert response.status_code == 400
    assert response.get_json()["error_code"] == "FESTIVAL_YEAR_UNSUPPORTED"




def test_hdd_capacity_and_quantity_are_not_reasked_when_ai_provider_is_quota_limited(monkeypatch):
    class _QuotaChat:
        def start_chat(self, history=None):
            return self

        def send_message(self, message):
            raise RuntimeError("429 RESOURCE_EXHAUSTED: quota exceeded")

    session_id = "dts-99999999-8888-7777-6666-555555555555"
    dts_app._sessions.pop(session_id, None)
    monkeypatch.setattr(dts_app, "model", _QuotaChat())
    client = dts_app.app.test_client()

    turns = [
        "apke pass HDD hai",
        "muze HDD 1 TB chiye 2",
        "internal",
        "Boisar",
        "7826349150",
    ]
    responses = []
    for message in turns:
        response = client.post(
            "/api/chat",
            json={
                "session_id": session_id,
                "messages": [{"role": "user", "content": message}],
            },
        )
        assert response.status_code == 200
        data = response.get_json()
        responses.append(data)
        assert data["whatsapp_draft_url"] is None
        assert data["whatsapp_sent"] is False

    capacity_reply = responses[1]["reply"].casefold()
    assert "1 tb" in capacity_reply
    assert "capacity (jaise 1 tb ya 2 tb) baad mein confirm" not in capacity_reply
    assert "kitni capacity chahiye" not in capacity_reply

    type_reply = responses[2]["reply"].casefold()
    assert "internal hdd" in type_reply
    assert "1 tb" in type_reply
    assert "kitne hdd chahiye" not in type_reply

    final = responses[-1]
    assert final["state"] == "SUMMARY_READY"
    summary = final["pending_summary"].casefold()
    assert "hdd / hard disk drive" in summary
    assert "2 hdd" in summary
    assert "boisar" in summary
    assert "7826349150" in summary
    assert "capacity: 1 tb" in summary
    assert "type: internal" in summary

    confirm = client.post(
        "/api/chat",
        json={
            "session_id": session_id,
            "messages": [{"role": "user", "content": "CONFIRM SUMMARY"}],
        },
    )
    confirmed = confirm.get_json()
    assert confirmed["state"] == "CONFIRMED"
    assert confirmed["whatsapp_draft_url"].startswith("https://wa.me/")
    assert confirmed["whatsapp_sent"] is False


def test_hdd_one_terabyte_capacity_is_acknowledged_without_asking_for_capacity_again():
    reply = dts_app._deterministic_product_education_reply(
        "muze HDD 1 TB chiye",
        ["apke pass HDD hai", "muze HDD 1 TB chiye"],
    )
    assert reply is not None
    assert "1 TB" in reply
    assert "internal HDD" in reply
    assert "capacity (jaise 1 TB ya 2 TB) baad mein confirm" not in reply
