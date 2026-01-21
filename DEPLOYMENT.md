# 🚀 Deployment Guide

## Frontend (Vercel) - FREE

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Initial commit: Scheme Sahayak"
git push origin main
```

### Step 2: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "Import Project"
3. Connect your GitHub repo: `Muqeeth47/idea`
4. Vercel will auto-detect Next.js
5. Click "Deploy"
6. Done! Your app will be live at `https://your-project.vercel.app`

**No configuration needed** - Vercel handles everything automatically!

---

## Backend (Optional - For Chatbot)

The current version works **100% client-side** with no backend needed!

If you want to add a chatbot later:

### Option 1: Python FastAPI (Render/Railway - FREE)
```bash
cd backend
pip install -r requirements.txt
python main.py
```

Then deploy to Render.com or Railway.app (both have free tiers)

### Option 2: Use Vercel Serverless Functions
Add API routes in `/app/api/` folder - stays on Vercel, no separate backend!

---

## What You Have Now

✅ **3,402 government schemes** loaded from CSV
✅ **Smart matching algorithm** - checks age, state, income, category, occupation
✅ **Mobile responsive** - works on all devices
✅ **Fast** - client-side processing, no server delays
✅ **Free to deploy** - Vercel free tier is generous

---

## Next Steps (Optional Enhancements)

1. **Multi-language Support**: Add Hindi, Tamil, Telugu translations
2. **Chatbot**: Add conversational interface using OpenAI/Gemini API
3. **Document Helper**: Guide users on getting required documents
4. **Application Tracking**: Let users save schemes they're interested in
5. **SMS Notifications**: Send scheme updates via SMS

---

## Testing Locally

```bash
npm run dev
```

Visit: http://localhost:3001

---

## Production Build

```bash
npm run build
npm start
```

---

## Environment Variables (if needed later)

Create `.env.local`:
```
NEXT_PUBLIC_API_URL=https://your-backend.com
OPENAI_API_KEY=your_key_here
```

---

## Support

- Frontend: Next.js 14 + TypeScript + Tailwind CSS
- Data: 3,402 schemes from your CSV
- Deployment: Vercel (frontend) + Render/Railway (backend if needed)
- Cost: **$0** on free tiers
