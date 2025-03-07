import { supabaseClient } from '../config/client-supabase';

interface KnowledgeMetadata {
  type: string;
  walletAddress: string;
  vaultAddress?: string;
}

interface KnowledgeContent {
  metadata: KnowledgeMetadata;
}

interface Knowledge {
  content: KnowledgeContent;
}

export async function getVaultInfo(
  walletAddress: string,
): Promise<string | null> {
  try {
    // Check if we have valid Supabase configuration
    if (!supabaseClient) {
      console.warn('Supabase client not initialized, skipping database check');
      return null;
    }

    const { data: knowledge, error } = await supabaseClient
      .from('knowledge')
      .select('content')
      .eq('content->metadata->walletAddress', walletAddress)
      .eq('content->metadata->type', 'vault_info')
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No data found - this is not an error
        return null;
      }
      console.error('Supabase error:', error);
      return null;
    }

    if (!knowledge) {
      return null;
    }

    const typedKnowledge = knowledge as Knowledge;
    if (!typedKnowledge.content?.metadata?.vaultAddress) {
      return null;
    }

    return typedKnowledge.content.metadata.vaultAddress;
  } catch (error) {
    console.error('Error fetching vault info:', error);
    return null;
  }
}
