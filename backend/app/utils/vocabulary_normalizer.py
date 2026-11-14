import re
from typing import List, Optional

NAMING_WORDS = [
    "Viswaa",
    "Sujith",
    "Nithi",
    "Sukant",
    "Bairavan",
    "Karthik",
    "Aravind",
    "Ravi",
    "Sneha",
    "Rahul",
    "John",
    "Sarah",
    "David",
    "FYZ",
    "MongoDB",
    "FastAPI",
    "WebRTC",
    "Uvicorn",
    "PyMongo",
    "React",
    "Groq",
    "IntenT_loG",
    "Whisper"
]

PHONETIC_RULES = [
    (re.compile(r"\b(viswaa|viswa|vishwa|vishvaa|vishva|visva|wiswa|which were|which war|this were|this war|with wah)\b", re.IGNORECASE), "Viswaa"),
    (re.compile(r"\b(sujith|sujit|sujeet|sujeeth)\b", re.IGNORECASE), "Sujith"),
    (re.compile(r"\b(suggest|subject)\s+(will|can|should|is|to|said|reported|completed|working)\b", re.IGNORECASE), r"Sujith \2"),
    (re.compile(r"\b(sukant|sukanta|sukanth|so can't|sue cant|sue can)\b", re.IGNORECASE), "Sukant"),
    (re.compile(r"\b(nithi|nidhi|neethi|niti|nifty|needy)\b", re.IGNORECASE), "Nithi"),
    (re.compile(r"\b(bairavan|bhairavan|by ravan|byron|by ron|by raven)\b", re.IGNORECASE), "Bairavan"),
    (re.compile(r"\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b", re.IGNORECASE), lambda m: m.group(0).capitalize()),
    (re.compile(r"\b(f\s*y\s*z|fies|fiz)\b", re.IGNORECASE), "FYZ"),
    (re.compile(r"\b(mongo\s*db|mongo)\b", re.IGNORECASE), "MongoDB"),
    (re.compile(r"\bfast\s*api\b", re.IGNORECASE), "FastAPI"),
    (re.compile(r"\bweb\s*rtc\b", re.IGNORECASE), "WebRTC"),
    (re.compile(r"\buv\s*corn|unicorn\b", re.IGNORECASE), "Uvicorn"),
    (re.compile(r"\b(pi\s*mongo|pie\s*mongo)\b", re.IGNORECASE), "PyMongo"),
    (re.compile(r"\bintent\s*log\b", re.IGNORECASE), "IntenT_loG"),
]

def normalize_text_naming_words(text: str, extra_names: Optional[List[str]] = None) -> str:
    if not text:
        return ""
    
    result = text
    for pattern, replacement in PHONETIC_RULES:
        result = pattern.sub(replacement, result)

    names_to_check = list(NAMING_WORDS)
    if extra_names:
        for name in extra_names:
            if name and name not in names_to_check:
                names_to_check.append(name)

    for name in names_to_check:
        if len(name) >= 2:
            escaped = re.escape(name)
            result = re.sub(rf"\b{escaped}\b", name, result, flags=re.IGNORECASE)

    # Capitalize sentence starters
    result = re.sub(r"(^\s*|\.\s+)([a-z])", lambda m: m.group(1) + m.group(2).upper(), result)
    return result
