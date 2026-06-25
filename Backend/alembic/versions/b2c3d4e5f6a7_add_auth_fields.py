"""add email verification and password reset fields to users

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-25 10:30:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b2c3d4e5f6a7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('email_verify_token', sa.String(), nullable=True))
    op.add_column('users', sa.Column('email_verify_expires', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('password_reset_token', sa.String(), nullable=True))
    op.add_column('users', sa.Column('password_reset_expires', sa.DateTime(timezone=True), nullable=True))
    op.create_index('ix_users_email_verify_token', 'users', ['email_verify_token'], unique=False)
    op.create_index('ix_users_password_reset_token', 'users', ['password_reset_token'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_users_password_reset_token', table_name='users')
    op.drop_index('ix_users_email_verify_token', table_name='users')
    op.drop_column('users', 'password_reset_expires')
    op.drop_column('users', 'password_reset_token')
    op.drop_column('users', 'email_verify_expires')
    op.drop_column('users', 'email_verify_token')
    op.drop_column('users', 'is_verified')
