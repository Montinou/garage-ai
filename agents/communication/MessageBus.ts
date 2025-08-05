/**
 * MessageBus implementation for inter-agent communication
 * Provides publish/subscribe messaging capabilities with persistent storage
 */

import { supabase } from '../../lib/supabase';
import { 
  AgentMessage, 
  MessageHandler, 
  MessageSubscription, 
  MessageType, 
  JobPriority,
  HealthCheck 
} from '../types/AgentTypes';

export class MessageBus {
  private agentId: string;
  private subscriptions: Map<string, MessageSubscription[]>;
  private isInitialized: boolean;
  private pollingInterval: NodeJS.Timeout | null;
  private config: {
    pollingIntervalMs: number;
    maxRetries: number;
    messageRetentionMs: number;
    batchSize: number;
  };

  constructor(agentId: string) {
    this.agentId = agentId;
    this.subscriptions = new Map();
    this.isInitialized = false;
    this.pollingInterval = null;
    this.config = {
      pollingIntervalMs: 1000, // Poll every second
      maxRetries: 3,
      messageRetentionMs: 24 * 60 * 60 * 1000, // 24 hours
      batchSize: 100
    };

    this.initialize();
  }

  /**
   * Initialize the message bus
   */
  private async initialize(): Promise<void> {
    try {
      await this.createMessageTable();
      this.startPolling();
      this.isInitialized = true;
      this.log('MessageBus initialized successfully');
    } catch (error) {
      this.logError('Failed to initialize MessageBus', error);
      throw error;
    }
  }

  /**
   * Create messages table if it doesn't exist
   */
  private async createMessageTable(): Promise<void> {
    try {
      // Check if table exists and create if needed
      const { error } = await supabase.rpc('create_messages_table_if_not_exists');
      
      if (error && !error.message.includes('already exists')) {
        throw new Error(`Failed to create messages table: ${error.message}`);
      }
    } catch (error) {
      // If RPC doesn't exist, we'll assume the table is created via schema
      this.log('Messages table creation handled by schema');
    }
  }

  /**
   * Start polling for new messages
   */
  private startPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(async () => {
      try {
        await this.processIncomingMessages();
      } catch (error) {
        this.logError('Error processing incoming messages', error);
      }
    }, this.config.pollingIntervalMs);
  }

  /**
   * Stop polling for messages
   */
  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Process incoming messages
   */
  private async processIncomingMessages(): Promise<void> {
    try {
      // Get unprocessed messages for this agent
      const { data: messages, error } = await supabase
        .from('agent_messages')
        .select('*')
        .or(`to.eq.${this.agentId},topic.like.agent.${this.agentId}%,topic.eq.agent.broadcast`)
        .eq('processed', false)
        .order('created_at', { ascending: true })
        .limit(this.config.batchSize);

      if (error) {
        throw new Error(`Failed to fetch messages: ${error.message}`);
      }

      if (!messages || messages.length === 0) {
        return;
      }

      // Process each message
      for (const messageData of messages) {
        try {
          const message: AgentMessage = {
            id: messageData.id,
            type: messageData.type as MessageType,
            from: messageData.from,
            to: messageData.to,
            topic: messageData.topic,
            payload: messageData.payload,
            priority: messageData.priority as JobPriority,
            timestamp: new Date(messageData.created_at),
            expiresAt: messageData.expires_at ? new Date(messageData.expires_at) : undefined,
            metadata: messageData.metadata
          };

          // Check if message has expired
          if (message.expiresAt && message.expiresAt < new Date()) {
            await this.markMessageProcessed(message.id, 'expired');
            continue;
          }

          // Find matching subscriptions
          const topicSubscriptions = this.subscriptions.get(message.topic) || [];
          const wildcardSubscriptions = this.findWildcardSubscriptions(message.topic);
          const allSubscriptions = [...topicSubscriptions, ...wildcardSubscriptions];

          // Process message with each matching subscription
          for (const subscription of allSubscriptions) {
            try {
              await subscription.handler(message);
            } catch (handlerError) {
              this.logError(`Handler error for message ${message.id}`, handlerError);
              
              // If handler fails and no auto-retry, mark as failed
              if (subscription.options?.maxRetries === 0) {
                await this.markMessageProcessed(message.id, 'failed');
              }
            }
          }

          // Mark message as processed
          await this.markMessageProcessed(message.id, 'processed');

        } catch (messageError) {
          this.logError(`Error processing message ${messageData.id}`, messageError);
          await this.markMessageProcessed(messageData.id, 'error');
        }
      }

    } catch (error) {
      this.logError('Error in processIncomingMessages', error);
    }
  }

  /**
   * Find wildcard subscriptions that match the topic
   */
  private findWildcardSubscriptions(topic: string): MessageSubscription[] {
    const wildcardSubscriptions: MessageSubscription[] = [];
    
    for (const [subscribedTopic, subscriptions] of this.subscriptions.entries()) {
      if (subscribedTopic.includes('*') && this.matchesWildcard(subscribedTopic, topic)) {
        wildcardSubscriptions.push(...subscriptions);
      }
    }
    
    return wildcardSubscriptions;
  }

  /**
   * Check if topic matches wildcard pattern
   */
  private matchesWildcard(pattern: string, topic: string): boolean {
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(topic);
  }

  /**
   * Mark message as processed
   */
  private async markMessageProcessed(messageId: string, status: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('agent_messages')
        .update({
          processed: true,
          processed_at: new Date(),
          status: status
        })
        .eq('id', messageId);

      if (error) {
        throw new Error(`Failed to mark message as processed: ${error.message}`);
      }
    } catch (error) {
      this.logError('Failed to mark message as processed', error);
    }
  }

  /**
   * Publish a message to a topic
   */
  async publish(
    topic: string, 
    payload: any, 
    options: {
      type?: MessageType;
      priority?: JobPriority;
      to?: string;
      expiresAt?: Date;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    try {
      const message: Partial<AgentMessage> = {
        type: options.type || MessageType.BROADCAST,
        from: this.agentId,
        to: options.to,
        topic,
        payload,
        priority: options.priority || JobPriority.NORMAL,
        timestamp: new Date(),
        expiresAt: options.expiresAt,
        metadata: options.metadata
      };

      const { error } = await supabase
        .from('agent_messages')
        .insert({
          type: message.type,
          from: message.from,
          to: message.to,
          topic: message.topic,
          payload: message.payload,
          priority: message.priority,
          expires_at: message.expiresAt,
          metadata: message.metadata,
          processed: false,
          created_at: message.timestamp
        });

      if (error) {
        throw new Error(`Failed to publish message: ${error.message}`);
      }

      this.log(`Published message to topic: ${topic}`);
    } catch (error) {
      this.logError('Failed to publish message', error);
      throw error;
    }
  }

  /**
   * Subscribe to a topic
   */
  async subscribe(
    topic: string, 
    handler: MessageHandler, 
    options: {
      persistent?: boolean;
      autoAck?: boolean;
      maxRetries?: number;
    } = {}
  ): Promise<void> {
    try {
      const subscription: MessageSubscription = {
        topic,
        handler,
        options: {
          persistent: options.persistent ?? true,
          autoAck: options.autoAck ?? true,
          maxRetries: options.maxRetries ?? this.config.maxRetries
        }
      };

      if (!this.subscriptions.has(topic)) {
        this.subscriptions.set(topic, []);
      }
      
      this.subscriptions.get(topic)!.push(subscription);
      
      this.log(`Subscribed to topic: ${topic}`);
    } catch (error) {
      this.logError('Failed to subscribe to topic', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from a topic
   */
  async unsubscribe(topic: string, handler?: MessageHandler): Promise<void> {
    try {
      if (!this.subscriptions.has(topic)) {
        return;
      }

      if (handler) {
        // Remove specific handler
        const subscriptions = this.subscriptions.get(topic)!;
        const index = subscriptions.findIndex(sub => sub.handler === handler);
        if (index !== -1) {
          subscriptions.splice(index, 1);
        }
        
        // Remove topic if no more subscriptions
        if (subscriptions.length === 0) {
          this.subscriptions.delete(topic);
        }
      } else {
        // Remove all subscriptions for this topic
        this.subscriptions.delete(topic);
      }

      this.log(`Unsubscribed from topic: ${topic}`);
    } catch (error) {
      this.logError('Failed to unsubscribe from topic', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from all topics
   */
  async unsubscribeAll(): Promise<void> {
    try {
      this.subscriptions.clear();
      this.log('Unsubscribed from all topics');
    } catch (error) {
      this.logError('Failed to unsubscribe from all topics', error);
      throw error;
    }
  }

  /**
   * Get message history for a topic
   */
  async getMessageHistory(
    topic: string, 
    options: {
      limit?: number;
      offset?: number;
      since?: Date;
      includeProcessed?: boolean;
    } = {}
  ): Promise<AgentMessage[]> {
    try {
      let query = supabase
        .from('agent_messages')
        .select('*')
        .eq('topic', topic)
        .order('created_at', { ascending: false });

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
      }

      if (options.since) {
        query = query.gte('created_at', options.since.toISOString());
      }

      if (!options.includeProcessed) {
        query = query.eq('processed', false);
      }

      const { data: messages, error } = await query;

      if (error) {
        throw new Error(`Failed to get message history: ${error.message}`);
      }

      return (messages || []).map(msg => ({
        id: msg.id,
        type: msg.type as MessageType,
        from: msg.from,
        to: msg.to,
        topic: msg.topic,
        payload: msg.payload,
        priority: msg.priority as JobPriority,
        timestamp: new Date(msg.created_at),
        expiresAt: msg.expires_at ? new Date(msg.expires_at) : undefined,
        metadata: msg.metadata
      }));
    } catch (error) {
      this.logError('Failed to get message history', error);
      throw error;
    }
  }

  /**
   * Clean up expired messages
   */
  async cleanupExpiredMessages(): Promise<void> {
    try {
      const cutoffTime = new Date(Date.now() - this.config.messageRetentionMs);
      
      const { error } = await supabase
        .from('agent_messages')
        .delete()
        .or(`expires_at.lt.${new Date().toISOString()},created_at.lt.${cutoffTime.toISOString()}`);

      if (error) {
        throw new Error(`Failed to cleanup expired messages: ${error.message}`);
      }

      this.log('Cleaned up expired messages');
    } catch (error) {
      this.logError('Failed to cleanup expired messages', error);
    }
  }

  /**
   * Get message bus statistics
   */
  async getStats(): Promise<{
    totalMessages: number;
    unprocessedMessages: number;
    subscriptionCount: number;
    topicCount: number;
  }> {
    try {
      const { data: totalResult, error: totalError } = await supabase
        .from('agent_messages')
        .select('*', { count: 'exact', head: true });

      const { data: unprocessedResult, error: unprocessedError } = await supabase
        .from('agent_messages')
        .select('*', { count: 'exact', head: true })
        .eq('processed', false);

      if (totalError || unprocessedError) {
        throw new Error('Failed to get message stats');
      }

      const subscriptionCount = Array.from(this.subscriptions.values())
        .reduce((total, subs) => total + subs.length, 0);

      return {
        totalMessages: totalResult?.length || 0,
        unprocessedMessages: unprocessedResult?.length || 0,
        subscriptionCount,
        topicCount: this.subscriptions.size
      };
    } catch (error) {
      this.logError('Failed to get message bus stats', error);
      return {
        totalMessages: 0,
        unprocessedMessages: 0,
        subscriptionCount: 0,
        topicCount: 0
      };
    }
  }

  /**
   * Health check for message bus
   */
  async healthCheck(): Promise<HealthCheck> {
    try {
      // Test database connectivity
      const { error } = await supabase
        .from('agent_messages')
        .select('id')
        .limit(1);

      if (error) {
        throw new Error(`Database connectivity issue: ${error.message}`);
      }

      // Check if polling is active
      const isPollingActive = this.pollingInterval !== null;

      // Get basic stats
      const stats = await this.getStats();

      return {
        healthy: true,
        details: {
          component: 'MessageBus',
          status: 'healthy',
          lastCheck: new Date(),
          metrics: {
            initialized: this.isInitialized,
            pollingActive: isPollingActive,
            subscriptions: stats.subscriptionCount,
            unprocessedMessages: stats.unprocessedMessages
          }
        }
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          component: 'MessageBus',
          status: 'unhealthy',
          lastCheck: new Date(),
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      this.stopPolling();
      await this.unsubscribeAll();
      this.log('MessageBus cleanup completed');
    } catch (error) {
      this.logError('MessageBus cleanup failed', error);
    }
  }

  /**
   * Logging utility
   */
  private log(message: string, data?: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      component: 'MessageBus',
      agentId: this.agentId,
      level: 'INFO',
      message,
      data
    };
    console.log(JSON.stringify(logEntry));
  }

  /**
   * Error logging utility
   */
  private logError(message: string, error: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      component: 'MessageBus',
      agentId: this.agentId,
      level: 'ERROR',
      message,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    };
    console.error(JSON.stringify(logEntry));
  }
}

export default MessageBus;