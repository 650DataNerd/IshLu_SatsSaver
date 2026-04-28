import anthropic
from core.config import settings

client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

SYSTEM_PROMPT = """You are Akili, the AI financial coach inside IshLu SatsSaver —
a Bitcoin micro-savings app built for young Africans.

Your personality: warm, encouraging, and culturally aware. You understand the
realities of gig economy income in Nairobi and Lagos. You use simple language,
celebrate small wins, and connect saving habits to long-term freedom.

Rules:
- Never give investment advice or price predictions
- Keep responses under 150 words
- Respond in English but sprinkle Swahili if the user uses it
"""

def get_offline_explanation(score: int, tier: str, breakdown: dict) -> str:
    """Generate smart explanation without API — based on score data."""
    weak_areas = sorted(
        [(k, v["score"], v["max"]) for k, v in breakdown.items()],
        key=lambda x: x[1] / x[2]
    )
    weakest = weak_areas[0][0].replace("_", " ") if weak_areas else "savings consistency"

    if score >= 750:
        return f"🌳 Platinum status! Your {score} Trust Score puts you in the top tier. Your savings discipline is exceptional — you've unlocked full loan access. Keep stacking sats!"
    elif score >= 650:
        return f"⭐ Gold tier with {score} points! You're building serious financial discipline. Focus on improving your {weakest} to reach Platinum and unlock maximum loan limits."
    elif score >= 550:
        return f"🥈 Silver tier — {score} points and growing! Your weakest area is {weakest}. Save consistently every week to climb to Gold and unlock bigger loans."
    elif score >= 450:
        return f"🥉 Bronze tier with {score} points. Good start! Your {weakest} score needs work. Try saving a small amount every week — even KES 50 counts toward your consistency score."
    else:
        return f"🌱 Seed tier — {score} points. Every journey starts here! Create a savings goal and make your first deposit to start growing your Trust Score. Hata kidogo kidogo hujaza ndoo!"

async def get_score_explanation(score: int, tier: str, breakdown: dict) -> str:
    """Try Claude API first, fall back to offline if no credits."""
    weak_areas = sorted(
        [(k, v["score"], v["max"]) for k, v in breakdown.items()],
        key=lambda x: x[1] / x[2]
    )
    weakest = weak_areas[0][0].replace("_", " ") if weak_areas else "savings consistency"

    prompt = f"""My Trust Score is {score} ({tier} tier).
My weakest area is {weakest}.
Give me 2 sentences about my score and ONE specific action to improve it this week."""

    try:
        resp = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=150,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}]
        )
        return resp.content[0].text
    except Exception:
        return get_offline_explanation(score, tier, breakdown)

async def chat_with_akili(user_message: str, context: dict) -> str:
    """Chat with Akili — falls back to helpful offline responses."""
    context_str = f"""
User context:
- Trust Score: {context.get('score', 'N/A')} ({context.get('tier', 'N/A')})
- Total saved: {context.get('total_sats', 0):,} sats
"""
    try:
        resp = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=200,
            system=SYSTEM_PROMPT + "\n\n" + context_str,
            messages=[{"role": "user", "content": user_message}]
        )
        return resp.content[0].text
    except Exception:
        # Smart offline responses
        msg = user_message.lower()
        score = context.get('score', 400)
        tier = context.get('tier', 'Seed')

        if any(w in msg for w in ['loan', 'borrow', 'emergency']):
            if score >= 550:
                return f"With your {tier} tier score of {score}, you can request emergency loans. Go to the Loans tab to see your available liquidity. Remember — loans are backed by your own sats!"
            else:
                return f"You need a Silver tier score (550+) to unlock loans. You're at {score} — keep saving consistently to get there! Try saving every week for the next 4 weeks."
        elif any(w in msg for w in ['score', 'trust', 'improve']):
            return f"Your Trust Score of {score} grows when you: 1) Save every week consistently, 2) Complete your savings goals, 3) Repay any loans on time. Small weekly deposits matter more than big occasional ones!"
        elif any(w in msg for w in ['mpesa', 'save', 'deposit', 'stack']):
            return "Go to the Save tab, select M-Pesa, choose your goal and amount, then tap Pay. You'll get a prompt on your phone. After entering your PIN, tap 'I've Paid' to confirm and credit your sats!"
        elif any(w in msg for w in ['bitcoin', 'btc', 'sats', 'what']):
            return "Sats (satoshis) are the smallest unit of Bitcoin. 100 million sats = 1 Bitcoin. We save in sats because Bitcoin protects your money from inflation — KES loses value every year, sats don't!"
        else:
            return f"Habari! I'm Akili, your financial coach 🌱 Your Trust Score is {score} ({tier} tier). Ask me about your score, how to save, loans, or anything about Bitcoin!"
