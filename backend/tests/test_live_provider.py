import os

import pytest

from app.ai import generate, warnings_for


@pytest.mark.live_ai
@pytest.mark.skipif(
    not os.getenv("LEADPILOT_LIVE_AI_BASE_URL"),
    reason="Set LEADPILOT_LIVE_AI_BASE_URL to opt into live provider calls",
)
def test_live_provider():
    result = generate(
        {
            "business": {
                "business_name": "Northstar Web Studio (fictional)",
                "services": ["Website redesign"],
                "signature": "Alex Morgan\nNorthstar Web Studio (demo)",
            },
            "lead": {
                "name": "Sarah Chen",
                "service_requested": "Website redesign",
                "inquiry_message": "Our fictional bakery site is slow on phones.",
            },
            "tone": "concise",
            "kind": "initial",
        },
        provider="openai_compatible",
        base_url=os.environ["LEADPILOT_LIVE_AI_BASE_URL"],
        model=os.getenv("LEADPILOT_LIVE_AI_MODEL", "qwen2.5:1.5b"),
    )
    assert result["subject"] and result["subject"] != "Following up on your inquiry"
    assert result["body"] and not result["body"].lstrip().startswith(("{", "```"))
    assert warnings_for(result["subject"] + " " + result["body"]) == []
