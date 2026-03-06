from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from services.cognito import verify_cognito_token

security = HTTPBearer()


def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    """
    Validates the Cognito ID/access token in the Authorization header.
    Returns the decoded token payload if valid.
    """
    token = credentials.credentials
    decoded = verify_cognito_token(token)

    if not decoded:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return decoded
