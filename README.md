# 🏛️ Scheme Sahayak - Government Benefits Navigator

**Stop missing out on benefits you deserve.** Find schemes, check eligibility, and apply - all in one place.

## 🚀 Quick Start

### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```
Visit: http://localhost:3000

### Backend (Python FastAPI)
```bash
cd backend
pip install -r requirements.txt
python main.py
```
API: http://localhost:8000

## 📦 What's Inside

- **Smart Matching**: Answer simple questions, get matched with schemes
- **Multi-language Chatbot**: Ask in Hindi, English, Tamil, Telugu, etc.
- **Document Helper**: Know exactly what papers you need
- **No Middlemen**: Direct, verified information

## 🌐 Deploy

**Frontend**: Push to GitHub → Connect Vercel → Deploy
**Backend**: Push to GitHub → Connect Render/Railway → Deploy

## 📊 CSV Format Required

Your schemes CSV needs these columns:
- `scheme_name`: Name of the scheme
- `description`: What it does
- `eligibility`: Who can apply (we'll parse this)
- `benefits`: What you get
- `documents`: Papers needed
- `how_to_apply`: Steps to apply
- `department`: Which government department
- `state`: Which state (or "Central" for national)
- `category`: Type (Education/Health/Pension/etc)
