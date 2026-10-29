"""
IshLu Multisig Service
2-of-3 P2WSH Bitcoin multisig for collateral custody.

Keys:
- Key 1: User (generated on phone, pubkey stored in DB)
- Key 2: IshLu hot key (backend, signs repayments)
- Key 3: IshLu cold key (offline, signs liquidations only)
"""

from bitcoinutils.setup import setup
from bitcoinutils.keys import PrivateKey, PublicKey, P2wshAddress
from bitcoinutils.script import Script
import httpx
import secrets
import os
import logging

logger = logging.getLogger(__name__)

from core.config import settings

NETWORK = settings.bitcoin_network
setup(NETWORK)

ISHLU_HOT_PRIVKEY_HEX = settings.ishlu_hot_privkey_hex
ISHLU_COLD_PUBKEY_HEX = settings.ishlu_cold_pubkey_hex

BLOCKSTREAM_API = (
    "https://blockstream.info/testnet/api"
    if NETWORK == "testnet"
    else "https://blockstream.info/api"
)


def get_ishlu_hot_keypair():
    if not ISHLU_HOT_PRIVKEY_HEX:
        raise ValueError("ISHLU_HOT_PRIVKEY_HEX not set")
    privkey = PrivateKey(secret_exponent=int(ISHLU_HOT_PRIVKEY_HEX, 16))
    return privkey, privkey.get_public_key()


def generate_user_keypair() -> dict:
    """
    Generate Bitcoin keypair for a user.
    Private key returned ONCE — must be stored on device only.
    Backend stores public key only.
    """
    raw = secrets.token_bytes(32)
    privkey = PrivateKey(secret_exponent=int.from_bytes(raw, 'big'))
    pubkey = privkey.get_public_key()
    return {
        "private_key_hex": format(int.from_bytes(raw, 'big'), '064x'),
        "public_key_hex": pubkey.to_hex(),
    }


def create_multisig_address(user_pubkey_hex: str) -> dict:
    """
    Create 2-of-3 P2WSH multisig address for a loan collateral.
    Pubkeys are sorted for determinism.
    """
    _, ishlu_hot_pubkey = get_ishlu_hot_keypair()

    pubkeys = sorted([
        user_pubkey_hex,
        ishlu_hot_pubkey.to_hex(),
        ISHLU_COLD_PUBKEY_HEX,
    ])

    redeem_script = Script([
        'OP_2',
        pubkeys[0],
        pubkeys[1],
        pubkeys[2],
        'OP_3',
        'OP_CHECKMULTISIG'
    ])

    p2wsh = P2wshAddress.from_script(redeem_script)
    address = p2wsh.to_string()

    logger.info(f"Multisig address created: {address} (network: {NETWORK})")

    return {
        "address": address,
        "redeem_script_hex": redeem_script.to_hex(),
        "user_pubkey": user_pubkey_hex,
        "ishlu_hot_pubkey": ishlu_hot_pubkey.to_hex(),
        "ishlu_cold_pubkey": ISHLU_COLD_PUBKEY_HEX,
        "network": NETWORK,
    }


async def check_deposit(address: str, expected_sats: int) -> dict:
    """
    Check if expected BTC deposit has arrived and confirmed.
    Uses Blockstream free API — no key needed.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{BLOCKSTREAM_API}/address/{address}")
            resp.raise_for_status()
            data = resp.json()

            funded = data.get("chain_stats", {}).get("funded_txo_sum", 0)
            spent = data.get("chain_stats", {}).get("spent_txo_sum", 0)
            balance_sats = funded - spent
            tx_count = data.get("chain_stats", {}).get("tx_count", 0)
            confirmed = tx_count > 0 and balance_sats >= expected_sats

            return {
                "address": address,
                "balance_sats": balance_sats,
                "expected_sats": expected_sats,
                "confirmed": confirmed,
                "tx_count": tx_count,
                "sufficient": balance_sats >= expected_sats,
                "explorer_url": f"https://mempool.space/{'testnet/' if NETWORK == 'testnet' else ''}address/{address}",
            }
    except Exception as e:
        logger.error(f"Deposit check failed for {address}: {e}")
        return {
            "address": address,
            "balance_sats": 0,
            "confirmed": False,
            "sufficient": False,
            "error": str(e),
        }


async def get_utxos(address: str) -> list:
    """Get UTXOs for signing a release/liquidation transaction."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{BLOCKSTREAM_API}/address/{address}/utxo")
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        logger.error(f"UTXO fetch failed for {address}: {e}")
        return []
