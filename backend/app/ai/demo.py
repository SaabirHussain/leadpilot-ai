import re


# Fixed snippets acknowledge topics without copying untrusted instructions into the reply.
TOPICS = [
    (
        r"online order|ordering|e-commerce|online store|shipping|checkout",
        "online ordering and a clear checkout or pickup flow",
        "Which ordering or inventory tools do you use today?",
        "Mapping product options and pickup or shipping choices is a useful starting point.",
        r"order|commerce|store",
    ),
    (
        r"mobile|phones?|slow|image sizes",
        "a site that is easier to use on mobile",
        "Which page causes the most difficulty for customers on a phone?",
        "A short list of the pages customers use most can help focus a mobile review.",
        r"mobile|redesign|website design",
    ),
    (
        r"local seo|local search|business profile|old address|opening hours",
        "accurate local search information for nearby customers",
        "Do you have access to your business profile and current address listings?",
        "Comparing your address, hours and service area across listings can help identify inconsistencies.",
        r"local|seo",
    ),
    (
        r"wordpress|maintenance|plugin|backup",
        "website upkeep, updates and backups",
        "How are website updates and backups handled currently?",
        "An inventory of plugins and the most recent backup is useful context for a maintenance discussion.",
        r"maintenance|care",
    ),
    (
        r"booking|schedule|timetable|classes",
        "a clearer path from browsing to booking",
        "Which booking tool would you like to keep using?",
        "Sketching the path from the class or service page to booking can highlight confusing steps.",
        r"redesign|website design",
    ),
    (
        r"seo|search|audit",
        "making relevant pages easier to find in search",
        "Which pages or services would you most like customers to find?",
        "A list of priority pages and access to existing search reports can guide an SEO discussion.",
        r"seo|search",
    ),
]


def generate_demo(context):
    lead, business = context["lead"], context["business"]
    text = lead.get("service_requested", "") + " " + lead.get("inquiry_message", "")
    topics = [item for item in TOPICS if re.search(item[0], text, re.I)][:2]
    if topics:
        need = "; and ".join(item[1] for item in topics)
        questions = [item[2] for item in topics]
        tip = topics[0][3]
        services = []
        for topic in topics:
            match = next(
                (
                    service
                    for service in business.get("services", [])
                    if re.search(topic[4], service, re.I)
                ),
                None,
            )
            if match and match not in services:
                services.append(match)
    else:
        need = lead.get("service_requested") or "your website project"
        questions = ["What would you most like to change, and which existing tools need to stay?"]
        tip = "A link to your current site and a short list of priorities can help frame a useful discussion."
        services = [
            service for service in business.get("services", []) if service.lower() in text.lower()
        ][:2]
    fit = (
        f"This relates to our {' and '.join(services)} services at {business['business_name']}."
        if services
        else f"We can discuss whether {business['business_name']} is a good fit."
    )
    company = f" for {lead['company']}" if lead.get("company") else ""
    tone = context["tone"]
    step = context.get("followup_step") or 1
    if context["kind"] == "initial":
        opening = {
            "professional": f"Thank you for your inquiry{company}. I understand your priorities include {need}.",
            "friendly": f"Thanks for telling us about your plans{company}! It sounds like you're looking at {need}.",
            "concise": f"Thanks for your inquiry{company} about {need}.",
        }[tone]
        subject = f"Your {lead.get('service_requested') or 'website'} inquiry"
    else:
        openings = {
            1: ("A gentle check-in", "I'm checking in on your inquiry"),
            2: ("A planning idea", "I wanted to share a practical starting point"),
            3: ("Closing the loop", "I'm closing the loop on this conversation for now"),
        }
        subject, intro = openings[min(step, 3)]
        opening = f"{intro}{company}, regarding {need}."
        if step == 2:
            opening += " " + tip
        elif step >= 3:
            opening += " If this is no longer a priority, there is no need to reply. You're welcome to reconnect when it suits you."
        elif tone == "friendly":
            opening += " No rush if you're still considering your options."
    if tone == "concise":
        questions = questions[:1]
        next_step = "Open to a short call? Reply with a time that suits you, if useful."
    elif tone == "professional":
        fit += " A brief outline of your existing setup and priorities would help us discuss scope without making assumptions."
        next_step = "If helpful, we could discuss your priorities on a short call. Please reply with a convenient time, or continue by email if you prefer."
    else:
        next_step = "If you'd like, we could have a short call to talk through your ideas. Just send a time that works for you — staying on email is fine too."
    greeting = "Dear" if tone == "professional" else "Hi"
    return {
        "subject": f"{subject} — {business['business_name']}",
        "body": f"{greeting} {lead['name']},\n\n{opening}\n\n{fit}\n\n"
        + " ".join(questions)
        + "\n\n"
        + next_step
        + "\n\n"
        + business.get("signature", ""),
    }
