const ORGAO = 'JUNTA COMERCIAL DO ESTADO DA PARAIBA';
const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const jsonReply = (data, status = 200, ttl = 0) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': ttl ? `public, max-age=${ttl}, s-maxage=${ttl}` : 'no-store'
  }
});

async function fetchCodata(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    let res;
    try {
      res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(15000)
      });
    } catch (err) {
      if (attempt === 2) throw err;
      await sleep(800 * (attempt + 1));
      continue;
    }
    if (res.ok) return res;
    if (![429, 500, 502, 503, 504].includes(res.status) || attempt === 2) {
      throw new Error(`API oficial indisponível (HTTP ${res.status}).`);
    }
    const retryAfter = Number(res.headers.get('Retry-After'));
    const delay = Number.isFinite(retryAfter) && retryAfter > 0
      ? Math.min(retryAfter * 1000, 6000)
      : 1200 * (attempt + 1);
    await sleep(delay);
  }
  throw new Error('API oficial indisponível.');
}

export async function onRequestGet({ request, waitUntil }) {
  const url = new URL(request.url);
  const ano = Number(url.searchParams.get('ano'));
  const mes = Number(url.searchParams.get('mes'));
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100 ||
      !Number.isInteger(mes) || mes < 1 || mes > 12) {
    return jsonReply({ erro: 'Ano ou mês inválido.' }, 400);
  }

  const now = new Date();
  const current = ano === now.getUTCFullYear() && mes === now.getUTCMonth() + 1;
  const ttl = current ? 900 : 86400; // 15 minutos para mês atual; 24 horas para outros meses
  const cache = caches.default;
  const cacheKey = new Request(`${url.origin}/api/receitas?ano=${ano}&mes=${mes}`, { method: 'GET' });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const dados = [];
  let paginas = 1;
  try {
    for (let page = 1; page <= paginas; page++) {
      if (page > 100) throw new Error('Limite de paginação atingido.');
      const api = new URL('https://api.dadosabertos.codata.pb.gov.br/api/v1/receita/receita_orcamentaria');
      api.searchParams.set('ano', ano);
      api.searchParams.set('mes', mes);
      api.searchParams.set('orgao', ORGAO);
      api.searchParams.set('page', page);
      api.searchParams.set('per_page', 100);
      const res = await fetchCodata(api.toString());
      const body = await res.json();
      if (!Array.isArray(body.dados)) throw new Error('Formato de resposta inesperado.');
      if (body.dados.some(r => norm(r.orgao) !== ORGAO)) throw new Error('Resposta contém registros de outro órgão.');
      if (body.dados.some(r => Number(r.ano) !== ano || Number(r.mes) !== mes)) throw new Error('Resposta contém registros de outro período.');
      dados.push(...body.dados);
      const p = Number(body.paginacao?.total_paginas ?? 1);
      if (!Number.isInteger(p) || p < 1 || p > 100) throw new Error('Paginação inválida ou acima do limite seguro.');
      paginas = p;
    }
    const response = jsonReply({ dados, orgao: ORGAO, ano, mes }, 200, ttl);
    if (typeof waitUntil === 'function') waitUntil(cache.put(cacheKey, response.clone()));
    else await cache.put(cacheKey, response.clone());
    return response;
  } catch (err) {
    return jsonReply({ erro: err.message || 'Erro na consulta à fonte oficial.' }, 502);
  }
}
