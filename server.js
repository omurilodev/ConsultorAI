import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabase = createClient(
  'https://gmmsjktczkyrmkqczsuu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtbXNqa3Rjemt5cm1rcWN6c3V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MTQ4MjEsImV4cCI6MjA5NTA5MDgyMX0.Gyyv78dII1g8s4PxrWwlud2JD0jh7ybecO20tIgzGu4'
);

const server = new McpServer({
  name: 'crm-server',
  version: '1.0.0'
});

// Tool: buscar leads
server.tool(
  'buscar_leads',
  'Busca leads do CRM. Pode filtrar por status: lead, call, proposta, fechado, perdido.',
  { status: z.string().optional().describe('Status para filtrar (opcional)') },
  async ({ status }) => {
    let query = supabase
      .from('leads')
      .select('nome, email, whatsapp, status, created_at')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return {
      content: [{
        type: 'text',
        text: data.length
          ? JSON.stringify(data, null, 2)
          : 'Nenhum lead encontrado.'
      }]
    };
  }
);

// Tool: buscar lead por nome
server.tool(
  'buscar_lead_por_nome',
  'Busca um lead específico pelo nome completo ou parcial.',
  { nome: z.string().describe('Nome ou parte do nome do lead') },
  async ({ nome }) => {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .ilike('nome', `%${nome}%`);

    if (error) throw new Error(error.message);

    return {
      content: [{
        type: 'text',
        text: data.length
          ? JSON.stringify(data, null, 2)
          : `Nenhum lead encontrado com o nome "${nome}".`
      }]
    };
  }
);

// Tool: atualizar status
server.tool(
  'atualizar_status',
  'Atualiza o status de um lead no CRM pelo email.',
  {
    email: z.string().describe('Email do lead'),
    status: z.string().describe('Novo status: lead, call, proposta, fechado, perdido')
  },
  async ({ email, status }) => {
    const { error } = await supabase
      .from('leads')
      .update({ status })
      .eq('email', email);

    if (error) throw new Error(error.message);

    return {
      content: [{
        type: 'text',
        text: `Status do lead ${email} atualizado para "${status}" com sucesso.`
      }]
    };
  }
);

// Tool: resumo do pipeline
server.tool(
  'resumo_pipeline',
  'Retorna um resumo de quantos leads existem em cada status do pipeline.',
  {},
  async () => {
    const { data, error } = await supabase
      .from('leads')
      .select('status');

    if (error) throw new Error(error.message);

    const resumo = data.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {});

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(resumo, null, 2)
      }]
    };
  }
);

// Inicia o servidor
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('CRM MCP Server rodando...');