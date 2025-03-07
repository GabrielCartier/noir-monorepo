import { http, createPublicClient } from 'viem';
import { sonic } from 'viem/chains';
import { clientEnv } from '../config/client-env';
import { VAULT_ABI } from '../constants/vault-abi';
import { VAULT_FACTORY_ABI } from '../constants/vault-factory-abi';
// import { getVaultInfo } from './database-service';

const publicClient = createPublicClient({
  chain: sonic,
  transport: http(clientEnv.NEXT_PUBLIC_API_URL),
});

export interface VaultInfo {
  address: string | null;
  balance?: bigint;
  exists: boolean;
}

export async function getVaultDetails(
  walletAddress: string,
): Promise<VaultInfo> {
  try {
    console.log('Checking vault info for wallet:', walletAddress);

    // // First check if vault exists in Supabase
    // let vaultAddress = await getVaultInfo(walletAddress);
    // console.log('Database vault check result:', vaultAddress);

    // If not in database, check on-chain
    let vaultAddress = null;
    if (!vaultAddress) {
      // console.log('No vault found in database, checking on-chain...');

      if (!clientEnv.NEXT_PUBLIC_VAULT_FACTORY_ADDRESS) {
        console.error('Vault factory address not configured');
        return {
          address: null,
          exists: false,
        };
      }

      try {
        vaultAddress = (await publicClient.readContract({
          address: clientEnv.NEXT_PUBLIC_VAULT_FACTORY_ADDRESS as `0x${string}`,
          abi: VAULT_FACTORY_ABI,
          functionName: 'userVault',
          args: [walletAddress as `0x${string}`],
        })) as `0x${string}`;
        console.log('On-chain vault check result:', vaultAddress);

        // If address is zero, vault doesn't exist
        if (vaultAddress === '0x0000000000000000000000000000000000000000') {
          console.log('No vault found on-chain');
          return {
            address: null,
            exists: false,
          };
        }
      } catch (error) {
        console.error('Error checking vault on-chain:', error);
        return {
          address: null,
          exists: false,
        };
      }
    }

    console.log('Found vault address:', vaultAddress);

    // Get vault balance
    try {
      const balance = await publicClient.readContract({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'getBalance',
        args: [walletAddress as `0x${string}`],
      });
      console.log('Vault balance:', balance?.toString());

      return {
        address: vaultAddress,
        balance,
        exists: true,
      };
    } catch (error) {
      console.error('Error fetching vault balance:', error);
      return {
        address: vaultAddress,
        exists: true,
      };
    }
  } catch (error) {
    console.error('Error getting vault details:', error);
    return {
      address: null,
      exists: false,
    };
  }
}
