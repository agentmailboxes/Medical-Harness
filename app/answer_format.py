import re


_SOURCE_HEADING = re.compile(
    r"(?im)^[ \t]*(?:#{1,6}[ \t]+)?(?:\*\*)?"
    r"(?:available citations|citations|references|bibliography|medical sources|sources)"
    r"(?:\*\*)?[ \t]*:?(?:\*\*)?[ \t]*(?=[\[【〔]|https?://|\r?$)"
)


def remove_source_appendix(answer: str) -> str:
    for match in reversed(list(_SOURCE_HEADING.finditer(answer))):
        remaining = answer[match.end():]
        next_heading = re.search(r"(?m)^#{1,6}\s+", remaining)
        end = match.end() + next_heading.start() if next_heading else len(answer)
        appendix = answer[match.end():end]
        if re.search(r"[\[【〔]\d+(?:\s*[,，]\s*\d+)*[\]】〕]|https?://", appendix):
            answer = answer[:match.start()].rstrip() + "\n\n" + answer[end:].lstrip()
    return answer.strip()
