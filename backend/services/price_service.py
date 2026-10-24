import httpx
import time
import logging

logger = logging.getLogger(__name__)

_cache = {"rate": 7.5, "updated_at": 0}
CACHE_TTL = 300  # 5 minutes


async def get_kes_to_sats() -> float:
    now = time.time()
    if now - _cache["updated_at"] < CACHE_TTL:
        return _cache["rate"]

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            # BTC/USDT from Binance
            btc_resp = await client.get(
                "https://api.binance.com/api/v3/ticker/price",
                params={"symbol": "BTCUSDT"}
            )
            btc_usd = float(btc_resp.json()["price"])

            # USD/KES from exchangerate-api (free, no key)
            kes_resp = await client.get(
                "https://open.er-api.com/v6/latest/USD"
            )
            usd_kes = float(kes_resp.json()["rates"]["KES"])

            btc_kes = btc_usd * usd_kes
            rate = 100_000_000 / btc_kes

            _cache["rate"] = rate
            _cache["updated_at"] = now

            logger.info(f"BTC = KES {btc_kes:,.0f} | 1 KES = {rate:.4f} sats")
            return rate

    except Exception as e:
        logger.warning(f"Price fetch failed, using cached {_cache['rate']:.4f}: {e}")
        return _cache["rate"]


async def get_btc_kes_price() -> float:
    rate = await get_kes_to_sats()
    return 100_000_000 / rate
