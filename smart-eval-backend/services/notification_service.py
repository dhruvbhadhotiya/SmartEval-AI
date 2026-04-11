"""
Email notification service for SmartEval.

Sends templated emails for key events:
  - Results published
  - Challenge received (teacher notification)
  - Challenge resolved (student notification)

Gracefully degrades to logging when MAIL_ENABLED is False or Flask-Mail
is not configured, so the rest of the app never breaks.
"""
import logging
from datetime import datetime

from flask import current_app

logger = logging.getLogger(__name__)


def _get_mail():
    """Return the Flask-Mail instance or None."""
    try:
        from app.extensions import mail
        return mail
    except ImportError:
        return None


def _send(subject, recipients, html_body):
    """
    Send an email if mail is enabled, otherwise log.

    Args:
        subject:    Email subject line
        recipients: List of email addresses
        html_body:  Rendered HTML string
    """
    if not current_app.config.get('MAIL_ENABLED'):
        logger.info("[Notification] MAIL_ENABLED=false — skipped: %s -> %s", subject, recipients)
        return

    mail = _get_mail()
    if mail is None:
        logger.warning("[Notification] Flask-Mail not initialised — skipped: %s", subject)
        return

    try:
        from flask_mail import Message
        msg = Message(
            subject=subject,
            recipients=recipients,
            html=html_body,
            sender=current_app.config.get('MAIL_DEFAULT_SENDER'),
        )
        mail.send(msg)
        logger.info("[Notification] Sent: %s -> %s", subject, recipients)
    except Exception as exc:
        logger.error("[Notification] Failed to send '%s': %s", subject, exc)


# ── HTML helpers ─────────────────────────────────────────────────────

_WRAPPER = """
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f4f5f7;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:8px;
              border:1px solid #e2e8f0;overflow:hidden;">
    <div style="background:#2563eb;padding:24px 32px;">
      <h1 style="margin:0;color:#fff;font-size:22px;">SmartEval</h1>
    </div>
    <div style="padding:32px;">
      {content}
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;
                font-size:12px;color:#94a3b8;text-align:center;">
      This is an automated message from SmartEval. Please do not reply.
    </div>
  </div>
</body>
</html>
"""


def _wrap(content_html):
    return _WRAPPER.replace("{content}", content_html)


# ── Public API ───────────────────────────────────────────────────────

def notify_results_published(student_emails, exam_title, exam_subject, teacher_name):
    """
    Notify students that exam results have been published.

    Args:
        student_emails: list of student email addresses
        exam_title:     title of the exam
        exam_subject:   subject of the exam
        teacher_name:   name of the teacher who published
    """
    if not student_emails:
        return

    html = _wrap(f"""
        <h2 style="margin:0 0 16px;color:#1e293b;">Results Published</h2>
        <p style="color:#475569;line-height:1.6;">
          Your results for <strong>{exam_title}</strong> ({exam_subject}) have
          been published by {teacher_name}.
        </p>
        <p style="color:#475569;line-height:1.6;">
          Log in to your SmartEval student portal to view your detailed
          question-wise results and feedback.
        </p>
        <div style="margin:24px 0;text-align:center;">
          <span style="display:inline-block;padding:12px 32px;background:#2563eb;
                       color:#fff;border-radius:6px;font-weight:600;font-size:14px;">
            View Your Results
          </span>
        </div>
    """)
    _send(
        subject=f"[SmartEval] Results Published — {exam_title}",
        recipients=student_emails,
        html_body=html,
    )


def notify_challenge_received(teacher_email, student_name, student_roll,
                              exam_title, question_numbers):
    """
    Notify a teacher that a student has submitted a grade challenge.
    """
    q_list = ", ".join(f"Q{q}" for q in question_numbers)
    html = _wrap(f"""
        <h2 style="margin:0 0 16px;color:#1e293b;">New Grade Challenge</h2>
        <p style="color:#475569;line-height:1.6;">
          <strong>{student_name}</strong> (Roll: {student_roll}) has submitted a
          grade challenge for <strong>{exam_title}</strong>.
        </p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr>
            <td style="padding:8px 12px;background:#f1f5f9;font-weight:600;
                       border:1px solid #e2e8f0;width:40%;">Questions Challenged</td>
            <td style="padding:8px 12px;border:1px solid #e2e8f0;">{q_list}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;background:#f1f5f9;font-weight:600;
                       border:1px solid #e2e8f0;">Student</td>
            <td style="padding:8px 12px;border:1px solid #e2e8f0;">{student_name} ({student_roll})</td>
          </tr>
        </table>
        <p style="color:#475569;line-height:1.6;">
          Log in to your teacher dashboard to review and resolve this challenge.
        </p>
    """)
    _send(
        subject=f"[SmartEval] New Challenge — {exam_title}",
        recipients=[teacher_email],
        html_body=html,
    )


def notify_challenge_resolved(student_email, student_name, exam_title,
                              decision, comments, score_changes=None):
    """
    Notify a student that their challenge has been resolved.
    """
    decision_color = "#16a34a" if decision == "accepted" else "#dc2626"
    decision_label = decision.capitalize()

    changes_html = ""
    if score_changes:
        rows = ""
        for sc in score_changes:
            rows += f"""
            <tr>
              <td style="padding:8px 12px;border:1px solid #e2e8f0;">Q{sc.get('question_number', '?')}</td>
              <td style="padding:8px 12px;border:1px solid #e2e8f0;">{sc.get('old_score', '-')}</td>
              <td style="padding:8px 12px;border:1px solid #e2e8f0;">{sc.get('new_score', '-')}</td>
            </tr>
            """
        changes_html = f"""
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr style="background:#f1f5f9;">
            <th style="padding:8px 12px;border:1px solid #e2e8f0;text-align:left;">Question</th>
            <th style="padding:8px 12px;border:1px solid #e2e8f0;text-align:left;">Old Score</th>
            <th style="padding:8px 12px;border:1px solid #e2e8f0;text-align:left;">New Score</th>
          </tr>
          {rows}
        </table>
        """

    comments_html = ""
    if comments:
        comments_html = f"""
        <p style="color:#475569;line-height:1.6;">
          <strong>Teacher Comments:</strong> {comments}
        </p>
        """

    html = _wrap(f"""
        <h2 style="margin:0 0 16px;color:#1e293b;">Challenge Resolved</h2>
        <p style="color:#475569;line-height:1.6;">
          Hi {student_name}, your grade challenge for
          <strong>{exam_title}</strong> has been reviewed.
        </p>
        <div style="margin:16px 0;padding:16px;border-radius:8px;
                    background:#f8fafc;border-left:4px solid {decision_color};">
          <span style="font-size:18px;font-weight:700;color:{decision_color};">
            {decision_label}
          </span>
        </div>
        {changes_html}
        {comments_html}
        <p style="color:#475569;line-height:1.6;">
          Log in to your student portal to see the updated results.
        </p>
    """)
    _send(
        subject=f"[SmartEval] Challenge {decision_label} — {exam_title}",
        recipients=[student_email],
        html_body=html,
    )