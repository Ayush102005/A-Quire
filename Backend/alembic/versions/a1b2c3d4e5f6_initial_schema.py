"""initial schema

Revision ID: a1b2c3d4e5f6
Revises: 
Create Date: 2026-06-25 10:06:08.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── users ─────────────────────────────────────────────────────────────────
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('full_name', sa.String(), nullable=False),
        sa.Column('password_hash', sa.String(), nullable=False),
        sa.Column('role', sa.Enum('student', 'instructor', 'admin', name='roleenum'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_onboarded', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_users_id', 'users', ['id'], unique=False)
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # ── courses ───────────────────────────────────────────────────────────────
    op.create_table(
        'courses',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('instructor_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_published', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_courses_id', 'courses', ['id'], unique=False)
    op.create_index('ix_courses_title', 'courses', ['title'], unique=False)
    op.create_index('ix_courses_instructor_id', 'courses', ['instructor_id'], unique=False)

    # ── student_courses (enrollment M2M) ──────────────────────────────────────
    op.create_table(
        'student_courses',
        sa.Column('student_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('course_id', sa.Integer(), sa.ForeignKey('courses.id'), nullable=False),
        sa.PrimaryKeyConstraint('student_id', 'course_id'),
    )

    # ── modules ───────────────────────────────────────────────────────────────
    op.create_table(
        'modules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('course_id', sa.Integer(), sa.ForeignKey('courses.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_modules_id', 'modules', ['id'], unique=False)
    op.create_index('ix_modules_course_id', 'modules', ['course_id'], unique=False)

    # ── lessons ───────────────────────────────────────────────────────────────
    op.create_table(
        'lessons',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('module_id', sa.Integer(), sa.ForeignKey('modules.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('video_url', sa.String(), nullable=True),
        sa.Column('order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('duration_seconds', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_lessons_id', 'lessons', ['id'], unique=False)
    op.create_index('ix_lessons_module_id', 'lessons', ['module_id'], unique=False)

    # ── progress ──────────────────────────────────────────────────────────────
    op.create_table(
        'progress',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('lesson_id', sa.Integer(), sa.ForeignKey('lessons.id', ondelete='CASCADE'), nullable=False),
        sa.Column('watched_seconds', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('completion_percent', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('is_completed', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'lesson_id', name='uq_user_lesson_progress'),
    )
    op.create_index('ix_progress_id', 'progress', ['id'], unique=False)
    op.create_index('ix_progress_user_id', 'progress', ['user_id'], unique=False)
    op.create_index('ix_progress_lesson_id', 'progress', ['lesson_id'], unique=False)

    # ── struggle_events ───────────────────────────────────────────────────────
    op.create_table(
        'struggle_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('lesson_id', sa.Integer(), sa.ForeignKey('lessons.id', ondelete='CASCADE'), nullable=False),
        sa.Column('client_event_id', sa.String(), nullable=False),
        sa.Column('struggle_score', sa.Float(), nullable=True, server_default='0.0'),
        sa.Column('lesson_timestamp_ms', sa.Integer(), nullable=False),
        sa.Column('fixation_duration_ms', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('inactivity_duration_ms', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('transcript_window_id', sa.String(), nullable=True),
        sa.Column('mentor_hint', sa.String(), nullable=True),
        sa.Column('mentor_hint_level', sa.String(), nullable=True, server_default='basic'),
        sa.Column('mentor_generated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('client_event_id'),
    )
    op.create_index('ix_struggle_events_id', 'struggle_events', ['id'], unique=False)
    op.create_index('ix_struggle_events_user_id', 'struggle_events', ['user_id'], unique=False)
    op.create_index('ix_struggle_events_lesson_id', 'struggle_events', ['lesson_id'], unique=False)
    op.create_index('ix_struggle_events_client_event_id', 'struggle_events', ['client_event_id'], unique=True)

    # ── mentor_responses ──────────────────────────────────────────────────────
    op.create_table(
        'mentor_responses',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('struggle_event_id', sa.Integer(), sa.ForeignKey('struggle_events.id', ondelete='CASCADE'), nullable=False),
        sa.Column('response_text', sa.String(), nullable=False),
        sa.Column('response_type', sa.String(), nullable=True, server_default='hint'),
        sa.Column('latency_ms', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_mentor_responses_id', 'mentor_responses', ['id'], unique=False)
    op.create_index('ix_mentor_responses_struggle_event_id', 'mentor_responses', ['struggle_event_id'], unique=False)

    # ── quizzes ───────────────────────────────────────────────────────────────
    op.create_table(
        'quizzes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('lesson_id', sa.Integer(), sa.ForeignKey('lessons.id', ondelete='SET NULL'), nullable=True),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_quizzes_id', 'quizzes', ['id'], unique=False)
    op.create_index('ix_quizzes_lesson_id', 'quizzes', ['lesson_id'], unique=False)

    # ── quiz_questions ────────────────────────────────────────────────────────
    op.create_table(
        'quiz_questions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('quiz_id', sa.Integer(), sa.ForeignKey('quizzes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('question_text', sa.Text(), nullable=False),
        sa.Column('question_type', sa.String(), nullable=True, server_default='multiple_choice'),
        sa.Column('correct_answer', sa.String(), nullable=True),
        sa.Column('options', sa.Text(), nullable=True),
        sa.Column('order', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_quiz_questions_id', 'quiz_questions', ['id'], unique=False)
    op.create_index('ix_quiz_questions_quiz_id', 'quiz_questions', ['quiz_id'], unique=False)

    # ── quiz_responses ────────────────────────────────────────────────────────
    op.create_table(
        'quiz_responses',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('quiz_id', sa.Integer(), sa.ForeignKey('quizzes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('question_id', sa.Integer(), sa.ForeignKey('quiz_questions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('answer', sa.Text(), nullable=False),
        sa.Column('is_correct', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('score', sa.Float(), nullable=True, server_default='0.0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_quiz_responses_id', 'quiz_responses', ['id'], unique=False)
    op.create_index('ix_quiz_responses_user_id', 'quiz_responses', ['user_id'], unique=False)
    op.create_index('ix_quiz_responses_quiz_id', 'quiz_responses', ['quiz_id'], unique=False)
    op.create_index('ix_quiz_responses_question_id', 'quiz_responses', ['question_id'], unique=False)

    # ── notifications ─────────────────────────────────────────────────────────
    op.create_table(
        'notifications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('notification_type', sa.String(), nullable=True, server_default='info'),
        sa.Column('is_read', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_notifications_id', 'notifications', ['id'], unique=False)
    op.create_index('ix_notifications_user_id', 'notifications', ['user_id'], unique=False)

    # ── onboarding ────────────────────────────────────────────────────────────
    op.create_table(
        'onboarding',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('current_step', sa.Enum('role_selection', 'profile_setup', 'preferences', 'completed', name='onboardingstepenum'), nullable=False),
        sa.Column('is_completed', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('role_set', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('role_completed', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('profile_completed', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('preferences_completed', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('profile_data', sa.String(1000), nullable=True),
        sa.Column('preferences_data', sa.String(1000), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id'),
    )
    op.create_index('ix_onboarding_id', 'onboarding', ['id'], unique=False)
    op.create_index('ix_onboarding_user_id', 'onboarding', ['user_id'], unique=True)

    # ── profiles ──────────────────────────────────────────────────────────────
    op.create_table(
        'profiles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('language', sa.Enum('en', 'es', 'fr', 'de', 'zh', 'ja', 'hi', 'hinglish', name='languageenum'), nullable=False),
        sa.Column('timezone', sa.String(50), nullable=False, server_default='UTC'),
        sa.Column('goals', sa.Text(), nullable=True),
        sa.Column('interests', sa.Text(), nullable=True),
        sa.Column('email_notifications', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('reminder_frequency', sa.Enum('daily', 'weekly', 'monthly', 'none', name='reminderfrequencyenum'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id'),
    )
    op.create_index('ix_profiles_id', 'profiles', ['id'], unique=False)
    op.create_index('ix_profiles_user_id', 'profiles', ['user_id'], unique=True)


def downgrade() -> None:
    op.drop_table('profiles')
    op.drop_table('onboarding')
    op.drop_table('notifications')
    op.drop_table('quiz_responses')
    op.drop_table('quiz_questions')
    op.drop_table('quizzes')
    op.drop_table('mentor_responses')
    op.drop_table('struggle_events')
    op.drop_table('progress')
    op.drop_table('lessons')
    op.drop_table('modules')
    op.drop_table('student_courses')
    op.drop_table('courses')
    op.drop_table('users')
    # Drop enums
    op.execute('DROP TYPE IF EXISTS roleenum')
    op.execute('DROP TYPE IF EXISTS onboardingstepenum')
    op.execute('DROP TYPE IF EXISTS languageenum')
    op.execute('DROP TYPE IF EXISTS reminderfrequencyenum')
