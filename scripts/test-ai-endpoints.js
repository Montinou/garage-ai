#!/usr/bin/env node

/**
 * Test script for new Vercel AI SDK endpoints
 * Tests the complete, chat, and object endpoints
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const BASE_URL = process.env.VERCEL_URL || 'http://localhost:3000';
const AGENT_ID = 'test-agent';

// Test data
const testCases = {
  complete: {
    prompt: "Explica en 2 frases qué es la inteligencia artificial.",
    system: "Eres un experto en tecnología que explica conceptos de forma clara y concisa."
  },
  chat: {
    messages: [
      { role: "user", content: "Hola, ¿puedes ayudarme con información sobre vehículos?" },
      { role: "assistant", content: "¡Por supuesto! Estaré encantado de ayudarte con información sobre vehículos. ¿Qué específicamente te gustaría saber?" },
      { role: "user", content: "¿Cuáles son las ventajas de los vehículos eléctricos?" }
    ]
  },
  object: {
    prompt: "Extrae información del vehículo: Toyota Corolla 2020, precio $250,000, usado, 45,000 km, ubicado en Ciudad de México",
    schema: "vehicle"
  }
};

async function testComplete() {
  console.log('\n🔧 Testing Complete Endpoint...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/agents/${AGENT_ID}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCases.complete)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Complete endpoint working');
      console.log('📝 Response:', result.text?.substring(0, 100) + '...');
      console.log('📊 Usage:', result.usage);
    } else {
      console.log('❌ Complete endpoint failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Complete endpoint error:', error.message);
  }
}

async function testChat() {
  console.log('\n💬 Testing Chat Endpoint (Streaming)...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/agents/${AGENT_ID}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCases.chat)
    });
    
    if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
      console.log('✅ Chat endpoint working (SSE detected)');
      console.log('📡 Streaming headers:', {
        'content-type': response.headers.get('content-type'),
        'cache-control': response.headers.get('cache-control')
      });
      
      // Read first few chunks
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let chunks = 0;
      
      if (reader) {
        while (chunks < 3) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          console.log(`📦 Chunk ${chunks + 1}:`, chunk.substring(0, 50) + '...');
          chunks++;
        }
        reader.releaseLock();
      }
    } else {
      const result = await response.json();
      console.log('❌ Chat endpoint failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Chat endpoint error:', error.message);
  }
}

async function testObject() {
  console.log('\n🎯 Testing Object Endpoint...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/agents/${AGENT_ID}/object`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCases.object)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Object endpoint working');
      console.log('📋 Structured object:', result.object);
      console.log('📊 Usage:', result.usage);
      console.log('⚠️  Warnings:', result.warnings);
    } else {
      console.log('❌ Object endpoint failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Object endpoint error:', error.message);
  }
}

async function testHealthChecks() {
  console.log('\n🏥 Testing Health Check Endpoints...');
  
  const endpoints = ['complete', 'chat', 'object'];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BASE_URL}/api/agents/${AGENT_ID}/${endpoint}`);
      const result = await response.json();
      
      if (response.ok) {
        console.log(`✅ ${endpoint} health check: ${result.status}`);
      } else {
        console.log(`❌ ${endpoint} health check failed`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint} health check error:`, error.message);
    }
  }
}

async function runTests() {
  console.log('🚀 Starting Vercel AI SDK Endpoint Tests');
  console.log('🎯 Base URL:', BASE_URL);
  console.log('🤖 Agent ID:', AGENT_ID);
  
  await testHealthChecks();
  await testComplete();
  await testChat();
  await testObject();
  
  console.log('\n✨ Test suite completed!');
}

// Only run if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testComplete, testChat, testObject, testHealthChecks };