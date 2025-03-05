import type { TokenBalance } from '../plugins/plugin-sonic/types/token-balance';

/**
 * The following tokens from supported-tokens.ts are intentionally excluded for testing:
 * - wstkscUSD (0x9fb76f7ce5FCeAA2C42887ff441D46095E494206)
 * - wstkscETH (0xE8a41c62BB4d5863C6eadC96792cFE90A1f37C47)
 * - scBTC (0xBb30e76d9Bb2CC9631F7fC5Eb8e87B5Aff32bFbd)
 * - scETH (0x3bcE5CB273F0F148010BbEa2470e7b5df84C7812)
 * - OS (0xb1e25689D55734FD3ffFc939c4C3Eb52DFf8A794)
 */

export const MOCK_WALLET_BALANCE: TokenBalance[] = [
  {
    // Beets Staked Sonic (stS) - 18 decimals
    address: '0xE5DA20F15420aD15DE0fa650600aFc998bbE3955',
    balance: 1500000000000000000000n, // 1,500 stS
  },
  {
    // Sonic (S) - 18 decimals
    address: '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38',
    balance: 25000000000000000000000n, // 25,000 S
  },
  {
    // Bridged USDC - 6 decimals
    address: '0x29219dd400f2Bf60E5a23d13Be72B486D4038894',
    balance: 50000000000n, // 50,000 USDC
  },
  {
    // Wrapped OS (wOS) - 18 decimals
    address: '0x9F0dF7799f6FDAd409300080cfF680f5A23df4b1',
    balance: 750000000000000000000n, // 750 wOS
  },
  {
    // HeyAnon (Anon) - 18 decimals
    address: '0x79bbF4508B1391af3A0F4B30bb5FC4aa9ab0E07C',
    balance: 100000000000000000000000n, // 100,000 Anon
  },
  {
    // Sonic USD (scUSD) - 6 decimals
    address: '0xd3DCe716f3eF535C5Ff8d041c1A41C3bd89b97aE',
    balance: 75000000000n, // 75,000 scUSD
  },
  {
    // Ether (ETH) - 18 decimals
    address: '0x50c42dEAcD8Fc9773493ED674b675bE577f2634b',
    balance: 150000000000000000000n, // 150 ETH
  },
  {
    // SolvBTC Babylon - 18 decimals
    address: '0xCC0966D8418d412c599A6421b760a847eB169A8c',
    balance: 5000000000000000000n, // 5 SolvBTC.BBN
  },
  {
    // Solv BTC - 18 decimals
    address: '0x541FD749419CA806a8bc7da8ac23D346f2dF8B77',
    balance: 3000000000000000000n, // 3 SolvBTC
  },
  {
    // Eggs (EGGS) - 18 decimals
    address: '0xf26Ff70573ddc8a90Bd7865AF8d7d70B8Ff019bC',
    balance: 500000000000000000000000n, // 500,000 EGGS
  },
  {
    // Lombard Staked Bitcoin (LBTC) - 8 decimals
    address: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
    balance: 1000000000n, // 10 LBTC
  },
  {
    // Wrapped anS (wanS) - 18 decimals
    address: '0xfA85Fe5A8F5560e9039C04f2b0a90dE1415aBD70',
    balance: 2500000000000000000000n, // 2,500 wanS
  },
  {
    // Wrapped BTC (WBTC) - 8 decimals
    address: '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c',
    balance: 500000000n, // 5 WBTC
  },
];
