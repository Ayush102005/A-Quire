# A-Quire Backend Deployment Guide

## Pre-Deployment Checklist

### Security
- [ ] Generate strong `SECRET_KEY` (min 32 chars, use: `python -c "import secrets; print(secrets.token_urlsafe(32))"`)
- [ ] Set `DEBUG=false`
- [ ] Rotate default database password
- [ ] Enable SSL/TLS certificates
- [ ] Configure CORS for production domains only
- [ ] Set up firewall rules
- [ ] Enable rate limiting on API endpoints

### Environment Variables (.env)
```bash
APP_NAME="A-Quire Backend"
DEBUG=false
SECRET_KEY=<generate-strong-key>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Database (use managed service like AWS RDS)
DATABASE_URL=postgresql+asyncpg://user:password@prod-db.rds.amazonaws.com:5432/aquire

# Redis (use managed service like AWS ElastiCache)
REDIS_URL=redis://:password@prod-redis.cache.amazonaws.com:6379/0

# AWS Integration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your-aws-key>
AWS_SECRET_ACCESS_KEY=<your-aws-secret>
AWS_BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Email Service (optional)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=<sendgrid-api-key>
```

## Deployment Options

### Option 1: AWS ECS (Recommended for Scale)

#### 1. Build and Push Docker Image

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

# Build image
docker build -t aquire-backend:latest .

# Tag image
docker tag aquire-backend:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/aquire-backend:latest

# Push to ECR
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/aquire-backend:latest
```

#### 2. Create ECS Task Definition

```json
{
  "family": "aquire-backend",
  "containerDefinitions": [
    {
      "name": "aquire-backend",
      "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/aquire-backend:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "hostPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "DEBUG",
          "value": "false"
        },
        {
          "name": "DATABASE_URL",
          "value": "postgresql+asyncpg://user:pass@rds-endpoint:5432/aquire"
        }
      ],
      "secrets": [
        {
          "name": "SECRET_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:aquire-backend-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/aquire-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "memory": 512,
      "cpu": 256
    }
  ]
}
```

#### 3. Create ECS Service

```bash
aws ecs create-service \
  --cluster aquire-cluster \
  --service-name aquire-backend-service \
  --task-definition aquire-backend \
  --desired-count 2 \
  --load-balancers targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=aquire-backend,containerPort=8000
```

### Option 2: Railway/Render (Easier for Startups)

#### Railway Deployment

1. Connect GitHub repo
2. Add environment variables in Railway dashboard
3. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Link PostgreSQL and Redis from Railway
5. Deploy automatically on git push

#### Render Deployment

1. Create new Web Service
2. Connect GitHub repo
3. Set Build Command: `pip install -r requirements.txt`
4. Set Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables
6. Link PostgreSQL from Render
7. Deploy

### Option 3: DigitalOcean App Platform

1. Create new App
2. Connect GitHub repo
3. Select Python as runtime
4. Set HTTP_PORT: 8000
5. Add build command: `pip install -r requirements.txt`
6. Add run command: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
7. Create managed PostgreSQL database
8. Create managed Redis cluster
9. Deploy

## Post-Deployment

### 1. Verify Health

```bash
curl https://api.yourdomain.com/health
# Should return: {"status": "ok", "app": "A-Quire Backend"}
```

### 2. Run Initial Migration

```bash
# SSH into container/instance
alembic upgrade head
```

### 3. Create Admin User

```bash
# Use API to create first admin user
curl -X POST https://api.yourdomain.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourdomain.com",
    "full_name": "Admin User",
    "password": "strong-password-here",
    "role": "admin"
  }'
```

### 4. Monitor Services

```bash
# CloudWatch logs (AWS)
aws logs tail /ecs/aquire-backend --follow

# Check services
docker-compose ps

# Monitor database
# Connect to managed PostgreSQL and check `users` table has 1 row
```

### 5. Set Up Monitoring & Alerts

- **Application Performance**: Configure New Relic or DataDog
- **Error Tracking**: Set up Sentry
- **Uptime Monitoring**: Configure UptimeRobot or PingDom
- **Database Monitoring**: Enable AWS RDS Performance Insights
- **Log Aggregation**: CloudWatch Logs or Datadog

## Production Best Practices

### 1. Database

```sql
-- Create indexes for common queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_progress_user_lesson ON progress(user_id, lesson_id);
CREATE INDEX idx_struggle_user ON struggle_events(user_id);

-- Enable automatic backups
-- (Configure in AWS RDS console - daily backups, 30-day retention)

-- Monitor slow queries
-- EXPLAIN ANALYZE SELECT ... for slow endpoints
```

### 2. API Security

```python
# Add rate limiting (in app/main.py)
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/api/v1/auth/login")
@limiter.limit("5/minute")  # 5 login attempts per minute
async def login(...):
    pass
```

### 3. Caching Strategy

```python
# Cache course list (Redis)
@app.get("/api/v1/courses/")
async def list_courses(cache: Redis = Depends(get_redis)):
    # Check cache first
    cached = await cache.get("courses:list")
    if cached:
        return json.loads(cached)
    
    # Fetch from DB
    courses = await db.execute(select(Course))
    
    # Cache for 1 hour
    await cache.setex("courses:list", 3600, json.dumps(courses))
    return courses
```

### 4. Async Workers

```bash
# Production: Use gunicorn with uvicorn workers
gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --access-logfile - \
  --error-logfile - \
  --timeout 120
```

### 5. Database Connection Pooling

```python
# In app/core/database.py
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=20,           # Max connections in pool
    max_overflow=10,        # Max overflow connections
    pool_pre_ping=True,     # Validate connections before using
    pool_recycle=3600,      # Recycle connections every hour
)
```

## Rollback Plan

### If Deployment Fails

1. **Check Logs**
   ```bash
   docker-compose logs backend
   # or
   aws logs tail /ecs/aquire-backend
   ```

2. **Revert to Previous Version**
   ```bash
   # Docker: Roll back image
   docker pull previous-image:tag
   docker-compose up -d
   
   # AWS ECS: Revert task definition
   aws ecs update-service \
     --cluster aquire-cluster \
     --service aquire-backend-service \
     --task-definition aquire-backend:5  # Previous version
   ```

3. **Database Migration Rollback**
   ```bash
   alembic downgrade -1  # Revert last migration
   ```

## Monitoring Commands

```bash
# Check service status
docker-compose ps

# View real-time logs
docker-compose logs -f backend

# Check database connections
psql -c "SELECT count(*) FROM pg_stat_activity;"

# Monitor Celery tasks
celery -A app.tasks.celery_app inspect active

# Check Redis
redis-cli INFO stats

# Performance metrics
curl https://api.yourdomain.com/health
```

## Scaling Guidelines

- **Horizontal**: Run multiple instances behind load balancer
- **Vertical**: Increase CPU/memory per container
- **Database**: Use read replicas for analytics queries
- **Cache**: Increase Redis instance size
- **CDN**: Use CloudFront for static API responses

## Cost Optimization

- Use spot instances for non-critical workloads
- Enable auto-scaling based on CPU/memory
- Archive old data to S3
- Use reserved instances for predictable load
- Optimize database instance type for workload

## Emergency Contacts & Escalation

- On-call: [Team Contact]
- Database Admin: [DB Contact]
- Cloud Provider Support: [Ticket Link]
