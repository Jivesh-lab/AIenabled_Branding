"""core/tools/__init__.py"""
from .database import get_startup_info, update_readiness_score, list_pending_applications, save_agent_analysis
from .search import web_search
from .email_tool import send_email, send_notification_email
from .documents import extract_text_from_pdf, extract_text_from_docx, analyse_pitch_deck

ALL_TOOLS = [
    get_startup_info,
    update_readiness_score,
    list_pending_applications,
    save_agent_analysis,
    web_search,
    send_email,
    send_notification_email,
    extract_text_from_pdf,
    extract_text_from_docx,
    analyse_pitch_deck,
]

__all__ = ["ALL_TOOLS"]
