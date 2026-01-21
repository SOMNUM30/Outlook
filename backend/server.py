from fastapi import FastAPI, APIRouter, HTTPException, Query, Depends, status
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import urllib.parse
import openai
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
if not mongo_url:
    raise Exception("MONGO_URL environment variable is required")
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'outlook_classifier')]

# Microsoft Graph Configuration
MS_CLIENT_ID = os.environ.get('MS_CLIENT_ID', '')
MS_CLIENT_SECRET = os.environ.get('MS_CLIENT_SECRET', '')
MS_TENANT_ID = os.environ.get('MS_TENANT_ID', 'common')
MS_REDIRECT_URI = os.environ.get('MS_REDIRECT_URI', '')
MS_SCOPES = 'openid profile email offline_access Mail.Read Mail.ReadWrite MailboxSettings.Read'

# OpenAI Configuration
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')

# Create the main app
app = FastAPI(title="Outlook AI Classifier")

# Create routers
api_router = APIRouter(prefix="/api")
auth_router = APIRouter(prefix="/auth", tags=["Authentication"])
mail_router = APIRouter(prefix="/mail", tags=["Mail"])
rules_router = APIRouter(prefix="/rules", tags=["Classification Rules"])
classify_router = APIRouter(prefix="/classify", tags=["AI Classification"])

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ==================== MODELS ====================

class UserToken(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    email: str
    display_name: str
    access_token: str
    refresh_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ClassificationRule(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    description: str
    target_folder_id: str
    target_folder_name: str
    keywords: List[str] = []
    ai_prompt: str = ""
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ClassificationRuleCreate(BaseModel):
    name: str
    description: str
    target_folder_id: str
    target_folder_name: str
    keywords: List[str] = []
    ai_prompt: str = ""


class ClassifiedEmail(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    message_id: str
    subject: str
    from_address: str
    from_name: str
    original_folder: str
    target_folder: str
    target_folder_name: str
    rule_name: str
    confidence: float
    classified_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class EmailPreview(BaseModel):
    id: str
    subject: str
    from_address: str
    from_name: str
    received_at: str
    body_preview: str
    is_read: bool
    folder_id: str


class FolderInfo(BaseModel):
    id: str
    display_name: str
    parent_folder_id: Optional[str]
    child_folder_count: int
    unread_item_count: int
    total_item_count: int


class ClassifyRequest(BaseModel):
    message_ids: List[str]
    rule_ids: Optional[List[str]] = None
    dry_run: bool = False


class ClassifyResult(BaseModel):
    message_id: str
    subject: str
    suggested_folder: str
    suggested_folder_name: str
    rule_applied: str
    confidence: float
    moved: bool


# ==================== HELPER FUNCTIONS ====================

async def get_user_from_token(access_token: str) -> Optional[Dict]:
    """Fetch user info from Microsoft Graph"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://graph.microsoft.com/v1.0/me",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        if response.status_code == 200:
            return response.json()
    return None


async def refresh_access_token(refresh_token: str) -> Optional[Dict]:
    """Refresh the access token"""
    token_url = f"https://login.microsoftonline.com/{MS_TENANT_ID}/oauth2/v2.0/token"
    data = {
        "client_id": MS_CLIENT_ID,
        "client_secret": MS_CLIENT_SECRET,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
        "scope": MS_SCOPES
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(token_url, data=data)
        if response.status_code == 200:
            return response.json()
    return None


async def get_current_user(token: str) -> UserToken:
    """Get current user from database"""
    user_data = await db.user_tokens.find_one({"access_token": token}, {"_id": 0})
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    # Check if token is expired
    expires_at = user_data.get('expires_at')
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
    
    if expires_at < datetime.now(timezone.utc):
        # Try to refresh
        new_tokens = await refresh_access_token(user_data['refresh_token'])
        if new_tokens:
            new_expires = datetime.now(timezone.utc) + timedelta(seconds=new_tokens['expires_in'])
            await db.user_tokens.update_one(
                {"user_id": user_data['user_id']},
                {"$set": {
                    "access_token": new_tokens['access_token'],
                    "refresh_token": new_tokens.get('refresh_token', user_data['refresh_token']),
                    "expires_at": new_expires.isoformat()
                }}
            )
            user_data['access_token'] = new_tokens['access_token']
        else:
            raise HTTPException(status_code=401, detail="Token expired and refresh failed")
    
    return UserToken(**user_data)


async def classify_email_with_ai(email_body: str, email_subject: str, rules: List[Dict]) -> Dict:
    """Use OpenAI GPT to classify email content"""
    if not OPENAI_API_KEY:
        return {"rule_name": "none", "confidence": 0, "reason": "OpenAI API key not configured"}
    
    # Build rules list with exact names
    rule_names = [r['name'] for r in rules if r.get('is_active', True)]
    rules_description = "\n".join([
        f"- Rule name: \"{r['name']}\"\n  Description: {r['description']}\n  Keywords: {', '.join(r.get('keywords', []))}\n  Criteria: {r.get('ai_prompt', 'N/A')}"
        for r in rules if r.get('is_active', True)
    ])
    
    prompt = f"""Analyze this email and classify it into one of the rules below.

EMAIL SUBJECT: {email_subject}

EMAIL BODY:
{email_body[:2000]}

AVAILABLE RULES:
{rules_description}

IMPORTANT: The rule_name in your response MUST be EXACTLY one of these values: {rule_names} or "none" if no rule matches.

Respond with a JSON object:
{{"rule_name": "exact rule name from list above", "confidence": 0.0-1.0, "reason": "brief explanation"}}

If the email matches any keywords or criteria from a rule, classify it with that rule. Only respond "none" if the email clearly doesn't match ANY rule."""

    try:
        client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
        
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": f"You are an email classifier. You MUST return the rule_name as EXACTLY one of: {rule_names} or 'none'. No variations allowed."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1
        )
        
        result_text = response.choices[0].message.content.strip()
        logger.info(f"AI Response: {result_text}")
        
        # Parse the JSON response
        try:
            result = json.loads(result_text)
            logger.info(f"Parsed result: {result}")
            # Verify rule_name is valid
            if result.get('rule_name') not in rule_names and result.get('rule_name') != 'none':
                # Try to find closest match
                for name in rule_names:
                    if name.lower() in result.get('rule_name', '').lower() or result.get('rule_name', '').lower() in name.lower():
                        result['rule_name'] = name
                        logger.info(f"Matched to rule: {name}")
                        break
            return result
        except json.JSONDecodeError:
            # Try to extract JSON from response
            import re
            json_match = re.search(r'\{[^}]+\}', result_text)
            if json_match:
                return json.loads(json_match.group())
            return {"rule_name": "none", "confidence": 0, "reason": "Failed to parse AI response"}
    except Exception as e:
        logger.error(f"AI classification error: {e}")
        return {"rule_name": "none", "confidence": 0, "reason": str(e)}


# ==================== AUTH ROUTES ====================

@auth_router.get("/login")
async def login():
    """Initiate Microsoft OAuth login"""
    if not MS_CLIENT_ID:
        raise HTTPException(
            status_code=503, 
            detail="Microsoft OAuth not configured. Please set MS_CLIENT_ID, MS_CLIENT_SECRET, and MS_REDIRECT_URI in environment variables."
        )
    
    auth_url = f"https://login.microsoftonline.com/{MS_TENANT_ID}/oauth2/v2.0/authorize"
    params = {
        "client_id": MS_CLIENT_ID,
        "response_type": "code",
        "redirect_uri": MS_REDIRECT_URI,
        "response_mode": "query",
        "scope": MS_SCOPES,
        "state": str(uuid.uuid4())
    }
    full_url = f"{auth_url}?{urllib.parse.urlencode(params)}"
    return {"auth_url": full_url}


@auth_router.get("/callback")
async def auth_callback(
    code: str = Query(default=None), 
    state: str = Query(default=None),
    error: str = Query(default=None),
    error_description: str = Query(default=None)
):
    """Handle OAuth callback from Microsoft"""
    # Handle Microsoft errors
    if error:
        logger.error(f"OAuth error: {error} - {error_description}")
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        return RedirectResponse(
            url=f"{frontend_url}/login?error={urllib.parse.quote(error_description or error)}",
            status_code=302
        )
    
    if not code:
        raise HTTPException(status_code=400, detail="Authorization code missing")
    
    token_url = f"https://login.microsoftonline.com/{MS_TENANT_ID}/oauth2/v2.0/token"
    data = {
        "client_id": MS_CLIENT_ID,
        "client_secret": MS_CLIENT_SECRET,
        "code": code,
        "redirect_uri": MS_REDIRECT_URI,
        "grant_type": "authorization_code",
        "scope": MS_SCOPES
    }
    
    async with httpx.AsyncClient() as http_client:
        token_response = await http_client.post(token_url, data=data)
        
        if token_response.status_code != 200:
            logger.error(f"Token exchange failed: {token_response.text}")
            raise HTTPException(status_code=400, detail="Failed to exchange code for token")
        
        tokens = token_response.json()
        access_token = tokens['access_token']
        refresh_token = tokens.get('refresh_token', '')
        expires_in = tokens.get('expires_in', 3600)
        
        # Get user info
        user_info = await get_user_from_token(access_token)
        if not user_info:
            raise HTTPException(status_code=400, detail="Failed to get user info")
        
        user_id = user_info['id']
        email = user_info.get('mail') or user_info.get('userPrincipalName', '')
        display_name = user_info.get('displayName', email)
        
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
        
        # Save or update user token
        user_token = UserToken(
            user_id=user_id,
            email=email,
            display_name=display_name,
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=expires_at
        )
        
        doc = user_token.model_dump()
        doc['expires_at'] = doc['expires_at'].isoformat()
        doc['created_at'] = doc['created_at'].isoformat()
        
        await db.user_tokens.update_one(
            {"user_id": user_id},
            {"$set": doc},
            upsert=True
        )
        
        # Redirect to frontend with token
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        return RedirectResponse(
            url=f"{frontend_url}?token={access_token}&user={urllib.parse.quote(display_name)}",
            status_code=302
        )


@auth_router.get("/me")
async def get_me(token: str = Query(...)):
    """Get current user info"""
    user = await get_current_user(token)
    return {
        "user_id": user.user_id,
        "email": user.email,
        "display_name": user.display_name
    }


@auth_router.post("/logout")
async def logout(token: str = Query(...)):
    """Logout user"""
    await db.user_tokens.delete_one({"access_token": token})
    return {"message": "Logged out successfully"}


# ==================== MAIL ROUTES ====================

@mail_router.get("/folders", response_model=List[FolderInfo])
async def get_folders(token: str = Query(...)):
    """Get all mail folders including subfolders"""
    user = await get_current_user(token)
    
    all_folders = []
    
    async def fetch_folders(parent_id: str = None):
        """Recursively fetch folders"""
        if parent_id:
            url = f"https://graph.microsoft.com/v1.0/me/mailFolders/{parent_id}/childFolders"
        else:
            url = "https://graph.microsoft.com/v1.0/me/mailFolders"
        
        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(
                url,
                headers={"Authorization": f"Bearer {user.access_token}"},
                params={
                    "$select": "id,displayName,parentFolderId,childFolderCount,unreadItemCount,totalItemCount",
                    "$top": 100
                }
            )
            
            if response.status_code != 200:
                return
            
            data = response.json()
            for folder in data.get('value', []):
                all_folders.append(FolderInfo(
                    id=folder['id'],
                    display_name=folder['displayName'],
                    parent_folder_id=folder.get('parentFolderId'),
                    child_folder_count=folder.get('childFolderCount', 0),
                    unread_item_count=folder.get('unreadItemCount', 0),
                    total_item_count=folder.get('totalItemCount', 0)
                ))
                
                # Fetch subfolders if any
                if folder.get('childFolderCount', 0) > 0:
                    await fetch_folders(folder['id'])
    
    await fetch_folders()
    return all_folders


@mail_router.get("/folders/{folder_id}/children", response_model=List[FolderInfo])
async def get_child_folders(folder_id: str, token: str = Query(...)):
    """Get child folders of a folder"""
    user = await get_current_user(token)
    
    async with httpx.AsyncClient() as http_client:
        response = await http_client.get(
            f"https://graph.microsoft.com/v1.0/me/mailFolders/{folder_id}/childFolders",
            headers={"Authorization": f"Bearer {user.access_token}"},
            params={
                "$select": "id,displayName,parentFolderId,childFolderCount,unreadItemCount,totalItemCount",
                "$top": 100
            }
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to get child folders")
        
        data = response.json()
        folders = []
        for folder in data.get('value', []):
            folders.append(FolderInfo(
                id=folder['id'],
                display_name=folder['displayName'],
                parent_folder_id=folder.get('parentFolderId'),
                child_folder_count=folder.get('childFolderCount', 0),
                unread_item_count=folder.get('unreadItemCount', 0),
                total_item_count=folder.get('totalItemCount', 0)
            ))
        
        return folders


@mail_router.get("/messages", response_model=List[EmailPreview])
async def get_messages(
    token: str = Query(...),
    folder_id: str = Query(default="inbox"),
    top: int = Query(default=100, le=500),
    skip: int = Query(default=0),
    filter_read: str = Query(default="all"),  # 'all', 'unread', 'read'
    exclude_flagged: bool = Query(default=True)  # Exclude pinned/flagged emails
):
    """Get messages from a folder"""
    user = await get_current_user(token)
    
    # Build filter
    filters = []
    if filter_read == "unread":
        filters.append("isRead eq false")
    elif filter_read == "read":
        filters.append("isRead eq true")
    
    params = {
        "$select": "id,subject,from,receivedDateTime,bodyPreview,isRead,parentFolderId,flag",
        "$top": top,
        "$skip": skip,
        "$orderby": "receivedDateTime desc"
    }
    
    if filters:
        params["$filter"] = " and ".join(filters)
    
    async with httpx.AsyncClient(timeout=60.0) as http_client:
        response = await http_client.get(
            f"https://graph.microsoft.com/v1.0/me/mailFolders/{folder_id}/messages",
            headers={"Authorization": f"Bearer {user.access_token}"},
            params=params
        )
        
        if response.status_code != 200:
            logger.error(f"Failed to get messages: {response.text}")
            raise HTTPException(status_code=response.status_code, detail="Failed to get messages")
        
        data = response.json()
        messages = []
        for msg in data.get('value', []):
            # Skip flagged emails if exclude_flagged is True
            if exclude_flagged:
                flag_status = msg.get('flag', {}).get('flagStatus', '')
                if flag_status == 'flagged':
                    continue
            
            from_info = msg.get('from', {}).get('emailAddress', {})
            messages.append(EmailPreview(
                id=msg['id'],
                subject=msg.get('subject', '(No Subject)'),
                from_address=from_info.get('address', ''),
                from_name=from_info.get('name', ''),
                received_at=msg.get('receivedDateTime', ''),
                body_preview=msg.get('bodyPreview', ''),
                is_read=msg.get('isRead', False),
                folder_id=msg.get('parentFolderId', '')
            ))
        
        return messages


@mail_router.get("/messages/{message_id}")
async def get_message_detail(message_id: str, token: str = Query(...)):
    """Get full message details"""
    user = await get_current_user(token)
    
    async with httpx.AsyncClient() as http_client:
        response = await http_client.get(
            f"https://graph.microsoft.com/v1.0/me/messages/{message_id}",
            headers={"Authorization": f"Bearer {user.access_token}"},
            params={
                "$select": "id,subject,from,toRecipients,ccRecipients,receivedDateTime,body,isRead,parentFolderId,hasAttachments"
            }
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to get message")
        
        return response.json()


@mail_router.post("/messages/{message_id}/move")
async def move_message(
    message_id: str,
    destination_folder_id: str = Query(...),
    token: str = Query(...)
):
    """Move a message to another folder"""
    user = await get_current_user(token)
    
    async with httpx.AsyncClient() as http_client:
        response = await http_client.post(
            f"https://graph.microsoft.com/v1.0/me/messages/{message_id}/move",
            headers={
                "Authorization": f"Bearer {user.access_token}",
                "Content-Type": "application/json"
            },
            json={"destinationId": destination_folder_id}
        )
        
        if response.status_code not in [200, 201]:
            logger.error(f"Failed to move message: {response.text}")
            raise HTTPException(status_code=response.status_code, detail="Failed to move message")
        
        return response.json()


# ==================== RULES ROUTES ====================

@rules_router.get("/", response_model=List[ClassificationRule])
async def get_rules(token: str = Query(...)):
    """Get all classification rules for the user"""
    user = await get_current_user(token)
    
    rules = await db.classification_rules.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).to_list(100)
    
    for rule in rules:
        if isinstance(rule.get('created_at'), str):
            rule['created_at'] = datetime.fromisoformat(rule['created_at'].replace('Z', '+00:00'))
    
    return [ClassificationRule(**rule) for rule in rules]


@rules_router.post("/", response_model=ClassificationRule)
async def create_rule(rule: ClassificationRuleCreate, token: str = Query(...)):
    """Create a new classification rule"""
    user = await get_current_user(token)
    
    new_rule = ClassificationRule(
        user_id=user.user_id,
        **rule.model_dump()
    )
    
    doc = new_rule.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.classification_rules.insert_one(doc)
    return new_rule


@rules_router.put("/{rule_id}", response_model=ClassificationRule)
async def update_rule(rule_id: str, rule: ClassificationRuleCreate, token: str = Query(...)):
    """Update a classification rule"""
    user = await get_current_user(token)
    
    result = await db.classification_rules.update_one(
        {"id": rule_id, "user_id": user.user_id},
        {"$set": rule.model_dump()}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    updated = await db.classification_rules.find_one({"id": rule_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'].replace('Z', '+00:00'))
    
    return ClassificationRule(**updated)


@rules_router.delete("/{rule_id}")
async def delete_rule(rule_id: str, token: str = Query(...)):
    """Delete a classification rule"""
    user = await get_current_user(token)
    
    result = await db.classification_rules.delete_one(
        {"id": rule_id, "user_id": user.user_id}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    return {"message": "Rule deleted successfully"}


@rules_router.patch("/{rule_id}/toggle")
async def toggle_rule(rule_id: str, token: str = Query(...)):
    """Toggle rule active status"""
    user = await get_current_user(token)
    
    rule = await db.classification_rules.find_one(
        {"id": rule_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    new_status = not rule.get('is_active', True)
    await db.classification_rules.update_one(
        {"id": rule_id},
        {"$set": {"is_active": new_status}}
    )
    
    return {"is_active": new_status}


# ==================== CLASSIFY ROUTES ====================

@classify_router.post("/analyze", response_model=List[ClassifyResult])
async def analyze_emails(request: ClassifyRequest, token: str = Query(...)):
    """Analyze emails and suggest classifications (without moving)"""
    import asyncio
    import re
    
    user = await get_current_user(token)
    
    # Get rules
    rules_query = {"user_id": user.user_id, "is_active": True}
    if request.rule_ids:
        rules_query["id"] = {"$in": request.rule_ids}
    
    rules = await db.classification_rules.find(rules_query, {"_id": 0}).to_list(100)
    
    if not rules:
        raise HTTPException(status_code=400, detail="No active classification rules found")
    
    async def process_email(message_id: str, http_client: httpx.AsyncClient):
        """Process a single email"""
        try:
            # Get full message content
            response = await http_client.get(
                f"https://graph.microsoft.com/v1.0/me/messages/{message_id}",
                headers={"Authorization": f"Bearer {user.access_token}"},
                params={"$select": "id,subject,body,from"}
            )
            
            if response.status_code != 200:
                return None
            
            msg = response.json()
            subject = msg.get('subject', '')
            body_content = msg.get('body', {}).get('content', '')
            
            # Strip HTML if present
            body_text = re.sub('<[^<]+?>', '', body_content)[:2000]
            
            # Classify with AI
            ai_result = await classify_email_with_ai(body_text, subject, rules)
            
            # Find matching rule
            matched_rule = None
            for rule in rules:
                if rule['name'].lower() == ai_result.get('rule_name', '').lower():
                    matched_rule = rule
                    break
            
            if matched_rule:
                return ClassifyResult(
                    message_id=message_id,
                    subject=subject,
                    suggested_folder=matched_rule['target_folder_id'],
                    suggested_folder_name=matched_rule['target_folder_name'],
                    rule_applied=matched_rule['name'],
                    confidence=ai_result.get('confidence', 0),
                    moved=False
                )
            else:
                return ClassifyResult(
                    message_id=message_id,
                    subject=subject,
                    suggested_folder="",
                    suggested_folder_name="No match",
                    rule_applied="none",
                    confidence=0,
                    moved=False
                )
        except Exception as e:
            logger.error(f"Error processing email {message_id}: {e}")
            return None
    
    # Process emails in parallel (batch of 10)
    results = []
    async with httpx.AsyncClient(timeout=60.0) as http_client:
        batch_size = 5  # Reduced to avoid rate limits
        for i in range(0, len(request.message_ids), batch_size):
            batch = request.message_ids[i:i + batch_size]
            batch_results = await asyncio.gather(*[process_email(mid, http_client) for mid in batch])
            results.extend([r for r in batch_results if r is not None])
            # Add delay between batches to avoid rate limits
            if i + batch_size < len(request.message_ids):
                await asyncio.sleep(2)
    
    return results


@classify_router.post("/execute", response_model=List[ClassifyResult])
async def execute_classification(request: ClassifyRequest, token: str = Query(...)):
    """Classify and move emails to their target folders"""
    user = await get_current_user(token)
    
    # First analyze
    analysis_results = await analyze_emails(request, token)
    
    if request.dry_run:
        return analysis_results
    
    # Move emails that have a match
    async with httpx.AsyncClient() as http_client:
        for result in analysis_results:
            if result.suggested_folder and result.confidence > 0.5:
                # Move the message
                move_response = await http_client.post(
                    f"https://graph.microsoft.com/v1.0/me/messages/{result.message_id}/move",
                    headers={
                        "Authorization": f"Bearer {user.access_token}",
                        "Content-Type": "application/json"
                    },
                    json={"destinationId": result.suggested_folder}
                )
                
                if move_response.status_code in [200, 201]:
                    result.moved = True
                    
                    # Log the classification
                    classified_email = ClassifiedEmail(
                        user_id=user.user_id,
                        message_id=result.message_id,
                        subject=result.subject,
                        from_address="",
                        from_name="",
                        original_folder="inbox",
                        target_folder=result.suggested_folder,
                        target_folder_name=result.suggested_folder_name,
                        rule_name=result.rule_applied,
                        confidence=result.confidence
                    )
                    
                    doc = classified_email.model_dump()
                    doc['classified_at'] = doc['classified_at'].isoformat()
                    await db.classified_emails.insert_one(doc)
    
    return analysis_results


@classify_router.get("/history", response_model=List[ClassifiedEmail])
async def get_classification_history(
    token: str = Query(...),
    limit: int = Query(default=50, le=100)
):
    """Get classification history"""
    user = await get_current_user(token)
    
    history = await db.classified_emails.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("classified_at", -1).to_list(limit)
    
    for item in history:
        if isinstance(item.get('classified_at'), str):
            item['classified_at'] = datetime.fromisoformat(item['classified_at'].replace('Z', '+00:00'))
    
    return [ClassifiedEmail(**item) for item in history]


@classify_router.get("/stats")
async def get_classification_stats(token: str = Query(...)):
    """Get classification statistics"""
    user = await get_current_user(token)
    
    total = await db.classified_emails.count_documents({"user_id": user.user_id})
    
    # Get counts by rule
    pipeline = [
        {"$match": {"user_id": user.user_id}},
        {"$group": {"_id": "$rule_name", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    by_rule = await db.classified_emails.aggregate(pipeline).to_list(100)
    
    # Get counts by folder
    pipeline = [
        {"$match": {"user_id": user.user_id}},
        {"$group": {"_id": "$target_folder_name", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    by_folder = await db.classified_emails.aggregate(pipeline).to_list(100)
    
    return {
        "total_classified": total,
        "by_rule": [{"rule": r["_id"], "count": r["count"]} for r in by_rule],
        "by_folder": [{"folder": f["_id"], "count": f["count"]} for f in by_folder]
    }


# ==================== ROOT ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "Outlook AI Classifier API", "version": "1.0.0"}


@api_router.get("/health")
async def health():
    return {"status": "healthy"}


# Include all routers
api_router.include_router(auth_router)
api_router.include_router(mail_router)
api_router.include_router(rules_router)
api_router.include_router(classify_router)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
