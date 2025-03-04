import { SupabaseDatabaseAdapter } from '@elizaos/adapter-supabase';
import type { Goal, Memory, UUID } from '@elizaos/core';
import {} from '@supabase/supabase-js';
export class ExtendedSupabaseDatabaseAdapter extends SupabaseDatabaseAdapter {
  async createMemory(
    memory: Memory,
    tableName: string,
    unique = false,
  ): Promise<void> {
    // const createdAt = memory.createdAt ?? Date.now();
    // Convert milliseconds timestamp to ISO string
    const createdAt = memory.createdAt
      ? new Date(memory.createdAt).toISOString()
      : new Date().toISOString();

    if (unique) {
      const opts = {
        // TODO: Add ID option, optionally
        query_table_name: tableName,
        query_userid: memory.userId,
        query_content: memory.content.text,
        query_roomid: memory.roomId,
        query_embedding: memory.embedding,
        query_createdAt: createdAt,
        similarity_threshold: 0.95,
      };

      const result = await this.supabase.rpc(
        'check_similarity_and_insert',
        opts,
      );

      if (result.error) {
        throw new Error(JSON.stringify(result.error));
      }
    } else {
      const result = await this.supabase
        .from('memories')
        .insert({ ...memory, createdAt, type: tableName });
      const { error } = result;
      if (error) {
        throw new Error(JSON.stringify(error));
      }
    }
  }
  async getGoals(params: {
    roomId: UUID;
    userId?: UUID | null;
    onlyInProgress?: boolean;
    count?: number;
  }): Promise<Goal[]> {
    const opts = {
      query_roomid: params.roomId,
      query_userid: params.userId,
      only_in_progress: params.onlyInProgress,
      row_count: params.count,
    };

    try {
      const { data: goals, error } = await this.supabase.rpc('get_goals', opts);
      if (error) {
        console.error('Error getting goals', error);
        throw new Error(error.message);
      }

      return goals;
    } catch (error) {
      console.error('Error getting goals', error);
      return [];
    }
  }

  async getMemories(params: {
    roomId: UUID;
    count?: number;
    unique?: boolean;
    tableName: string;
    agentId?: UUID;
    start?: number;
    end?: number;
  }): Promise<Memory[]> {
    console.log('Getting memories', params);
    const query = this.supabase
      // .from(params.tableName) error here trying to get messages table. tableName is the filter field
      .from('memories')
      .select('*')
      .eq('roomId', params.roomId);

    if (params.start) {
      // Convert milliseconds to seconds and create a Date object
      const startDate = new Date(params.start);
      query.gte('createdAt', startDate.toISOString());
      // query.gte("createdAt", params.start);
    }

    if (params.end) {
      // Convert milliseconds to seconds and create a Date object
      const endDate = new Date(params.end);
      query.lte('createdAt', endDate.toISOString());
      // query.lte("createdAt", params.end);
    }

    if (params.unique) {
      query.eq('unique', true);
    }

    if (params.agentId) {
      query.eq('agentId', params.agentId);
    }

    query.order('createdAt', { ascending: false });

    if (params.count) {
      query.limit(params.count);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Error retrieving memories: ${error.message}`);
    }

    return data as Memory[];
  }
}

const supabaseAdapter = new ExtendedSupabaseDatabaseAdapter(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
);

export default supabaseAdapter;
