import bcrypt

# Passlib bcrypt compatibility patch
# 1. Add __about__ attribute if missing to avoid warnings
if not hasattr(bcrypt, "__about__"):
    bcrypt.__about__ = type('About', (object,), {'__version__': bcrypt.__version__})

# 2. Wrap hashpw to truncate passwords to 72 bytes to avoid ValueError
_orig_hashpw = bcrypt.hashpw
def _patched_hashpw(password: bytes, salt: bytes) -> bytes:
    if len(password) > 72:
        password = password[:72]
    return _orig_hashpw(password, salt)
bcrypt.hashpw = _patched_hashpw
