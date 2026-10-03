"""Builds the message list sent to the LLM for one chat turn.

Two deliberate departures from the previous implementation:

1. **Roles, not a transcript.** The old code concatenated the system prompt, the
   history and the new question into a single `user` message shaped like
   `Candidate: ...\\nAssistant: ...`. An instruct-tuned model reads that as a
   script to continue, which is exactly what it did — answers that invented the
   candidate's next question, or that opened with `Assistant:`. Passing real
   `system`/`user`/`assistant` roles lets the model's own chat template do its
   job.

2. **No JSON contract.** The model used to be asked to emit
   `{"messages": [...], "suggestions": [...]}` under six rules about topic
   diversity. A 3B model breaks that format often enough that raw braces reached
   the UI, and when it held the format it spent its attention budget on the
   schema rather than the answer. The model now writes plain prose; bubbles are
   split and suggestions are chosen in Python, where neither can fail.
"""

from app.chat.context import ChatContext

# Kept short on purpose. Every rule competes for a small model's attention, so
# these are only the ones that were observably violated in production output.
_GROUNDING_RULES = """Rules you must follow:
1. Answer only from the job information below. It is the complete set of facts you have.
2. If something is not in that information, say plainly that the listing does not mention it, then offer a related detail you do have. Never guess, and never fill a gap with a typical or example value.
3. Never state a salary, application deadline, interview stage, contact detail, or company fact that is not written below.
4. The candidate cannot see this information as a document. Never mention "the context", "the provided information", "the data above", or refer to yourself reading a file.
5. Never write "N/A", "Not specified", placeholders, code, JSON, markdown headings, or links.
6. If asked about something unrelated to this job, this company, or the candidate's own application, say that you can only help with this listing and offer what you can answer.
7. Reply in the language the candidate wrote in."""

_STYLE_RULES = """Style: write 2 to 4 short sentences in a warm, natural, conversational tone, as a person would type in a chat window. No bullet lists unless you are naming several skills or benefits. Do not repeat the question back. Do not end with a follow-up question — the interface offers those separately."""


def build_system_prompt(ctx: ChatContext) -> str:
    """Assemble the system message: who the assistant is, plus the grounded facts."""
    company = ctx.company_name or "the hiring company"
    title = ctx.job_title or "this role"

    identity = (
        f"You are the hiring assistant on a job board, helping a candidate who is "
        f"looking at the \"{title}\" listing at {company}. You answer questions about "
        f"this one job and this one company."
    )

    parts = [identity, "", _GROUNDING_RULES]

    if ctx.has_profile:
        name = ctx.candidate_name or "the candidate"
        parts.append(
            f"\nYou also have {name}'s profile. Use it: address them by first name "
            f"once in a while (not in every message), and when a question touches on "
            f"whether they are a good match, compare their actual skills and work "
            f"history against this job's requirements. Be honest about gaps — name "
            f"the specific missing skill rather than softening it. Only use what is "
            f"in their profile below; do not assume experience they have not listed."
        )

    if not ctx.is_open:
        parts.append(
            "\nThis listing is closed and no longer accepting applications. Mention "
            "that clearly the first time it becomes relevant, and still answer what "
            "the candidate asks about the role."
        )
    else:
        parts.append(
            "\nIf the candidate asks how to apply, tell them to use the Apply button "
            "on this job page. You cannot submit an application, check application "
            "status, or contact the employer yourself."
        )

    parts.append("\n" + _STYLE_RULES)

    job_block = ctx.render_job()
    if job_block:
        parts.append("\n---\n" + job_block)

    if ctx.candidate_block:
        parts.append("\n## Candidate profile\n" + ctx.candidate_block)

    return "\n".join(parts).strip()


def build_messages(ctx: ChatContext, history: list[dict], message: str) -> list[dict]:
    """System message, replayed turns, then the new question."""
    messages = [{"role": "system", "content": build_system_prompt(ctx)}]

    for turn in history:
        role = turn.get("role")
        content = str(turn.get("content") or "").strip()
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": message})
    return messages
